// Bandeja: solo los casos que necesitan a una persona, explicados en lenguaje simple.
import Link from "next/link";
import { Semaforo } from "@/components/Semaforo";
import { AutoRefrescar } from "@/components/cliente/AutoRefrescar";
import { almacen } from "@/lib/almacen/index.ts";
import { listo } from "@/lib/demo.ts";
import { resumenSimple } from "@/lib/explicar.ts";
import { pesos } from "@/lib/formato.ts";
import { ultimasVerificaciones } from "@/lib/servicios.ts";

export const dynamic = "force-dynamic";

export default async function Bandeja() {
  await listo();
  const db = almacen();
  const [casos, proveedores, verificaciones] = await Promise.all([db.casos.listar(), db.proveedores.listar(), ultimasVerificaciones()]);
  const abiertos = casos
    .filter((c) => c.estado === "pendiente" || c.estado === "pausado")
    .sort((a, b) => Number(b.tipo === "clabe") - Number(a.tipo === "clabe") || b.prioridad - a.prioridad);
  const porId = new Map(proveedores.map((p) => [p.id, p]));
  const aprobadosSolos = [...verificaciones.values()].filter((v) => v.decision === "liberar").length;

  return (
    <div className="space-y-4">
      <AutoRefrescar activo />
      <div>
        <h1 className="text-2xl font-semibold">Bandeja de la gestora</h1>
        <p className="text-slate-600">
          <strong>{abiertos.length}</strong> casos necesitan una decisión, del más urgente al menos urgente.
          {aprobadosSolos > 0 && <> Otros <strong>{aprobadosSolos}</strong> proveedores se aprobaron solos y no aparecen aquí.</>}
        </p>
      </div>
      {abiertos.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-lg text-slate-600">🎉 No hay casos pendientes.</div>
      ) : (
        <ul data-tour="bandeja" className="space-y-3">
          {abiertos.map((c, i) => {
            const p = porId.get(c.proveedor_id);
            if (!p) return null;
            const v = verificaciones.get(p.id);
            const razones = c.tipo === "clabe" ? [`Alguien pidió cambiar su cuenta bancaria: ${c.motivo.charAt(0).toLowerCase()}${c.motivo.slice(1)}`] : resumenSimple(v?.hallazgos ?? []);
            const barra = c.decision_sugerida === "bloquear" ? "bg-red-500" : "bg-amber-400";
            return (
              <li key={c.id} className="animar-aparecer" style={{ animationDelay: `${Math.min(i, 10) * 60}ms` }}>
                <Link href={`/expediente/${c.proveedor_id}`} className="flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-blue-300 hover:shadow-md">
                  <span className={`w-2 shrink-0 ${barra}`} />
                  <div className="flex flex-1 flex-wrap items-center gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {c.tipo === "clabe" && <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">🚨 Posible fraude de cuenta</span>}
                        <span className="font-semibold">{p.razon_social}</span>
                      </div>
                      <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
                        {razones.map((r) => <li key={r}>• {r}</li>)}
                      </ul>
                    </div>
                    <div className="text-right">
                      <Semaforo decision={c.decision_sugerida} />
                      <div className="mt-1 text-xs text-slate-500">le compramos {pesos(p.monto_anual)} al año</div>
                    </div>
                    <span className="text-blue-700" aria-hidden>→</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
