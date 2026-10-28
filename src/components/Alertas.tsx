// Avisos recientes para la gestora (cambios en listas, documentos recibidos, políticas aplicadas…).
import Link from "next/link";
import type { Alerta } from "@/lib/tipos.ts";
import { fecha } from "@/lib/formato.ts";
import { BotonAccion } from "./cliente/BotonAccion";

export function Alertas({ alertas, max = 5 }: { alertas: Alerta[]; max?: number }) {
  const nuevas = alertas.filter((a) => !a.leida).sort((a, b) => b.creado_en.localeCompare(a.creado_en));
  if (nuevas.length === 0) return null;
  return (
    <section className="rounded-panel border border-borde bg-superficie p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">{nuevas.length} aviso{nuevas.length > 1 ? "s" : ""} nuevo{nuevas.length > 1 ? "s" : ""}</h2>
        <BotonAccion url="/api/alertas" texto="Marcar como leídos" />
      </div>
      <ul className="space-y-1 text-sm">
        {nuevas.slice(0, max).map((a) => (
          <li key={a.id} className="flex flex-wrap gap-x-2">
            {a.proveedor_id ? <Link href={`/expediente/${a.proveedor_id}`} className="hover:underline">{a.mensaje}</Link> : <span>{a.mensaje}</span>}
            <span className="text-xs text-tinta-3">{fecha(a.creado_en)}</span>
          </li>
        ))}
      </ul>
      {nuevas.length > max && <p className="mt-1 text-xs text-tinta-3">y {nuevas.length - max} más</p>}
    </section>
  );
}
