import Link from "next/link";
import { Chip } from "@/components/ui/Chip";
import { Panel } from "@/components/ui/Panel";
import { almacen } from "@/lib/almacen/index.ts";
import { listo } from "@/lib/demo.ts";
import { fecha } from "@/lib/formato.ts";

export const dynamic = "force-dynamic";

export default async function Llamadas() {
  await listo();
  const db = almacen();
  const [solicitudes, proveedores, llamadas] = await Promise.all([db.solicitudes.listar(), db.proveedores.listar(), db.llamadas.listar()]);
  const porId = new Map(proveedores.map((p) => [p.id, p]));
  const conLlamada = new Set(llamadas.map((l) => l.solicitud_id));
  return <div className="space-y-5"><div><h1 className="text-2xl font-semibold">Monitor de llamadas</h1><p className="text-sm text-tinta-2">Verificación de cambios de cuenta bancaria.</p></div><Panel titulo="Solicitudes de cambio de cuenta"><ul className="divide-y divide-borde">{solicitudes.sort((a, b) => b.creado_en.localeCompare(a.creado_en)).map((s) => <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div><Link href={`/clabe/${s.id}`} className="font-semibold text-tinta underline">{porId.get(s.proveedor_id)?.razon_social ?? "Proveedor"}</Link><p className="text-tinta-3">{fecha(s.creado_en)}</p></div><Chip tono={conLlamada.has(s.id) ? "ok" : "medio"}>{conLlamada.has(s.id) ? "Con evidencia" : "Pendiente"}</Chip></li>)}</ul>{solicitudes.length === 0 && <p className="text-sm text-tinta-3">Aún no hay solicitudes.</p>}</Panel></div>;
}
