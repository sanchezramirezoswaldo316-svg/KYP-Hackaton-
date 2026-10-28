// Panel de resultados: impacto en personas, horas y dinero.
import Link from "next/link";
import { Alertas } from "@/components/Alertas";
import { Icono, type NombreIcono } from "@/components/Icono";
import { Tarjeta } from "@/components/Tarjeta";
import { BotonAccion } from "@/components/cliente/BotonAccion";
import { Contador } from "@/components/cliente/Contador";
import { Personas } from "@/components/cliente/Personas";
import { BarrasHoras } from "@/components/cliente/BarrasHoras";
import { almacen } from "@/lib/almacen/index.ts";
import { listo } from "@/lib/demo.ts";
import { ESTADO_SIMPLE } from "@/lib/explicar.ts";
import { fecha } from "@/lib/formato.ts";
import { HORAS_MANUAL_POR_REVISION, metricas, MINUTOS_POR_EXCEPCION } from "@/lib/servicios.ts";
import type { EstadoProveedor } from "@/lib/tipos.ts";
import { infoListas } from "@/lib/verificacion/listas.ts";
import { generarResumen } from "@/lib/monitoreo.ts";

export const dynamic = "force-dynamic";

const COLORES: Record<EstadoProveedor, string> = {
  aprobado: "bg-ok", en_revision: "bg-alerta", pausado: "bg-alerta", bloqueado: "bg-peligro", pendiente: "bg-texto-3",
};

export default async function Panel() {
  await listo();
  const m = await metricas();
  const listas = infoListas();
  const [alertas, resumen] = await Promise.all([almacen().alertas.listar(), generarResumen()]);
  const modo = almacen().modo;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Panel de resultados</h1>
          <p className="text-texto-3">El sistema revisa a todos; la gestora decide solo los casos dudosos.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/bandeja" className="inline-flex items-center gap-2 rounded bg-acento px-4 py-2 text-sm font-medium text-white hover:bg-acento/85"><Icono nombre="bandeja" />Ir a la bandeja <span className="rounded-sm bg-black/25 px-1.5 font-mono text-xs">{m.pendientes}</span></Link>
          {modo === "memoria" && <BotonAccion url="/api/demo/reiniciar" texto="Reiniciar demo" confirmar="Se borrarán todos los datos de la demo. ¿Continuar?" />}
          {modo === "supabase" && m.proveedores === 0 && <BotonAccion url="/api/demo/sembrar" texto="Cargar datos de ejemplo" />}
        </div>
      </div>

      <Alertas alertas={alertas} />

      <section data-tour="personas" className="rounded-md border border-borde bg-panel p-6">
        <Personas />
      </section>

      <div className="grid gap-px overflow-hidden rounded-md border border-borde bg-borde sm:grid-cols-2 lg:grid-cols-4">
        {([
          { icono: "escanear", titulo: "Proveedores revisados", valor: <Contador valor={m.verificados} />, detalle: `de ${m.proveedores.toLocaleString("es-MX")} registrados` },
          { icono: "rayo", titulo: "Aprobados solos", valor: <Contador valor={m.porcentajeAutomatico} formato="porcentaje" />, detalle: `${m.automaticos.toLocaleString("es-MX")} sin que nadie los revisara` },
          { icono: "persona", titulo: "Esperan a una persona", valor: <Contador valor={m.pendientes} />, detalle: `${m.casosAtendidos} decididos por la gestora · ${m.porPolitica} por políticas` },
          { icono: "escudoOk", titulo: "Dinero protegido", valor: <Contador valor={m.montoProtegido} formato="millones" />, detalle: "compras anuales a proveedores con alerta" },
        ] as { icono: NombreIcono; titulo: string; valor: React.ReactNode; detalle: string }[]).map((t) => (
          <div key={t.titulo} className="bg-panel px-4 py-3.5">
            <div className="flex items-center justify-between"><span className="rotulo">{t.titulo}</span><Icono nombre={t.icono} className="h-4 w-4 text-texto-3" /></div>
            <div className="mt-2 font-mono text-3xl font-semibold tabular-nums">{t.valor}</div>
            <div className="mt-1 text-xs text-texto-3">{t.detalle}</div>
          </div>
        ))}
      </div>

      <Tarjeta icono="reloj" titulo="Horas de trabajo: a mano vs. con KYP">
        <BarrasHoras manual={m.horasManual} kyp={m.horasKyp} />
        <p className="mt-2 text-xs text-texto-3">Supuestos: {HORAS_MANUAL_POR_REVISION} h por revisión a mano y {MINUTOS_POR_EXCEPCION} min por cada caso que llega a la bandeja.</p>
      </Tarjeta>

      <Tarjeta icono="correo" titulo="Resumen de hoy" acciones={<Link href="/automatizacion" className="font-mono text-xs text-acento-2 hover:underline">AUTOMATIZACIÓN →</Link>}>
        <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-texto-2">{resumen.texto}</pre>
      </Tarjeta>

      <div className="grid gap-4 lg:grid-cols-2">
        <Tarjeta icono="empresa" titulo="Cómo están los proveedores">
          <div className="mb-3 flex h-3 gap-px overflow-hidden rounded-sm">
            {Object.entries(m.porEstado).map(([e, n]) => (
              <div key={e} className={COLORES[e as EstadoProveedor]} style={{ width: `${(n / Math.max(m.proveedores, 1)) * 100}%` }} title={`${ESTADO_SIMPLE[e as EstadoProveedor].texto}: ${n}`} />
            ))}
          </div>
          <ul className="grid grid-cols-2 gap-1 text-sm">
            {Object.entries(m.porEstado).map(([e, n]) => (
              <li key={e} className="flex items-center gap-2 text-texto-2"><span className={`h-2 w-2 rounded-[1px] ${COLORES[e as EstadoProveedor]}`} />{ESTADO_SIMPLE[e as EstadoProveedor].texto}<strong className="ml-auto pr-4 font-mono text-texto tabular-nums">{n}</strong></li>
            ))}
          </ul>
        </Tarjeta>

        <Tarjeta icono="datos" titulo="Fuentes oficiales que consultamos">
          <table className="w-full text-sm">
            <tbody>
              {listas.map((l) => (
                <tr key={l.fuente} className="border-t border-borde first:border-0">
                  <td className="py-1.5">{l.fuente}</td>
                  <td className="py-1.5 text-right font-mono">{l.registros.toLocaleString("es-MX")}</td>
                  <td className="py-1.5 pl-3 text-right font-mono text-[11px] text-texto-3">{l.actualizacion ? `al ${fecha(l.actualizacion)}` : `desc. ${fecha(l.descargado_en.slice(0, 10))}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Tarjeta>
      </div>
    </div>
  );
}
