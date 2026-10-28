// ERP simulado: estado de pago de cada factura según la decisión de KYP.
import Link from "next/link";
import { Etiqueta } from "@/components/Etiquetas";
import { almacen } from "@/lib/almacen/index.ts";
import { listo } from "@/lib/demo.ts";
import { fecha, pesos } from "@/lib/formato.ts";
import { estadoPago } from "@/lib/servicios.ts";

export const dynamic = "force-dynamic";

const TONO = { liberada: "verde", pausada: "ambar", bloqueada: "rojo" } as const;

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
        <h1 className="text-2xl font-semibold">ERP simulado · Cuentas por pagar</h1>
        <p className="text-sm text-slate-600">Así recibiría el ERP (SAP, NetSuite, CONTPAQi) las órdenes de KYP. La conexión real es fase Enterprise.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {(["liberada", "pausada", "bloqueada"] as const).map((e) => (
          <div key={e} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-sm capitalize text-slate-500">{e}s</div>
            <div className="text-xl font-semibold">{pesos(totales[e])}</div>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left text-slate-600"><tr><th className="p-3">Folio</th><th className="p-3">Proveedor</th><th className="p-3">Fecha</th><th className="p-3 text-right">Monto</th><th className="p-3">Pago</th></tr></thead>
          <tbody>
            {filas.sort((a, b) => b.f.monto - a.f.monto).slice(0, 300).map(({ f, p }) => {
              const e = estadoPago(p);
              return (
                <tr key={f.id} className="border-t border-slate-100">
                  <td className="p-3 font-mono">{f.folio}</td>
                  <td className="p-3"><Link href={`/expediente/${p.id}`} className="text-blue-800 hover:underline">{p.razon_social}</Link></td>
                  <td className="p-3 text-slate-600">{fecha(f.fecha)}</td>
                  <td className="p-3 text-right">{pesos(f.monto)}</td>
                  <td className="p-3"><Etiqueta tono={TONO[e]}>{e}</Etiqueta></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
