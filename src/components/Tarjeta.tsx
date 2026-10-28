import { Icono, type NombreIcono } from "./Icono";

export function Tarjeta({ titulo, children, acciones, icono }: { titulo?: React.ReactNode; children: React.ReactNode; acciones?: React.ReactNode; icono?: NombreIcono }) {
  return (
    <section className="rounded-md border border-borde bg-panel">
      {(titulo || acciones) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-borde px-4 py-2.5">
          {titulo && <h2 className="rotulo flex items-center gap-2">{icono && <Icono nombre={icono} className="h-3.5 w-3.5 text-acento-2" />}{titulo}</h2>}
          {acciones}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Indicador({ titulo, valor, detalle }: { titulo: string; valor: React.ReactNode; detalle?: string }) {
  return (
    <div className="rounded-md border border-borde bg-panel px-4 py-3">
      <div className="rotulo">{titulo}</div>
      <div className="mt-1.5 font-mono text-2xl font-semibold tabular-nums">{valor}</div>
      {detalle && <div className="mt-1 text-xs text-texto-3">{detalle}</div>}
    </div>
  );
}
