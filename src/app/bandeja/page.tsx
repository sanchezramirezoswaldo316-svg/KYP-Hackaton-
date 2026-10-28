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
import { Icono } from "@/components/Icono";

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
        <h1 className="text-xl font-semibold tracking-tight">Bandeja de la gestora</h1>
        <p className="text-texto-3 [&_strong]:font-mono [&_strong]:text-texto">
          <strong>{abiertos.length}</strong> casos necesitan una decisión. Primero los cambios de cuenta, luego los que tienen un pago esta semana.
          {aprobadosSolos > 0 && <> Otros <strong>{aprobadosSolos}</strong> se aprobaron solos</>}
          {porPolitica > 0 && <> y <strong>{porPolitica}</strong> los resolvieron las <Link href="/automatizacion" className="underline">políticas automáticas</Link></>}.
          {antiguos > 0 && <span className="font-medium text-peligro"> <Icono nombre="reloj" className="inline h-3.5 w-3.5 align-[-2px]" /> {antiguos} llevan más de {HORAS_CASO_ANTIGUO} h esperando.</span>}
        </p>
      </div>
      <Alertas alertas={alertas} />
      {abiertos.length === 0 ? (
        <div className="rounded-md border border-borde bg-panel p-10 text-center text-texto-2"><Icono nombre="escudoOk" className="mx-auto mb-2 h-8 w-8 text-ok" trazo={1.5} />No hay casos pendientes.</div>
      ) : (
        <ul data-tour="bandeja" className="space-y-2">
          {abiertos.map((c, i) => {
            const p = porId.get(c.proveedor_id);
            if (!p) return null;
            const v = verificaciones.get(p.id);
            const razones = c.tipo === "clabe" ? [`Alguien pidió cambiar su cuenta bancaria: ${c.motivo.charAt(0).toLowerCase()}${c.motivo.slice(1)}`] : resumenSimple(v?.hallazgos ?? []);
            const barra = c.decision_sugerida === "bloquear" ? "bg-peligro" : "bg-alerta";
            const horas = horasDesde(c.creado_en);
            const pago = pagos.get(p.id);
            const doc = docPorProveedor.get(p.id);
            return (
              <li key={c.id} className="animar-aparecer" style={{ animationDelay: `${Math.min(i, 10) * 60}ms` }}>
                <Link href={`/expediente/${c.proveedor_id}`} className="flex overflow-hidden rounded-md border border-borde bg-panel transition hover:border-acento/50 hover:bg-panel-2">
                  <span className={`w-1 shrink-0 ${barra}`} />
                  <div className="flex flex-1 flex-wrap items-center gap-4 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {c.tipo === "clabe" && <span className="inline-flex items-center gap-1 rounded-sm bg-peligro/15 px-1.5 py-px font-mono text-[10.5px] font-semibold tracking-wider text-peligro uppercase ring-1 ring-peligro/40"><Icono nombre="alerta" className="h-3 w-3" />Posible fraude de cuenta</span>}
                        <span className="font-semibold">{p.razon_social}</span>
                      </div>
                      <ul className="mt-1 space-y-0.5 text-sm text-texto-2">
                        {razones.map((r) => <li key={r} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 bg-texto-3" aria-hidden />{r}</li>)}
                      </ul>
                      <div className="mt-2 flex flex-wrap gap-2 font-mono text-[11px]">
                        <span className={`rounded-sm px-2 py-0.5 ${horas >= HORAS_CASO_ANTIGUO ? "bg-peligro/15 font-semibold text-peligro" : "bg-realce text-texto-2"} inline-flex items-center gap-1`}><Icono nombre="reloj" className="h-3 w-3" />{antiguedad(horas)}</span>
                        {pago && <span className={`rounded-sm px-2 py-0.5 ${pago.dias <= DIAS_PAGO_URGENTE ? "bg-alerta/15 font-semibold text-alerta" : "bg-realce text-texto-2"} inline-flex items-center gap-1`}><Icono nombre="dinero" className="h-3 w-3" />{pesos(pago.monto)} por pagarle {enDias(pago.dias)}</span>}
                        {doc && <EstadoDocumento d={doc} />}
                      </div>
                    </div>
                    <div className="text-right">
                      <Semaforo decision={c.decision_sugerida} />
                      <div className="mt-1 font-mono text-[11px] text-texto-3">le compramos {pesos(p.monto_anual)} al año</div>
                    </div>
                    <Icono nombre="adelante" className="h-4 w-4 text-texto-3" />
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
