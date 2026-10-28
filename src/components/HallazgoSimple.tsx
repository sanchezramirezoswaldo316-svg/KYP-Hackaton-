import { explicarHallazgo } from "@/lib/explicar.ts";
import { esSimulacion } from "@/lib/formato.ts";
import type { Hallazgo } from "@/lib/tipos.ts";
import { Icono } from "./Icono";
import { TEXTO_NIVEL } from "./Semaforo";

const BARRA = { ok: "bg-ok", info: "bg-borde-fuerte", alerta: "bg-alerta", peligro: "bg-peligro" };
const ESTADO = { ok: "SIN RIESGO", info: "INFORMATIVO", alerta: "ALERTA", peligro: "CRÍTICO" };

export function HallazgoSimple({ h, retraso = 0 }: { h: Hallazgo; retraso?: number }) {
  const e = explicarHallazgo(h);
  return (
    <li className="animar-aparecer relative overflow-hidden rounded border border-borde bg-panel-2 py-3 pr-3 pl-4" style={{ animationDelay: `${retraso}ms` }}>
      <span className={`absolute inset-y-0 left-0 w-0.5 ${BARRA[e.nivel]}`} aria-hidden />
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded border border-borde bg-panel text-texto-2"><Icono nombre={e.icono} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="rotulo">{e.fuente}</span>
            <span className={`font-mono text-[10px] font-semibold tracking-wider ${TEXTO_NIVEL[e.nivel]}`}>{ESTADO[e.nivel]}</span>
            {esSimulacion(h.detalle) && <span className="inline-flex items-center gap-1 rounded-sm bg-voz/15 px-1.5 py-px font-mono text-[10px] text-voz"><Icono nombre="cpu" className="h-3 w-3" />SIMULACIÓN DE DEMO · NO ES DATO OFICIAL</span>}
          </div>
          <div className="mt-0.5 font-medium text-texto">{e.titulo}</div>
          <p className="text-[13px] text-texto-2">{e.frase}</p>
          <details className="mt-1 text-xs text-texto-3">
            <summary className="cursor-pointer select-none hover:text-texto-2">Detalle técnico</summary>
            <p className="mt-1 font-mono text-[11px]">{h.detalle}{h.fecha_fuente && ` · fecha de la fuente: ${h.fecha_fuente}`}</p>
            {h.evidencia_url && <a href={h.evidencia_url} target="_blank" rel="noreferrer" className="break-all font-mono text-[11px] text-acento-2 underline">{h.evidencia_url}</a>}
          </details>
        </div>
      </div>
    </li>
  );
}
