// Expediente del proveedor: evidencia, decisión, llamadas y bitácora.
import Link from "next/link";
import { notFound } from "next/navigation";
import { Etiqueta, EtiquetaDecision, EtiquetaEstado } from "@/components/Etiquetas";
import { Tarjeta } from "@/components/Tarjeta";
import { BotonAccion } from "@/components/cliente/BotonAccion";
import { BotonesDecision } from "@/components/cliente/BotonesDecision";
import { SimularLlamada } from "@/components/cliente/SimularLlamada";
import { listo } from "@/lib/demo.ts";
import { cargarExpediente } from "@/lib/expediente.ts";
import { fecha, NOMBRE_FUENTE, pesos } from "@/lib/formato.ts";
import type { Hallazgo } from "@/lib/tipos.ts";
import { enmascararClabe } from "@/lib/validacion.ts";
import { vozConfigurada } from "@/lib/voz/elevenlabs.ts";

export const dynamic = "force-dynamic";

const ALERTA = new Set(["presunto", "definitivo", "listado", "coincidencia_exacta", "coincidencia_parecida", "giro_no_coincide", "noticias_negativas", "dominio_reciente"]);
const NEUTRO = new Set(["no_consultado", "error", "no_concluyente", "no_aplica", "consultado", "sin_contenido", "sin_sitio", "desvirtuado", "sentencia_favorable"]);

function tono(h: Hallazgo) {
  if (ALERTA.has(h.resultado)) return "rojo" as const;
  if (NEUTRO.has(h.resultado)) return "gris" as const;
  return "verde" as const;
}

