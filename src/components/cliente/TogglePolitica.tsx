"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { enviar } from "./peticion.ts";

export function TogglePolitica({ clave, activa }: { clave: string; activa: boolean }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  async function cambiar() {
    setOcupado(true);
    try {
      await enviar("/api/politicas", { clave, activa: !activa });
      router.refresh();
    } finally {
      setOcupado(false);
    }
  }
  return (
    <button role="switch" aria-checked={activa} disabled={ocupado} onClick={cambiar}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:opacity-50 ${activa ? "bg-superficie0" : "bg-seleccion"}`}>
      <span className="sr-only">{activa ? "Desactivar" : "Activar"}</span>
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${activa ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}
