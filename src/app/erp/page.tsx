// ERP simulado: estado de pago de cada factura según la decisión de KYP.
import Link from "next/link";
import { Etiqueta } from "@/components/Etiquetas";
import { almacen } from "@/lib/almacen/index.ts";
import { listo } from "@/lib/demo.ts";
import { fecha, pesos } from "@/lib/formato.ts";
import { estadoPago } from "@/lib/servicios.ts";
import { Icono } from "@/components/Icono";

export const dynamic = "force-dynamic";

const TONO = { liberada: "verde", pausada: "ambar", bloqueada: "rojo" } as const;
const TEXTO = { liberada: "Lista para pago", pausada: "Congelada", bloqueada: "Bloqueada" } as const;
const ICONO = { liberada: "ok", pausada: "pausa", bloqueada: "prohibido" } as const;
const COLOR = { liberada: "text-ok", pausada: "text-alerta", bloqueada: "text-peligro" } as const;

export default async function Erp() {
  await listo();
  const db = almacen();
  const [facturas, proveedores] = await Promise.all([db.facturas.listar(), db.proveedores.listar()]);
  const porId = new Map(proveedores.map((p) => [p.id, p]));
  const filas = facturas.map((f) => ({ f, p: porId.get(f.proveedor_id)! })).filter((x) => x.p);
  const totales = { liberada: 0, pausada: 0, bloqueada: 0 };
  for (const { f, p } of filas) totales[estadoPago(p)] += f.monto;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Pagos a proveedores</h1>
        <p className="text-texto-3">Así se vería en el sistema contable de la empresa (SAP, CONTPAQi…): las facturas de proveedores con riesgo no se pagan hasta que una persona decida. <span className="text-xs text-texto-3">(Simulación: la conexión real es fase Enterprise.)</span></p>
      </div>
      <div className="grid gap-px overflow-hidden rounded border border-borde bg-borde sm:grid-cols-3">
        {(["liberada", "pausada", "bloqueada"] as const).map((e) => (
          <div key={e} className="bg-panel px-4 py-3">
            <div className="flex items-center justify-between"><span className="rotulo">{TEXTO[e]}</span><Icono nombre={ICONO[e]} className={`h-4 w-4 ${COLOR[e]}`} /></div>
            <div className="mt-1 font-mono text-2xl font-semibold tabular-nums">{pesos(totales[e])}</div>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded border border-borde bg-panel">
        <table className="w-full text-sm">
          <thead className="border-b border-borde bg-panel-2 text-left"><tr><th className="px-3 py-2">Folio</th><th className="px-3 py-2">Proveedor</th><th className="px-3 py-2">Fecha</th><th className="px-3 py-2">Se paga</th><th className="px-3 py-2 text-right">Monto</th><th className="px-3 py-2">Pago</th></tr></thead>
          <tbody>
            {filas.sort((a, b) => b.f.monto - a.f.monto).slice(0, 300).map(({ f, p }) => {
              const e = estadoPago(p);
              return (
                <tr key={f.id} className="border-t border-borde">
                  <td className="px-3 py-2 font-mono">{f.folio}</td>
                  <td className="px-3 py-2"><Link href={`/expediente/${p.id}`} className="text-acento-2 hover:underline">{p.razon_social}</Link></td>
                  <td className="px-3 py-2 font-mono text-xs text-texto-2">{fecha(f.fecha)}</td>
                  <td className="px-3 py-2 font-mono text-xs text-texto-2">{f.vence ? fecha(f.vence) : "—"}</td>
                  <td className="px-3 py-2 text-right font-mono">{pesos(f.monto)}</td>
                  <td className="px-3 py-2"><Etiqueta tono={TONO[e]}><Icono nombre={ICONO[e]} className="h-3 w-3" />{TEXTO[e]}</Etiqueta></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
