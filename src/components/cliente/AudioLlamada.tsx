"use client";

import type { Llamada } from "@/lib/tipos.ts";

const AUDIO_DEMO = "/api/voz/demo/audio";

function audioUrlDe(llamada: Llamada): string | null {
  const extra: object = llamada;
  if (!("audio_url" in extra)) return null;
  const url = extra.audio_url;
  return typeof url === "string" && url.trim() ? url : null;
}

export function AudioLlamada({ llamada, demo = false }: { llamada: Llamada; demo?: boolean }) {
  const url = audioUrlDe(llamada) ?? (llamada.simulada ? (demo ? AUDIO_DEMO : null) : `/api/voz/llamadas/${llamada.id}/audio`);
  if (!url) return null;
  return (
    <audio controls preload="none" className="mt-2 w-full" src={url} aria-label="Audio de la llamada">
      Tu navegador no reproduce audio.
    </audio>
  );
}
