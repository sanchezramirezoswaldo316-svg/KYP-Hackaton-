import { NextResponse } from "next/server";
import { casos } from "@/lib/datos-prueba/index.ts";

// Bandeja de excepciones: casos pendientes ordenados por prioridad (riesgo × monto).
export async function GET() {
  return NextResponse.json(casos.filter((c) => c.estado === "pendiente"));
}
