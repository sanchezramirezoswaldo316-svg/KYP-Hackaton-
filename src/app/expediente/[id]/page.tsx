// Expediente: qué tan riesgoso es, por qué (en palabras simples), la decisión y la evidencia.
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentoProveedor } from "@/components/DocumentoProveedor";
import { HallazgoSimple } from "@/components/HallazgoSimple";
import { LineaTiempoClabe } from "@/components/LineaTiempoClabe";
import { EstadoSimple, Semaforo } from "@/components/Semaforo";
import { Tarjeta } from "@/components/Tarjeta";
import { Termino } from "@/components/Termino";
import { AutoRefrescar } from "@/components/cliente/AutoRefrescar";
import { BotonAccion } from "@/components/cliente/BotonAccion";
import { BotonesDecision } from "@/components/cliente/BotonesDecision";
import { Reverificar } from "@/components/cliente/Reverificar";
import { Velocimetro } from "@/components/cliente/Velocimetro";
import { DatoClave } from "@/components/ui/DatoClave";
import { almacen } from "@/lib/almacen/index.ts";
import { listo } from "@/lib/demo.ts";
import { explicarHallazgo, SEMAFORO } from "@/lib/explicar.ts";
import { cargarExpediente } from "@/lib/expediente.ts";
import { enDias, fecha, pesos } from "@/lib/formato.ts";
import { UMBRAL_LIBERAR, UMBRAL_REVISAR } from "@/lib/puntaje/reglas.ts";
import { proximosPagos } from "@/lib/servicios.ts";
import type { Caso, Decision, SolicitudClabe } from "@/lib/tipos.ts";
import { enmascararClabe } from "@/lib/validacion.ts";
import { simulacionPermitida } from "@/lib/voz/elevenlabs.ts";

export const dynamic = "force-dynamic";

const ORDEN_NIVEL = { peligro: 0, alerta: 1, ok: 2, info: 3 };

function chipRiesgo(puntaje: number | undefined) {
  if (puntaje == null) return { texto: "Sin puntaje", clase: "border border-borde-fuerte text-tinta-3" };
  if (puntaje <= UMBRAL_LIBERAR) return { texto: "Riesgo bajo", clase: "border border-borde-fuerte text-tinta-3" };
  if (puntaje <= UMBRAL_REVISAR) return { texto: "Riesgo medio", clase: "border border-tinta text-tinta" };
  return { texto: "Riesgo alto", clase: "bg-tinta text-white" };
}

