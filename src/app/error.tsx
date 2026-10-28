"use client";
import { Boton } from "@/components/ui/Boton";
import { Panel } from "@/components/ui/Panel";
export default function ErrorPagina({ reset }: { reset: () => void }) {
  return <Panel titulo="No pudimos abrir esta página"><p className="mb-4 text-sm text-tinta-2">Revisa el estado del registro antes de repetir una operación.</p><Boton onClick={reset}>Volver a cargar</Boton></Panel>;
}
