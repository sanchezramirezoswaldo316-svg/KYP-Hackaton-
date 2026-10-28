// Avisos recientes para la gestora (cambios en listas, documentos recibidos, políticas aplicadas…).
import Link from "next/link";
import type { Alerta, TipoAlerta } from "@/lib/tipos.ts";
import { fecha } from "@/lib/formato.ts";
import { BotonAccion } from "./cliente/BotonAccion";
import { Icono, type NombreIcono } from "./Icono";

const ICONO: Record<TipoAlerta, { icono: NombreIcono; color: string }> = {
  cambio_lista: { icono: "alerta", color: "text-alerta" },
  documento_recibido: { icono: "documentoOk", color: "text-acento-2" },
  solicitud_vencida: { icono: "reloj", color: "text-peligro" },
  politica_aplicada: { icono: "robot", color: "text-voz" },
};

// Los avisos guardados antes del rediseño traían un emoji al inicio.
const sinEmoji = (t: string) => t.replace(/^[\p{Extended_Pictographic}\u{FE0F}\u{200D}\s]+/u, "");

export function Alertas({ alertas, max = 5 }: { alertas: Alerta[]; max?: number }) {
  const nuevas = alertas.filter((a) => !a.leida).sort((a, b) => b.creado_en.localeCompare(a.creado_en));
  if (nuevas.length === 0) return null;
  return (
    <section className="rounded-md border border-alerta/40 bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-borde px-4 py-2.5">
        <h2 className="rotulo flex items-center gap-2 text-alerta!">
          <span className="h-1.5 w-1.5 animar-parpadeo rounded-full bg-alerta" aria-hidden />
          {nuevas.length} aviso{nuevas.length > 1 ? "s" : ""} nuevo{nuevas.length > 1 ? "s" : ""}
        </h2>
        <BotonAccion url="/api/alertas" texto="Marcar como leídos" />
      </div>
      <ul className="divide-y divide-borde text-[13px]">
        {nuevas.slice(0, max).map((a) => (
          <li key={a.id} className="flex items-start gap-3 px-4 py-2">
            <Icono nombre={ICONO[a.tipo]?.icono ?? "campana"} className={`mt-0.5 h-4 w-4 ${ICONO[a.tipo]?.color ?? "text-texto-3"}`} />
            <div className="min-w-0 flex-1">
              {a.proveedor_id ? <Link href={`/expediente/${a.proveedor_id}`} className="hover:text-acento-2">{sinEmoji(a.mensaje)}</Link> : <span>{sinEmoji(a.mensaje)}</span>}
            </div>
            <span className="shrink-0 font-mono text-[11px] text-texto-3">{fecha(a.creado_en)}</span>
          </li>
        ))}
      </ul>
      {nuevas.length > max && <p className="px-4 pb-2 text-xs text-texto-3">y {nuevas.length - max} más</p>}
    </section>
  );
}
