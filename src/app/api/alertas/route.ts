import { NextResponse } from "next/server";
import { almacen } from "@/lib/almacen/index.ts";
import { listo } from "@/lib/demo.ts";

// Marca todas las alertas como leídas.
export async function POST() {
  await listo();
  const db = almacen();
  for (const a of await db.alertas.listar({ leida: false })) await db.alertas.actualizar(a.id, { leida: true });
  return NextResponse.json({ ok: true });
}
