import { NextResponse } from "next/server";
import { listo } from "@/lib/demo.ts";
import { simularPublicacion } from "@/lib/monitoreo.ts";

// Demo: hace como si el SAT hubiera publicado hoy a un proveedor aprobado. Queda marcado como simulación.
export async function POST() {
  await listo();
  const p = await simularPublicacion();
  if (!p) return NextResponse.json({ error: "No hay proveedores aprobados para simular" }, { status: 409 });
  return NextResponse.json({ proveedor_id: p.id, razon_social: p.razon_social });
}
