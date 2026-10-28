"use client";

import { useState } from "react";

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
      <button onClick={copiar} className="rounded border border-borde-fuerte bg-white px-2 py-1 text-xs hover:bg-superficie">{copiado ? "Copiado" : "Copiar enlace del portal"}</button>
      <a href={`/portal/${token}`} target="_blank" rel="noreferrer" className="text-xs text-tinta underline">abrir</a>
    </span>
  );
}
