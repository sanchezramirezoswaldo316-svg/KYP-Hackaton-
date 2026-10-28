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
      <button onClick={() => setAbierto(true)} className="rounded border border-borde-fuerte bg-white px-3 py-2 text-sm font-medium text-tinta hover:bg-superficie">Volver a revisar</button>
      {abierto && (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-tinta/60 p-4" role="dialog" aria-modal>
          <div className="my-8 w-full max-w-lg rounded-xl bg-superficie p-5 shadow-xl">
            <Escaner
              nombre={nombre}
              ejecutar={ejecutar}
              alTerminar={() => (
                <button onClick={() => { setAbierto(false); router.refresh(); }} className="rounded bg-marca px-4 py-2 font-medium text-white hover:bg-marca">Listo</button>
              )}
            />
          </div>
        </div>
      )}
    </>
  );
}
