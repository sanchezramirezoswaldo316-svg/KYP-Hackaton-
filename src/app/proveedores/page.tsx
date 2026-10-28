import Link from "next/link";
import { EstadoSimple, Semaforo } from "@/components/Semaforo";
import { almacen } from "@/lib/almacen/index.ts";
import { listo } from "@/lib/demo.ts";
import { pesos } from "@/lib/formato.ts";
import { ultimasVerificaciones } from "@/lib/servicios.ts";

export const dynamic = "force-dynamic";

export default async function Proveedores({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string }> }) {
  await listo();
  const { q = "", estado = "" } = await searchParams;
  const [todos, verificaciones] = await Promise.all([almacen().proveedores.listar(), ultimasVerificaciones()]);
  const texto = q.trim().toUpperCase();
  const lista = todos
    .filter((p) => (!texto || p.rfc.includes(texto) || p.razon_social.toUpperCase().includes(texto)) && (!estado || p.estado === estado))
    .sort((a, b) => (verificaciones.get(b.id)?.puntaje ?? 0) - (verificaciones.get(a.id)?.puntaje ?? 0));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Proveedores</h1>
          <p className="text-sm text-tinta-3">{lista.length} de {todos.length}, del más riesgoso al más confiable</p>
        </div>
        <Link href="/proveedores/nuevo" className="rounded bg-marca px-4 py-2 text-sm font-medium text-white hover:bg-marca">+ Nuevo proveedor</Link>
      </div>
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Buscar por nombre o RFC" className="w-72 rounded border border-borde-fuerte px-3 py-2 text-sm" />
        <select name="estado" defaultValue={estado} className="rounded border border-borde-fuerte px-3 py-2 text-sm">
          <option value="">Todos</option>
          <option value="aprobado">Pagos activos</option>
          <option value="en_revision">🔎 En revisión</option>
          <option value="pausado">Pagos congelados</option>
          <option value="bloqueado">Bloqueados</option>
        </select>
        <button className="rounded border border-borde-fuerte bg-white px-3 py-2 text-sm">Filtrar</button>
      </form>
      <div className="overflow-x-auto rounded-lg border border-borde bg-white">
        <table className="w-full text-sm">
          <thead className="bg-superficie text-left text-tinta-3">
            <tr><th className="p-3">Proveedor</th><th className="p-3">Qué nos vende</th><th className="p-3 text-right">Compras al año</th><th className="p-3">Riesgo</th><th className="p-3">Pagos</th></tr>
          </thead>
          <tbody>
            {lista.slice(0, 300).map((p) => {
              const v = verificaciones.get(p.id);
              return (
                <tr key={p.id} className="border-t border-borde hover:bg-superficie">
                  <td className="p-3"><Link href={`/expediente/${p.id}`} className="font-medium text-tinta hover:underline">{p.razon_social}</Link><div className="font-mono text-xs text-tinta-3">{p.rfc}</div></td>
                  <td className="p-3 text-tinta-3">{p.giro_declarado ?? "—"}</td>
                  <td className="p-3 text-right">{pesos(p.monto_anual)}</td>
                  <td className="p-3">{v && <Semaforo decision={v.decision} />}</td>
                  <td className="p-3"><EstadoSimple estado={p.estado} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {lista.length > 300 && <p className="p-3 text-xs text-tinta-3">Mostrando 300 de {lista.length}. Usa la búsqueda para encontrar otros.</p>}
      </div>
    </div>
  );
}
