// Bandeja: solo los casos que necesitan a una persona, explicados en lenguaje simple.
import Link from "next/link";
import { Alertas } from "@/components/Alertas";
import { EstadoDocumento } from "@/components/DocumentoProveedor";
import { Semaforo } from "@/components/Semaforo";
import { AutoRefrescar } from "@/components/cliente/AutoRefrescar";
import { almacen } from "@/lib/almacen/index.ts";
import { listo } from "@/lib/demo.ts";
import { resumenSimple } from "@/lib/explicar.ts";
import { enDias, pesos } from "@/lib/formato.ts";
import { HORAS_CASO_ANTIGUO, horasDesde, proximosPagos, ultimasVerificaciones } from "@/lib/servicios.ts";
import type { SolicitudDocumento } from "@/lib/tipos.ts";

export const dynamic = "force-dynamic";

const DIAS_PAGO_URGENTE = 7;

const antiguedad = (h: number) => (h < 1 ? "hace menos de 1 h" : h < 48 ? `hace ${h} h` : `hace ${Math.floor(h / 24)} días`);

export default async function Bandeja() {
  await listo();
  const db = almacen();
  const [casos, proveedores, verificaciones, pagos, documentos, alertas] = await Promise.all([
    db.casos.listar(), db.proveedores.listar(), ultimasVerificaciones(), proximosPagos(), db.documentos.listar(), db.alertas.listar(),
  ]);
  const pagoUrgente = (id: string) => { const p = pagos.get(id); return p && p.dias <= DIAS_PAGO_URGENTE ? p.dias : null; };
  // Orden: cambios de cuenta primero; luego los que tienen un pago esta semana (el más próximo primero); luego riesgo × monto.
  const abiertos = casos
    .filter((c) => c.estado === "pendiente" || c.estado === "pausado")
    .sort((a, b) =>
      Number(b.tipo === "clabe") - Number(a.tipo === "clabe")
      || (pagoUrgente(a.proveedor_id) ?? 99) - (pagoUrgente(b.proveedor_id) ?? 99)
      || b.prioridad - a.prioridad);
  const porId = new Map(proveedores.map((p) => [p.id, p]));
  const docPorProveedor = new Map<string, SolicitudDocumento>();
  for (const d of documentos.sort((a, b) => a.enviada_en.localeCompare(b.enviada_en))) docPorProveedor.set(d.proveedor_id, d);
  const aprobadosSolos = [...verificaciones.values()].filter((v) => v.decision === "liberar").length;
  const porPolitica = casos.filter((c) => c.decidido_por?.startsWith("Política:")).length;
  const antiguos = abiertos.filter((c) => horasDesde(c.creado_en) >= HORAS_CASO_ANTIGUO).length;

  return (
    <div className="space-y-4">
      <AutoRefrescar activo />
      <div>
        <h1 className="text-2xl font-semibold">Bandeja de la gestora</h1>
        <p className="text-slate-600">
          <strong>{abiertos.length}</strong> casos necesitan una decisión. Primero los cambios de cuenta, luego los que tienen un pago esta semana.
          {aprobadosSolos > 0 && <> Otros <strong>{aprobadosSolos}</strong> se aprobaron solos</>}
          {porPolitica > 0 && <> y <strong>{porPolitica}</strong> los resolvieron las <Link href="/automatizacion" className="underline">políticas automáticas</Link></>}.
          {antiguos > 0 && <span className="font-medium text-red-700"> ⏰ {antiguos} llevan más de {HORAS_CASO_ANTIGUO} h esperando.</span>}
        </p>
      </div>
      <Alertas alertas={alertas} />
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
            const horas = horasDesde(c.creado_en);
            const pago = pagos.get(p.id);
            const doc = docPorProveedor.get(p.id);
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
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className={`rounded-full px-2 py-0.5 ${horas >= HORAS_CASO_ANTIGUO ? "bg-red-100 font-semibold text-red-800" : "bg-slate-100 text-slate-600"}`}>⏰ {antiguedad(horas)}</span>
                        {pago && <span className={`rounded-full px-2 py-0.5 ${pago.dias <= DIAS_PAGO_URGENTE ? "bg-orange-100 font-semibold text-orange-800" : "bg-slate-100 text-slate-600"}`}>💸 {pesos(pago.monto)} por pagarle {enDias(pago.dias)}</span>}
                        {doc && <EstadoDocumento d={doc} />}
                      </div>
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
