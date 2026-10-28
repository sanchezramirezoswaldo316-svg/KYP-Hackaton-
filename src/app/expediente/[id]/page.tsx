// Vista de expediente (Samuel).
import { notFound } from "next/navigation";
import { EtiquetaDecision } from "@/components/Decision";
import { proveedores, verificaciones } from "@/lib/datos-prueba/index.ts";

export default async function Expediente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = proveedores.find((x) => x.id === id);
  const v = verificaciones.find((x) => x.proveedor_id === id);
  if (!p || !v) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{p.razon_social}</h1>
        <div className="font-mono text-sm text-slate-500">{p.rfc}</div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-3">
          <span className="text-lg font-semibold">Puntaje {v.puntaje}</span>
          <EtiquetaDecision decision={v.decision} />
        </div>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {v.motivos.map((m) => (
            <li key={m.regla}>+{m.puntos} · {m.descripcion}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">Hallazgos</h2>
        <ul className="space-y-2 text-sm">
          {v.hallazgos.map((h, i) => (
            <li key={i}>
              <span className="font-mono text-xs text-slate-500">{h.fuente}</span> · {h.detalle}
              {h.fecha_fuente && <span className="text-slate-400"> ({h.fecha_fuente})</span>}
            </li>
          ))}
        </ul>
      </section>

      {/* TODO(Samuel): resumen IA, llamada, botones aprobar/pausar/bloquear y PDF con hash */}
      <div className="flex gap-2">
        <button className="rounded bg-green-600 px-4 py-2 text-sm text-white">Aprobar</button>
        <button className="rounded bg-amber-500 px-4 py-2 text-sm text-white">Pausar</button>
        <button className="rounded bg-red-600 px-4 py-2 text-sm text-white">Bloquear</button>
      </div>
    </div>
  );
}
