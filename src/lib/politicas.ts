// Políticas automáticas: reglas que la gestora activa para que el sistema actúe sin esperarla.
// El catálogo es fijo (decisiones seguras y explicables); en la base solo se guarda si están activas.

import type { AccionPolitica, Hallazgo } from "./tipos.ts";

export interface DefinicionPolitica {
  clave: string;
  nombre: string;
  descripcion: string;
  accion: AccionPolitica;
  aplica: (hallazgos: Hallazgo[]) => boolean;
}

const tiene = (hs: Hallazgo[], fuente: Hallazgo["fuente"], resultado: string) => hs.some((h) => h.fuente === fuente && h.resultado === resultado);

export const CATALOGO: DefinicionPolitica[] = [
  {
    clave: "bloquear_efos",
    nombre: "Bloquear empresas fantasma confirmadas",
    descripcion: "Si el SAT ya confirmó que vende facturas falsas (69-B definitivo), se bloquea sin esperar a la gestora.",
    accion: "bloquear",
    aplica: (hs) => tiene(hs, "sat_69b", "definitivo"),
  },
  {
    clave: "bloquear_ofac_exacta",
    nombre: "Bloquear coincidencias exactas con sanciones de EE. UU.",
    descripcion: "Si su nombre es idéntico al de una empresa sancionada por OFAC, se bloquea. Los nombres solo parecidos siguen yendo a la bandeja.",
    accion: "bloquear",
    aplica: (hs) => tiene(hs, "ofac", "coincidencia_exacta"),
  },
  {
    clave: "documentos_presunto",
    nombre: "Pedir la opinión 32-D a los que el SAT investiga",
    descripcion: "Si está como presunto en el 69-B, se le pide su opinión de cumplimiento por el portal. El caso sigue en la bandeja y se decide cuando llegue.",
    accion: "solicitar_documentos",
    aplica: (hs) => tiene(hs, "sat_69b", "presunto"),
  },
  {
    clave: "documentos_art69",
    nombre: "Pedir la opinión 32-D a quienes tienen problemas con el SAT",
    descripcion: "Si aparece como no localizado, con deudas exigibles o con sentencia (Art. 69), se le pide su opinión de cumplimiento.",
    accion: "solicitar_documentos",
    aplica: (hs) => tiene(hs, "sat_69", "listado"),
  },
];

export function politicasQueAplican(hallazgos: Hallazgo[], activas: Set<string>): DefinicionPolitica[] {
  // Primero las que bloquean: si una bloquea, no tiene caso pedir documentos.
  const aplican = CATALOGO.filter((p) => activas.has(p.clave) && p.aplica(hallazgos));
  const bloqueo = aplican.find((p) => p.accion === "bloquear");
  return bloqueo ? [bloqueo] : aplican.slice(0, 1);
}
