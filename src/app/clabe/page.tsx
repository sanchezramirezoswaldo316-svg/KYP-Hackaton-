// Cambios de cuenta bancaria: pago congelado + llamada al teléfono registrado.
import Link from "next/link";
import { LineaTiempoClabe } from "@/components/LineaTiempoClabe";
import { Tarjeta } from "@/components/Tarjeta";
import { Termino } from "@/components/Termino";
import { AutoRefrescar } from "@/components/cliente/AutoRefrescar";
import { FormularioClabe } from "@/components/cliente/FormularioClabe";
import { almacen } from "@/lib/almacen/index.ts";
import { listo } from "@/lib/demo.ts";
import { simulacionPermitida } from "@/lib/voz/elevenlabs.ts";

export const dynamic = "force-dynamic";

export default async function Clabe({ searchParams }: { searchParams: Promise<{ proveedor?: string }> }) {
  await listo();
  const { proveedor } = await searchParams;
  const db = almacen();
  const [proveedores, solicitudes, llamadas, facturas, fallos] = await Promise.all([db.proveedores.listar(), db.solicitudes.listar(), db.llamadas.listar(), db.facturas.listar(), db.bitacora.listar({ accion: "llamada_fallida" })]);
  const porId = new Map(proveedores.map((p) => [p.id, p]));
  const simular = simulacionPermitida();
  const enLlamada = solicitudes.some((s) => s.estado === "en_llamada" && !llamadas.some((l) => l.solicitud_id === s.id));

  return (
    <div className="space-y-5">
      <AutoRefrescar activo={enLlamada} />
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Cambios de cuenta bancaria</h1>
        <p className="text-texto-3">
          Un fraude común: alguien se hace pasar por un proveedor y pide cambiar su <Termino t="CLABE" /> para quedarse con el pago.
          Cuando llega una solicitud, <strong>el pago se congela</strong>. {simular
            ? "En esta demo simulamos la verificación y guardamos el resultado como evidencia de prueba; no se realiza una llamada telefónica."
            : "El agente llama al teléfono registrado desde el alta, nunca al número que viene en la solicitud."}
        </p>
      </div>
      {simular && <details className="rounded border border-alerta/40 bg-alerta/10 p-4">
        <summary className="cursor-pointer font-medium">Escuchar demostración de voz pregrabada</summary>
        <p className="my-2 text-sm">Audio sintético con datos ficticios generado con ElevenLabs. No es una llamada real ni evidencia de esta solicitud.</p>
        <audio controls preload="none" src="/api/voz/demo/audio" aria-label="Demostración pregrabada y sintética" />
        <a className="mt-2 block text-sm text-acento-2 underline" href="/api/voz/demo/audio" download="DEMO-PREGRABADA-SINTETICA.mp3">Descargar audio de respaldo</a>
      </details>}
      <Tarjeta icono="correo" titulo="Registrar una solicitud recibida">
        <div data-tour="form-clabe">
          <FormularioClabe
            seleccionado={proveedor}
            simulada={simular}
            proveedores={proveedores.filter((p) => p.estado !== "bloqueado").sort((a, b) => a.razon_social.localeCompare(b.razon_social)).map(({ id, razon_social, rfc }) => ({ id, razon_social, rfc }))}
          />
        </div>
      </Tarjeta>
      {solicitudes.length === 0 ? (
        <p className="text-sm text-texto-2">Aún no hay solicitudes.</p>
      ) : (
        solicitudes.sort((a, b) => b.creado_en.localeCompare(a.creado_en)).map((s) => {
          const p = porId.get(s.proveedor_id);
          const f = facturas.filter((x) => x.proveedor_id === s.proveedor_id).sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
          return (
            <Tarjeta key={s.id} titulo={p?.razon_social} acciones={<Link href={`/expediente/${s.proveedor_id}`} className="font-mono text-xs text-acento-2 hover:underline">VER EXPEDIENTE →</Link>}>
              <LineaTiempoClabe s={s} llamada={llamadas.find((l) => l.solicitud_id === s.id)} monto={f?.monto ?? null} simular={simular} fallo={fallos.some(b => b.entidad_id === s.id)} />
            </Tarjeta>
          );
        })
      )}
    </div>
  );
}
