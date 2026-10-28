// Cambios de cuenta bancaria: centro de llamadas de verificación (pago congelado + llamada al teléfono registrado).
import Link from "next/link";
import { Icono, type NombreIcono } from "@/components/Icono";
import { PildoraLlamada } from "@/components/MonitorLlamada";
import { Tarjeta } from "@/components/Tarjeta";
import { Termino } from "@/components/Termino";
import { AutoRefrescar } from "@/components/cliente/AutoRefrescar";
import { FormularioClabe } from "@/components/cliente/FormularioClabe";
import { almacen } from "@/lib/almacen/index.ts";
import { listo } from "@/lib/demo.ts";
import { fecha, pesos } from "@/lib/formato.ts";
import { vistaLlamada } from "@/lib/voz/monitor.ts";

export const dynamic = "force-dynamic";

export default async function Clabe({ searchParams }: { searchParams: Promise<{ proveedor?: string }> }) {
  await listo();
  const { proveedor } = await searchParams;
  const db = almacen();
  const [proveedores, solicitudes, llamadas, facturas, bitacora] = await Promise.all([db.proveedores.listar(), db.solicitudes.listar(), db.llamadas.listar(), db.facturas.listar(), db.bitacora.listar({ entidad: "solicitud_clabe" })]);
  const porId = new Map(proveedores.map((p) => [p.id, p]));
  const filas = solicitudes
    .sort((a, b) => b.creado_en.localeCompare(a.creado_en))
    .map((s) => {
      const llamada = llamadas.find((l) => l.solicitud_id === s.id);
      const f = facturas.filter((x) => x.proveedor_id === s.proveedor_id).sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
      return { s, p: porId.get(s.proveedor_id), monto: f?.monto ?? null, v: vistaLlamada(s, llamada, bitacora.filter((b) => b.entidad_id === s.id)) };
    });
  const cuenta = (f: (x: (typeof filas)[number]) => boolean) => filas.filter(f).length;
  const kpis: { titulo: string; valor: number; detalle: string; icono: NombreIcono }[] = [
    { titulo: "Solicitudes", valor: filas.length, detalle: "cada una congela el pago", icono: "banco" },
    { titulo: "En llamada o por llamar", valor: cuenta((x) => x.v.fase === "llamando" || x.v.fase === "por_llamar"), detalle: "pago congelado", icono: "llamadaSaliente" },
    { titulo: "Confirmadas", valor: cuenta((x) => x.v.resultado === "confirmado"), detalle: "el proveedor reconoció el cambio", icono: "escudoOk" },
    { titulo: "Fraudes detenidos", valor: cuenta((x) => x.v.resultado === "no_reconoce"), detalle: "el proveedor real no lo pidió", icono: "escudoX" },
    { titulo: "Revisión manual", valor: cuenta((x) => x.v.fase === "fallida" || x.v.resultado === "sin_respuesta" || x.v.resultado === "datos_no_coinciden"), detalle: "sin respuesta, datos distintos o falla", icono: "alerta" },
  ];
  const protegido = filas.filter((x) => x.v.resultado === "no_reconoce").reduce((t, x) => t + (x.monto ?? 0), 0);

  return (
    <div className="space-y-5">
      <AutoRefrescar activo={filas.some((x) => x.v.fase === "llamando")} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Cambios de cuenta bancaria</h1>
          <p className="max-w-3xl text-tinta-3">
            Un fraude común: alguien se hace pasar por un proveedor y pide cambiar su <Termino t="CLABE" /> para quedarse con el pago.
            Cuando llega una solicitud, <strong>el pago se congela</strong> y nuestro agente de voz <strong>llama al teléfono que el proveedor registró desde el principio</strong>, nunca al número que viene en la solicitud.
          </p>
        </div>
        {protegido > 0 && (
          <div className="rounded-panel border border-acento bg-acento-fondo px-4 py-2 text-right">
            <div className="rotulo text-acento!">Dinero protegido</div>
            <div className="font-mono text-2xl font-semibold tabular-nums">{pesos(protegido)}</div>
          </div>
        )}
      </div>

      <div className="grid gap-px overflow-hidden rounded-panel border border-borde bg-borde sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.titulo} className="bg-panel px-4 py-3">
            <div className="flex items-center justify-between"><span className="rotulo">{k.titulo}</span><Icono nombre={k.icono} className="h-4 w-4 text-tinta-3" /></div>
            <div className="mt-1.5 font-mono text-3xl font-semibold tabular-nums">{k.valor}</div>
            <div className="text-xs text-tinta-3">{k.detalle}</div>
          </div>
        ))}
      </div>

      <Tarjeta titulo="Llamadas de verificación" acciones={<span className="font-mono text-xs text-tinta-3">{filas.length} en total</span>}>
        {filas.length === 0 ? (
          <p className="text-sm text-tinta-3">Aún no hay solicitudes. Registra una abajo para ver el monitor de la llamada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="border-b border-borde text-left text-xs text-tinta-3">
                <tr><th className="py-2 pr-4 font-medium">Estado</th><th className="py-2 pr-4 font-medium">Proveedor</th><th className="py-2 pr-4 font-medium">Teléfono de la solicitud</th><th className="py-2 pr-4 font-medium">Recibida</th><th className="py-2 pr-4 text-right font-medium">Pago en juego</th><th className="py-2" /></tr>
              </thead>
              <tbody>
                {filas.map(({ s, p, monto, v }) => (
                  <tr key={s.id} className="border-t border-borde hover:bg-hover">
                    <td className="py-2.5 pr-4"><PildoraLlamada v={v} /></td>
                    <td className="py-2.5 pr-4 font-medium">{p?.razon_social ?? "—"}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-tinta-3">{s.telefono_en_solicitud ? <span className="line-through">{s.telefono_en_solicitud}</span> : "—"}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-tinta-2">{fecha(s.creado_en)}</td>
                    <td className="py-2.5 pr-4 text-right font-mono">{monto === null ? "—" : pesos(monto)}</td>
                    <td className="py-2.5 text-right">
                      <Link href={`/clabe/${s.id}`} className={`inline-flex items-center gap-1.5 rounded-control px-3 py-1.5 text-xs font-medium ${v.fase === "llamando" || v.fase === "por_llamar" ? "bg-marca text-white hover:bg-marca-2" : "border border-borde-fuerte text-tinta-2 hover:bg-hover"}`}>
                        <Icono nombre="radar" className="h-3.5 w-3.5" />{v.fase === "llamando" ? "Monitorear" : v.fase === "por_llamar" ? "Abrir llamada" : "Ver llamada"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      <Tarjeta titulo="Registrar una solicitud recibida">
        <div data-tour="form-clabe">
          <FormularioClabe
            seleccionado={proveedor}
            proveedores={proveedores.filter((p) => p.estado !== "bloqueado").sort((a, b) => a.razon_social.localeCompare(b.razon_social)).map(({ id, razon_social, rfc }) => ({ id, razon_social, rfc }))}
          />
        </div>
      </Tarjeta>
    </div>
  );
}
