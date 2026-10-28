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
import { almacen } from "@/lib/almacen/index.ts";
import { listo } from "@/lib/demo.ts";
import { explicarHallazgo, SEMAFORO } from "@/lib/explicar.ts";
import { cargarExpediente } from "@/lib/expediente.ts";
import { enDias, fecha, pesos } from "@/lib/formato.ts";
import { proximosPagos } from "@/lib/servicios.ts";
import { enmascararClabe } from "@/lib/validacion.ts";
import { simulacionPermitida } from "@/lib/voz/elevenlabs.ts";
import { Icono } from "@/components/Icono";

export const dynamic = "force-dynamic";

const ORDEN_NIVEL = { peligro: 0, alerta: 1, ok: 2, info: 3 };

export default async function Expediente({ params }: { params: Promise<{ id: string }> }) {
  await listo();
  const e = await cargarExpediente((await params).id);
  if (!e) notFound();
  const { proveedor: p } = e;
  const v = e.verificaciones[0];
  const abiertos = e.casos.filter((c) => c.estado === "pendiente" || c.estado === "pausado");
  const simular = simulacionPermitida();
  const montoFactura = e.facturas[0]?.monto ?? null;
  const documentos = (await almacen().documentos.listar({ proveedor_id: p.id })).sort((a, b) => b.enviada_en.localeCompare(a.enviada_en));
  const pago = (await proximosPagos()).get(p.id);
  const casoAbierto = abiertos.find((c) => c.tipo === "alta");
  const enLlamada = e.solicitudes.some((s) => s.estado === "en_llamada" && !e.llamadas.some((l) => l.solicitud_id === s.id));
  const hallazgos = v ? [...v.hallazgos].sort((a, b) => ORDEN_NIVEL[explicarHallazgo(a).nivel] - ORDEN_NIVEL[explicarHallazgo(b).nivel]) : [];

  return (
    <div className="space-y-5">
      <AutoRefrescar activo={enLlamada} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/bandeja" className="inline-flex items-center gap-1 font-mono text-[11px] tracking-wider text-texto-3 uppercase hover:text-acento-2"><Icono nombre="atras" className="h-3 w-3" />Bandeja / Expediente</Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{p.razon_social}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-texto-2">
            <span><Termino t="RFC" />: <span className="font-mono">{p.rfc}</span></span>
            <EstadoSimple estado={p.estado} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/en-vivo?proveedor=${p.id}`} className="rounded border border-borde-fuerte bg-panel px-3 py-2 inline-flex items-center gap-2 text-sm font-medium text-texto-2 hover:bg-panel-2"><Icono nombre="radar" />Ver extracción en vivo</Link>
          <Reverificar id={p.id} nombre={p.razon_social} />
          <a href={`/api/expediente/${p.id}/pdf`} className="inline-flex items-center gap-2 rounded bg-acento px-3 py-2 text-sm font-medium text-white hover:bg-acento/85"><Icono nombre="documento" />Descargar expediente</a>
        </div>
      </div>

      {v && (
        <section data-tour="velocimetro" className="grid items-center gap-6 rounded-md border border-borde bg-panel p-6 md:grid-cols-[auto_1fr]">
          <Velocimetro valor={v.puntaje} />
          <div className="space-y-3">
            <Semaforo decision={v.decision} grande />
            <p className="text-base text-texto">{SEMAFORO[v.decision].frase}</p>
            <p className="rounded border border-borde bg-panel-2 p-3 text-sm text-texto-2">
              {v.resumen}
              <span className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-texto-3">{v.resumen_origen === "ia" && <Icono nombre="ia" className="h-3 w-3 text-voz" />}{v.resumen_origen === "ia" ? "Resumen redactado por IA a partir de las pruebas" : "Resumen automático"} · revisado {fecha(v.fecha)}</span>
            </p>
            {v.motivos.some((m) => m.puntos > 0) && (
              <details className="text-sm">
                <summary className="cursor-pointer text-texto-2">¿Cómo se calculó el <Termino t="Puntaje">puntaje</Termino>?</summary>
                <ul className="mt-2 space-y-1">{v.motivos.filter((m) => m.puntos > 0).map((m) => <li key={m.regla}><span className="font-mono font-semibold">+{m.puntos}</span> {m.descripcion}</li>)}</ul>
              </details>
            )}
          </div>
        </section>
      )}


      {abiertos.filter((c) => c.tipo === "alta").map((c) => (
        <section key={c.id} data-tour="decision" className="rounded-md border border-acento/50 bg-acento/8 p-5">
          <h2 className="rotulo mb-2 flex items-center gap-2 text-acento-2!"><Icono nombre="persona" className="h-3.5 w-3.5" />Tu decisión</h2>
          <p className="mb-3 text-sm text-texto-2">
            {c.tipo === "clabe" ? "Alguien pidió cambiar la cuenta bancaria de este proveedor. " : ""}
            El sistema sugiere: <Semaforo decision={c.decision_sugerida} />. Tu decisión queda registrada con tu nombre y la hora.
          </p>
          <BotonesDecision casoId={c.id} />
        </section>
      ))}

      {e.solicitudes.length > 0 && (
        <section data-tour="clabe-timeline" className="space-y-4 rounded-md border border-borde bg-panel p-5">
          <h2 className="rotulo flex items-center gap-2"><Icono nombre="banco" className="h-3.5 w-3.5 text-acento-2" />Cambios de cuenta bancaria (<Termino t="CLABE" />)</h2>
          {e.solicitudes.map((s) => (
            <LineaTiempoClabe key={s.id} s={s} llamada={e.llamadas.find((l) => l.solicitud_id === s.id)} monto={montoFactura} simular={simular} fallo={e.bitacora.some(b => b.entidad_id === s.id && b.accion === "llamada_fallida")} />
          ))}
        </section>
      )}

      {abiertos.filter((c) => c.tipo === "clabe").map((c) => (
        <section key={c.id} data-tour="decision" className="rounded-md border border-acento/50 bg-acento/8 p-5">
          <h2 className="rotulo mb-2 flex items-center gap-2 text-acento-2!"><Icono nombre="persona" className="h-3.5 w-3.5" />Tu decisión</h2>
          <p className="mb-3 text-sm text-texto-2">
            {c.tipo === "clabe" ? "Alguien pidió cambiar la cuenta bancaria de este proveedor. " : ""}
            El sistema sugiere: <Semaforo decision={c.decision_sugerida} />. Tu decisión queda registrada con tu nombre y la hora.
          </p>
          <BotonesDecision casoId={c.id} />
        </section>
      ))}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {v && (
            <Tarjeta icono="buscar" titulo="Qué encontramos">
              <ul data-tour="evidencia" className="space-y-2">
                {hallazgos.map((h, i) => <HallazgoSimple key={i} h={h} retraso={i * 120} />)}
              </ul>
            </Tarjeta>
          )}
        </div>

        <div className="space-y-5">
          <Tarjeta icono="empresa" titulo="Datos del proveedor">
            <dl className="space-y-2.5 text-sm [&_dt]:text-[11px] [&_dt]:tracking-wider [&_dt]:uppercase">
              <div><dt className="text-texto-3">Qué nos vende</dt><dd>{p.giro_declarado ?? "—"}</dd></div>
              <div><dt className="text-texto-3">Página web</dt><dd>{p.sitio_web ? <a href={p.sitio_web} target="_blank" rel="noreferrer" className="text-acento-2 underline">{p.sitio_web}</a> : "—"}</dd></div>
              <div><dt className="text-texto-3">Teléfono registrado</dt><dd className="font-mono">{p.telefono_registrado}</dd></div>
              <div><dt className="text-texto-3">Cuenta (CLABE)</dt><dd className="font-mono">{enmascararClabe(p.clabe)}</dd></div>
              <div><dt className="text-texto-3">Le compramos al año</dt><dd className="font-mono">{pesos(p.monto_anual)}</dd></div>
              {pago && <div><dt className="text-texto-3">Próximo pago</dt><dd className={pago.dias <= 7 ? "font-semibold text-alerta" : ""}>{pesos(pago.monto)} {enDias(pago.dias)} ({fecha(pago.vence)})</dd></div>}
            </dl>
            <Link href={`/clabe?proveedor=${p.id}`} className="mt-3 inline-block text-sm text-acento-2 underline">Registrar un cambio de cuenta</Link>
          </Tarjeta>

          <Tarjeta icono="documento" titulo="Documentos del proveedor">
            <div className="space-y-2">
              {documentos.map((d) => <DocumentoProveedor key={d.id} d={d} rfc={p.rfc} />)}
              {!documentos.some((d) => d.estado === "enviada") && (
                <BotonAccion url="/api/documentos" cuerpo={{ proveedor_id: p.id, caso_id: casoAbierto?.id }} icono="correo" texto="Pedir su opinión 32-D" textoOcupado="Creando solicitud…" />
              )}
              {documentos.length === 0 && <p className="text-xs text-texto-3">Se le envía un enlace a su portal para que suba el PDF; si no responde, recibe recordatorios cada 3 días.</p>}
            </div>
          </Tarjeta>

          {e.casos.some((c) => c.decidido_por) && (
            <Tarjeta icono="balanza" titulo="Decisiones">
              <ul className="space-y-2 text-sm">
                {e.casos.filter((c) => c.decidido_por).map((c) => (
                  <li key={c.id}>
                    <strong className={`inline-flex items-center gap-1 ${c.estado === "aprobado" ? "text-ok" : c.estado === "bloqueado" ? "text-peligro" : "text-alerta"}`}><Icono nombre={c.estado === "aprobado" ? "ok" : c.estado === "bloqueado" ? "prohibido" : "pausa"} className="h-3.5 w-3.5" />{c.estado === "aprobado" ? "Aprobado" : c.estado === "bloqueado" ? "Bloqueado" : "En pausa"}</strong>
                    <span className="text-xs text-texto-3"> · {c.tipo === "clabe" ? "cambio de cuenta" : "alta"} · {fecha(c.decidido_en)}</span>
                    <p className="text-xs text-texto-2">{c.decidido_por}{c.comentario && `: "${c.comentario}"`}</p>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}

          {e.facturas.length > 0 && (
            <Tarjeta icono="factura" titulo="Facturas">
              <ul className="space-y-1 text-sm">{e.facturas.map((f) => <li key={f.id} className="flex justify-between"><span className="font-mono">{f.folio}</span><span className="font-mono tabular-nums">{pesos(f.monto)}</span></li>)}</ul>
            </Tarjeta>
          )}

          <Tarjeta icono="lista" titulo="Bitácora">
            <ol className="space-y-2 border-l border-borde pl-3 text-xs">
              {e.bitacora.slice(0, 25).map((b) => (
                <li key={b.id} className="relative"><span className="absolute top-1.5 -left-[15px] h-1.5 w-1.5 rounded-full bg-borde-fuerte" aria-hidden /><span className="font-mono text-[10.5px] text-texto-3">{fecha(b.creado_en)}</span><br /><strong>{b.actor}</strong> · {b.accion.replaceAll("_", " ")}</li>
              ))}
            </ol>
          </Tarjeta>
        </div>
      </div>
    </div>
  );
}
