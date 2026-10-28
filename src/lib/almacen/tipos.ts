import type { Caso, EventoBitacora, Factura, Llamada, Proveedor, SolicitudClabe, Verificacion } from "../tipos.ts";

export interface Coleccion<T extends { id: string }> {
  listar(filtro?: Partial<T>): Promise<T[]>;
  obtener(id: string): Promise<T | null>;
  crear(datos: Omit<T, "id">): Promise<T>;
  actualizar(id: string, cambios: Partial<Omit<T, "id">>): Promise<T>;
}

export interface Almacen {
  modo: "supabase" | "memoria";
  proveedores: Coleccion<Proveedor>;
  verificaciones: Coleccion<Verificacion>;
  casos: Coleccion<Caso>;
  facturas: Coleccion<Factura>;
  solicitudes: Coleccion<SolicitudClabe>;
  llamadas: Coleccion<Llamada>;
  bitacora: Coleccion<EventoBitacora>;
}
