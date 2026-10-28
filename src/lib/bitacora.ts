import { almacen } from "./almacen/index.ts";

export async function registrar(actor: string, accion: string, entidad: string, entidad_id: string | null, detalle: Record<string, unknown> | null = null) {
  await almacen().bitacora.crear({ actor, accion, entidad, entidad_id, detalle, creado_en: new Date().toISOString() });
}
