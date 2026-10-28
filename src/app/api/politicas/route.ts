import { NextResponse } from "next/server";
import { listo } from "@/lib/demo.ts";
import { actorDe, manejarError } from "@/lib/http.ts";
import { CATALOGO } from "@/lib/politicas.ts";
import { cambiarPolitica, clavesActivas } from "@/lib/servicios.ts";

export async function GET() {
  await listo();
  const activas = await clavesActivas();
  return NextResponse.json(CATALOGO.map((p) => ({ clave: p.clave, nombre: p.nombre, descripcion: p.descripcion, accion: p.accion, activa: activas.has(p.clave) })));
}

export async function POST(req: Request) {
  try {
    await listo();
    const { clave, activa } = (await req.json()) as { clave: string; activa: boolean };
    return NextResponse.json(await cambiarPolitica(clave, !!activa, actorDe(req)));
  } catch (error) {
    return manejarError(error);
  }
}
