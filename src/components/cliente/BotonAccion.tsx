"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { enviar } from "./peticion.ts";

export function BotonAccion({ url, texto, textoOcupado, confirmar, variante = "secundario", cuerpo }: {
  url: string; texto: string; textoOcupado?: string; confirmar?: string; variante?: "primario" | "secundario"; cuerpo?: unknown;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clase = variante === "primario"
    ? "bg-blue-700 text-white hover:bg-blue-800"
    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50";

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
      <button onClick={ejecutar} disabled={ocupado} className={`rounded px-3 py-2 text-sm font-medium disabled:opacity-50 ${clase}`}>
        {ocupado ? (textoOcupado ?? "Procesando…") : texto}
      </button>
      {error && <span className="mt-1 text-xs text-red-700">{error}</span>}
    </span>
  );
}