export default async function Expediente({ params }: { params: Promise<{ id: string }> }) {
  await listo();
  const e = await cargarExpediente((await params).id);
  if (!e) notFound();
  const { proveedor: p } = e;
  const v = e.verificaciones[0];
  const abiertos = e.casos.filter((c) => c.estado === "pendiente" || c.estado === "pausado");
  const simular = !vozConfigurada();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/bandeja" className="text-sm text-blue-800 hover:underline">← Bandeja</Link>
          <h1 className="mt-1 text-2xl font-semibold">{p.razon_social}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className="font-mono">{p.rfc}</span><EtiquetaEstado estado={p.estado} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <BotonAccion url={`/api/proveedores/${p.id}/verificar`} texto="Volver a verificar (todas las fuentes)" textoOcupado="Consultando fuentes…" />
          <a href={`/api/expediente/${p.id}/pdf`} className="rounded bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800">Descargar expediente PDF</a>
        </div>
      </div>

      {abiertos.map((c) => (
        <section key={c.id} className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">{c.tipo === "clabe" ? "Cambio de CLABE por decidir" : "Caso por decidir"}</h2>
            <span className="text-sm">Sugerencia del sistema:</span><EtiquetaDecision decision={c.decision_sugerida} />
          </div>
          <p className="mb-3 text-sm text-slate-700">{c.motivo}</p>
          <BotonesDecision casoId={c.id} />
        </section>
      ))}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {v ? (
            <Tarjeta titulo="Verificación más reciente" acciones={<span className="text-xs text-slate-500">{fecha(v.fecha)}</span>}>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span className="text-3xl font-semibold">{v.puntaje}</span>
                <EtiquetaDecision decision={v.decision} />
                {v.bloqueo_directo && <Etiqueta tono="rojo">Bloqueo directo</Etiqueta>}
              </div>
              <p className="mb-3 rounded bg-slate-50 p-3 text-sm">
                {v.resumen}
                <span className="mt-1 block text-xs text-slate-500">{v.resumen_origen === "ia" ? "Resumen redactado por IA a partir de los hallazgos" : "Resumen generado por reglas"}</span>
              </p>
              <h3 className="mb-1 text-sm font-medium">Por qué este puntaje</h3>
              {v.motivos.filter((m) => m.puntos > 0).length === 0 ? (
                <p className="text-sm text-slate-600">Sin motivos de riesgo.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {v.motivos.filter((m) => m.puntos > 0).map((m) => <li key={m.regla}><span className="font-mono font-medium">+{m.puntos}</span> {m.descripcion}</li>)}
                </ul>
              )}
            </Tarjeta>
          ) : null}

          {v && (
            <Tarjeta titulo="Evidencia por fuente">
              <ul className="divide-y divide-slate-100">
                {v.hallazgos.map((h, i) => (
                  <li key={i} className="py-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{NOMBRE_FUENTE[h.fuente]}</span>
                      <Etiqueta tono={tono(h)}>{h.resultado.replaceAll("_", " ")}</Etiqueta>
                      {h.fecha_fuente && <span className="text-xs text-slate-500">fuente: {h.fecha_fuente}</span>}
                    </div>
                    <p className="text-slate-700">{h.detalle}</p>
                    {h.evidencia_url && <a href={h.evidencia_url} target="_blank" rel="noreferrer" className="text-xs text-blue-800 underline">{h.evidencia_url}</a>}
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}

          {e.solicitudes.length > 0 && (
            <Tarjeta titulo="Cambios de CLABE y llamadas de verificación">
              <ul className="space-y-4">
                {e.solicitudes.map((s) => (
                  <li key={s.id} className="text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono">{enmascararClabe(s.clabe_nueva)}</span>
                      <Etiqueta tono={s.estado === "verificada" ? "verde" : s.estado === "rechazada" ? "rojo" : "ambar"}>{s.estado.replace("_", " ")}</Etiqueta>
                      <span className="text-xs text-slate-500">{fecha(s.creado_en)}</span>
                    </div>
                    {s.telefono_en_solicitud && <p className="text-xs text-slate-500">Teléfono en la solicitud (no usado): {s.telefono_en_solicitud}</p>}
                    {e.llamadas.filter((l) => l.solicitud_id === s.id).map((l) => (
                      <div key={l.id} className="mt-2 rounded bg-slate-50 p-2">
                        <div className="flex items-center gap-2"><strong>Llamada:</strong> {l.resultado.replaceAll("_", " ")} {l.simulada && <Etiqueta tono="ambar">Simulada</Etiqueta>}</div>
                        {l.resumen && <p>{l.resumen}</p>}
                        <pre className="mt-1 whitespace-pre-wrap text-xs text-slate-600">{l.transcripcion}</pre>
                      </div>
                    ))}
                    {simular && (s.estado === "pausada" || s.estado === "en_llamada") && e.llamadas.every((l) => l.solicitud_id !== s.id) && <div className="mt-2"><SimularLlamada solicitudId={s.id} /></div>}
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}
        </div>

        <div className="space-y-5">
          <Tarjeta titulo="Datos del proveedor">
            <dl className="space-y-2 text-sm">
              <div><dt className="text-slate-500">Giro declarado</dt><dd>{p.giro_declarado ?? "—"}</dd></div>
              <div><dt className="text-slate-500">Página web</dt><dd>{p.sitio_web ? <a href={p.sitio_web} target="_blank" rel="noreferrer" className="text-blue-800 underline">{p.sitio_web}</a> : "—"}</dd></div>
              <div><dt className="text-slate-500">Teléfono registrado</dt><dd>{p.telefono_registrado}</dd></div>
              <div><dt className="text-slate-500">CLABE</dt><dd className="font-mono">{enmascararClabe(p.clabe)}</dd></div>
              <div><dt className="text-slate-500">Monto anual</dt><dd>{pesos(p.monto_anual)}</dd></div>
            </dl>
            <Link href={`/clabe?proveedor=${p.id}`} className="mt-3 inline-block text-sm text-blue-800 underline">Registrar solicitud de cambio de CLABE</Link>
          </Tarjeta>

          {e.facturas.length > 0 && (
            <Tarjeta titulo="Facturas">
              <ul className="space-y-1 text-sm">{e.facturas.map((f) => <li key={f.id} className="flex justify-between"><span className="font-mono">{f.folio}</span><span>{pesos(f.monto)}</span></li>)}</ul>
            </Tarjeta>
          )}

          {e.casos.some((c) => c.decidido_por) && (
            <Tarjeta titulo="Decisiones">
              <ul className="space-y-2 text-sm">
                {e.casos.filter((c) => c.decidido_por).map((c) => (
                  <li key={c.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Etiqueta tono={c.estado === "aprobado" ? "verde" : c.estado === "bloqueado" ? "rojo" : "ambar"}>{c.estado}</Etiqueta>
                      <span className="text-xs text-slate-500">{c.tipo === "clabe" ? "Cambio de CLABE" : "Alta"} · {fecha(c.decidido_en)}</span>
                    </div>
                    <p className="text-xs text-slate-600">{c.decidido_por}{c.comentario && `: "${c.comentario}"`}</p>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}

          <Tarjeta titulo="Bitácora">
            <ol className="space-y-2 text-xs">
              {e.bitacora.slice(0, 25).map((b) => (
                <li key={b.id}><span className="text-slate-500">{fecha(b.creado_en)}</span><br /><strong>{b.actor}</strong> · {b.accion.replaceAll("_", " ")}</li>
              ))}
            </ol>
          </Tarjeta>
        </div>
      </div>
    </div>
  );
}