function SeccionDecision({ c, solicitud }: { c: Caso; solicitud?: SolicitudClabe }) {
  const clabe = c.tipo === "clabe";
  return (
    <section data-tour="decision" className={`rounded-panel border p-5 ${clabe ? "border-acento bg-acento-fondo" : "border-borde bg-panel"}`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold">Tu decisión</h2>
        {clabe && (
          <>
            <span className="rounded-control border border-acento px-2 py-0.5 text-xs font-semibold text-acento">Cambio de CLABE</span>
            <span className="font-mono text-sm text-acento">{enmascararClabe(solicitud?.clabe_nueva ?? null)}</span>
          </>
        )}
      </div>
      <p className="mb-3 text-sm text-tinta-2">
        {clabe ? "Alguien pidió cambiar la cuenta bancaria de este proveedor. " : ""}
        El sistema sugiere: <Semaforo decision={c.decision_sugerida} />. Tu decisión queda registrada con tu nombre y la hora.
      </p>
      <BotonesDecision casoId={c.id} />
    </section>
  );
}

export default async function Expediente({ params }: { params: Promise<{ id: string }> }) {
  await listo();
  const e = await cargarExpediente((await params).id);
  if (!e) notFound();
  const { proveedor: p } = e;
  const v = e.verificaciones[0];
  const abiertos = e.casos.filter((c) => c.estado === "pendiente" || c.estado === "pausado");
  const simular = simulacionPermitida();
  const demo = almacen().modo === "memoria";
  const montoFactura = e.facturas[0]?.monto ?? null;
  const documentos = (await almacen().documentos.listar({ proveedor_id: p.id })).sort((a, b) => b.enviada_en.localeCompare(a.enviada_en));
  const pago = (await proximosPagos()).get(p.id);
  const casoAbierto = abiertos.find((c) => c.tipo === "alta");
  const enLlamada = e.solicitudes.some((s) => s.estado === "en_llamada" && !e.llamadas.some((l) => l.solicitud_id === s.id));
  const hallazgos = v ? [...v.hallazgos].sort((a, b) => ORDEN_NIVEL[explicarHallazgo(a).nivel] - ORDEN_NIVEL[explicarHallazgo(b).nivel]) : [];
  const riesgo = chipRiesgo(v?.puntaje);
  const decisionActual: Decision | null = v?.decision ?? null;
  const solicitudPorId = new Map(e.solicitudes.map((s) => [s.id, s]));

  return (
    <div className="space-y-5">
      <AutoRefrescar activo={enLlamada} />
      <header className="rounded-panel border border-borde bg-panel p-5 lg:flex lg:items-start lg:justify-between lg:gap-6">
        <div>
          <Link href="/bandeja" className="text-sm text-tinta-2 hover:underline">← Bandeja</Link>
          <h1 className="mt-1 text-xl font-semibold">{p.razon_social}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-tinta-2">
            <span><Termino t="RFC" />: <span className="font-mono">{p.rfc}</span></span>
            <span className="text-tinta-3">·</span>
            <span>{pesos(p.monto_anual)} al año</span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${riesgo.clase}`}>{riesgo.texto}</span>
            {decisionActual ? <Semaforo decision={decisionActual} /> : <span className="rounded-control border border-borde-fuerte px-2.5 py-0.5 text-xs font-semibold text-tinta-3">Sin decisión</span>}
            <EstadoSimple estado={p.estado} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-borde pt-4 sm:grid-cols-4">
            <DatoClave etiqueta="RFC" valor={<span className="font-mono text-sm">{p.rfc}</span>} />
            <DatoClave etiqueta="Monto anual" valor={pesos(p.monto_anual)} />
            <DatoClave etiqueta="Puntaje" valor={<span className="text-xl">{v?.puntaje ?? "—"}</span>} />
            <DatoClave etiqueta="Tipo de caso" valor={e.solicitudes.length > 0 ? "Cambio de CLABE" : "Alta"} detalle={v ? `Verificado ${fecha(v.fecha)}` : "Sin verificación"} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/en-vivo?proveedor=${p.id}`} className="rounded-control border border-borde-fuerte bg-panel px-3 py-2 text-sm font-medium text-tinta hover:bg-hover">Ver extracción en vivo</Link>
          <Reverificar id={p.id} nombre={p.razon_social} />
          <a href={`/api/expediente/${p.id}/pdf`} className="rounded-control bg-marca px-3 py-2 text-sm font-medium text-white hover:bg-marca-2">Descargar expediente</a>
        </div>
      </header>

      {v && (
        <section data-tour="velocimetro" className="grid items-center gap-6 rounded-panel border border-borde bg-panel p-5 md:grid-cols-[auto_1fr]">
          <Velocimetro valor={v.puntaje} />
          <div className="space-y-3">
            <Semaforo decision={v.decision} grande />
            <p className="text-lg">{SEMAFORO[v.decision].frase}</p>
            <p className="rounded-panel bg-superficie p-3 text-sm text-tinta-2">
              {v.resumen}
              <span className="mt-1 block text-xs text-tinta-3">{v.resumen_origen === "ia" ? "Resumen redactado por IA a partir de las pruebas" : "Resumen automático"} · revisado {fecha(v.fecha)}</span>
            </p>
            {v.motivos.some((m) => m.puntos > 0) && (
              <details className="text-sm">
                <summary className="cursor-pointer text-tinta-2">¿Cómo se calculó el <Termino t="Puntaje">puntaje</Termino>?</summary>
                <ul className="mt-2 space-y-1">{v.motivos.filter((m) => m.puntos > 0).map((m) => <li key={m.regla}><span className="font-mono font-semibold">+{m.puntos}</span> {m.descripcion}</li>)}</ul>
              </details>
            )}
          </div>
        </section>
      )}

      {abiertos.filter((c) => c.tipo === "alta").map((c) => (
        <SeccionDecision key={c.id} c={c} />
      ))}

      {e.solicitudes.length > 0 && (
        <section data-tour="clabe-timeline" className="space-y-4 rounded-panel border border-borde bg-panel p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">Cambios de cuenta bancaria (<Termino t="CLABE" />)</h2>
            <span className="rounded-control border border-acento px-2 py-0.5 text-xs font-semibold text-acento">Cambio de CLABE</span>
          </div>
          {e.solicitudes.map((s) => (
            <div key={s.id} className="space-y-2">
            <Link href={`/clabe/${s.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-acento underline">Abrir monitor de la llamada</Link>
            <LineaTiempoClabe s={s} llamada={e.llamadas.find((l) => l.solicitud_id === s.id)} monto={montoFactura} simular={simular} demo={demo} fallo={e.bitacora.some((b) => b.entidad_id === s.id && b.accion === "llamada_fallida")} />
            </div>
          ))}
        </section>
      )}

      {e.solicitudes.length === 0 && (
        <Tarjeta titulo="Llamada de verificación">
          <p className="text-sm text-tinta-3">Este expediente no tiene una llamada registrada. Las llamadas solo se solicitan para confirmar cambios de CLABE.</p>
        </Tarjeta>
      )}

      {abiertos.filter((c) => c.tipo === "clabe").map((c) => (
        <SeccionDecision key={c.id} c={c} solicitud={c.solicitud_id ? solicitudPorId.get(c.solicitud_id) : undefined} />
      ))}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tarjeta titulo="Hallazgos por fuente">
            {!v ? (
              <p className="text-sm text-tinta-3">Aún no hay verificación para este proveedor.</p>
            ) : hallazgos.length === 0 ? (
              <p className="text-sm text-tinta-3">No se registraron hallazgos.</p>
            ) : (
              <ul data-tour="evidencia" className="space-y-2">
                {hallazgos.map((h, i) => <HallazgoSimple key={i} h={h} retraso={i * 120} />)}
              </ul>
            )}
          </Tarjeta>
        </div>

        <div className="space-y-5">
          <Tarjeta titulo="Datos del proveedor">
            <dl className="space-y-2 text-sm">
              <div><dt className="text-tinta-3">Qué nos vende</dt><dd>{p.giro_declarado ?? "—"}</dd></div>
              <div><dt className="text-tinta-3">Página web</dt><dd>{p.sitio_web ? <a href={p.sitio_web} target="_blank" rel="noreferrer" className="text-tinta underline">{p.sitio_web}</a> : "—"}</dd></div>
              <div><dt className="text-tinta-3">Teléfono registrado</dt><dd>{p.telefono_registrado}</dd></div>
              <div><dt className="text-tinta-3">Cuenta (CLABE)</dt><dd className="font-mono">{enmascararClabe(p.clabe)}</dd></div>
              <div><dt className="text-tinta-3">Le compramos al año</dt><dd>{pesos(p.monto_anual)}</dd></div>
              {pago && <div><dt className="text-tinta-3">Próximo pago</dt><dd className={pago.dias <= 7 ? "font-semibold text-acento" : ""}>{pesos(pago.monto)} {enDias(pago.dias)} ({fecha(pago.vence)})</dd></div>}
            </dl>
            <Link href={`/clabe?proveedor=${p.id}`} className="mt-3 inline-block text-sm text-tinta underline">Registrar un cambio de cuenta</Link>
          </Tarjeta>

          <Tarjeta titulo="Documentos del proveedor">
            <div className="space-y-2">
              {documentos.map((d) => <DocumentoProveedor key={d.id} d={d} rfc={p.rfc} />)}
              {!documentos.some((d) => d.estado === "enviada") && (
                <BotonAccion url="/api/documentos" cuerpo={{ proveedor_id: p.id, caso_id: casoAbierto?.id }} texto="Pedir su opinión 32-D" textoOcupado="Creando solicitud…" />
              )}
              {documentos.length === 0 && <p className="text-xs text-tinta-3">Se le envía un enlace a su portal para que suba el PDF; si no responde, recibe recordatorios cada 3 días.</p>}
            </div>
          </Tarjeta>

          {e.casos.some((c) => c.decidido_por) && (
            <Tarjeta titulo="Decisiones">
              <ul className="space-y-2 text-sm">
                {e.casos.filter((c) => c.decidido_por).map((c) => (
                  <li key={c.id}>
                    <strong>{c.estado === "aprobado" ? "Aprobado" : c.estado === "bloqueado" ? "Bloqueado" : "En pausa"}</strong>
                    {c.tipo === "clabe" && <span className="ml-2 rounded-control border border-acento px-1.5 py-0.5 text-xs font-semibold text-acento">Cambio de CLABE</span>}
                    <span className="text-xs text-tinta-3"> · {c.tipo === "clabe" ? "cambio de cuenta" : "alta"} · {fecha(c.decidido_en)}</span>
                    <p className="text-xs text-tinta-2">{c.decidido_por}{c.comentario && `: "${c.comentario}"`}</p>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}

          {e.facturas.length > 0 && (
            <Tarjeta titulo="Facturas">
              <ul className="space-y-1 text-sm">{e.facturas.map((f) => <li key={f.id} className="flex justify-between"><span className="font-mono">{f.folio}</span><span>{pesos(f.monto)}</span></li>)}</ul>
            </Tarjeta>
          )}

          <Tarjeta titulo="Bitácora">
            {e.bitacora.length === 0 ? (
              <p className="text-sm text-tinta-3">Sin eventos todavía.</p>
            ) : (
              <ol className="space-y-2 text-xs">
                {e.bitacora.slice(0, 25).map((b) => (
                  <li key={b.id}><span className="text-tinta-3">{fecha(b.creado_en)}</span><br /><strong>{b.actor}</strong> · {b.accion.replaceAll("_", " ")}</li>
                ))}
              </ol>
            )}
          </Tarjeta>
        </div>
      </div>
    </div>
  );
}
