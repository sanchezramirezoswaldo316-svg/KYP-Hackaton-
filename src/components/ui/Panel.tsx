export function Panel({ titulo, acciones, children, className = "" }: { titulo?: string; acciones?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-panel border border-borde bg-panel ${className}`}>
      {(titulo || acciones) && <header className="flex flex-wrap items-center justify-between gap-2 border-b border-borde px-4 py-3"><h2 className="text-sm font-semibold">{titulo}</h2>{acciones}</header>}
      <div className="p-4">{children}</div>
    </section>
  );
}
