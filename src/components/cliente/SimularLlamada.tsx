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

  async function simular(resultado: string) {
    setOcupado(true);
    try {
      await enviar(`/api/clabe/${solicitudId}/simular`, { resultado });
      router.refresh();
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-acento">Simular llamada (demo):</span>
      {OPCIONES.map((o) => (
        <button key={o.resultado} disabled={ocupado} onClick={() => simular(o.resultado)} className="rounded border border-acento bg-acento-fondo px-2 py-1 text-xs text-acento hover:bg-acento-fondo disabled:opacity-50">
          {o.texto}
        </button>
      ))}
    </div>
  );
}
