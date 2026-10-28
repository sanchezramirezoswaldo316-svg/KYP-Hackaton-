// n8n (u otro sistema) agrega hallazgos externos a un proveedor y se recalcula el puntaje.
import { NextResponse } from "next/server";
import { almacen } from "@/lib/almacen/index.ts";
import { listo } from "@/lib/demo.ts";
import { manejarError, secretoValido } from "@/lib/http.ts";
import { verificar } from "@/lib/servicios.ts";
import type { WebhookVerificacion } from "@/lib/tipos.ts";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!secretoValido(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    await listo();
    const body = (await req.json()) as WebhookVerificacion;
    const p = await almacen().proveedores.obtener(body.proveedor_id);
    if (!p) return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
    const r = await verificar(p, "n8n", false, body.hallazgos ?? []);
    return NextResponse.json({ proveedor_id: p.id, puntaje: r.verificacion.puntaje, decision: r.verificacion.decision, motivos: r.verificacion.motivos });
  } catch (error) {
    return manejarError(error);
  }
}
