// Webhook post-llamada de ElevenLabs (post_call_transcription), firmado con ELEVENLABS_WEBHOOK_SECRET.
import { NextResponse } from "next/server";
import { listo } from "@/lib/demo.ts";
import { manejarError } from "@/lib/http.ts";
import { almacen } from "@/lib/almacen/index.ts";
import { registrarResultadoLlamada } from "@/lib/servicios.ts";
import { firmaValida, interpretarEvento, eventoSchema } from "@/lib/voz/elevenlabs.ts";

export async function POST(req: Request) {
  const cuerpo = await req.text();
  if (!firmaValida(cuerpo, req.headers.get("elevenlabs-signature"))) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }
  try {
    let json: unknown;
    try { json = JSON.parse(cuerpo); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
    const parsed = eventoSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: "Evento inválido o no soportado" }, { status: 400 });
    const evento = parsed.data;
    if (!process.env.ELEVENLABS_AGENT_ID || evento.data.agent_id !== process.env.ELEVENLABS_AGENT_ID) {
      return NextResponse.json({ error: "Agente incorrecto" }, { status: 400 });
    }
    await listo();
    const r = interpretarEvento(evento);
    // Los fallos de inicio no traen variables dinámicas: resolver solo con la correlación guardada.
    const inicios = (await almacen().bitacora.listar({ accion: "llamada_iniciada" }))
      .filter(e => e.detalle?.conversation_id === r.conversation_id);
    if (inicios.length !== 1) return NextResponse.json({ error: "Correlación aún no disponible" }, { status: 503 });
    const solicitudId = inicios[0].entidad_id;
    if (!solicitudId || (r.solicitud_id && r.solicitud_id !== solicitudId)) return NextResponse.json({ error: "Correlación inválida" }, { status: 400 });
    r.solicitud_id = solicitudId;
    await registrarResultadoLlamada({ ...r, solicitud_id: r.solicitud_id, simulada: false });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return manejarError(error);
  }
}
