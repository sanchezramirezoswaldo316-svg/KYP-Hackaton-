"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Boton } from "@/components/ui/Boton";
import { enviar } from "./peticion.ts";

const BOTONES = [
  { estado: "aprobado", texto: "Aprobar proveedor", variante: "primario" },
  { estado: "pausado", texto: "Pausar pago", variante: "secundario" },
  { estado: "bloqueado", texto: "Bloquear proveedor", variante: "peligro" },
] as const;

export function BotonesDecision({ casoId }: { casoId: string }) {
  const router = useRouter();
  const [comentario, setComentario] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmarBloqueo, setConfirmarBloqueo] = useState(false);

  async function decidir(estado: (typeof BOTONES)[number]["estado"]) {
    setError(null);
    if (estado === "bloqueado") {
      if (!comentario.trim()) {
        setError("Escribe el motivo antes de bloquear.");
        return;
      }
      setConfirmarBloqueo(true);
      return;
    }

    await enviarDecision(estado);
  }

  async function enviarDecision(estado: (typeof BOTONES)[number]["estado"]) {
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
        disabled={ocupado}
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        {BOTONES.map((b) => (
          <Boton key={b.estado} disabled={ocupado} onClick={() => decidir(b.estado)} variante={b.variante}>{ocupado ? "Guardando…" : b.texto}</Boton>
        ))}
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {confirmarBloqueo && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 p-4" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="confirmar-bloqueo" className="w-full max-w-md rounded-panel border border-borde bg-panel p-5 shadow-xl">
            <h2 id="confirmar-bloqueo" className="text-base font-semibold">Bloquear proveedor</h2>
            <p className="mt-2 text-sm text-tinta-2">El pago quedará detenido y el motivo se guardará en la bitácora.</p>
            <p className="mt-3 border-l-4 border-alto bg-alto-fondo px-3 py-2 text-sm text-tinta">{comentario}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Boton disabled={ocupado} onClick={() => setConfirmarBloqueo(false)}>Cancelar</Boton>
              <Boton variante="peligro" disabled={ocupado} onClick={() => { setConfirmarBloqueo(false); void enviarDecision("bloqueado"); }}>{ocupado ? "Bloqueando…" : "Bloquear proveedor"}</Boton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
