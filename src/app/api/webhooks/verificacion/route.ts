// n8n (Alan) llama aquí al terminar el flujo de alta.
import { NextResponse } from "next/server";
import { calcularPuntaje } from "@/lib/puntaje/reglas.ts";
import { webhookAutorizado } from "@/lib/webhook.ts";
import type { WebhookVerificacion } from "@/lib/tipos.ts";

export async function POST(req: Request) {
  if (!webhookAutorizado(req)) return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  const body = (await req.json()) as WebhookVerificacion;
  const resultado = calcularPuntaje(body.hallazgos);
  // TODO(Oswaldo): guardar verificación y hallazgos; crear caso si decision !== "liberar".
  return NextResponse.json({ proveedor_id: body.proveedor_id, ...resultado });
}
