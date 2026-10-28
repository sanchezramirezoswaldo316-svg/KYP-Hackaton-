import { NextResponse } from "next/server";
import { almacen } from "@/lib/almacen/index.ts";
import { listo } from "@/lib/demo.ts";
import { actorDe, manejarError } from "@/lib/http.ts";
import { verificar } from "@/lib/servicios.ts";

export const maxDuration = 60;

// Vuelve a verificar con todas las fuentes, incluidas las externas.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await listo();
    const p = await almacen().proveedores.obtener((await params).id);
    if (!p) return NextResponse.json({ error: "No existe" }, { status: 404 });
    return NextResponse.json(await verificar(p, actorDe(req), true));
  } catch (error) {
    return manejarError(error);
  }
}
