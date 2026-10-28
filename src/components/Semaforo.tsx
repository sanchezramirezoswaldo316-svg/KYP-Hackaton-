import { ESTADO_SIMPLE, SEMAFORO } from "@/lib/explicar.ts";
import type { Decision, EstadoProveedor } from "@/lib/tipos.ts";

const COLOR = {
  ok: "border border-borde-fuerte text-tinta-3",
  info: "bg-hover text-tinta-2",
  alerta: "border border-tinta text-tinta",
  peligro: "bg-tinta text-white",
};

export function Semaforo({ decision, grande = false }: { decision: Decision; grande?: boolean }) {
  const s = SEMAFORO[decision];
  return (
    <span className={`inline-flex items-center rounded-control font-semibold whitespace-nowrap ${COLOR[s.nivel]} ${grande ? "px-4 py-1.5 text-lg" : "px-2.5 py-0.5 text-xs"}`}>
      {s.texto}
    </span>
  );
}

export function EstadoSimple({ estado }: { estado: EstadoProveedor }) {
  const e = ESTADO_SIMPLE[estado];
  return <span className="inline-flex items-center text-sm whitespace-nowrap">{e.texto}</span>;
}

export { COLOR as COLOR_NIVEL };
