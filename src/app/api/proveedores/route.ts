import { NextResponse } from "next/server";
import { almacen } from "@/lib/almacen/index.ts";
import { listo } from "@/lib/demo.ts";
import { actorDe, manejarError } from "@/lib/http.ts";
import { altaProveedor, type EntradaAlta } from "@/lib/servicios.ts";

export async function GET() {
  await listo();
  return NextResponse.json(await almacen().proveedores.listar());
}

// Alta individual con verificación completa (listas + Firecrawl + dominio + IA).
export async function POST(req: Request) {
  try {
    await listo();
    const r = await altaProveedor((await req.json()) as EntradaAlta, actorDe(req), true);
    return NextResponse.json(r, { status: 201 });
  } catch (error) {
    return manejarError(error);
  }
}
