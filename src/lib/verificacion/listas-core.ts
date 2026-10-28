// Lógica de consulta de listas oficiales, independiente de cómo se cargan los datos (testeable).

import type { Estatus69B, Hallazgo } from "../tipos.ts";
import { normalizarNombre, bigramas } from "./nombres.ts";

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
  const clave = rfc.trim().toUpperCase();
  const r = datos.rfc[clave];
  if (!r) {
    return {
      fuente: "sat_69b", resultado: "sin_coincidencia", detalle: `No aparece en el listado 69-B (${datos.registros.toLocaleString("es-MX")} RFC revisados)`, fecha_fuente: datos.actualizacion,
      datos: { "RFC buscado": clave, "Registros revisados": datos.registros.toLocaleString("es-MX"), "Lista al": datos.actualizacion ?? "—", "Coincidencia": "ninguna" },
    };
  }
  const [estatus, nombre, fecha] = r;
  return {
    fuente: "sat_69b",
    resultado: estatus,
    detalle: `${nombre}: listado 69-B, estatus "${NOMBRES_69B[estatus]}"${fecha ? `, publicado en el DOF el ${fecha}` : ""}`,
    fecha_fuente: fecha ?? datos.actualizacion,
    datos: { "RFC buscado": clave, "Nombre en la lista": nombre, "Estatus": NOMBRES_69B[estatus], "Publicado en el DOF": fecha ?? "—" },
  };
}

export function consultar69(datos: Datos69, rfc: string): Hallazgo {
  const clave = rfc.trim().toUpperCase();
  const r = datos.rfc[clave];
  if (!r) {
    return {
      fuente: "sat_69", resultado: "sin_coincidencia", detalle: "No aparece en los listados del Art. 69 (no localizados, exigibles, sentencias)", fecha_fuente: null,
      datos: { "RFC buscado": clave, "Registros revisados": datos.registros.toLocaleString("es-MX"), "Coincidencia": "ninguna" },
    };
  }
  const supuestos = r.map(([s, f]) => `${NOMBRES_69[s] ?? s}${f ? ` (desde ${f})` : ""}`).join("; ");
  return {
    fuente: "sat_69", resultado: "listado", detalle: `Listado en el Art. 69 del CFF: ${supuestos}`, fecha_fuente: r[0][1],
    datos: { "RFC buscado": clave, "Supuesto": r.map(([s]) => NOMBRES_69[s] ?? s).join(", "), "Desde": r.map(([, f]) => f ?? "—").join(", ") },
  };
}

export const UMBRAL_HOMONIMO = 0.82;

export interface IndiceOfac {
  datos: DatosOfac;
  normalizados: string[];
  porToken: Map<string, number[]>;
  porBigrama: Map<string, [number, number][]>;
  totales: number[];
}

export function indexarOfac(datos: DatosOfac): IndiceOfac {
  const normalizados = datos.entidades.map((e) => normalizarNombre(e[1]));
  const porToken = new Map<string, number[]>();
  normalizados.forEach((n, i) => {
    for (const t of new Set(n.split(" "))) {
      if (!t) continue;
      const lista = porToken.get(t);
      if (lista) lista.push(i);
      else porToken.set(t, [i]);
    }
  });
  const porBigrama = new Map<string, [number, number][]>();
  const totales = normalizados.map((n, i) => {
    let total = 0;
    for (const [b, cantidad] of bigramas(n)) {
      total += cantidad;
      const entradas = porBigrama.get(b) ?? [];
      entradas.push([i, cantidad]);
      porBigrama.set(b, entradas);
    }
    return total;
  });
  return { datos, normalizados, porToken, porBigrama, totales };
}

export function consultarOfac(indice: IndiceOfac, razonSocial: string): Hallazgo {
  const fecha = indice.datos.descargado_en.slice(0, 10);
  const q = normalizarNombre(razonSocial);
  // Acumular intersección multiconjunto permite calcular Dice sin recorrer
  // toda la lista ni reconstruir bigramas para cada candidato.
  const comunes = new Map<number, number>();
  const consultaBigramas = bigramas(q);
  const total = [...consultaBigramas.values()].reduce((s, n) => s + n, 0);
  if (q) for (const [b, cantidad] of consultaBigramas) {
    for (const [i, frecuencia] of indice.porBigrama.get(b) ?? []) {
      // Cota superior de Dice por longitudes: descartar solo lo imposible.
      const longitud = indice.totales[i];
      if (2 * Math.min(total, longitud) / (total + longitud) < UMBRAL_HOMONIMO) continue;
      comunes.set(i, (comunes.get(i) ?? 0) + Math.min(cantidad, frecuencia));
    }
  }
  // También contempla nombres canónicos de una letra sin bigramas.
  if (q) for (const i of indice.porToken.get(q) ?? []) comunes.set(i, comunes.get(i) ?? 0);

  const base = { "Nombre buscado": q || razonSocial, "Registros revisados": indice.datos.registros.toLocaleString("es-MX"), "Candidatos comparados": comunes.size.toLocaleString("es-MX") };
  let mejor = -1, mejorSim = 0, mejorExacta = false;
  const desempatar = (i: number, j: number) => {
    const a = indice.datos.entidades[i], b = indice.datos.entidades[j];
    return a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0) || (a[3] < b[3] ? -1 : a[3] > b[3] ? 1 : 0);
  };
  for (const [i, comun] of comunes) {
    const exacta = q !== "" && q === indice.normalizados[i];
    const s = exacta ? 1 : total + indice.totales[i] ? 2 * comun / (total + indice.totales[i]) : 0;
    if (!exacta && s < UMBRAL_HOMONIMO) continue;
    if (mejor < 0 || (exacta && !mejorExacta) || (exacta === mejorExacta && (s > mejorSim || (s === mejorSim && desempatar(i, mejor) < 0)))) {
      mejor = i; mejorSim = s; mejorExacta = exacta;
    }
  }
  if (mejor >= 0) {
    const [id, nombre, , programa] = indice.datos.entidades[mejor];
    return {
      fuente: "ofac", resultado: mejorExacta ? "coincidencia_exacta" : "coincidencia_parecida",
      detalle: `${mejorExacta ? "Nombre canónico igual" : `Nombre parecido (similitud Dice ${mejorSim.toFixed(2)}; no es probabilidad de sanción)`} a "${nombre}" (SDN #${id}, programa ${programa}). ${mejorExacta ? "Identidad no confirmada; pendiente de revisión humana" : "Posible homónimo: revisar"}`,
      fecha_fuente: fecha,
      evidencia_url: `https://sanctionssearch.ofac.treas.gov/Details.aspx?id=${id}`,
      datos: { ...base, [mejorExacta ? "Coincide con" : "Se parece a"]: nombre, "Similitud": `${Math.round(mejorSim * 100)}%`, "Programa": programa },
    };
  }
  return {
    fuente: "ofac", resultado: "sin_coincidencia", detalle: `Sin coincidencias en la lista SDN (${indice.datos.registros.toLocaleString("es-MX")} registros)`, fecha_fuente: fecha,
    datos: { ...base, "Más parecido": `ninguno alcanza ${Math.round(UMBRAL_HOMONIMO * 100)}% de similitud` },
  };
}
