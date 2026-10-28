// ERP simulado: estado de pago de cada factura según la decisión de KYP.
import Link from "next/link";
import { Chip } from "@/components/ui/Chip";
import { DatoClave } from "@/components/ui/DatoClave";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { Tabla } from "@/components/ui/Tabla";
import { almacen } from "@/lib/almacen/index.ts";
import { listo } from "@/lib/demo.ts";
import { fecha, pesos } from "@/lib/formato.ts";
import { estadoPago } from "@/lib/servicios.ts";

export const dynamic = "force-dynamic";

const TEXTO = { liberada: "✅ Lista para pago", pausada: "⏸️ Congelada", bloqueada: "⛔ Bloqueada" } as const;

export default async function Erp() {
  await listo();
  const db = almacen();
  const [facturas, proveedores] = await Promise.all([db.facturas.listar(), db.proveedores.listar()]);
  const porId = new Map(proveedores.map((p) => [p.id, p]));
  const filas = facturas.map((f) => ({ f, p: porId.get(f.proveedor_id)! })).filter((x) => x.p);
  const totales = { liberada: 0, pausada: 0, bloqueada: 0 };
  for (const { f, p } of filas) totales[estadoPago(p)] += f.monto;

  return (
    <div className="space-y-6">
      <header><h1 className="text-xl font-semibold">Cuentas por pagar (simulado)</h1><p className="mt-1 text-sm text-tinta-2">Vista de demostración. La integración con SAP, NetSuite y CONTPAQi corresponde a la fase Enterprise.</p></header>
      <div className="grid gap-4 border-y border-borde py-4 sm:grid-cols-3">
        <DatoClave etiqueta="Liberado" valor={pesos(totales.liberada)} />
        <DatoClave etiqueta="En pausa" valor={pesos(totales.pausada)} />
        <DatoClave etiqueta="Bloqueado" valor={pesos(totales.bloqueada)} />
      </div>
      {filas.length === 0 ? <EstadoVacio titulo="No hay facturas" texto="Las facturas aparecerán aquí cuando se carguen proveedores de ejemplo." /> : <Tabla>
          <thead className="bg-lienzo text-left text-xs font-medium text-tinta-2"><tr><th className="px-4 py-3">Factura</th><th className="px-4 py-3">Proveedor</th><th className="px-4 py-3">Vencimiento</th><th className="px-4 py-3 text-right">Monto</th><th className="px-4 py-3">Estado</th></tr></thead>
          <tbody>
            {filas.sort((a, b) => b.f.monto - a.f.monto).slice(0, 300).map(({ f, p }) => {
              const e = estadoPago(p);
              return (
                <tr key={f.id} className="border-t border-borde hover:bg-slate-50">
                  <td className="px-4 py-3"><span className="font-mono text-xs">{f.folio}</span><span className="mt-0.5 block text-xs text-tinta-3">{fecha(f.fecha)}</span></td>
                  <td className="px-4 py-3"><Link href={`/expediente/${p.id}`} className="font-medium text-marca hover:underline">{p.razon_social}</Link></td>
                  <td className="px-4 py-3 text-tinta-2">{f.vence ? fecha(f.vence) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{pesos(f.monto)}</td>
                  <td className="px-4 py-3"><Chip tono={e === "liberada" ? "ok" : e === "pausada" ? "medio" : "alto"}>{TEXTO[e].replace(/^[^ ]+ /, "")}</Chip></td>
                </tr>
              );
            })}
          </tbody>
      </Tabla>}
    </div>
  );
}
