// Lógica de negocio. Todas las acciones importantes quedan en la bitácora.

import { almacen } from "./almacen/index.ts";
import type {
  Caso, Decision, EstadoCaso, EstadoProveedor, Hallazgo, Llamada,
  Proveedor, ResultadoLlamada, SolicitudClabe, Verificacion,
} from "./tipos.ts";
import { clabeValida, normalizarRfc, normalizarTelefono, rfcValido } from "./validacion.ts";
import type { EntradaAlta } from "./servicios-tipos.ts";
import { verificarProveedor, type EventoVerificacion } from "./verificacion/index.ts";
import { iniciarLlamada, vozConfigurada, resultadoSchema } from "./voz/elevenlabs.ts";

export const SISTEMA = "Sistema KYP";

async function registrar(actor: string, accion: string, entidad: string, entidad_id: string | null, detalle: Record<string, unknown> | null = null) {
  await almacen().bitacora.crear({ actor, accion, entidad, entidad_id, detalle, creado_en: new Date().toISOString() });
}

export class ErrorValidacion extends Error {}

// ---------- Alta y verificación ----------

export type { EntradaAlta } from "./servicios-tipos.ts";

export function validarAlta(e: EntradaAlta): string[] {
  const errores: string[] = [];
  if (!rfcValido(e.rfc ?? "")) errores.push(`RFC inválido: ${e.rfc}`);
  if (!e.razon_social?.trim()) errores.push("Falta la razón social");
  if (!e.telefono_registrado?.trim()) errores.push("Falta el teléfono registrado del representante");
  if (e.clabe && !clabeValida(e.clabe)) errores.push(`CLABE inválida: ${e.clabe}`);
  return errores;
}

export async function altaProveedor(e: EntradaAlta, actor: string, fuentesExternas = true, alEvento?: (ev: EventoVerificacion) => void) {
  const errores = validarAlta(e);
  if (errores.length) throw new ErrorValidacion(errores.join("; "));
  const db = almacen();
  const rfc = normalizarRfc(e.rfc);

  let proveedor = (await db.proveedores.listar({ rfc }))[0] ?? null;
  if (!proveedor) {
    proveedor = await db.proveedores.crear({
      rfc,
      razon_social: e.razon_social.trim(),
      sitio_web: e.sitio_web?.trim() || null,
      telefono_registrado: normalizarTelefono(e.telefono_registrado),
      clabe: e.clabe?.trim() || null,
      giro_declarado: e.giro_declarado?.trim() || null,
      monto_anual: Number(e.monto_anual) || 0,
      estado: "pendiente",
      creado_en: new Date().toISOString(),
    });
    await registrar(actor, "alta_proveedor", "proveedor", proveedor.id, { rfc });
    if (e.factura_folio && e.factura_monto) {
      await db.facturas.crear({ proveedor_id: proveedor.id, folio: e.factura_folio, monto: Number(e.factura_monto), fecha: new Date().toISOString().slice(0, 10) });
    }
  }
  return verificar(proveedor, actor, fuentesExternas, [], alEvento);
}

export async function verificar(proveedor: Proveedor, actor: string, fuentesExternas = true, hallazgosExtra: Hallazgo[] = [], alEvento?: (ev: EventoVerificacion) => void) {
  const db = almacen();
  const v = await db.verificaciones.crear(await verificarProveedor(proveedor, { fuentesExternas, hallazgosExtra, alEvento }));
  await registrar(actor, "verificacion", "proveedor", proveedor.id, { puntaje: v.puntaje, decision: v.decision, fuentes_externas: fuentesExternas });

  // Cierra casos de alta pendientes anteriores: la nueva verificación los reemplaza.
  for (const c of await db.casos.listar({ proveedor_id: proveedor.id, tipo: "alta", estado: "pendiente" })) {
    await db.casos.actualizar(c.id, { estado: "aprobado", decidido_por: SISTEMA, decidido_en: new Date().toISOString(), comentario: "Reemplazado por una nueva verificación" });
  }

  // Un cambio de CLABE sin resolver mantiene el pago en pausa, sea cual sea el resultado de la verificación.
  const clabePendiente = (await db.solicitudes.listar({ proveedor_id: proveedor.id }))
    .some((s) => s.estado === "pausada" || s.estado === "en_llamada");

  let caso: Caso | null = null;
  if (v.decision === "liberar") {
    await db.proveedores.actualizar(proveedor.id, { estado: clabePendiente ? "pausado" : "aprobado" });
  } else {
    caso = await db.casos.crear({
      proveedor_id: proveedor.id,
      tipo: "alta",
      prioridad: v.puntaje * Math.max(proveedor.monto_anual, 1),
      estado: "pendiente",
      decision_sugerida: v.decision,
      motivo: v.motivos.filter((m) => m.puntos > 0).map((m) => m.descripcion).join("; "),
      solicitud_id: null,
      decidido_por: null,
      decidido_en: null,
      comentario: null,
      creado_en: new Date().toISOString(),
    });
    await db.proveedores.actualizar(proveedor.id, { estado: clabePendiente ? "pausado" : "en_revision" });
  }
  return { proveedor: (await db.proveedores.obtener(proveedor.id))!, verificacion: v, caso };
}

