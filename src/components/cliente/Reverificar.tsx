"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Escaner } from "./Escaner";
import { enviar } from "./peticion.ts";

// Vuelve a revisar al proveedor con todas las fuentes, mostrando el escaneo.
export function Reverificar({ id, nombre }: { id: string; nombre: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const ejecutar = useCallback(() => enviar<{ verificacion: never }>(`/api/proveedores/${id}/verificar`), [id]);

  return (
    <>
      <button onClick={() => setAbierto(true)} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">🔍 Volver a revisar</button>
      {abierto && (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4" role="dialog" aria-modal>
          <div className="my-8 w-full max-w-lg rounded-xl bg-slate-50 p-5 shadow-xl">
            <Escaner
              nombre={nombre}
              ejecutar={ejecutar}
              alTerminar={() => (
                <button onClick={() => { setAbierto(false); router.refresh(); }} className="rounded bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800">Listo</button>
              )}
            />
          </div>
        </div>
      )}
    </>
  );
}
