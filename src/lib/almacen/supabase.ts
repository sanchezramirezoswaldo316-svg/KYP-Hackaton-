// Almacén sobre Supabase (PostgreSQL). Solo se usa desde el servidor con la service role key.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Almacen, Coleccion } from "./tipos.ts";

const PAGINA = 1000;

function coleccion<T extends { id: string }>(db: SupabaseClient, tabla: string, orden: string): Coleccion<T> {
  return {
    async listar(filtro) {
      const todos: T[] = [];
      for (let desde = 0; ; desde += PAGINA) {
        let q = db.from(tabla).select("*").order(orden, { ascending: true }).range(desde, desde + PAGINA - 1);
        if (filtro) q = q.match(filtro as Record<string, unknown>);
        const { data, error } = await q;
        if (error) throw new Error(`${tabla}: ${error.message}`);
        todos.push(...(data as T[]));
        if (data.length < PAGINA) return todos;
      }
    },
    async obtener(id) {
      const { data, error } = await db.from(tabla).select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(`${tabla}: ${error.message}`);
      return data as T | null;
    },
    async crear(datos) {
      const { data, error } = await db.from(tabla).insert(datos as never).select().single();
      if (error) throw new Error(`${tabla}: ${error.message}`);
      return data as T;
    },
    async actualizar(id, cambios) {
      const { data, error } = await db.from(tabla).update(cambios as never).eq("id", id).select().single();
      if (error) throw new Error(`${tabla}: ${error.message}`);
      return data as T;
    },
  };
}

export function crearAlmacenSupabase(url: string, key: string): Almacen {
  const db = createClient(url, key, { auth: { persistSession: false } });
  return {
    modo: "supabase",
    proveedores: coleccion(db, "proveedores", "creado_en"),
    verificaciones: coleccion(db, "verificaciones", "fecha"),
    casos: coleccion(db, "casos", "creado_en"),
    facturas: coleccion(db, "facturas", "fecha"),
    solicitudes: coleccion(db, "solicitudes_clabe", "creado_en"),
    llamadas: coleccion(db, "llamadas", "creado_en"),
    bitacora: coleccion(db, "bitacora", "creado_en"),
  };
}
