import { NextResponse } from "next/server";
import { almacen } from "@/lib/almacen/index.ts";
import { listo } from "@/lib/demo.ts";

// Bandeja de excepciones: casos pendientes, más urgentes primero (riesgo × monto).
export async function GET() {
  await listo();
  const casos = await almacen().casos.listar({ estado: "pendiente" });
  return NextResponse.json(casos.sort((a, b) => b.prioridad - a.prioridad));
}