// ---------- Decisiones del gestor ----------

const ESTADO_PROVEEDOR: Record<Exclude<EstadoCaso, "pendiente">, EstadoProveedor> = {
  aprobado: "aprobado",
  pausado: "pausado",
  bloqueado: "bloqueado",
};

export async function decidirCaso(casoId: string, estado: Exclude<EstadoCaso, "pendiente">, actor: string, comentario: string | null) {
  const db = almacen();
  const caso = await db.casos.obtener(casoId);
  if (!caso) throw new ErrorValidacion("El caso no existe");
  if (caso.estado !== "pendiente" && caso.estado !== "pausado") throw new ErrorValidacion("El caso ya fue resuelto");
  if (estado === "aprobado" && caso.decision_sugerida === "bloquear" && !comentario) {
    throw new ErrorValidacion("Para aprobar en contra de una sugerencia de bloqueo, escribe un comentario que lo justifique");
  }

  const actualizado = await db.casos.actualizar(casoId, { estado, decidido_por: actor, decidido_en: new Date().toISOString(), comentario });

  if (caso.tipo === "clabe" && caso.solicitud_id) {
    const s = await db.solicitudes.obtener(caso.solicitud_id);
    if (s && estado === "aprobado") {
      await db.solicitudes.actualizar(s.id, { estado: "verificada" });
      await db.proveedores.actualizar(caso.proveedor_id, { clabe: s.clabe_nueva, estado: await estadoBase(caso.proveedor_id) });
    } else if (s && estado === "bloqueado") {
      await db.solicitudes.actualizar(s.id, { estado: "rechazada" });
      await db.proveedores.actualizar(caso.proveedor_id, { estado: await estadoBase(caso.proveedor_id) });
    } else {
      await db.proveedores.actualizar(caso.proveedor_id, { estado: "pausado" });
    }
  } else {
    await db.proveedores.actualizar(caso.proveedor_id, { estado: ESTADO_PROVEEDOR[estado] });
  }

  await registrar(actor, `caso_${estado}`, "caso", casoId, { proveedor_id: caso.proveedor_id, tipo: caso.tipo, comentario });
  return actualizado;
}

// Estado del proveedor según su caso de alta más reciente (sin contar cambios de CLABE).
async function estadoBase(proveedorId: string): Promise<EstadoProveedor> {
  const casos = (await almacen().casos.listar({ proveedor_id: proveedorId, tipo: "alta" }))
    .sort((a, b) => b.creado_en.localeCompare(a.creado_en));
  const ultimo = casos[0];
  if (!ultimo) return "aprobado";
  return ultimo.estado === "pendiente" ? "en_revision" : ESTADO_PROVEEDOR[ultimo.estado];
}

// ---------- Cambio de CLABE y llamada de verificación ----------

