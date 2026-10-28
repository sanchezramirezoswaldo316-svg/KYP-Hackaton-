"use client";

import { useState } from "react";
import { Icono } from "@/components/Icono";

// Copia el enlace del portal del proveedor (por si el aviso no se envió solo).
export function CopiarEnlace({ token }: { token: string }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    const url = `${window.location.origin}/portal/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt("Copia el enlace:", url);
    }
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button onClick={copiar} className="inline-flex items-center gap-1.5 rounded border border-borde-fuerte bg-panel px-2 py-1 text-xs hover:bg-panel-2"><Icono nombre={copiado ? "ok" : "enlace"} className={`h-3.5 w-3.5 ${copiado ? "text-ok" : ""}`} />{copiado ? "Copiado" : "Copiar enlace del portal"}</button>
      <a href={`/portal/${token}`} target="_blank" rel="noreferrer" className="text-xs text-acento-2 underline">abrir</a>
    </span>
  );
}
