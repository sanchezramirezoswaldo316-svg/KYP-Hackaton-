// Datos de ejemplo. En modo memoria se cargan solos la primera vez; en Supabase, con el botón del panel.

import { readFileSync } from "node:fs";
import path from "node:path";
import { almacen } from "./almacen/index.ts";
import { altaProveedor, type EntradaAlta } from "./servicios.ts";

const global = globalThis as unknown as { __kypSemilla?: Promise<void> };

export async function sembrarDemo(): Promise<number> {
  const filas = JSON.parse(readFileSync(path.join(process.cwd(), "src", "data", "demo-semilla.json"), "utf8")) as EntradaAlta[];
  for (const f of filas) await altaProveedor(f, "Carga de ejemplo", false);
  return filas.length;
}

// Llamar al inicio de cada página o ruta que lea datos.
export async function listo(): Promise<void> {
  const db = almacen();
  if (db.modo !== "memoria") return;
  global.__kypSemilla ??= (async () => {
    if ((await db.proveedores.listar()).length === 0) await sembrarDemo();
  })();
  await global.__kypSemilla;
}

export function olvidarSemilla(): void {
  global.__kypSemilla = undefined;
}
