"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 p-6 text-center hover:bg-blue-100">
        <span className="text-4xl" aria-hidden>📄</span>
        <span className="font-medium">{archivo ? archivo.name : "Elige el PDF de tu opinión de cumplimiento"}</span>
        <span className="text-xs text-slate-500">Solo PDF, máximo 5 MB</span>
        <input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
      </label>
      <button disabled={!archivo || ocupado} className="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50">
        {ocupado ? "Enviando…" : "Enviar documento"}
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </form>
  );
}
