// Convierte una solicitud de cambio de CLABE y su llamada en lo que muestra el monitor:
// en qué fase va, por qué rama del guion pasó, los momentos clave y qué pasa con el dinero.
// Sin dependencias de servidor ni de React para poder probarlo.

import type { EventoBitacora, Llamada, ResultadoLlamada, SolicitudClabe } from "../tipos.ts";

export type Fase = "por_llamar" | "llamando" | "fallida" | "terminada";
export type EstadoPaso = "hecho" | "actual" | "pendiente" | "ok" | "alerta" | "peligro" | "apagado";
export type NivelMonitor = "ok" | "alerta" | "peligro" | "acento" | "gris";

export type Paso = "marcar" | "contesto" | "reconoce" | "datos" | "confirmado" | "sin_respuesta" | "fraude" | "no_coinciden";

export interface Mensaje { quien: "agente" | "proveedor"; texto: string; inicio: number; largo: number }
export interface Criterio { id: string; texto: string; valor: string; nivel: NivelMonitor }
export interface Marcador { pos: number; titulo: string; nivel: NivelMonitor }
export interface EventoMonitor { fecha: string; titulo: string; fuente: string; nivel: NivelMonitor }

export interface VistaLlamada {
  fase: Fase;
  resultado: ResultadoLlamada | null;
  mensajes: Mensaje[];
  ruta: Record<Paso, EstadoPaso>;
  criterios: Criterio[];
  marcadores: Marcador[];
  dinero: { estado: "congelado" | "protegido" | "liberado" | "en_revision"; titulo: string; texto: string; nivel: NivelMonitor };
  eventos: EventoMonitor[];
}

export function faseLlamada(s: SolicitudClabe, llamada: Llamada | undefined, fallo: boolean): Fase {
  if (llamada) return "terminada";
  if (fallo) return "fallida";
  return s.estado === "en_llamada" ? "llamando" : "por_llamar";
}

// La transcripción llega como líneas "Agente: …" / "Proveedor: …". Sin marcas de tiempo,
// la posición de cada frase se aproxima por la cantidad de texto dicho antes.
export function leerTranscripcion(transcripcion: string): Mensaje[] {
  const lineas = transcripcion.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const m = /^(agente|proveedor)\s*:\s*/i.exec(l);
    return { quien: (m?.[1].toLowerCase() === "proveedor" ? "proveedor" : "agente") as Mensaje["quien"], texto: m ? l.slice(m[0].length) : l };
  });
  const total = lineas.reduce((s, l) => s + Math.max(l.texto.length, 1), 0) || 1;
  let acumulado = 0;
  return lineas.map((l) => {
    const largo = Math.max(l.texto.length, 1) / total;
    const m = { ...l, inicio: acumulado, largo };
    acumulado += largo;
    return m;
  });
}

const TODO_PENDIENTE: Record<Paso, EstadoPaso> = {
  marcar: "pendiente", contesto: "pendiente", reconoce: "pendiente", datos: "pendiente",
  confirmado: "pendiente", sin_respuesta: "pendiente", fraude: "pendiente", no_coinciden: "pendiente",
};

export function rutaLlamada(fase: Fase, resultado: ResultadoLlamada | null): Record<Paso, EstadoPaso> {
  if (fase === "por_llamar") return { ...TODO_PENDIENTE, marcar: "actual" };
  if (fase === "llamando") return { ...TODO_PENDIENTE, marcar: "hecho", contesto: "actual" };
  const apagado: Record<Paso, EstadoPaso> = Object.fromEntries(Object.keys(TODO_PENDIENTE).map((k) => [k, "apagado"])) as Record<Paso, EstadoPaso>;
  if (fase === "fallida") return { ...apagado, marcar: "alerta" };
  switch (resultado) {
    case "sin_respuesta": return { ...apagado, marcar: "hecho", contesto: "hecho", sin_respuesta: "alerta" };
    case "no_reconoce": return { ...apagado, marcar: "hecho", contesto: "hecho", reconoce: "hecho", fraude: "peligro" };
    case "datos_no_coinciden": return { ...apagado, marcar: "hecho", contesto: "hecho", reconoce: "hecho", datos: "hecho", no_coinciden: "alerta" };
    default: return { ...apagado, marcar: "hecho", contesto: "hecho", reconoce: "hecho", datos: "hecho", confirmado: "ok" };
  }
}

export function criteriosLlamada(fase: Fase, resultado: ResultadoLlamada | null): Criterio[] {
  const c = (id: string, texto: string, valor: string, nivel: NivelMonitor): Criterio => ({ id, texto, valor, nivel });
  const enEspera = fase === "por_llamar" || fase === "llamando";
  if (enEspera || fase === "fallida") {
    const v = fase === "llamando" ? "EVALUANDO" : fase === "fallida" ? "SIN LLAMADA" : "PENDIENTE";
    const n: NivelMonitor = fase === "llamando" ? "acento" : "gris";
    return [c("contesto", "Contestó el número registrado", v, n), c("reconoce_solicitud", "¿Él pidió el cambio de cuenta?", "PENDIENTE", "gris"), c("datos_coinciden", "Los datos que confirma coinciden", "PENDIENTE", "gris")];
  }
  const contesto = resultado !== "sin_respuesta";
  const reconoce = resultado === "confirmado" || resultado === "datos_no_coinciden";
  return [
    c("contesto", "Contestó el número registrado", contesto ? "SÍ" : "NO", contesto ? "ok" : "alerta"),
    c("reconoce_solicitud", "¿Él pidió el cambio de cuenta?", !contesto ? "NO APLICA" : reconoce ? "SÍ" : "NO", !contesto ? "gris" : reconoce ? "ok" : "peligro"),
    c("datos_coinciden", "Los datos que confirma coinciden", !reconoce ? "NO APLICA" : resultado === "confirmado" ? "SÍ" : "NO", !reconoce ? "gris" : resultado === "confirmado" ? "ok" : "alerta"),
  ];
}

