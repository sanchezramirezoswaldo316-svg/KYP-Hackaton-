const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap";

export function Etiqueta({ children, tono = "gris" }: { children: React.ReactNode; tono?: "gris" | "verde" | "ambar" | "rojo" | "azul" }) {
  const tonos = {
    gris: "border border-borde-fuerte bg-panel text-tinta-2",
    verde: "border border-borde-fuerte bg-panel text-tinta-3",
    ambar: "border border-tinta bg-panel text-tinta",
    rojo: "bg-tinta text-white",
    azul: "bg-hover text-tinta-2",
  };
  return <span className={`${base} ${tonos[tono]}`}>{children}</span>;
}
