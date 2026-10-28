"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { enviar } from "./peticion.ts";

const BOTONES = [
  { estado: "aprobado", texto: "Aprobar", clase: "bg-emerald-600 hover:bg-emerald-700" },
  { estado: "pausado", texto: "Pausar", clase: "bg-amber-500 hover:bg-amber-600" },
  { estado: "bloqueado", texto: "Bloquear", clase: "bg-red-600 hover:bg-red-700" },
] as const;

export function BotonesDecision({ casoId }: { casoId: string }) {
  const router = useRouter();
  const [comentario, setComentario] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decidir(estado: (typeof BOTONES)[number]["estado"]) {
    setError(null);
    if (estado === "bloqueado") {
      if (!comentario.trim()) {
        setError("Escribe el motivo antes de bloquear.");
        return;
      }
      if (!window.confirm("¿Confirmas bloquear este caso? El motivo quedará en la bitácora.")) return;
    }

    setOcupado(true);
    try {
      await enviar(`/api/casos/${casoId}/decision`, { estado, comentario });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        placeholder="Motivo obligatorio al bloquear; comentario opcional en otros casos"
        aria-label="Motivo o comentario de la decisión"
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap gap-2">
        {BOTONES.map((b) => (
          <button key={b.estado} disabled={ocupado} onClick={() => decidir(b.estado)} className={`rounded px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${b.clase}`}>
            {b.texto}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
