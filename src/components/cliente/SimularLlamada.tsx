"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { enviar } from "./peticion.ts";

const OPCIONES = [
  { resultado: "confirmado", texto: "Confirma" },
  { resultado: "no_reconoce", texto: "No reconoce el cambio" },
  { resultado: "datos_no_coinciden", texto: "Datos no coinciden" },
  { resultado: "sin_respuesta", texto: "No contesta" },
];

export function SimularLlamada({ solicitudId }: { solicitudId: string }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function simular(resultado: string) {
    setOcupado(true);
    setError(null);
    try {
      await enviar(`/api/clabe/${solicitudId}/simular`, { resultado }, 30000);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la simulación. Revisa el estado antes de intentar de nuevo.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-amber-800">Simular llamada (demo):</span>
      {error && <p role="alert" className="w-full text-sm text-red-700">{error}</p>}
      {OPCIONES.map((o) => (
        <button key={o.resultado} disabled={ocupado} onClick={() => simular(o.resultado)} className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900 hover:bg-amber-100 disabled:opacity-50">
          {o.texto}
        </button>
      ))}
    </div>
  );
}
