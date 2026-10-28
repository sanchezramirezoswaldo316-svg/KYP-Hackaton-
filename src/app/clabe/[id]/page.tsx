import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefrescar } from "@/components/cliente/AutoRefrescar";
import { LineaTiempoClabe } from "@/components/LineaTiempoClabe";
import { BotonesDecision } from "@/components/cliente/BotonesDecision";
import { Chip } from "@/components/ui/Chip";
import { DatoClave } from "@/components/ui/DatoClave";
import { Panel } from "@/components/ui/Panel";
import { almacen } from "@/lib/almacen/index.ts";
import { listo } from "@/lib/demo.ts";
import { fecha, pesos } from "@/lib/formato.ts";
import { enmascararClabe } from "@/lib/validacion.ts";
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
  const vista = vistaLlamada(s, llamada, bitacora.filter((b) => b.entidad_id && ids.has(b.entidad_id)));
  const caso = casosSolicitud.find((c) => c.estado === "pendiente" || c.estado === "pausado");
  const monto = facturas.sort((a, b) => b.fecha.localeCompare(a.fecha))[0]?.monto ?? null;
  const fases = { por_llamar: "Por llamar", llamando: "En llamada", fallida: "Llamada fallida", terminada: "Terminada" };

  return <div className="space-y-5">
    <AutoRefrescar activo={vista.fase === "llamando"} />
    <header className="space-y-2">
      <Link href="/clabe" className="text-sm text-tinta-2 underline">← Cambios de cuenta</Link>
      <div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-semibold">Llamada de {p.razon_social}</h1><Chip tono={vista.fase === "terminada" ? "ok" : "medio"}>{fases[vista.fase]}</Chip></div>
      <Link href={`/expediente/${p.id}`} className="text-sm text-tinta underline">Ver expediente</Link>
    </header>
    <Panel titulo="Verificación de cuenta">
      <div className="grid gap-4 sm:grid-cols-3">
        <DatoClave etiqueta="Cuenta anterior" valor={enmascararClabe(p.clabe)} />
        <DatoClave etiqueta="Cuenta solicitada" valor={enmascararClabe(s.clabe_nueva)} />
        <DatoClave etiqueta="Última factura" valor={monto === null ? "—" : pesos(monto)} />
      </div>
      {s.telefono_en_solicitud && <p className="mt-4 text-sm text-tinta-2">El teléfono de la solicitud ({s.telefono_en_solicitud}) no se marca. Se llama al registrado en el alta.</p>}
    </Panel>
    <Panel titulo="Estado del pago"><p className="font-semibold">{vista.dinero.titulo}</p><p className="text-sm text-tinta-2">{vista.dinero.texto}</p></Panel>
    <Panel titulo="Llamada y evidencia"><LineaTiempoClabe s={s} llamada={llamada} monto={monto} simular={simulacionPermitida()} demo={db.modo === "memoria"} /></Panel>
    <Panel titulo="Criterios verificados"><dl className="space-y-2">{vista.criterios.map((c) => <div key={c.id} className="flex justify-between gap-3 border-b border-borde py-2 text-sm"><dt>{c.texto}</dt><dd className="font-semibold">{c.valor}</dd></div>)}</dl></Panel>
    <Panel titulo="Eventos"><ol className="space-y-2 text-sm">{vista.eventos.map((e, i) => <li key={`${e.fecha}-${i}`}><span className="text-tinta-3">{fecha(e.fecha)}</span> · {e.titulo} <span className="text-tinta-3">({e.fuente})</span></li>)}</ol></Panel>
    {caso && <Panel titulo="Tu decisión"><BotonesDecision casoId={caso.id} /></Panel>}
  </div>;
}
