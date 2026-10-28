"use client";

import type { Llamada } from "@/lib/tipos.ts";

const AUDIO_DEMO = "/api/voz/demo/audio";

export function AudioLlamada({ llamada, demo = false }: { llamada: Llamada; demo?: boolean }) {
  const url = llamada.simulada ? (demo ? AUDIO_DEMO : null) : `/api/voz/llamadas/${encodeURIComponent(llamada.id)}/audio`;
  if (!url) return null;
  return (
    <audio controls preload="none" className="mt-2 w-full" src={url} aria-label="Audio de la llamada">
      Tu navegador no reproduce audio.
    </audio>
  );
}
