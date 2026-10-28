"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icono, type NombreIcono } from "@/components/Icono";
import { enviar } from "./peticion.ts";

export function BotonAccion({ url, texto, textoOcupado, confirmar, variante = "secundario", cuerpo, icono }: {
  url: string; texto: string; icono?: NombreIcono; textoOcupado?: string; confirmar?: string; variante?: "primario" | "secundario"; cuerpo?: unknown;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clase = variante === "primario"
    ? "bg-acento text-white hover:bg-acento/85"
    : "border border-borde-fuerte bg-panel text-texto-2 hover:bg-panel-2";

  async function ejecutar() {
    if (confirmar && !window.confirm(confirmar)) return;
    setOcupado(true);
    setError(null);
    try {
      await enviar(url, cuerpo);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <span className="inline-flex flex-col">
      <button onClick={ejecutar} disabled={ocupado} className={`inline-flex items-center justify-center gap-2 rounded px-3 py-2 text-sm font-medium disabled:opacity-50 ${clase}`}>
        {icono && <Icono nombre={icono} className={`h-4 w-4 ${ocupado ? "animate-spin" : ""}`} />}{ocupado ? (textoOcupado ?? "Procesando…") : texto}
      </button>
      {error && <span className="mt-1 text-xs text-peligro">{error}</span>}
    </span>
  );
}