export async function solicitarCambioClabe(proveedorId: string, clabeNueva: string, telefonoEnSolicitud: string | null, actor: string) {
  const db = almacen();
  const p = await db.proveedores.obtener(proveedorId);
  if (!p) throw new ErrorValidacion("El proveedor no existe");
  if (!clabeValida(clabeNueva)) throw new ErrorValidacion("La CLABE no es válida (18 dígitos y dígito verificador)");

  const solicitud = await db.solicitudes.crear({
    proveedor_id: p.id,
    clabe_nueva: clabeNueva,
    telefono_en_solicitud: telefonoEnSolicitud?.trim() || null,
    estado: "pausada",
    creado_en: new Date().toISOString(),
  });
  await db.proveedores.actualizar(p.id, { estado: "pausado" });
  await registrar(actor, "solicitud_clabe", "solicitud_clabe", solicitud.id, { proveedor_id: p.id, pago: "pausado" });

  let llamada: { iniciada: boolean; error?: string } = { iniciada: false };
  if (vozConfigurada()) {
    try {
      const factura = (await db.facturas.listar({ proveedor_id: p.id })).sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
      if (!factura || !p.clabe) throw new Error("Faltan factura o cuenta anterior para verificar");
      const conversationId = await iniciarLlamada(p.telefono_registrado, {
        solicitud_id: solicitud.id,
        empresa: process.env.EMPRESA_NOMBRE ?? "la empresa",
        proveedor: p.razon_social,
        folio_factura: factura?.folio ?? "sin folio registrado",
        monto_factura: factura ? String(factura.monto) : "sin monto registrado",
        ultimos4_anterior: p.clabe?.slice(-4) ?? "sin cuenta anterior",
      });
      await db.solicitudes.actualizar(solicitud.id, { estado: "en_llamada" });
      await registrar(SISTEMA, "llamada_iniciada", "solicitud_clabe", solicitud.id, { telefono: "registrado en el alta", conversation_id: conversationId });
      llamada = { iniciada: true };
    } catch (error) {
      llamada = { iniciada: false, error: error instanceof Error && error.name !== "TimeoutError" ? error.message : "La llamada no pudo confirmarse; revisar antes de reintentar" };
      await registrar(SISTEMA, "llamada_fallida", "solicitud_clabe", solicitud.id, { error: llamada.error });
      await crearCasoClabe(p, solicitud, "No se pudo realizar la llamada de verificación");
    }
  }
  return { solicitud: (await db.solicitudes.obtener(solicitud.id))!, llamada };
}

async function crearCasoClabe(p: Proveedor, s: SolicitudClabe, motivo: string) {
  return almacen().casos.crear({
    proveedor_id: p.id,
    tipo: "clabe",
    prioridad: 100 * Math.max(p.monto_anual, 1),
    estado: "pendiente",
    decision_sugerida: "bloquear",
    motivo,
    solicitud_id: s.id,
    decidido_por: null,
    decidido_en: null,
    comentario: null,
    creado_en: new Date().toISOString(),
  });
}

const MOTIVO_LLAMADA: Record<Exclude<ResultadoLlamada, "confirmado">, string> = {
  no_reconoce: "El proveedor NO reconoce la solicitud de cambio de CLABE",
  datos_no_coinciden: "Los datos confirmados en la llamada no coinciden",
  sin_respuesta: "No se pudo contactar al teléfono registrado",
};

async function aplicarResultadoLlamada(datos: {
  solicitud_id: string; resultado: ResultadoLlamada; transcripcion: string;
  conversation_id?: string | null; resumen?: string | null; simulada: boolean;
}): Promise<Llamada> {
  const db = almacen();
  const s = await db.solicitudes.obtener(datos.solicitud_id);
  if (!s) throw new ErrorValidacion("La solicitud no existe");
  const p = (await db.proveedores.obtener(s.proveedor_id))!;
  const existentes = await db.llamadas.listar({ solicitud_id: s.id });
  if (existentes.length) {
    const anterior = existentes[0];
    if (anterior.resultado !== datos.resultado || anterior.conversation_id !== (datos.conversation_id ?? null) || anterior.simulada !== datos.simulada) {
      throw new ErrorValidacion("Resultado en conflicto con la evidencia registrada");
    }
    return anterior;
  }
  if (["verificada", "rechazada"].includes(s.estado)) throw new ErrorValidacion("La solicitud ya está resuelta");
  if (!datos.simulada) {
    const inicio = (await db.bitacora.listar({ entidad_id: s.id, accion: "llamada_iniciada" }))
      .find(e => e.detalle?.conversation_id === datos.conversation_id);
    if (!datos.conversation_id || !inicio) throw new ErrorValidacion("La conversación no corresponde a la solicitud");
  } else if (vozConfigurada()) throw new ErrorValidacion("No se puede simular con voz configurada");

  const llamada = await db.llamadas.crear({
    solicitud_id: s.id,
    conversation_id: datos.conversation_id ?? null,
    resultado: datos.resultado,
    transcripcion: datos.transcripcion,
    resumen: datos.resumen ?? null,
    simulada: datos.simulada,
    creado_en: new Date().toISOString(),
  });
  await registrar(datos.simulada ? "Simulación (demo)" : "Agente de voz", `llamada_${datos.resultado}`, "solicitud_clabe", s.id, { simulada: datos.simulada });

  if (datos.resultado === "confirmado") {
    await db.solicitudes.actualizar(s.id, { estado: "verificada" });
    await db.proveedores.actualizar(p.id, { clabe: s.clabe_nueva, estado: (await db.solicitudes.listar({ proveedor_id: p.id })).some(x => x.id !== s.id && ["pausada", "en_llamada"].includes(x.estado)) ? "pausado" : await estadoBase(p.id) });
  } else {
    await db.solicitudes.actualizar(s.id, { estado: "pausada" });
    await db.proveedores.actualizar(p.id, { estado: "pausado" });
    await crearCasoClabe(p, s, MOTIVO_LLAMADA[datos.resultado]);
  }
  return llamada;
}

