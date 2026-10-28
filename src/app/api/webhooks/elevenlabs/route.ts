// Webhook post-llamada de ElevenLabs (post_call_transcription), firmado con ELEVENLABS_WEBHOOK_SECRET.
import { NextResponse } from "next/server";
import { listo } from "@/lib/demo.ts";
import { manejarError } from "@/lib/http.ts";
import { registrarResultadoLlamada } from "@/lib/servicios.ts";
import { firmaValida, interpretarEvento, type EventoPostLlamada } from "@/lib/voz/elevenlabs.ts";

export async function POST(req: Request) {
  const cuerpo = await req.text();
  if (!firmaValida(cuerpo, req.headers.get("elevenlabs-signature"))) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }
  const evento = JSON.parse(cuerpo) as EventoPostLlamada;
  if (evento.type !== "post_call_transcription") return NextResponse.json({ ignorado: evento.type });
  try {
    await listo();
    const r = interpretarEvento(evento);
    if (!r.solicitud_id) return NextResponse.json({ error: "La llamada no trae solicitud_id" }, { status: 400 });
    await registrarResultadoLlamada({ ...r, solicitud_id: r.solicitud_id, simulada: false });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return manejarError(error);
  }
}
