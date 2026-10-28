// Motor de puntaje (Ulises). Función pura: mismos hallazgos → mismo resultado, siempre.
// La IA NO decide aquí; solo redacta el resumen después.

import type { Decision, Hallazgo, Motivo, ResultadoPuntaje } from "../tipos.ts";

interface Regla {
  id: string;
  fuente: Hallazgo["fuente"];
  resultado: string;
  puntos: number;
  bloqueo_directo?: boolean;
  descripcion: string;
}

export const REGLAS: Regla[] = [
  { id: "69b_definitivo", fuente: "sat_69b", resultado: "definitivo", puntos: 100, bloqueo_directo: true, descripcion: "Listado 69-B como definitivo (EFOS)" },
  { id: "69b_presunto", fuente: "sat_69b", resultado: "presunto", puntos: 60, descripcion: "Listado 69-B como presunto" },
  { id: "69b_desvirtuado", fuente: "sat_69b", resultado: "desvirtuado", puntos: 0, descripcion: "Listado 69-B como desvirtuado (informativo)" },
  { id: "69b_sentencia", fuente: "sat_69b", resultado: "sentencia_favorable", puntos: 0, descripcion: "Listado 69-B con sentencia favorable (informativo)" },
  { id: "69_listado", fuente: "sat_69", resultado: "listado", puntos: 30, descripcion: "Listado 69 del SAT (no localizado, créditos exigibles o sentencia)" },
  { id: "ofac_exacta", fuente: "ofac", resultado: "coincidencia_exacta", puntos: 100, bloqueo_directo: true, descripcion: "Coincidencia exacta en lista OFAC" },
  { id: "ofac_parecida", fuente: "ofac", resultado: "coincidencia_parecida", puntos: 25, descripcion: "Coincidencia parecida en OFAC: revisar homónimo" },
  { id: "web_giro", fuente: "web", resultado: "giro_no_coincide", puntos: 20, descripcion: "El giro de su página web no coincide con lo facturado" },
  { id: "web_sin_sitio", fuente: "web", resultado: "sin_sitio", puntos: 0, descripcion: "Sin página web (informativo; muchas pymes no tienen)" },
  { id: "noticias", fuente: "noticias", resultado: "noticias_negativas", puntos: 15, descripcion: "Noticias negativas relevantes" },
  { id: "dominio_reciente", fuente: "dominio", resultado: "dominio_reciente", puntos: 10, descripcion: "Dominio con menos de 6 meses" },
];

export const UMBRAL_LIBERAR = 20;
export const UMBRAL_REVISAR = 60;

export function calcularPuntaje(hallazgos: Hallazgo[]): ResultadoPuntaje {
  const motivos: Motivo[] = [];
  let bloqueo_directo = false;

  for (const h of hallazgos) {
    const regla = REGLAS.find((r) => r.fuente === h.fuente && r.resultado === h.resultado);
    if (!regla) continue;
    motivos.push({ regla: regla.id, puntos: regla.puntos, descripcion: regla.descripcion });
    if (regla.bloqueo_directo) bloqueo_directo = true;
  }

  const puntaje = Math.min(100, motivos.reduce((s, m) => s + m.puntos, 0));
  let decision: Decision;
  if (bloqueo_directo || puntaje > UMBRAL_REVISAR) decision = "bloquear";
  else if (puntaje > UMBRAL_LIBERAR) decision = "revisar";
  else decision = "liberar";

  return { puntaje, decision, bloqueo_directo, motivos };
}
