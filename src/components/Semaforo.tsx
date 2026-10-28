import { ESTADO_SIMPLE, SEMAFORO } from "@/lib/explicar.ts";
import type { Decision, EstadoProveedor } from "@/lib/tipos.ts";
import { Icono } from "./Icono";

const COLOR = {
  ok: "bg-ok/12 text-ok ring-ok/40",
  info: "bg-realce text-texto-2 ring-borde-fuerte",
  alerta: "bg-alerta/12 text-alerta ring-alerta/40",
  peligro: "bg-peligro/12 text-peligro ring-peligro/45",
};

export const TEXTO_NIVEL = { ok: "text-ok", info: "text-texto-2", alerta: "text-alerta", peligro: "text-peligro" };
export const FONDO_NIVEL = { ok: "bg-ok", info: "bg-texto-3", alerta: "bg-alerta", peligro: "bg-peligro" };

export function Semaforo({ decision, grande = false }: { decision: Decision; grande?: boolean }) {
  const s = SEMAFORO[decision];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-sm font-semibold whitespace-nowrap uppercase tracking-wider ring-1 ${COLOR[s.nivel]} ${grande ? "px-3 py-1.5 text-sm" : "px-2 py-0.5 text-[10.5px]"}`}>
      <Icono nombre={s.icono} className={grande ? "h-4 w-4" : "h-3 w-3"} trazo={2} />{s.texto}
    </span>
  );
}

const COLOR_ESTADO: Record<EstadoProveedor, string> = {
  pendiente: "text-texto-3", aprobado: "text-ok", en_revision: "text-alerta", pausado: "text-alerta", bloqueado: "text-peligro",
};

export function EstadoSimple({ estado }: { estado: EstadoProveedor }) {
  const e = ESTADO_SIMPLE[estado];
  return <span className="inline-flex items-center gap-1.5 text-[13px] whitespace-nowrap text-texto-2"><Icono nombre={e.icono} className={`h-3.5 w-3.5 ${COLOR_ESTADO[estado]}`} />{e.texto}</span>;
}

export { COLOR as COLOR_NIVEL };
