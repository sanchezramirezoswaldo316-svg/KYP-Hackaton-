// Monitor de la llamada de verificación de un cambio de CLABE.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icono } from "@/components/Icono";
import { MonitorLlamada, PildoraLlamada } from "@/components/MonitorLlamada";
import { AutoRefrescar } from "@/components/cliente/AutoRefrescar";
import { almacen } from "@/lib/almacen/index.ts";
import { listo } from "@/lib/demo.ts";
import { simulacionPermitida } from "@/lib/voz/elevenlabs.ts";
import { vistaLlamada } from "@/lib/voz/monitor.ts";

export const dynamic = "force-dynamic";

export default async function MonitorDeLlamada({ params }: { params: Promise<{ id: string }> }) {
  await listo();
  const db = almacen();
  const s = await db.solicitudes.obtener((await params).id);
  if (!s) notFound();
  const p = await db.proveedores.obtener(s.proveedor_id);
  if (!p) notFound();
  const [llamadas, casos, facturas, bitacora] = await Promise.all([
    db.llamadas.listar({ solicitud_id: s.id }),
    db.casos.listar({ proveedor_id: p.id, tipo: "clabe" }),
    db.facturas.listar({ proveedor_id: p.id }),
    db.bitacora.listar(),
  ]);
  const llamada = llamadas[0];
  const casosSolicitud = casos.filter((c) => c.solicitud_id === s.id);
  const ids = new Set([s.id, ...casosSolicitud.map((c) => c.id)]);
  const v = vistaLlamada(s, llamada, bitacora.filter((b) => b.entidad_id && ids.has(b.entidad_id)));
  const caso = casosSolicitud.find((c) => c.estado === "pendiente" || c.estado === "pausado");
  const monto = facturas.sort((a, b) => b.fecha.localeCompare(a.fecha))[0]?.monto ?? null;

  return (
    <div className="space-y-4">
      <AutoRefrescar activo={v.fase === "llamando"} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <Link href="/clabe" className="inline-flex items-center gap-1 font-mono text-[11px] tracking-wider text-tinta-3 uppercase hover:text-acento">
            <Icono nombre="atras" className="h-3 w-3" />Cambios de cuenta / Monitor de llamada
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight">{p.razon_social}</h1>
            <PildoraLlamada v={v} />
          </div>
        </div>
        <Link href={`/expediente/${p.id}`} className="inline-flex items-center gap-2 rounded border border-borde-fuerte bg-panel px-3 py-2 text-sm font-medium text-tinta-2 hover:bg-superficie">
          <Icono nombre="documento" />Ver expediente
        </Link>
      </div>
      <MonitorLlamada v={v} p={p} s={s} llamada={llamada} monto={monto} caso={caso} simular={simulacionPermitida()} />
    </div>
  );
}
