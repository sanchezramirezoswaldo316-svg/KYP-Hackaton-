export function Tabla({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-panel border border-borde bg-panel"><table className="w-full text-sm">{children}</table></div>;
}
