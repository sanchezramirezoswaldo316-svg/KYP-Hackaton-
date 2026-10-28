const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap";

export function Etiqueta({ children, tono = "gris" }: { children: React.ReactNode; tono?: "gris" | "verde" | "ambar" | "rojo" | "azul" }) {
  const tonos = {
    gris: "bg-slate-100 text-slate-700",
    verde: "bg-emerald-100 text-emerald-800",
    ambar: "bg-amber-100 text-amber-800",
    rojo: "bg-red-100 text-red-800",
    azul: "bg-blue-100 text-blue-800",
  };
  return <span className={`${base} ${tonos[tono]}`}>{children}</span>;
}
