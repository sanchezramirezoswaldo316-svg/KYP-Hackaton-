// Lógica de consulta de listas oficiales, independiente de cómo se cargan los datos (testeable).

import type { Estatus69B, Hallazgo } from "../tipos.ts";
import { normalizarNombre, similitud } from "./nombres.ts";

export interface Datos69B {
  actualizacion: string | null;
  sha256: string;
  registros: number;
  rfc: Record<string, [Estatus69B, string, string | null]>;
}

export interface Datos69 {
  listas: { supuesto: string; sha256: string; registros: number }[];
  registros: number;
  rfc: Record<string, [string, string | null][]>;
}

export interface DatosOfac {
  sha256: string;
  registros: number;
  descargado_en: string;
  entidades: [number, string, "persona" | "entidad", string][];
}

const NOMBRES_69B: Record<Estatus69B, string> = {
  presunto: "presunto",
  definitivo: "definitivo",
  desvirtuado: "desvirtuado",
  sentencia_favorable: "sentencia favorable",
};

const NOMBRES_69: Record<string, string> = {
  no_localizado: "no localizado",
  exigible: "con créditos fiscales exigibles",
  sentencia: "con sentencia condenatoria por delito fiscal",
};

export function consultar69B(datos: Datos69B, rfc: string): Hallazgo {
  const r = datos.rfc[rfc];
  if (!r) {
    return {
      fuente: "sat_69b", resultado: "sin_coincidencia", detalle: `No aparece en el listado 69-B (${datos.registros.toLocaleString("es-MX")} RFC revisados)`, fecha_fuente: datos.actualizacion,
      datos: { "RFC buscado": rfc, "Registros revisados": datos.registros.toLocaleString("es-MX"), "Lista al": datos.actualizacion ?? "—", "Coincidencia": "ninguna" },
    };
  }
  const [estatus, nombre, fecha] = r;
  return {
    fuente: "sat_69b",
    resultado: estatus,
    detalle: `${nombre}: listado 69-B, estatus "${NOMBRES_69B[estatus]}"${fecha ? `, publicado en el DOF el ${fecha}` : ""}`,
    fecha_fuente: fecha ?? datos.actualizacion,
    datos: { "RFC buscado": rfc, "Nombre en la lista": nombre, "Estatus": NOMBRES_69B[estatus], "Publicado en el DOF": fecha ?? "—" },
  };
}

export function consultar69(datos: Datos69, rfc: string): Hallazgo {
  const r = datos.rfc[rfc];
  if (!r) {
    return {
      fuente: "sat_69", resultado: "sin_coincidencia", detalle: "No aparece en los listados del Art. 69 (no localizados, exigibles, sentencias)", fecha_fuente: null,
      datos: { "RFC buscado": rfc, "Registros revisados": datos.registros.toLocaleString("es-MX"), "Coincidencia": "ninguna" },
    };
  }
  const supuestos = r.map(([s, f]) => `${NOMBRES_69[s] ?? s}${f ? ` (desde ${f})` : ""}`).join("; ");
  return {
    fuente: "sat_69", resultado: "listado", detalle: `Listado en el Art. 69 del CFF: ${supuestos}`, fecha_fuente: r[0][1],
    datos: { "RFC buscado": rfc, "Supuesto": r.map(([s]) => NOMBRES_69[s] ?? s).join(", "), "Desde": r.map(([, f]) => f ?? "—").join(", ") },
  };
}

export const UMBRAL_HOMONIMO = 0.82;

export interface IndiceOfac {
  datos: DatosOfac;
  normalizados: string[];
  porToken: Map<string, number[]>;
}

export function indexarOfac(datos: DatosOfac): IndiceOfac {
  const normalizados = datos.entidades.map((e) => normalizarNombre(e[1]));
  const porToken = new Map<string, number[]>();
  normalizados.forEach((n, i) => {
    for (const t of new Set(n.split(" "))) {
      if (t.length < 3) continue;
      const lista = porToken.get(t);
      if (lista) lista.push(i);
      else porToken.set(t, [i]);
    }
  });
  return { datos, normalizados, porToken };
}

export function consultarOfac(indice: IndiceOfac, razonSocial: string): Hallazgo {
  const fecha = indice.datos.descargado_en.slice(0, 10);
  const q = normalizarNombre(razonSocial);
  const candidatos = new Set<number>();
  for (const t of q.split(" ")) for (const i of indice.porToken.get(t) ?? []) candidatos.add(i);

  let mejor = -1, mejorSim = 0;
  for (const i of candidatos) {
    const s = similitud(q, indice.normalizados[i]);
    if (s > mejorSim) { mejorSim = s; mejor = i; }
  }

  const base = { "Nombre buscado": q || razonSocial, "Registros revisados": indice.datos.registros.toLocaleString("es-MX"), "Candidatos comparados": candidatos.size.toLocaleString("es-MX") };
  if (mejor >= 0 && mejorSim === 1) {
    const [id, nombre, , programa] = indice.datos.entidades[mejor];
    return { fuente: "ofac", resultado: "coincidencia_exacta", detalle: `Coincide con "${nombre}" (SDN #${id}, programa ${programa})`, fecha_fuente: fecha, datos: { ...base, "Coincide con": nombre, "Similitud": "100%", "Programa": programa } };
  }
  if (mejor >= 0 && mejorSim >= UMBRAL_HOMONIMO) {
    const [id, nombre, , programa] = indice.datos.entidades[mejor];
    return { fuente: "ofac", resultado: "coincidencia_parecida", detalle: `Nombre parecido (${Math.round(mejorSim * 100)}%) a "${nombre}" (SDN #${id}, programa ${programa}). Posible homónimo: revisar`, fecha_fuente: fecha, datos: { ...base, "Se parece a": nombre, "Similitud": `${Math.round(mejorSim * 100)}%`, "Programa": programa } };
  }
  return {
    fuente: "ofac", resultado: "sin_coincidencia", detalle: `Sin coincidencias en la lista SDN (${indice.datos.registros.toLocaleString("es-MX")} registros)`, fecha_fuente: fecha,
    datos: { ...base, "Más parecido": mejor >= 0 ? `${Math.round(mejorSim * 100)}% (no alcanza ${Math.round(UMBRAL_HOMONIMO * 100)}%)` : "ninguno" },
  };
}
