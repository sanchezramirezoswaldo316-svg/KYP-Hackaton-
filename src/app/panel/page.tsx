// Panel de resultados: impacto en personas, horas y dinero.
import Link from "next/link";
import { Alertas } from "@/components/Alertas";
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
  aprobado: "bg-emerald-500", en_revision: "bg-amber-400", pausado: "bg-orange-500", bloqueado: "bg-red-600", pendiente: "bg-slate-400",
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
          <h1 className="text-2xl font-semibold">Panel de resultados</h1>
          <p className="text-slate-600">El sistema revisa a todos; la gestora decide solo los casos dudosos.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/bandeja" className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">Ir a la bandeja ({m.pendientes})</Link>
          {modo === "memoria" && <BotonAccion url="/api/demo/reiniciar" texto="Reiniciar demo" confirmar="Se borrarán todos los datos de la demo. ¿Continuar?" />}
          {modo === "supabase" && m.proveedores === 0 && <BotonAccion url="/api/demo/sembrar" texto="Cargar datos de ejemplo" />}
        </div>
      </div>

      <Alertas alertas={alertas} />

      <section data-tour="personas" className="rounded-2xl border border-slate-200 bg-white p-6">
        <Personas />
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icono: "🔍", titulo: "Proveedores revisados", valor: <Contador valor={m.verificados} />, detalle: `de ${m.proveedores.toLocaleString("es-MX")} registrados` },
          { icono: "⚡", titulo: "Aprobados solos", valor: <Contador valor={m.porcentajeAutomatico} formato="porcentaje" />, detalle: `${m.automaticos.toLocaleString("es-MX")} sin que nadie los revisara` },
          { icono: "👩‍💼", titulo: "Esperan a una persona", valor: <Contador valor={m.pendientes} />, detalle: `${m.casosAtendidos} decididos por la gestora · ${m.porPolitica} por políticas` },
          { icono: "🛡️", titulo: "Dinero protegido", valor: <Contador valor={m.montoProtegido} formato="millones" />, detalle: "compras anuales a proveedores con alerta" },
        ].map((t) => (
          <div key={t.titulo} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500"><span aria-hidden>{t.icono} </span>{t.titulo}</div>
            <div className="mt-1 text-3xl font-bold">{t.valor}</div>
            <div className="mt-1 text-xs text-slate-500">{t.detalle}</div>
          </div>
        ))}
      </div>

      <Tarjeta titulo="⏱️ Horas de trabajo: a mano vs. con KYP">
        <BarrasHoras manual={m.horasManual} kyp={m.horasKyp} />
        <p className="mt-2 text-xs text-slate-500">Supuestos: {HORAS_MANUAL_POR_REVISION} h por revisión a mano y {MINUTOS_POR_EXCEPCION} min por cada caso que llega a la bandeja.</p>
      </Tarjeta>

      <Tarjeta titulo="📬 Resumen de hoy" acciones={<Link href="/automatizacion" className="text-sm text-blue-800 underline">Automatización →</Link>}>
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">{resumen.texto}</pre>
      </Tarjeta>

      <div className="grid gap-4 lg:grid-cols-2">
        <Tarjeta titulo="Cómo están los proveedores">
          <div className="mb-3 flex h-5 overflow-hidden rounded-full">
            {Object.entries(m.porEstado).map(([e, n]) => (
              <div key={e} className={COLORES[e as EstadoProveedor]} style={{ width: `${(n / Math.max(m.proveedores, 1)) * 100}%` }} title={`${ESTADO_SIMPLE[e as EstadoProveedor].texto}: ${n}`} />
            ))}
          </div>
          <ul className="grid grid-cols-2 gap-1 text-sm">
            {Object.entries(m.porEstado).map(([e, n]) => (
              <li key={e} className="flex items-center gap-2"><span className={`h-3 w-3 rounded-sm ${COLORES[e as EstadoProveedor]}`} />{ESTADO_SIMPLE[e as EstadoProveedor].emoji} {ESTADO_SIMPLE[e as EstadoProveedor].texto}: <strong>{n}</strong></li>
            ))}
          </ul>
        </Tarjeta>

        <Tarjeta titulo="Fuentes oficiales que consultamos">
          <table className="w-full text-sm">
            <tbody>
              {listas.map((l) => (
                <tr key={l.fuente} className="border-t border-slate-100 first:border-0">
                  <td className="py-1.5">{l.fuente}</td>
                  <td className="py-1.5 text-right">{l.registros.toLocaleString("es-MX")}</td>
                  <td className="py-1.5 pl-3 text-right text-xs text-slate-500">{l.actualizacion ? `al ${fecha(l.actualizacion)}` : `desc. ${fecha(l.descargado_en.slice(0, 10))}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Tarjeta>
      </div>
    </div>
  );
}
