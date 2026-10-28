// Monitoreo continuo, resumen diario y la tarea diaria que los ejecuta (Vercel Cron o botón manual).

import { almacen } from "./almacen/index.ts";
import { registrar } from "./bitacora.ts";
import { procesarRecordatorios } from "./documentos.ts";
import { explicarHallazgo } from "./explicar.ts";
import { enDias, pesos, plural } from "./formato.ts";
import { notificar } from "./notificaciones.ts";
import { HORAS_CASO_ANTIGUO, horasDesde, proximosPagos, ultimasVerificaciones, verificar } from "./servicios.ts";
import type { Fuente, Hallazgo } from "./tipos.ts";
import { revisar69, revisar69B, revisarOfac } from "./verificacion/listas.ts";

const FUENTES_LISTAS: Fuente[] = ["sat_69b", "sat_69", "ofac"];

// Simulaciones de demo: "como si el SAT hubiera publicado hoy a este proveedor". Siempre marcadas como simulación.
const global = globalThis as unknown as { __kypSimulaciones?: Map<string, Hallazgo> };
const simulaciones = () => (global.__kypSimulaciones ??= new Map());

const firma = (hs: Hallazgo[]) => hs.filter((h) => FUENTES_LISTAS.includes(h.fuente)).map((h) => `${h.fuente}:${h.resultado}`).sort().join("|");

export async function ejecutarMonitoreo(actor: string) {
  const db = almacen();
  const verificaciones = await ultimasVerificaciones();
  const pagos = await proximosPagos();
  const cambios: { proveedor_id: string; razon_social: string; antes: string; ahora: string }[] = [];

  for (const p of await db.proveedores.listar()) {
    const previa = verificaciones.get(p.id);
    if (!previa) continue;
    const simulada = simulaciones().get(p.id);
    const actuales = [revisar69B(p.rfc), revisar69(p.rfc), revisarOfac(p.razon_social), ...(simulada ? [simulada] : [])];
    if (firma(actuales) === firma(previa.hallazgos)) continue;

    // Conserva lo que ya se sabía de fuentes externas (web, noticias, dominio) y solo actualiza las listas.
    const externas = previa.hallazgos.filter((h) => !FUENTES_LISTAS.includes(h.fuente) && !(h.fuente === "web" && !p.sitio_web));
    const r = await verificar(p, actor, false, [...externas, ...(simulada ? [simulada] : [])]);

    const describir = (hs: Hallazgo[]) => hs.filter((h) => FUENTES_LISTAS.includes(h.fuente)).map((h) => explicarHallazgo(h)).filter((e) => e.nivel === "alerta" || e.nivel === "peligro").map((e) => e.titulo).join("; ") || "sin alertas";
    const antes = describir(previa.hallazgos), ahora = describir(r.verificacion.hallazgos);
    const pago = pagos.get(p.id);
    const extra = pago && r.verificacion.decision !== "liberar" ? ` Tienes ${pesos(pago.monto)} por pagarle ${enDias(pago.dias)}: el pago queda retenido.` : "";
    const etiqueta = simulada ? "🧪 [Simulación de demo] " : "⚠️ ";
    await db.alertas.crear({ tipo: "cambio_lista", proveedor_id: p.id, mensaje: `${etiqueta}${p.razon_social} cambió en las listas oficiales. Ahora: ${ahora}.${extra}`, creado_en: new Date().toISOString(), leida: false });
    cambios.push({ proveedor_id: p.id, razon_social: p.razon_social, antes, ahora });
  }
  return { revisados: verificaciones.size, cambios };
}

export async function simularPublicacion() {
  const db = almacen();
  const pagos = await proximosPagos();
  const candidatos = (await db.proveedores.listar())
    .filter((p) => p.estado === "aprobado" && !simulaciones().has(p.id))
    .sort((a, b) => (pagos.get(a.id)?.dias ?? 999) - (pagos.get(b.id)?.dias ?? 999));
  const p = candidatos[0];
  if (!p) return null;
  const hoy = new Date().toISOString().slice(0, 10);
  simulaciones().set(p.id, {
    fuente: "sat_69b",
    resultado: "presunto",
    detalle: `[SIMULACIÓN DE DEMO] Como si el SAT hubiera publicado hoy a ${p.razon_social} como presunto en el 69-B. No es un dato oficial.`,
    fecha_fuente: hoy,
    datos: { "Origen": "simulación de demo", "Estatus": "presunto", "Publicado": hoy },
  });
  await registrar("Simulación (demo)", "publicacion_simulada", "proveedor", p.id, null);
  return p;
}

