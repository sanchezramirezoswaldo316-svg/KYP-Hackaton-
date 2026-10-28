export function DatoClave({ etiqueta, valor, detalle }: { etiqueta: string; valor: React.ReactNode; detalle?: React.ReactNode }) {
  return <div><div className="text-xs text-tinta-3">{etiqueta}</div><div className="mt-1 text-base font-semibold tabular-nums">{valor}</div>{detalle && <div className="mt-0.5 text-xs text-tinta-3">{detalle}</div>}</div>;
}
