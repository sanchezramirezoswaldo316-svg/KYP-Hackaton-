// El flujo de voz (Axel) llama aquí al terminar la llamada de verificación de CLABE.
import { NextResponse } from "next/server";
import { webhookAutorizado } from "@/lib/webhook.ts";
import type { WebhookLlamada } from "@/lib/tipos.ts";

export async function POST(req: Request) {
  if (!webhookAutorizado(req)) return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  const body = (await req.json()) as WebhookLlamada;
  const verificada = body.resultado === "confirmado";
  // TODO(Oswaldo): guardar en `llamadas`; si no se confirmó, crear caso tipo "clabe" de alto riesgo.
  return NextResponse.json({ solicitud_id: body.solicitud_id, estado: verificada ? "verificada" : "rechazada" });
}
