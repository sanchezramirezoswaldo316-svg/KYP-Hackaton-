"use client";

import type { Llamada } from "@/lib/tipos.ts";
import { useState } from "react";

const AUDIO_DEMO = "/demo/llamada-demo.mp3";

function audioUrlDe(llamada: Llamada): string | null {
  const extra: object = llamada;
  if (!("audio_url" in extra)) return null;
  const url = extra.audio_url;
  return typeof url === "string" && url.trim() ? url : null;
}

export function AudioLlamada({ llamada, demo = false, llamadaId }: { llamada?: Llamada; demo?: boolean; llamadaId?: string }) {
  const [urlRemota, setUrlRemota] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = (llamada ? audioUrlDe(llamada) : null) ?? urlRemota ?? (demo ? AUDIO_DEMO : null);
  async function cargarAudio() {
    if (!llamadaId || cargando || urlRemota) return;
    setCargando(true);
    setError(null);
    try {
      const respuesta = await fetch(`/api/voz/llamadas/${llamadaId}/audio`);
      if (!respuesta.ok) throw new Error("No se pudo cargar el audio.");
      setUrlRemota(URL.createObjectURL(await respuesta.blob()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el audio.");
    } finally {
      setCargando(false);
    }
  }
  if (!url && llamadaId) return <button type="button" onClick={cargarAudio} disabled={cargando} className="mt-2 text-sm text-acento underline disabled:opacity-50">{cargando ? "Cargando audio…" : "Cargar audio de la llamada"}</button>;
  if (!url) return null;
  return (
    <div className="mt-2">
      <audio controls preload="none" className="w-full" src={url} aria-label="Audio de la llamada">Tu navegador no reproduce audio.</audio>
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}
