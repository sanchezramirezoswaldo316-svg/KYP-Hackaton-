// Llamadas salientes con el agente de ElevenLabs (vía Twilio) y lectura de su webhook post-llamada.

import { createHmac, timingSafeEqual } from "node:crypto";
import type { ResultadoLlamada } from "../tipos.ts";

export function vozConfigurada(): boolean {
  return !!(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_AGENT_ID && process.env.ELEVENLABS_PHONE_NUMBER_ID);
}

export async function iniciarLlamada(telefono: string, variables: Record<string, string>): Promise<string | null> {
  const res = await fetch("https://api.elevenlabs.io/v1/convai/twilio/outbound-call", {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({
      agent_id: process.env.ELEVENLABS_AGENT_ID,
      agent_phone_number_id: process.env.ELEVENLABS_PHONE_NUMBER_ID,
      to_number: telefono,
      conversation_initiation_client_data: { dynamic_variables: variables },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs respondió ${res.status}: ${await res.text()}`);
  const datos = (await res.json()) as { success?: boolean; conversation_id?: string; message?: string };
  if (datos.success === false) throw new Error(datos.message ?? "ElevenLabs no pudo iniciar la llamada");
  return datos.conversation_id ?? null;
}

// Verifica el header ElevenLabs-Signature: "t=<timestamp>,v0=<hmac sha256 de `${t}.${cuerpo}`>".
export function firmaValida(cuerpo: string, header: string | null): boolean {
  const secreto = process.env.ELEVENLABS_WEBHOOK_SECRET;
  if (!secreto || !header) return false;
  const partes = Object.fromEntries(header.split(",").map((p) => p.split("=", 2)));
  const t = Number(partes.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 30 * 60) return false;
  const esperado = createHmac("sha256", secreto).update(`${partes.t}.${cuerpo}`).digest();
  const recibido = Buffer.from(partes.v0 ?? "", "hex");
  return recibido.length === esperado.length && timingSafeEqual(esperado, recibido);
}

export interface EventoPostLlamada {
  type: string;
  data: {
    conversation_id: string;
    status?: string;
    transcript?: { role: string; message: string | null }[];
    analysis?: {
      call_successful?: string;
      transcript_summary?: string;
      data_collection_results?: Record<string, { value?: unknown }>;
    };
    conversation_initiation_client_data?: { dynamic_variables?: Record<string, string> };
  };
}

const RESULTADOS: ResultadoLlamada[] = ["confirmado", "no_reconoce", "datos_no_coinciden", "sin_respuesta"];

// El agente debe tener configurado un campo de "data collection" llamado `resultado`
// con uno de los valores de ResultadoLlamada (ver voz/README.md).
export function interpretarEvento(evento: EventoPostLlamada) {
  const d = evento.data;
  const valor = String(d.analysis?.data_collection_results?.resultado?.value ?? "");
  const resultado: ResultadoLlamada = RESULTADOS.includes(valor as ResultadoLlamada)
    ? (valor as ResultadoLlamada)
    : (d.transcript ?? []).some((t) => t.role === "user")
      ? "datos_no_coinciden"
      : "sin_respuesta";
  return {
    solicitud_id: d.conversation_initiation_client_data?.dynamic_variables?.solicitud_id ?? null,
    conversation_id: d.conversation_id,
    resultado,
    resumen: d.analysis?.transcript_summary ?? null,
    transcripcion: (d.transcript ?? [])
      .filter((t) => t.message)
      .map((t) => `${t.role === "agent" ? "Agente" : "Proveedor"}: ${t.message}`)
      .join("\n"),
  };
}
