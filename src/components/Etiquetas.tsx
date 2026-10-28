const base = "inline-flex items-center gap-1 rounded-sm px-1.5 py-px font-mono text-[11px] font-medium whitespace-nowrap ring-1 ring-inset";

export function Etiqueta({ children, tono = "gris" }: { children: React.ReactNode; tono?: "gris" | "verde" | "ambar" | "rojo" | "azul" }) {
  const tonos = {
    gris: "bg-realce text-texto-2 ring-borde-fuerte",
    verde: "bg-ok/12 text-ok ring-ok/35",
    ambar: "bg-alerta/12 text-alerta ring-alerta/35",
    rojo: "bg-peligro/12 text-peligro ring-peligro/40",
    azul: "bg-acento/12 text-acento-2 ring-acento/40",
  };
  return <span className={`${base} ${tonos[tono]}`}>{children}</span>;
}
