// Elige el almacén: Supabase si hay credenciales; si no, memoria con datos de ejemplo (modo demo).

import { crearAlmacenMemoria } from "./memoria.ts";
import { crearAlmacenSupabase } from "./supabase.ts";
import type { Almacen } from "./tipos.ts";

const global = globalThis as unknown as { __kypAlmacen?: Almacen };

export function almacen(): Almacen {
  if (!global.__kypAlmacen) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    global.__kypAlmacen = url && key ? crearAlmacenSupabase(url, key) : crearAlmacenMemoria();
  }
  return global.__kypAlmacen;
}

export function reiniciarAlmacenMemoria(): void {
  if (global.__kypAlmacen?.modo === "memoria") global.__kypAlmacen = crearAlmacenMemoria();
}

export type { Almacen } from "./tipos.ts";
