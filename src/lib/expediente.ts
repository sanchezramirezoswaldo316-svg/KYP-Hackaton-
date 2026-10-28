// Reúne toda la evidencia de un proveedor (para la vista de expediente y el PDF).

import { createHash } from "node:crypto";
import { almacen } from "./almacen/index.ts";

export async function cargarExpediente(proveedorId: string) {
  const db = almacen();
  const proveedor = await db.proveedores.obtener(proveedorId);
  if (!proveedor) return null;
  const [verificaciones, casos, solicitudes, facturas, bitacora] = await Promise.all([
    db.verificaciones.listar({ proveedor_id: proveedorId }),
    db.casos.listar({ proveedor_id: proveedorId }),
    db.solicitudes.listar({ proveedor_id: proveedorId }),
    db.facturas.listar({ proveedor_id: proveedorId }),
    db.bitacora.listar(),
  ]);
  const llamadas = (await Promise.all(solicitudes.map((s) => db.llamadas.listar({ solicitud_id: s.id })))).flat();
  const ids = new Set([proveedorId, ...casos.map((c) => c.id), ...solicitudes.map((s) => s.id)]);
  const desc = <T,>(f: (x: T) => string) => (a: T, b: T) => f(b).localeCompare(f(a));
  return {
    proveedor,
    verificaciones: verificaciones.sort(desc((v) => v.fecha)),
    casos: casos.sort(desc((c) => c.creado_en)),
    solicitudes: solicitudes.sort(desc((s) => s.creado_en)),
    llamadas: llamadas.sort(desc((l) => l.creado_en)),
    facturas: facturas.sort(desc((f) => f.fecha)),
    bitacora: bitacora.filter((e) => e.entidad_id && ids.has(e.entidad_id)).sort(desc((e) => e.creado_en)),
  };
}

export type Expediente = NonNullable<Awaited<ReturnType<typeof cargarExpediente>>>;

// Huella SHA-256 de la evidencia: cambia si cambia cualquier dato del expediente.
export function huellaEvidencia(e: Expediente): string {
  return createHash("sha256").update(JSON.stringify(e)).digest("hex");
}
