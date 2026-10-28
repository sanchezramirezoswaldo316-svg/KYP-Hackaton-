import { explicarHallazgo } from "@/lib/explicar.ts";
import { esSimulacion } from "@/lib/formato.ts";
import type { Hallazgo } from "@/lib/tipos.ts";

const BORDE = { ok: "border-borde bg-panel", info: "border-borde bg-superficie", alerta: "border-borde-fuerte bg-panel", peligro: "border-tinta bg-superficie" };
const MARCA = { ok: "OK", info: "Info", alerta: "Revisar", peligro: "Alto" };

export function HallazgoSimple({ h, retraso = 0 }: { h: Hallazgo; retraso?: number }) {
  const e = explicarHallazgo(h);
  return (
    <li className={`animar-aparecer border-b px-2 py-3 ${BORDE[e.nivel]}`} style={{ animationDelay: `${retraso}ms` }}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wide text-tinta-3">
            {e.fuente}
            {esSimulacion(h.detalle) && <span className="ml-2 rounded-control border border-borde-fuerte px-1.5 py-0.5 font-semibold normal-case tracking-normal text-tinta-2">Simulación de demo, no es dato oficial</span>}
          </div>
          <div className="font-semibold"><span className="mr-2 rounded-control border border-borde-fuerte px-1.5 py-0.5 text-xs" aria-label={`Nivel ${MARCA[e.nivel]}`}>{MARCA[e.nivel]}</span>{e.titulo}</div>
          <p className="text-sm text-tinta-2">{e.frase}</p>
          <details className="mt-1 text-xs text-tinta-3">
            <summary className="cursor-pointer">Detalle técnico</summary>
            <p className="mt-1">{h.detalle}{h.fecha_fuente && ` · fecha de la fuente: ${h.fecha_fuente}`}</p>
            {h.evidencia_url && <a href={h.evidencia_url} target="_blank" rel="noreferrer" className="break-all text-tinta underline">{h.evidencia_url}</a>}
          </details>
        </div>
      </div>
    </li>
  );
}
