"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icono } from "@/components/Icono";

export function SubirDocumento({ token }: { token: string }) {
  const router = useRouter();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subir(e: React.FormEvent) {
    e.preventDefault();
    if (!archivo) return;
    if (archivo.size > 5 * 1024 * 1024) { setError("El archivo debe pesar máximo 5 MB"); return; }
    setOcupado(true);
    setError(null);
    const datos = new FormData();
    datos.append("archivo", archivo);
    try {
      const res = await fetch(`/api/portal/${token}`, { method: "POST", body: datos });
      const r = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((r as { error?: string }).error ?? "No se pudo subir el archivo");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <form onSubmit={subir} className="space-y-3">
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed border-acento/40 bg-acento/10 p-6 text-center hover:bg-acento/15">
        <Icono nombre="subir" className="h-8 w-8 text-acento-2" trazo={1.5} />
        <span className="font-medium">{archivo ? archivo.name : "Elige el PDF de tu opinión de cumplimiento"}</span>
        <span className="text-xs text-texto-3">Solo PDF, máximo 5 MB</span>
        <input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
      </label>
      <button disabled={!archivo || ocupado} className="w-full rounded bg-acento px-4 py-3 font-semibold text-white hover:bg-acento/85 disabled:opacity-50">
        {ocupado ? "Enviando…" : "Enviar documento"}
      </button>
      {error && <p className="text-sm text-peligro">{error}</p>}
    </form>
  );
}
