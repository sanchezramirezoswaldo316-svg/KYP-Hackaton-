type Tono = "ok" | "medio" | "alto" | "info" | "neutral";

const estilos: Record<Tono, string> = {
  ok: "bg-ok-fondo text-ok", medio: "bg-medio-fondo text-medio", alto: "bg-alto-fondo text-alto", info: "bg-info-fondo text-info", neutral: "bg-slate-100 text-tinta-2",
};

export function Chip({ children, tono = "neutral" }: { children: React.ReactNode; tono?: Tono }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-control px-2 py-1 text-xs font-medium ${estilos[tono]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />{children}</span>;
}