// ---------- Consultas ----------

export async function ultimasVerificaciones(): Promise<Map<string, Verificacion>> {
  const mapa = new Map<string, Verificacion>();
  for (const v of await almacen().verificaciones.listar()) {
    const actual = mapa.get(v.proveedor_id);
    if (!actual || v.fecha > actual.fecha) mapa.set(v.proveedor_id, v);
  }
  return mapa;
}

export type EstadoPago = "liberada" | "pausada" | "bloqueada";

export function estadoPago(p: Proveedor): EstadoPago {
  if (p.estado === "aprobado") return "liberada";
  if (p.estado === "bloqueado") return "bloqueada";
  return "pausada";
}

export const HORAS_MANUAL_POR_REVISION = 2.6;
export const MINUTOS_POR_EXCEPCION = 20;

export async function metricas() {
  const db = almacen();
  const [proveedores, casos, verificaciones] = await Promise.all([db.proveedores.listar(), db.casos.listar(), ultimasVerificaciones()]);
  const verificados = verificaciones.size;
  const porDecision: Record<Decision, number> = { liberar: 0, revisar: 0, bloquear: 0 };
  for (const v of verificaciones.values()) porDecision[v.decision]++;
  const casosAtendidos = casos.filter((c) => c.decidido_por && c.decidido_por !== SISTEMA).length;
  const pendientes = casos.filter((c) => c.estado === "pendiente").length;
  const montoProtegido = proveedores
    .filter((p) => p.estado === "bloqueado" || p.estado === "pausado" || p.estado === "en_revision")
    .reduce((s, p) => s + p.monto_anual, 0);
  return {
    proveedores: proveedores.length,
    verificados,
    automaticos: porDecision.liberar,
    porcentajeAutomatico: verificados ? Math.round((porDecision.liberar / verificados) * 100) : 0,
    porDecision,
    pendientes,
    casosAtendidos,
    horasManual: verificados * HORAS_MANUAL_POR_REVISION,
    horasKyp: ((pendientes + casosAtendidos) * MINUTOS_POR_EXCEPCION) / 60,
    montoProtegido,
    porEstado: proveedores.reduce<Record<string, number>>((m, p) => ({ ...m, [p.estado]: (m[p.estado] ?? 0) + 1 }), {}),
  };
}

// Serializa la demo en memoria. En Supabase el RPC bloquea las filas y confirma todo en una transacción.
let colaVoz: Promise<unknown> = Promise.resolve();
export async function registrarResultadoLlamada(entrada: Parameters<typeof aplicarResultadoLlamada>[0]): Promise<Llamada> {
  const parsed = resultadoSchema.safeParse(entrada);
  if (!parsed.success) throw new ErrorValidacion("Resultado de llamada inválido");
  if (parsed.data.simulada && vozConfigurada()) throw new ErrorValidacion("No se puede simular con voz configurada");
  if (almacen().modo === "supabase") {
    const { registrarResultadoPersistente } = await import("./voz/persistencia.ts");
    return registrarResultadoPersistente(parsed.data);
  }
  const tarea = colaVoz.then(() => aplicarResultadoLlamada(parsed.data));
  colaVoz = tarea.catch(() => undefined);
  return tarea;
}
