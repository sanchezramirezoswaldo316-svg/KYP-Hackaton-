// Resultado de llamada en formato propio (para n8n u otro proveedor de voz).
import { NextResponse } from "next/server";
import { listo } from "@/lib/demo.ts";
import { manejarError, secretoValido } from "@/lib/http.ts";
import { registrarResultadoLlamada } from "@/lib/servicios.ts";
import type { WebhookLlamada } from "@/lib/tipos.ts";

export async function POST(req: Request) {
  if (!secretoValido(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    await listo();
    let b: WebhookLlamada;
    try { b = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
    return NextResponse.json(await registrarResultadoLlamada({ ...b, simulada: false }));
  } catch (error) {
    return manejarError(error);
  }
}