export async function generarResumen(ahora = new Date()) {
  const db = almacen();
  const [casos, proveedores, alertas, documentos, pagos] = await Promise.all([db.casos.listar(), db.proveedores.listar(), db.alertas.listar(), db.documentos.listar(), proximosPagos(ahora)]);
  const abiertos = casos.filter((c) => c.estado === "pendiente" || c.estado === "pausado");
  const hace24 = ahora.getTime() - 86_400_000;
  const recientes = (iso: string | null) => !!iso && Date.parse(iso) >= hace24;
  const porId = new Map(proveedores.map((p) => [p.id, p]));
  const enRiesgo = [...pagos.entries()].filter(([id, pg]) => pg.dias <= 7 && porId.get(id) && porId.get(id)!.estado !== "aprobado");

  const datos = {
    fecha: ahora.toISOString().slice(0, 10),
    casos_abiertos: abiertos.length,
    urgentes: abiertos.filter((c) => c.decision_sugerida === "bloquear").length,
    cambios_de_cuenta: abiertos.filter((c) => c.tipo === "clabe").length,
    casos_antiguos: abiertos.filter((c) => horasDesde(c.creado_en, ahora.getTime()) >= HORAS_CASO_ANTIGUO).length,
    cambios_en_listas: alertas.filter((a) => a.tipo === "cambio_lista" && recientes(a.creado_en)).length,
    documentos_recibidos: documentos.filter((d) => recientes(d.recibida_en)).length,
    documentos_pendientes: documentos.filter((d) => d.estado === "enviada").length,
    pagos_retenidos_7_dias: enRiesgo.length,
    monto_retenido_7_dias: enRiesgo.reduce((s, [, pg]) => s + pg.monto, 0),
    resueltos_por_politicas_24h: casos.filter((c) => c.decidido_por?.startsWith("Política:") && recientes(c.decidido_en)).length,
  };
  const lineas = [
    `Resumen KYP · ${datos.fecha}`,
    `• ${plural(datos.casos_abiertos, "caso espera", "casos esperan")} decisión (${plural(datos.urgentes, "urgente")}, ${plural(datos.cambios_de_cuenta, "cambio", "cambios")} de cuenta).`,
    datos.casos_antiguos ? `• ⏰ ${plural(datos.casos_antiguos, "caso lleva", "casos llevan")} más de ${HORAS_CASO_ANTIGUO} h sin decisión.` : null,
    datos.cambios_en_listas ? `• ⚠️ ${plural(datos.cambios_en_listas, "proveedor cambió", "proveedores cambiaron")} en las listas oficiales.` : null,
    datos.pagos_retenidos_7_dias ? `• 💸 ${plural(datos.pagos_retenidos_7_dias, "pago", "pagos")} de proveedores con alerta ${datos.pagos_retenidos_7_dias === 1 ? "vence" : "vencen"} esta semana (${pesos(datos.monto_retenido_7_dias)}).` : null,
    `• 📄 ${plural(datos.documentos_recibidos, "documento recibido", "documentos recibidos")}; ${plural(datos.documentos_pendientes, "pendiente")}.`,
    datos.resueltos_por_politicas_24h ? `• 🤖 ${plural(datos.resueltos_por_politicas_24h, "caso resuelto", "casos resueltos")} por políticas automáticas.` : null,
  ].filter(Boolean) as string[];
  return { datos, texto: lineas.join("\n") };
}

export async function tareaDiaria(actor: string) {
  const monitoreo = await ejecutarMonitoreo(actor);
  const recordatorios = await procesarRecordatorios();
  const resumen = await generarResumen();
  const envio = await notificar({ tipo: "resumen_diario", texto: resumen.texto, datos: resumen.datos });
  const resultado = {
    revisados: monitoreo.revisados,
    cambios: monitoreo.cambios.length,
    recordatorios: recordatorios.enviados,
    solicitudes_vencidas: recordatorios.vencidas,
    resumen_enviado: envio.enviada,
    motivo_resumen: envio.motivo ?? null,
  };
  await registrar(actor, "tarea_diaria", "sistema", null, resultado);
  return { ...resultado, detalle_cambios: monitoreo.cambios, resumen };
}

export async function ultimaTareaDiaria() {
  const eventos = (await almacen().bitacora.listar({ accion: "tarea_diaria" })).sort((a, b) => b.creado_en.localeCompare(a.creado_en));
  return eventos[0] ?? null;
}
