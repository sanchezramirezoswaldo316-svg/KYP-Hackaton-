type Tono = "ok" | "medio" | "alto" | "info" | "neutral";

const estilos: Record<Tono, string> = {
  ok: "border border-borde-fuerte bg-panel text-tinta-3", medio: "border border-acento bg-acento-fondo text-acento", alto: "bg-tinta text-white", info: "bg-hover text-tinta-2", neutral: "border border-borde-fuerte bg-panel text-tinta-2",
};

export function Chip({ children, tono = "neutral" }: { children: React.ReactNode; tono?: Tono }) {
  return <span className={`inline-flex items-center rounded-control px-2.5 py-0.5 text-xs font-medium ${estilos[tono]}`}>{children}</span>;
}
