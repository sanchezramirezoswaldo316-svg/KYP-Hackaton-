import { NextResponse } from "next/server";
import { sembrarDemo } from "@/lib/demo.ts";
import { manejarError } from "@/lib/http.ts";

// Carga los 12 proveedores de ejemplo (útil con Supabase recién creado).
export async function POST() {
  try {
    return NextResponse.json({ cargados: await sembrarDemo() });
  } catch (error) {
    return manejarError(error);
  }
}
