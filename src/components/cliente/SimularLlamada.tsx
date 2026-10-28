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
      <span className="text-xs font-medium text-alerta">Simular llamada (demo):</span>
      {error && <p role="alert" className="w-full text-sm text-peligro">{error}</p>}
      {OPCIONES.map((o) => (
        <button key={o.resultado} disabled={ocupado} onClick={() => simular(o.resultado)} className="rounded border border-alerta/40 bg-alerta/10 px-2 py-1 text-xs text-alerta hover:bg-alerta/15 disabled:opacity-50">
          {o.texto}
        </button>
      ))}
    </div>
  );
}
