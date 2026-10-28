// Panel de productividad y riesgo.
import Link from "next/link";
import { Indicador, Tarjeta } from "@/components/Tarjeta";
import { BotonAccion } from "@/components/cliente/BotonAccion";
import { almacen } from "@/lib/almacen/index.ts";
import { listo } from "@/lib/demo.ts";
import { fecha, millones, NOMBRE_ESTADO } from "@/lib/formato.ts";
import { HORAS_MANUAL_POR_REVISION, metricas, MINUTOS_POR_EXCEPCION } from "@/lib/servicios.ts";
import type { EstadoProveedor } from "@/lib/tipos.ts";
import { infoListas } from "@/lib/verificacion/listas.ts";

export const dynamic = "force-dynamic";

const COLORES: Record<EstadoProveedor, string> = {
  aprobado: "bg-emerald-500", en_revision: "bg-amber-400", pausado: "bg-orange-500", bloqueado: "bg-red-600", pendiente: "bg-slate-400",
};

export default async function Panel() {
  await listo();
  const m = await metricas();
  const listas = infoListas();
  const modo = almacen().modo;
  const ahorro = m.horasManual > 0 ? Math.round((1 - m.horasKyp / m.horasManual) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Panel de productividad</h1>
          <p className="text-sm text-slate-600">Gestión por excepción: el sistema revisa a todos; tú decides solo los casos dudosos.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/bandeja" className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">Ir a la bandeja ({m.pendientes})</Link>
          {modo === "memoria" && <BotonAccion url="/api/demo/reiniciar" texto="Reiniciar demo" confirmar="Se borrarán todos los datos de la demo. ¿Continuar?" />}
          {modo === "supabase" && m.proveedores === 0 && <BotonAccion url="/api/demo/sembrar" texto="Cargar datos de ejemplo" />}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador titulo="Proveedores revisados" valor={m.verificados.toLocaleString("es-MX")} detalle={`de ${m.proveedores.toLocaleString("es-MX")} registrados`} />
        <Indicador titulo="Resueltos en automático" valor={`${m.porcentajeAutomatico}%`} detalle={`${m.automaticos.toLocaleString("es-MX")} liberados sin intervención`} />
        <Indicador titulo="En tu bandeja" valor={m.pendientes} detalle={`${m.casosAtendidos} ${m.casosAtendidos === 1 ? "caso ya decidido" : "casos ya decididos"}`} />
        <Indicador titulo="Monto en revisión o bloqueado" valor={millones(m.montoProtegido)} detalle="Monto anual de proveedores con alerta" />
      </div>

      <Tarjeta titulo="Horas de trabajo: proceso manual vs. KYP">
        <div className="space-y-3">
          {[
            { etiqueta: "Manual", horas: m.horasManual, color: "bg-slate-400" },
            { etiqueta: "Con KYP", horas: m.horasKyp, color: "bg-blue-700" },
          ].map((b) => (
            <div key={b.etiqueta} className="flex items-center gap-3">
              <span className="w-20 text-sm text-slate-600">{b.etiqueta}</span>
              <div className="h-6 flex-1 rounded bg-slate-100">
                <div className={`h-6 rounded ${b.color}`} style={{ width: `${m.horasManual ? Math.max((b.horas / m.horasManual) * 100, 1) : 0}%` }} />
              </div>
              <span className="w-24 text-right text-sm font-medium">{b.horas.toLocaleString("es-MX", { maximumFractionDigits: 1 })} h</span>
            </div>
          ))}
          <p className="text-xs text-slate-500">
            Supuestos: {HORAS_MANUAL_POR_REVISION} h por revisión manual y {MINUTOS_POR_EXCEPCION} min por caso que llega a la bandeja.
            {ahorro > 0 && ` Ahorro estimado: ${ahorro}% de las horas.`}
          </p>
        </div>
      </Tarjeta>

      <div className="grid gap-4 lg:grid-cols-2">
        <Tarjeta titulo="Proveedores por estado">
          <div className="mb-3 flex h-4 overflow-hidden rounded">
            {Object.entries(m.porEstado).map(([e, n]) => (
              <div key={e} className={COLORES[e as EstadoProveedor]} style={{ width: `${(n / Math.max(m.proveedores, 1)) * 100}%` }} title={`${NOMBRE_ESTADO[e as EstadoProveedor]}: ${n}`} />
            ))}
          </div>
          <ul className="grid grid-cols-2 gap-1 text-sm">
            {Object.entries(m.porEstado).map(([e, n]) => (
              <li key={e} className="flex items-center gap-2"><span className={`h-3 w-3 rounded-sm ${COLORES[e as EstadoProveedor]}`} />{NOMBRE_ESTADO[e as EstadoProveedor]}: <strong>{n}</strong></li>
            ))}
          </ul>
        </Tarjeta>

        <Tarjeta titulo="Listas oficiales consultadas">
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
