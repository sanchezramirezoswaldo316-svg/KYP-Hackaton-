export function Tarjeta({ titulo, children, acciones, icono: _icono }: { titulo?: string; children: React.ReactNode; acciones?: React.ReactNode; icono?: string }) {
  void _icono;
  return (
    <section className="rounded-panel border border-borde bg-panel p-4">
      {(titulo || acciones) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {titulo && <h2 className="text-sm font-semibold">{titulo}</h2>}
          {acciones}
        </div>
      )}
      {children}
    </section>
  );
}

export function Indicador({ titulo, valor, detalle }: { titulo: string; valor: React.ReactNode; detalle?: string }) {
  return (
    <div className="rounded-lg border border-borde bg-white p-4">
      <div className="text-xs text-tinta-3">{titulo}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{valor}</div>
      {detalle && <div className="mt-1 text-xs text-tinta-3">{detalle}</div>}
    </div>
  );
}
