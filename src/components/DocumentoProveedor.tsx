// Estado de un documento pedido al proveedor, con enlace del portal, descarga y lectura de la IA.
import type { SolicitudDocumento } from "@/lib/tipos.ts";
import { fecha } from "@/lib/formato.ts";
import { CopiarEnlace } from "./cliente/CopiarEnlace";
import { Etiqueta } from "./Etiquetas";
import { Icono } from "./Icono";

export function EstadoDocumento({ d }: { d: SolicitudDocumento }) {
  if (d.estado === "recibida") {
    const s = d.analisis?.sentido;
    return <Etiqueta tono={!d.analisis ? "azul" : s === "positivo" && d.analisis.es_opinion_32d ? "verde" : "rojo"}><Icono nombre="documentoOk" className="h-3 w-3" />Recibida{d.analisis ? ` · ${d.analisis.es_opinion_32d ? `opinión ${s}` : "no es 32-D"}` : ""}</Etiqueta>;
  }
  if (d.estado === "vencida") return <Etiqueta tono="rojo"><Icono nombre="reloj" className="h-3 w-3" />Sin respuesta</Etiqueta>;
  return <Etiqueta tono="ambar"><Icono nombre="espera" className="h-3 w-3" />Esperando al proveedor</Etiqueta>;
}

export function DocumentoProveedor({ d, rfc }: { d: SolicitudDocumento; rfc: string }) {
  const rfcDistinto = d.analisis && d.analisis.rfc && d.analisis.rfc.toUpperCase().replace(/\s/g, "") !== rfc;
  return (
    <div className="space-y-2 rounded border border-borde p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <strong>Opinión de cumplimiento 32-D</strong>
        <EstadoDocumento d={d} />
      </div>
      <p className="text-xs text-texto-3">
        Pedida por {d.solicitada_por} el {fecha(d.enviada_en)} · {d.notificada ? "aviso enviado por n8n" : "aviso NO enviado: comparte el enlace"}
        {d.recordatorios > 0 && ` · ${d.recordatorios} recordatorio${d.recordatorios > 1 ? "s" : ""}`}
      </p>
      {d.estado !== "recibida" && <CopiarEnlace token={d.token} />}
      {d.estado === "recibida" && (
        <div className="space-y-1">
          <a href={`/api/documentos/${d.id}`} className="inline-flex items-center gap-1 font-mono text-xs text-acento-2 hover:underline"><Icono nombre="documento" className="h-3.5 w-3.5" />{d.archivo_nombre}</a>
          <span className="text-xs text-texto-3"> · recibida {fecha(d.recibida_en)} · SHA-256 {d.archivo_sha256?.slice(0, 12)}…</span>
          {d.analisis ? (
            <div className={`rounded p-2 text-xs ${d.analisis.es_opinion_32d && d.analisis.sentido === "positivo" && !rfcDistinto ? "bg-ok/10" : "bg-peligro/10"}`}>
              <Icono nombre="ia" className="mr-1 inline h-3.5 w-3.5 align-[-2px] text-voz" /><strong>Lectura de la IA:</strong> {d.analisis.es_opinion_32d ? `opinión en sentido ${d.analisis.sentido.toUpperCase()}, RFC ${d.analisis.rfc}, emitida ${d.analisis.fecha_emision}.` : "no parece una opinión 32-D."}
              {rfcDistinto && <strong className="text-peligro"> El RFC del documento no es el del proveedor.</strong>} {d.analisis.explicacion}
              <span className="block text-texto-3">La decisión sigue siendo de la gestora.</span>
            </div>
          ) : <p className="text-xs text-texto-3">Revísalo manualmente (la lectura con IA se activa con ANTHROPIC_API_KEY).</p>}
        </div>
      )}
    </div>
  );
}
