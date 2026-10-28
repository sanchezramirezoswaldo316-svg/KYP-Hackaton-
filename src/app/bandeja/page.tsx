// Bandeja de excepciones: solo los casos que necesitan a una persona.
import Link from "next/link";
import { Etiqueta, EtiquetaDecision } from "@/components/Etiquetas";
import { almacen } from "@/lib/almacen/index.ts";
import { listo } from "@/lib/demo.ts";
import { fecha, pesos } from "@/lib/formato.ts";
import { ultimasVerificaciones } from "@/lib/servicios.ts";

export const dynamic = "force-dynamic";

export default async function Bandeja() {
  await listo();
  const db = almacen();
  const [casos, proveedores, verificaciones] = await Promise.all([db.casos.listar(), db.proveedores.listar(), ultimasVerificaciones()]);
  const abiertos = casos.filter((c) => c.estado === "pendiente" || c.estado === "pausado").sort((a, b) => b.prioridad - a.prioridad);
  const porId = new Map(proveedores.map((p) => [p.id, p]));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Bandeja de excepciones</h1>
        <p className="text-sm text-slate-600">{abiertos.length} casos abiertos, ordenados por riesgo × monto. Los proveedores limpios no aparecen aquí: se liberaron solos.</p>
      </div>
      {abiertos.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-600">No hay casos pendientes. 🎉</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-slate-600">
              <tr>
                <th className="p-3">Proveedor</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Motivo</th>
                <th className="p-3 text-right">Puntaje</th>
                <th className="p-3 text-right">Monto anual</th>
                <th className="p-3">Sugerencia</th>
                <th className="p-3">Desde</th>
              </tr>
            </thead>
            <tbody>
              {abiertos.map((c) => {
                const p = porId.get(c.proveedor_id);
                if (!p) return null;
                return (
                  <tr key={c.id} className="border-t border-slate-100 align-top hover:bg-slate-50">
                    <td className="p-3">
                      <Link href={`/expediente/${p.id}`} className="font-medium text-blue-800 hover:underline">{p.razon_social}</Link>
                      <div className="font-mono text-xs text-slate-500">{p.rfc}</div>
                    </td>
                    <td className="p-3">{c.tipo === "clabe" ? <Etiqueta tono="rojo">Cambio de CLABE</Etiqueta> : <Etiqueta>Alta</Etiqueta>}{c.estado === "pausado" && <div className="mt-1"><Etiqueta tono="ambar">En pausa</Etiqueta></div>}</td>
                    <td className="max-w-xs p-3 text-slate-700">{c.motivo}</td>
                    <td className="p-3 text-right font-medium">{c.tipo === "clabe" ? "—" : verificaciones.get(p.id)?.puntaje}</td>
                    <td className="p-3 text-right">{pesos(p.monto_anual)}</td>
                    <td className="p-3"><EtiquetaDecision decision={c.decision_sugerida} /></td>
                    <td className="p-3 text-xs text-slate-500">{fecha(c.creado_en)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
