// Bandeja: solo los casos que necesitan a una persona, explicados en lenguaje simple.
import Link from "next/link";
import { Alertas } from "@/components/Alertas";
import { EstadoDocumento } from "@/components/DocumentoProveedor";
import { Semaforo } from "@/components/Semaforo";
import { Chip } from "@/components/ui/Chip";
import { DatoClave } from "@/components/ui/DatoClave";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { Tabla } from "@/components/ui/Tabla";
import { AutoRefrescar } from "@/components/cliente/AutoRefrescar";
import { almacen } from "@/lib/almacen/index.ts";
import { listo } from "@/lib/demo.ts";
import { resumenSimple } from "@/lib/explicar.ts";
import { enDias, pesos } from "@/lib/formato.ts";
import { horasDesde, proximosPagos, ultimasVerificaciones } from "@/lib/servicios.ts";
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
  const clabeEnPausa = abiertos.filter((c) => c.tipo === "clabe").length;
  const montoExpuesto = abiertos.reduce((total, c) => total + (pagos.get(c.proveedor_id)?.monto ?? 0), 0);

  return (
    <div className="space-y-6">
      <AutoRefrescar activo />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-xl font-semibold">Bandeja de excepciones</h1><p className="mt-1 text-sm text-tinta-2">{abiertos.length} casos pendientes · ordenados por riesgo y monto</p></div>
        <span className="text-xs text-tinta-3">Actualizado hace menos de 1 min</span>
      </header>
      <div className="grid gap-4 border-y border-borde py-4 sm:grid-cols-2 lg:grid-cols-4">
        <DatoClave etiqueta="Pendientes" valor={abiertos.length} />
        <DatoClave etiqueta="En pausa por CLABE" valor={clabeEnPausa} />
        <DatoClave etiqueta="Monto expuesto" valor={pesos(montoExpuesto)} />
        <DatoClave etiqueta="Aprobados automáticamente" valor={aprobadosSolos} />
      </div>
      <Alertas alertas={alertas} />
      {abiertos.length === 0 ? (
        <EstadoVacio titulo="No hay casos pendientes" texto="Los proveedores con riesgo bajo se aprueban automáticamente." />
      ) : (
        <Tabla>
          <thead className="border-y border-borde text-left text-xs font-medium text-tinta-3"><tr><th className="px-4 py-3">Caso</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Riesgo</th><th className="px-4 py-3 text-right">Monto anual</th><th className="px-4 py-3">Motivo principal</th><th className="px-4 py-3">Antigüedad</th><th className="px-4 py-3" /></tr></thead>
          <tbody data-tour="bandeja">
          {abiertos.map((c) => {
            const p = porId.get(c.proveedor_id);
            if (!p) return null;
            const v = verificaciones.get(p.id);
            const razon = c.tipo === "clabe" ? "Cambio de cuenta bancaria solicitado" : resumenSimple(v?.hallazgos ?? [])[0] ?? "Revisión pendiente";
            const horas = horasDesde(c.creado_en);
            const pago = pagos.get(p.id);
            const doc = docPorProveedor.get(p.id);
            return (
              <tr key={c.id} className={`h-12 border-b border-borde align-middle hover:bg-hover ${c.tipo === "clabe" ? "border-l-2 border-l-acento" : ""}`}>
                <td className="px-4 py-3"><Link href={`/expediente/${c.proveedor_id}`} className="font-medium text-marca hover:underline">{p.razon_social}</Link><div className="mt-0.5 text-xs text-tinta-3">{p.rfc}</div></td>
                <td className="px-4 py-3">{c.tipo === "clabe" ? <Chip tono="medio">Pago en pausa</Chip> : <Chip tono="info">Alta</Chip>}</td>
                <td className="px-4 py-3"><div className="flex items-center gap-2"><Semaforo decision={c.decision_sugerida} /><span className="tabular-nums text-xs text-tinta-3">{v?.puntaje ?? "—"}</span></div></td>
                <td className="px-4 py-3 text-right tabular-nums">{pesos(p.monto_anual)}</td>
                <td className="max-w-[220px] truncate px-4 py-3 text-tinta-2" title={razon}>{razon}{doc && <span className="ml-2"><EstadoDocumento d={doc} /></span>}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-tinta-2">{antiguedad(horas)}{pago && <span className="block text-tinta-3">{pesos(pago.monto)} {enDias(pago.dias)}</span>}</td>
                <td className="px-4 py-3 text-right"><Link href={`/expediente/${c.proveedor_id}`} className="text-sm font-medium text-marca hover:underline">Abrir</Link></td>
              </tr>
            );
          })}
          </tbody>
        </Tabla>
      )}
    </div>
  );
}
