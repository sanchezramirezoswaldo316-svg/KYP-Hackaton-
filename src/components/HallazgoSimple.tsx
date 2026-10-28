import { explicarHallazgo } from "@/lib/explicar.ts";
import { esSimulacion } from "@/lib/formato.ts";
import type { Hallazgo } from "@/lib/tipos.ts";

const BORDE = { ok: "border-emerald-300 bg-emerald-50", info: "border-slate-200 bg-slate-50", alerta: "border-amber-300 bg-amber-50", peligro: "border-red-300 bg-red-50" };
const MARCA = { ok: "✅", info: "➖", alerta: "⚠️", peligro: "⛔" };

export function HallazgoSimple({ h, retraso = 0 }: { h: Hallazgo; retraso?: number }) {
  const e = explicarHallazgo(h);
  return (
    <li className={`animar-aparecer rounded-lg border p-3 ${BORDE[e.nivel]}`} style={{ animationDelay: `${retraso}ms` }}>
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none" aria-hidden>{e.icono}</span>
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            {e.fuente}
            {esSimulacion(h.detalle) && <span className="ml-2 rounded bg-purple-200 px-1.5 py-0.5 font-semibold normal-case tracking-normal text-purple-900">🧪 Simulación de demo, no es dato oficial</span>}
          </div>
          <div className="font-semibold"><span aria-hidden>{MARCA[e.nivel]} </span>{e.titulo}</div>
          <p className="text-sm text-slate-700">{e.frase}</p>
          <details className="mt-1 text-xs text-slate-500">
            <summary className="cursor-pointer">Detalle técnico</summary>
            <p className="mt-1">{h.detalle}{h.fecha_fuente && ` · fecha de la fuente: ${h.fecha_fuente}`}</p>
            {h.evidencia_url && <a href={h.evidencia_url} target="_blank" rel="noreferrer" className="break-all text-blue-800 underline">{h.evidencia_url}</a>}
          </details>
        </div>
      </div>
    </li>
  );
}
