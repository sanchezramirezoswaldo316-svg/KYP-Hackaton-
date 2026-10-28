import { NextResponse } from "next/server";
import { almacen } from "@/lib/almacen/index.ts";
import { infoListas } from "@/lib/verificacion/listas.ts";
import { integraciones } from "@/lib/integraciones.ts";

// Estado del sistema: almacén, integraciones configuradas y versión de las listas oficiales.
export async function GET() {
  return NextResponse.json({ almacen: almacen().modo, integraciones: integraciones(), listas: infoListas() });
}
