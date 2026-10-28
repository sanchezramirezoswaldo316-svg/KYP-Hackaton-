"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Escaner } from "./Escaner";
import { enviar } from "./peticion.ts";
import { Icono } from "@/components/Icono";

// Vuelve a revisar al proveedor con todas las fuentes, mostrando el escaneo.
export function Reverificar({ id, nombre }: { id: string; nombre: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const ejecutar = useCallback(() => enviar<{ verificacion: never }>(`/api/proveedores/${id}/verificar`), [id]);

  return (
    <>
      <button onClick={() => setAbierto(true)} className="rounded border border-borde-fuerte bg-panel px-3 py-2 inline-flex items-center gap-2 text-sm font-medium text-texto-2 hover:bg-panel-2"><Icono nombre="repetir" />Volver a revisar</button>
      {abierto && (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-fondo/80 p-4" role="dialog" aria-modal>
          <div className="my-8 w-full max-w-lg rounded-md bg-panel-2 p-5 shadow-2xl shadow-black/40">
            <Escaner
              nombre={nombre}
              ejecutar={ejecutar}
              alTerminar={() => (
                <button onClick={() => { setAbierto(false); router.refresh(); }} className="rounded bg-acento px-4 py-2 font-medium text-white hover:bg-acento/85">Listo</button>
              )}
            />
          </div>
        </div>
      )}
    </>
  );
}
