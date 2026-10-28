// Carga perezosa (y en caché) de las listas oficiales generadas con `npm run listas`.
// Se leen del disco para no inflar el bundle ni el chequeo de tipos.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Hallazgo } from "../tipos.ts";
import {
  consultar69, consultar69B, consultarOfac, indexarOfac,
  type Datos69, type Datos69B, type DatosOfac, type IndiceOfac,
} from "./listas-core.ts";

const DIR = path.join(process.cwd(), "src", "data");

let sat69b: Datos69B | null = null;
let sat69: Datos69 | null = null;
let ofac: IndiceOfac | null = null;

// Captura todo el conjunto una vez; no mezclar cachés de distintas generaciones.
let conjunto: Record<string, unknown> | null = null;
function leer<T>(archivo: string): T {
  if (!conjunto) {
    const bloqueo = path.join(process.cwd(), "datos", "ulises-publicacion");
    const marca = path.join(process.cwd(), "datos", "ulises-generacion.json");
    const version = () => existsSync(marca) ? readFileSync(marca, "utf8") : "historico";
    if (existsSync(bloqueo)) throw new Error("Listas en publicación/recuperación; conservar última generación y reintentar");
    const antes = version();
    const datos = Object.fromEntries(["sat-69b.json", "sat-69.json", "ofac-sdn.json"].map(
      (nombre) => [nombre, JSON.parse(readFileSync(path.join(DIR, nombre), "utf8"))],
    ));
    if (existsSync(bloqueo) || version() !== antes) throw new Error("Generación de listas cambió durante lectura; reintentar");
    conjunto = datos;
  }
  return conjunto[archivo] as T;
}

export function revisar69B(rfc: string): Hallazgo {
  sat69b ??= leer<Datos69B>("sat-69b.json");
  return consultar69B(sat69b, rfc);
}

export function revisar69(rfc: string): Hallazgo {
  sat69 ??= leer<Datos69>("sat-69.json");
  return consultar69(sat69, rfc);
}

export function revisarOfac(razonSocial: string): Hallazgo {
  ofac ??= indexarOfac(leer<DatosOfac>("ofac-sdn.json"));
  return consultarOfac(ofac, razonSocial);
}

export interface InfoLista {
  fuente: string;
  registros: number;
  actualizacion: string | null;
  descargado_en: string;
  sha256: string;
}

// Metadatos de las listas (para el panel y el expediente), sin cargar los registros completos en memoria dos veces.
export function infoListas(): InfoLista[] {
  sat69b ??= leer<Datos69B>("sat-69b.json");
  sat69 ??= leer<Datos69>("sat-69.json");
  ofac ??= indexarOfac(leer<DatosOfac>("ofac-sdn.json"));
  const b = sat69b as Datos69B & { descargado_en: string };
  const a = sat69 as Datos69 & { descargado_en: string };
  return [
    { fuente: "SAT · Art. 69-B", registros: b.registros, actualizacion: b.actualizacion, descargado_en: b.descargado_en, sha256: b.sha256 },
    ...a.listas.map((l) => ({ fuente: `SAT · Art. 69 (${l.supuesto.replace("_", " ")})`, registros: l.registros, actualizacion: null, descargado_en: a.descargado_en, sha256: l.sha256 })),
    { fuente: "OFAC · SDN", registros: ofac.datos.registros, actualizacion: null, descargado_en: ofac.datos.descargado_en, sha256: ofac.datos.sha256 },
  ];
}
