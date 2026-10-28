// Llamadas salientes con el agente de ElevenLabs (vía Twilio) y lectura de su webhook post-llamada.

import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { ResultadoLlamada } from "../tipos.ts";

export function vozConfigurada(): boolean {
  return !!(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_AGENT_ID && process.env.ELEVENLABS_PHONE_NUMBER_ID && process.env.ELEVENLABS_WEBHOOK_SECRET);
}

export async function iniciarLlamada(telefono: string, variables: Record<string, string>): Promise<string> {
  const permitidos = (process.env.VOZ_TELEFONOS_AUTORIZADOS ?? "").split(",").map(t => t.trim());
  if (!/^\+[1-9]\d{7,14}$/.test(telefono) || !permitidos.includes(telefono)) {
    throw new Error("El teléfono registrado no está autorizado para pruebas de voz");
  }
  const res = await fetch("https://api.elevenlabs.io/v1/convai/twilio/outbound-call", {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({
      agent_id: process.env.ELEVENLABS_AGENT_ID,
      agent_phone_number_id: process.env.ELEVENLABS_PHONE_NUMBER_ID,
      to_number: telefono,
      conversation_initiation_client_data: { dynamic_variables: variables },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs respondió ${res.status}`);
  const datos = (await res.json()) as { success?: boolean; conversation_id?: string; message?: string };
  if (datos.success === false) throw new Error("ElevenLabs no pudo iniciar la llamada");
  if (!datos.conversation_id) throw new Error("ElevenLabs no devolvió conversation_id; revisar antes de reintentar");
  return datos.conversation_id;
}

// Verifica el header ElevenLabs-Signature: "t=<timestamp>,v0=<hmac sha256 de `${t}.${cuerpo}`>".
export function firmaValida(cuerpo: string, header: string | null): boolean {
  const secreto = process.env.ELEVENLABS_WEBHOOK_SECRET;
  if (!secreto || !header) return false;
  const partes = header.split(",").map(p => p.trim().split("=", 2));
  const tiempos = partes.filter(([k]) => k === "t");
  if (tiempos.length !== 1 || !/^\d+$/.test(tiempos[0][1])) return false;
  const timestamp = tiempos[0][1];
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const esperado = createHmac("sha256", secreto).update(`${timestamp}.${cuerpo}`).digest();
  return partes.some(([k, v]) => k === "v0" && /^[a-fA-F0-9]{64}$/.test(v) &&
    timingSafeEqual(esperado, Buffer.from(v, "hex")));
}

export const eventoSchema = z.object({
  type: z.enum(["post_call_transcription", "call_initiation_failure"]),
  data: z.object({
    agent_id: z.string().min(1),
    conversation_id: z.string().min(1),
    status: z.string().optional(),
    failure_reason: z.string().optional(),
    transcript: z.array(z.object({ role: z.string(), message: z.string().nullable() })).optional(),
    analysis: z.object({
      transcript_summary: z.string().nullable().optional(),
      data_collection_results: z.record(z.string(), z.object({ value: z.unknown().optional() })).optional(),
    }).nullable().optional(),
    conversation_initiation_client_data: z.object({ dynamic_variables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional() }).optional(),
  }),
});
export type EventoPostLlamada = z.infer<typeof eventoSchema>;

export const resultadoSchema = z.object({
  solicitud_id: z.string().min(1),
  resultado: z.enum(["confirmado", "no_reconoce", "datos_no_coinciden", "sin_respuesta"]),
  transcripcion: z.string(),
  conversation_id: z.string().min(1).nullable().optional(),
  resumen: z.string().nullable().optional(),
  simulada: z.boolean(),
});

const RESULTADOS: ResultadoLlamada[] = ["confirmado", "no_reconoce", "datos_no_coinciden", "sin_respuesta"];

// El agente debe tener configurado un campo de "data collection" llamado `resultado`
// con uno de los valores de ResultadoLlamada (ver voz/README.md).
export function interpretarEvento(evento: EventoPostLlamada) {
  const d = evento.data;
  const valor = String(d.analysis?.data_collection_results?.resultado?.value ?? "");
  const resultado: ResultadoLlamada = evento.type === "call_initiation_failure" || d.status !== "done" || !(d.transcript ?? []).some(t => t.role === "user" && t.message?.trim()) ? "sin_respuesta" : RESULTADOS.includes(valor as ResultadoLlamada)
    ? (valor as ResultadoLlamada)
    : (d.transcript ?? []).some((t) => t.role === "user")
      ? "datos_no_coinciden"
      : "sin_respuesta";
  return {
    solicitud_id: String(d.conversation_initiation_client_data?.dynamic_variables?.solicitud_id ?? "") || null,
    conversation_id: d.conversation_id,
    resultado,
    resumen: d.analysis?.transcript_summary ?? (evento.type === "call_initiation_failure" ? `Fallo de llamada: ${d.failure_reason ?? "desconocido"}` : null),
    transcripcion: (d.transcript ?? [])
      .filter((t) => t.message)
      .map((t) => `${t.role === "agent" ? "Agente" : "Proveedor"}: ${t.message}`)
      .join("\n"),
  };
}
