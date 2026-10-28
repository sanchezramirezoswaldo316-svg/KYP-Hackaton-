// Automatización: políticas, monitoreo diario, resumen y documentos pedidos a proveedores.
import Link from "next/link";
import { EstadoDocumento } from "@/components/DocumentoProveedor";
import { Tarjeta } from "@/components/Tarjeta";
import { BotonAccion } from "@/components/cliente/BotonAccion";
import { CopiarEnlace } from "@/components/cliente/CopiarEnlace";
import { TogglePolitica } from "@/components/cliente/TogglePolitica";
import { almacen } from "@/lib/almacen/index.ts";
import { listo } from "@/lib/demo.ts";
import { fecha, plural } from "@/lib/formato.ts";
import { generarResumen, ultimaTareaDiaria } from "@/lib/monitoreo.ts";
import { notificacionesConfiguradas } from "@/lib/notificaciones.ts";
import { CATALOGO } from "@/lib/politicas.ts";
import { clavesActivas, ultimasVerificaciones } from "@/lib/servicios.ts";
import { Icono } from "@/components/Icono";

export const dynamic = "force-dynamic";

export default async function Automatizacion() {
  await listo();
  const db = almacen();
  const [activas, casos, verificaciones, documentos, proveedores, ultima, resumen] = await Promise.all([
    clavesActivas(), db.casos.listar(), ultimasVerificaciones(), db.documentos.listar(), db.proveedores.listar(), ultimaTareaDiaria(), generarResumen(),
  ]);
  const pendientes = casos.filter((c) => c.tipo === "alta" && c.estado === "pendiente");
  const conDocumento = new Set(documentos.map((d) => d.proveedor_id));
  const afectados = (p: (typeof CATALOGO)[number]) => pendientes.filter((c) => p.aplica(verificaciones.get(c.proveedor_id)?.hallazgos ?? []) && !(p.accion === "solicitar_documentos" && conDocumento.has(c.proveedor_id))).length;
  const porPolitica = casos.filter((c) => c.decidido_por?.startsWith("Política:")).length;
  const porId = new Map(proveedores.map((p) => [p.id, p]));
  const avisos = notificacionesConfiguradas();
  const r = ultima?.detalle as Record<string, unknown> | null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Automatización</h1>
        <p className="text-texto-3">Lo que el sistema hace solo para que la gestora se concentre en los casos que de verdad necesitan una persona.</p>
      </div>

      <Tarjeta icono="robot" titulo="Políticas: que el sistema decida solo" acciones={<span className="font-mono text-xs text-texto-3">{plural(porPolitica, "caso resuelto", "casos resueltos")} por políticas</span>}>
        <p className="mb-3 text-sm text-texto-2">Actívalas y se aplican a cada proveedor nuevo. Cada acción queda en la bitácora con el nombre de la política. Los casos dudosos (nombres parecidos, señales mezcladas) siempre los decide una persona.</p>
        <ul className="space-y-3">
          {CATALOGO.map((p) => {
            const n = afectados(p);
            return (
              <li key={p.clave} className={`flex items-start gap-4 rounded border p-4 ${activas.has(p.clave) ? "border-ok/40 bg-ok/8" : "border-borde bg-panel-2"}`}>
                <TogglePolitica clave={p.clave} activa={activas.has(p.clave)} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-semibold"><Icono nombre={p.accion === "bloquear" ? "prohibido" : "documento"} className={`h-4 w-4 ${p.accion === "bloquear" ? "text-peligro" : "text-acento-2"}`} />{p.nombre}</div>
                  <p className="text-sm text-texto-2">{p.descripcion}</p>
                  {n > 0 && <p className="mt-1 text-xs font-medium text-acento-2">Aplicaría a {n} caso{n > 1 ? "s" : ""} que hoy está{n > 1 ? "n" : ""} en la bandeja.</p>}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-3">
          <BotonAccion url="/api/politicas/aplicar" texto="Aplicar las políticas activas a la bandeja actual" textoOcupado="Aplicando…" variante="primario" confirmar="Se aplicarán las políticas activas a los casos pendientes. ¿Continuar?" />
        </div>
      </Tarjeta>

      <div className="grid gap-6 lg:grid-cols-2">
        <Tarjeta icono="radar" titulo="Monitoreo diario">
          <p className="text-sm text-texto-2">Cada día vuelve a revisar a todos los proveedores contra las listas oficiales y avisa <strong>solo si alguien cambió</strong>. También manda recordatorios a proveedores y el resumen del día.</p>
          <div className="mt-3 rounded border border-borde bg-panel-2 p-3 font-mono text-xs">
            {ultima ? (
              <>
                <div>Última ejecución: <strong>{fecha(ultima.creado_en)}</strong> · {ultima.actor}</div>
                {r && <div className="text-texto-2">{String(r.revisados)} revisados · {String(r.cambios)} cambios · {String(r.recordatorios)} recordatorios · resumen {r.resumen_enviado ? "enviado" : "no enviado"}</div>}
              </>
            ) : <div className="text-texto-3">Aún no se ha ejecutado.</div>}
            <div className="mt-1 text-xs text-texto-3">Automática todos los días a las 8:23 a. m. (hora del centro) con Vercel Cron{process.env.CRON_SECRET ? "" : " · falta configurar CRON_SECRET"}.</div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <BotonAccion url="/api/tareas/diaria" icono="reproducir" texto="Ejecutar ahora" textoOcupado="Revisando a todos…" variante="primario" />
            <BotonAccion url="/api/monitoreo/simular" icono="cpu" texto="Simular que el SAT publicó a un proveedor (demo)" />
          </div>
          <p className="mt-2 text-xs text-texto-3">La simulación marca a un proveedor aprobado como &quot;presunto&quot; solo para la demo; queda etiquetada como simulación en su expediente.</p>
        </Tarjeta>

        <Tarjeta icono="correo" titulo="Resumen de hoy">
          <pre className="whitespace-pre-wrap rounded border border-borde bg-fondo p-3 font-mono text-xs leading-relaxed text-texto">{resumen.texto}</pre>
          <p className="mt-2 text-xs text-texto-3">
            {avisos ? "Se envía cada día por n8n (correo, WhatsApp o Slack, según el flujo de Alan)." : "Para recibirlo por correo, WhatsApp o Slack, configura N8N_WEBHOOK_NOTIFICACIONES (flujo de n8n)."}
          </p>
        </Tarjeta>
      </div>

      <Tarjeta icono="documento" titulo="Documentos pedidos a proveedores" acciones={<span className="font-mono text-xs text-texto-3">{documentos.filter((d) => d.estado === "enviada").length} esperando · {documentos.filter((d) => d.estado === "recibida").length} recibidos</span>}>
        {!avisos && <p className="mb-3 rounded bg-alerta/10 p-2 text-xs text-alerta">Los avisos automáticos al proveedor no están conectados: copia el enlace del portal y compártelo. Con n8n configurado se envían solos, con recordatorios cada 3 días.</p>}
        {documentos.length === 0 ? <p className="text-sm text-texto-2">Aún no se han pedido documentos. Activa una política de documentos o pídelos desde un expediente.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-texto-3"><tr><th className="py-2">Proveedor</th><th>Estado</th><th>Pedido</th><th>Recordatorios</th><th></th></tr></thead>
              <tbody>
                {documentos.sort((a, b) => b.enviada_en.localeCompare(a.enviada_en)).map((d) => (
                  <tr key={d.id} className="border-t border-borde">
                    <td className="py-2"><Link href={`/expediente/${d.proveedor_id}`} className="text-acento-2 hover:underline">{porId.get(d.proveedor_id)?.razon_social}</Link></td>
                    <td><EstadoDocumento d={d} /></td>
                    <td className="text-xs text-texto-3">{fecha(d.enviada_en)}<br />{d.solicitada_por}</td>
                    <td className="text-center font-mono">{d.recordatorios}</td>
                    <td>{d.estado === "recibida" ? <a href={`/api/documentos/${d.id}`} className="inline-flex items-center gap-1 font-mono text-xs text-acento-2 hover:underline"><Icono nombre="documento" className="h-3.5 w-3.5" />PDF</a> : <CopiarEnlace token={d.token} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>
    </div>
  );
}
