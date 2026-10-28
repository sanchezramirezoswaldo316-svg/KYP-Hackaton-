import { ESTADO_SIMPLE, SEMAFORO } from "@/lib/explicar.ts";
import type { Decision, EstadoProveedor } from "@/lib/tipos.ts";

const COLOR = {
  ok: "bg-emerald-100 text-emerald-900 ring-emerald-300",
  info: "bg-slate-100 text-slate-800 ring-slate-300",
  alerta: "bg-amber-100 text-amber-900 ring-amber-300",
  peligro: "bg-red-100 text-red-900 ring-red-300",
};

export function Semaforo({ decision, grande = false }: { decision: Decision; grande?: boolean }) {
  const s = SEMAFORO[decision];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap ring-1 ${COLOR[s.nivel]} ${grande ? "px-4 py-1.5 text-lg" : "px-2.5 py-0.5 text-xs"}`}>
      <span aria-hidden>{s.emoji}</span>{s.texto}
    </span>
  );
}

export function EstadoSimple({ estado }: { estado: EstadoProveedor }) {
  const e = ESTADO_SIMPLE[estado];
  return <span className="inline-flex items-center gap-1 text-sm whitespace-nowrap"><span aria-hidden>{e.emoji}</span>{e.texto}</span>;
}

export { COLOR as COLOR_NIVEL };
