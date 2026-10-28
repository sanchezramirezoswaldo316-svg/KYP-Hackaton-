// Almacén en memoria para el modo demo (sin Supabase). Los datos se pierden al reiniciar el servidor.

import type { Almacen, Coleccion } from "./tipos.ts";

function coincide<T>(item: T, filtro?: Partial<T>): boolean {
  if (!filtro) return true;
  return Object.entries(filtro).every(([k, v]) => (item as Record<string, unknown>)[k] === v);
}

function coleccion<T extends { id: string }>(): Coleccion<T> & { _datos: T[] } {
  const datos: T[] = [];
  return {
    _datos: datos,
    async listar(filtro) {
      return datos.filter((d) => coincide(d, filtro)).map((d) => ({ ...d }));
    },
    async obtener(id) {
      const d = datos.find((x) => x.id === id);
      return d ? { ...d } : null;
    },
    async crear(nuevo) {
      const d = { ...nuevo, id: crypto.randomUUID() } as T;
      datos.push(d);
      return { ...d };
    },
    async actualizar(id, cambios) {
      const d = datos.find((x) => x.id === id);
      if (!d) throw new Error(`No existe ${id}`);
      Object.assign(d, cambios);
      return { ...d };
    },
  };
}

export function crearAlmacenMemoria(): Almacen {
  return {
    modo: "memoria",
    proveedores: coleccion(),
    verificaciones: coleccion(),
    casos: coleccion(),
    facturas: coleccion(),
    solicitudes: coleccion(),
    llamadas: coleccion(),
    bitacora: coleccion(),
    politicas: coleccion(),
    documentos: coleccion(),
    alertas: coleccion(),
  };
}