const DECISIVO: Record<ResultadoLlamada, { titulo: string; nivel: NivelMonitor }> = {
  confirmado: { titulo: "CONFIRMA EL CAMBIO", nivel: "ok" },
  no_reconoce: { titulo: "NO RECONOCE EL CAMBIO", nivel: "peligro" },
  datos_no_coinciden: { titulo: "DATOS NO COINCIDEN", nivel: "alerta" },
  sin_respuesta: { titulo: "SIN RESPUESTA", nivel: "alerta" },
};

export function marcadoresLlamada(mensajes: Mensaje[], resultado: ResultadoLlamada | null): Marcador[] {
  const delProveedor = mensajes.filter((m) => m.quien === "proveedor");
  const centro = (m: Mensaje) => m.inicio + m.largo / 2;
  const marcas: Marcador[] = [];
  const ultimo = delProveedor.at(-1);
  if (delProveedor.length > 1) marcas.push({ pos: centro(delProveedor[0]), titulo: "CONTESTÓ", nivel: "ok" });
  if (ultimo && resultado) marcas.push({ pos: centro(ultimo), titulo: DECISIVO[resultado].titulo, nivel: DECISIVO[resultado].nivel });
  return marcas;
}

export function dineroLlamada(fase: Fase, resultado: ResultadoLlamada | null): VistaLlamada["dinero"] {
  if (fase !== "terminada") {
    return {
      estado: "congelado", titulo: "PAGO CONGELADO", nivel: "alerta",
      texto: fase === "fallida" ? "La llamada no se pudo hacer. El pago sigue congelado y el caso está en la bandeja." : "Nadie puede pagar a la cuenta nueva hasta que termine la verificación.",
    };
  }
  if (resultado === "no_reconoce") return { estado: "protegido", titulo: "PROTEGIDO", nivel: "ok", texto: "El proveedor real no pidió el cambio. El dinero se queda en su cuenta registrada." };
  if (resultado === "confirmado") return { estado: "liberado", titulo: "CUENTA NUEVA VERIFICADA", nivel: "acento", texto: "El proveedor confirmó el cambio en la llamada; la cuenta nueva quedó registrada." };
  return { estado: "en_revision", titulo: "EN REVISIÓN", nivel: "alerta", texto: "El pago sigue congelado. La gestora decide en la bandeja con la evidencia de la llamada." };
}

const EVENTO: Record<string, { titulo: string; fuente: string; nivel: NivelMonitor }> = {
  llamada_iniciada: { titulo: "Llamada saliente iniciada", fuente: "ElevenLabs", nivel: "acento" },
  llamada_fallida: { titulo: "La llamada no se pudo hacer", fuente: "ElevenLabs", nivel: "alerta" },
  llamada_confirmado: { titulo: "Confirma el cambio", fuente: "Agente de voz", nivel: "ok" },
  llamada_no_reconoce: { titulo: "No reconoce el cambio", fuente: "Agente de voz", nivel: "peligro" },
  llamada_datos_no_coinciden: { titulo: "Datos no coinciden", fuente: "Agente de voz", nivel: "alerta" },
  llamada_sin_respuesta: { titulo: "No contestó", fuente: "Agente de voz", nivel: "alerta" },
  caso_aprobado: { titulo: "La gestora aprobó", fuente: "Gestora", nivel: "ok" },
  caso_pausado: { titulo: "La gestora pausó", fuente: "Gestora", nivel: "alerta" },
  caso_bloqueado: { titulo: "La gestora bloqueó la solicitud", fuente: "Gestora", nivel: "peligro" },
};

export function eventosLlamada(s: SolicitudClabe, bitacora: EventoBitacora[]): EventoMonitor[] {
  const inicio: EventoMonitor[] = [
    { fecha: s.creado_en, titulo: "Solicitud recibida", fuente: "KYP", nivel: "acento" },
    { fecha: s.creado_en, titulo: "Pago congelado", fuente: "KYP", nivel: "alerta" },
  ];
  const resto = bitacora
    .filter((b) => EVENTO[b.accion])
    .sort((a, b) => a.creado_en.localeCompare(b.creado_en))
    .map((b) => {
      const e = EVENTO[b.accion];
      const simulada = b.detalle?.simulada === true;
      return { fecha: b.creado_en, titulo: e.titulo, fuente: simulada ? "Simulación (demo)" : e.fuente, nivel: e.nivel };
    });
  return [...inicio, ...resto];
}

export function vistaLlamada(s: SolicitudClabe, llamada: Llamada | undefined, bitacora: EventoBitacora[]): VistaLlamada {
  const fallo = bitacora.some((b) => b.accion === "llamada_fallida");
  const fase = faseLlamada(s, llamada, fallo);
  const resultado = llamada?.resultado ?? null;
  const mensajes = leerTranscripcion(llamada?.transcripcion ?? "");
  return {
    fase, resultado, mensajes,
    ruta: rutaLlamada(fase, resultado),
    criterios: criteriosLlamada(fase, resultado),
    marcadores: marcadoresLlamada(mensajes, resultado),
    dinero: dineroLlamada(fase, resultado),
    eventos: eventosLlamada(s, bitacora),
  };
}
