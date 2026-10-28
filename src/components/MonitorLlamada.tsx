// Monitor visual de la llamada de verificación de un cambio de CLABE: la escena de la llamada,
// la ruta que tomó el guion, qué pasa con el dinero, los momentos clave y la evidencia.
import type { Caso, Llamada, Proveedor, SolicitudClabe } from "@/lib/tipos.ts";
import { fecha, pesos } from "@/lib/formato.ts";
import { enmascararClabe } from "@/lib/validacion.ts";
import type { EstadoPaso, NivelMonitor, Paso, VistaLlamada } from "@/lib/voz/monitor.ts";
import { Icono, type NombreIcono } from "./Icono";
import { AudioLlamada } from "./cliente/AudioLlamada";
import { BotonesDecision } from "./cliente/BotonesDecision";
import { SimularLlamada } from "./cliente/SimularLlamada";

const COLOR: Record<NivelMonitor, string> = { ok: "#2fb37a", alerta: "#e3a33b", peligro: "#ef5350", acento: "#6cb2ff", gris: "#8696a7" };

function Chip({ nivel, children }: { nivel: NivelMonitor; children: React.ReactNode }) {
  const c = COLOR[nivel];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 font-mono text-[10.5px] font-semibold tracking-wider whitespace-nowrap" style={{ color: c, background: `${c}1f`, boxShadow: `inset 0 0 0 1px ${c}66` }}>
      {children}
    </span>
  );
}

function Panel({ titulo, extra, children, className = "", borde }: { titulo: string; extra?: React.ReactNode; children: React.ReactNode; className?: string; borde?: string }) {
  return (
    <section className={`overflow-hidden rounded-md border bg-panel ${className}`} style={{ borderColor: borde ?? "var(--color-borde)" }}>
      <div className="flex items-center justify-between gap-3 border-b border-borde px-4 py-2.5">
        <h2 className="rotulo">{titulo}</h2>
        {extra}
      </div>
      {children}
    </section>
  );
}

export function estadoLlamada(v: VistaLlamada): { texto: string; nivel: NivelMonitor; vivo: boolean } {
  if (v.fase === "llamando") return { texto: "EN LLAMADA", nivel: "peligro", vivo: true };
  if (v.fase === "por_llamar") return { texto: "POR LLAMAR", nivel: "gris", vivo: false };
  if (v.fase === "fallida") return { texto: "LLAMADA FALLIDA", nivel: "alerta", vivo: false };
  const r = { confirmado: ["CONFIRMADO", "ok"], no_reconoce: ["NO RECONOCE EL CAMBIO", "peligro"], datos_no_coinciden: ["DATOS NO COINCIDEN", "alerta"], sin_respuesta: ["SIN RESPUESTA", "alerta"] } as const;
  const [texto, nivel] = r[v.resultado!];
  return { texto: `TERMINADA · ${texto}`, nivel, vivo: false };
}

export function PildoraLlamada({ v }: { v: VistaLlamada }) {
  const e = estadoLlamada(v);
  return (
    <Chip nivel={e.nivel}>
      <span className={`h-1.5 w-1.5 rounded-full ${e.vivo ? "animar-parpadeo" : ""}`} style={{ background: COLOR[e.nivel] }} />
      {e.texto}
    </Chip>
  );
}

function Nodo({ icono, color, activo, x, y, titulo, sub }: { icono: NombreIcono; color: string; activo: boolean; x: string; y: string; titulo: string; sub: string }) {
  return (
    <div className="absolute h-0 w-0" style={{ left: x, top: y }}>
      {activo && <>
        <span className="onda-voz absolute top-0 left-0 h-28 w-28 rounded-full border-2" style={{ borderColor: color }} aria-hidden />
        <span className="onda-voz-2 absolute top-0 left-0 h-28 w-28 rounded-full border-2" style={{ borderColor: color }} aria-hidden />
      </>}
      <div className="absolute top-0 left-0 flex h-[88px] w-[88px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 bg-panel" style={{ borderColor: color, boxShadow: activo ? `0 0 36px ${color}66` : "none", color }}>
        <Icono nombre={icono} className="h-10 w-10" trazo={1.4} />
      </div>
      <div className="absolute top-[54px] left-0 -translate-x-1/2 text-center whitespace-nowrap">
        <div className="font-semibold">{titulo}</div>
        <div className="font-mono text-[11px]" style={{ color }}>{sub}</div>
      </div>
    </div>
  );
}

// Agente y proveedor real unidos por la línea de la llamada; el número de la solicitud queda fuera.
function Escena({ v, p, s }: { v: VistaLlamada; p: Proveedor; s: SolicitudClabe }) {
  const enLlamada = v.fase === "llamando";
  const linea = enLlamada ? "#a78bfa" : v.fase === "terminada" ? COLOR[estadoLlamada(v).nivel] : "#364657";
  return (
    <div className="relative h-[360px] min-w-[640px] reticula bg-fondo">
      <svg aria-hidden viewBox="0 0 1000 360" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <line x1="170" y1="160" x2="830" y2="130" stroke={linea} strokeWidth="3" vectorEffect="non-scaling-stroke" strokeDasharray="10 4" className={enLlamada ? "linea-viva" : ""} />
        {s.telefono_en_solicitud && <line x1="170" y1="160" x2="690" y2="300" stroke="#364657" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeDasharray="3 7" />}
      </svg>
      <div className="absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-borde bg-fondo px-2 py-0.5 font-mono text-[10.5px] tracking-wider whitespace-nowrap text-texto-2">
        LÍNEA SEGURA · NÚMERO DEL ALTA
      </div>
      <Nodo icono="robot" color="#a78bfa" activo={enLlamada} x="17%" y="44%" titulo="Agente KYP" sub={enLlamada ? "LLAMANDO…" : v.fase === "terminada" ? "LLAMADA TERMINADA" : v.fase === "fallida" ? "NO SE PUDO LLAMAR" : "EN ESPERA"} />
      <Nodo icono="persona" color={COLOR.acento} activo={false} x="83%" y="36%" titulo="Proveedor real" sub={`${enmascararTelefono(p.telefono_registrado)} · registrado en el alta`} />
      {s.telefono_en_solicitud && (
        <>
          <div className="absolute top-[64%] left-[43%] flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-peligro bg-fondo text-peligro"><Icono nombre="error" className="h-4 w-4" trazo={2} /></div>
          <div className="absolute top-[83%] left-[69%] h-0 w-0">
            <div className="absolute top-0 left-0 flex h-[52px] w-[52px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-dashed border-borde-fuerte bg-panel text-peligro"><Icono nombre="escudoX" className="h-6 w-6" trazo={1.5} /></div>
            <div className="absolute top-0 left-9 -translate-y-1/2 whitespace-nowrap">
              <div className="font-mono text-xs text-texto-3 line-through">{s.telefono_en_solicitud}</div>
              <div className="text-xs text-texto-3">Número de la solicitud · nunca se marca</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const enmascararTelefono = (t: string) => {
  const d = t.replace(/\D/g, "");
  return d.length > 6 ? `+${d.slice(0, 2)} ${d.slice(2, 4)} •••• ${d.slice(-4)}` : t;
};

const RUTA: { id: Paso; titulo: string; icono: NombreIcono; x: number; y: number }[] = [
  { id: "marcar", titulo: "Llamar al número registrado", icono: "llamadaSaliente", x: 9, y: 28 },
  { id: "contesto", titulo: "¿Contestó?", icono: "telefono", x: 29, y: 28 },
  { id: "reconoce", titulo: "¿Reconoce el cambio?", icono: "persona", x: 50, y: 28 },
  { id: "datos", titulo: "¿Datos coinciden?", icono: "numero", x: 71, y: 28 },
  { id: "confirmado", titulo: "Cambio confirmado", icono: "escudoOk", x: 91, y: 28 },
  { id: "sin_respuesta", titulo: "No contestó", icono: "sinRespuesta", x: 29, y: 78 },
  { id: "fraude", titulo: "Fraude detenido", icono: "escudoX", x: 50, y: 78 },
  { id: "no_coinciden", titulo: "Datos no coinciden", icono: "alerta", x: 71, y: 78 },
];
const COLOR_PASO: Record<EstadoPaso, string> = { hecho: COLOR.ok, actual: COLOR.acento, pendiente: "#364657", ok: COLOR.ok, alerta: COLOR.alerta, peligro: COLOR.peligro, apagado: "#1f2a35" };

function Ruta({ v }: { v: VistaLlamada }) {
  const arista = (de: Paso, a: Paso) => {
    const p = RUTA.find((r) => r.id === de)!, q = RUTA.find((r) => r.id === a)!;
    const s = v.ruta[a];
    const color = s === "pendiente" || s === "apagado" ? COLOR_PASO[s] : COLOR_PASO[s === "actual" ? "actual" : s];
    return <line key={`${de}-${a}`} x1={p.x * 10} y1={p.y * 3} x2={q.x * 10} y2={q.y * 3} stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeDasharray={s === "pendiente" ? "4 5" : undefined} />;
  };
  return (
    <div className="overflow-x-auto">
      <div className="relative h-[300px] min-w-[860px]">
        <svg aria-hidden viewBox="0 0 1000 300" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          {arista("marcar", "contesto")}{arista("contesto", "reconoce")}{arista("reconoce", "datos")}{arista("datos", "confirmado")}
          {arista("contesto", "sin_respuesta")}{arista("reconoce", "fraude")}{arista("datos", "no_coinciden")}
        </svg>
        {[["contesto", 39], ["reconoce", 60], ["datos", 81]].map(([id, x]) => <span key={id} className="absolute top-[20%] font-mono text-[10px] text-ok" style={{ left: `${x}%` }}>SÍ</span>)}
        {[29, 50, 71].map((x) => <span key={x} className="absolute top-[52%] font-mono text-[10px] text-peligro" style={{ left: `${x + 1}%` }}>NO</span>)}
        {RUTA.map((r) => {
          const s = v.ruta[r.id];
          const c = COLOR_PASO[s];
          const vivo = s === "actual";
          const brilla = s === "ok" || s === "peligro" || s === "alerta";
          return (
            <div key={r.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${r.x}%`, top: `${r.y}%` }}>
              <div
                className={`flex items-center gap-2 rounded px-3 py-2.5 text-[13px] font-medium whitespace-nowrap ${vivo ? "animar-parpadeo" : ""} ${s === "apagado" ? "text-texto-3/60" : s === "pendiente" ? "text-texto-2" : "text-texto"}`}
                style={{ border: `${s === "pendiente" || s === "apagado" ? "1px dashed" : "1.5px solid"} ${s === "apagado" ? "#364657" : c}`, background: s === "apagado" ? "var(--color-fondo)" : s === "pendiente" ? "var(--color-panel)" : `linear-gradient(${c}1c, ${c}1c), var(--color-panel)`, boxShadow: brilla || vivo ? `0 0 24px ${c}55` : "none" }}
              >
                <Icono nombre={r.icono} className="h-4 w-4" />{r.titulo}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Dinero({ v, monto }: { v: VistaLlamada; monto: number | null }) {
  const c = COLOR[v.dinero.nivel];
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-3 px-4 py-8 text-center">
      <div className="flex h-[76px] w-[76px] items-center justify-center rounded-md border" style={{ color: c, borderColor: c, background: `${c}1f`, boxShadow: `0 0 30px ${c}40` }}>
        <Icono nombre={v.dinero.estado === "liberado" ? "candadoAbierto" : "candado"} className="h-10 w-10" trazo={1.5} />
      </div>
      <div className="font-mono text-4xl font-semibold tabular-nums">{monto === null ? "—" : pesos(monto)}</div>
      <div className="rotulo -mt-1">monto de su última factura</div>
      <Chip nivel={v.dinero.nivel}>{v.dinero.titulo}</Chip>
      <p className="max-w-xs text-[13px] text-texto-2">{v.dinero.texto}</p>
      {v.dinero.estado === "protegido" && (
        <div className="animar-sello absolute top-6 right-5 rounded border-[3px] border-peligro px-3 py-1.5 text-center font-mono text-[15px] leading-tight font-bold tracking-[0.12em] text-peligro">FRAUDE<br />DETENIDO</div>
      )}
    </div>
  );
}

// Franja de turnos: cada frase ocupa un ancho proporcional a lo que se dijo (no hay marcas de tiempo).
function Momentos({ v }: { v: VistaLlamada }) {
  if (v.mensajes.length === 0) {
    return (
      <div className="space-y-2 p-4">
        <div className={`h-10 rounded-sm ${v.fase === "llamando" ? "franja-espera" : "bg-panel-2"}`} />
        <p className="text-xs text-texto-3">
          {v.fase === "llamando" ? "La conversación está en curso. ElevenLabs envía la transcripción completa al terminar la llamada." : v.fase === "por_llamar" ? "Aún no hay llamada." : "No hay transcripción de esta llamada."}
        </p>
      </div>
    );
  }
  return (
    <div className="p-4">
      <div className="relative h-[150px]">
        {v.marcadores.map((m) => (
          <div key={m.titulo} className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `${m.pos * 100}%` }}>
            <Chip nivel={m.nivel}>{m.titulo}</Chip>
            <span className="h-12 w-px" style={{ background: COLOR[m.nivel] }} aria-hidden />
          </div>
        ))}
        <div className="absolute inset-x-0 bottom-6 flex h-14 gap-0.5">
          {v.mensajes.map((m, i) => (
            <div key={i} title={m.texto} className="flex min-w-[3px] items-center gap-px overflow-hidden rounded-sm" style={{ flexGrow: m.largo, flexBasis: 0 }}>
              {Array.from({ length: Math.max(2, Math.round(m.largo * 120)) }, (_, j) => (
                <span key={j} className="min-w-px flex-1 rounded-[1px]" style={{ height: `${10 + Math.abs(Math.sin((i * 31 + j) * 1.7) * 28 + Math.sin((i * 31 + j) * 0.6) * 14)}px`, background: m.quien === "agente" ? "#a78bfa" : COLOR.acento }} />
              ))}
            </div>
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-0 flex justify-between font-mono text-[10px] text-texto-3"><span>INICIO</span><span>FIN DE LA LLAMADA</span></div>
      </div>
      <div className="mt-2 flex flex-wrap gap-4 font-mono text-[10.5px] text-texto-3 uppercase">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-voz" />Agente</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-acento-2" />Proveedor</span>
        <span>El ancho de cada tramo es proporcional a lo que se dijo</span>
      </div>
    </div>
  );
}

export function MonitorLlamada({ v, p, s, llamada, monto, caso, simular }: {
  v: VistaLlamada; p: Proveedor; s: SolicitudClabe; llamada?: Llamada; monto: number | null; caso?: Caso; simular: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-stretch gap-4">
        <Panel titulo="Escena de la llamada" className="min-w-0 flex-[999_1_640px]" extra={<span className="font-mono text-[11px] text-texto-3">{llamada ? (llamada.simulada ? "simulada (demo)" : llamada.conversation_id ?? "") : fecha(s.creado_en)}</span>}>
          <div data-tour="clabe-timeline" className="overflow-x-auto"><Escena v={v} p={p} s={s} /></div>
        </Panel>
        <Panel titulo="Dinero en juego" className="flex min-w-0 flex-[1_1_340px] flex-col" borde={`${COLOR[v.dinero.nivel]}80`}>
          <Dinero v={v} monto={monto} />
        </Panel>
      </div>

      <Panel titulo="Ruta de la conversación" extra={<span className="font-mono text-[11px] text-texto-3">guion del agente de voz</span>}>
        <Ruta v={v} />
      </Panel>

      <Panel titulo="Momentos clave de la llamada">
        <Momentos v={v} />
      </Panel>

      <div className="flex flex-wrap items-start gap-4">
        <Panel titulo="Transcripción" className="min-w-0 flex-[999_1_560px]" extra={llamada?.simulada ? <Chip nivel="alerta">SIMULADA</Chip> : undefined}>
          <div className="space-y-3 p-4">
            {v.mensajes.length === 0 && <p className="text-sm text-texto-3">Aparece aquí cuando termina la llamada.</p>}
            {v.mensajes.map((m, i) => (
              <div key={i} className={`flex ${m.quien === "agente" ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[78%] rounded border px-3 py-2 text-sm ${m.quien === "agente" ? "border-borde bg-panel-2" : "border-acento/35 bg-acento/8"}`}>
                  <div className={`mb-1 flex items-center gap-1.5 font-mono text-[10.5px] font-semibold tracking-wider ${m.quien === "agente" ? "text-voz" : "text-acento-2"}`}>
                    <Icono nombre={m.quien === "agente" ? "robot" : "persona"} className="h-3 w-3" />{m.quien === "agente" ? "AGENTE KYP" : "PROVEEDOR"}
                  </div>
                  {m.texto}
                </div>
              </div>
            ))}
            {llamada?.resumen && <p className="rounded border border-borde bg-fondo p-3 text-xs text-texto-2"><span className="rotulo mr-2">Resumen</span>{llamada.resumen}</p>}
            {llamada && !llamada.simulada && llamada.conversation_id && <AudioLlamada llamadaId={llamada.id} />}
          </div>
        </Panel>

        <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-4">
          <Panel titulo="Criterios de evaluación">
            <ul className="divide-y divide-borde px-4">
              {v.criterios.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div><div className="font-mono text-xs">{c.id}</div><div className="text-xs text-texto-3">{c.texto}</div></div>
                  <Chip nivel={c.nivel}>{c.valor}</Chip>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel titulo="Cuentas">
            <dl className="space-y-2 p-4 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-texto-3">Cuenta actual</dt><dd className="font-mono">{enmascararClabe(p.clabe)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-texto-3">Cuenta solicitada</dt><dd className="font-mono text-alerta">{enmascararClabe(s.clabe_nueva)}</dd></div>
            </dl>
          </Panel>

          {simular && !llamada && (v.fase === "por_llamar" || v.fase === "llamando") && (
            <Panel titulo="Simular la llamada (demo)" borde="rgba(227,163,59,0.5)">
              <div data-tour="simular" className="space-y-2 p-4">
                <p className="text-xs text-texto-2">La voz real no está conectada. Elige qué respondería el proveedor:</p>
                <SimularLlamada solicitudId={s.id} />
              </div>
            </Panel>
          )}

          {caso && (
            <Panel titulo="Tu decisión" borde="rgba(45,140,240,0.5)">
              <div className="space-y-3 p-4">
                <p className="text-sm text-texto-2">{caso.motivo}. Tu decisión queda registrada con tu nombre y la hora.</p>
                <BotonesDecision casoId={caso.id} />
              </div>
            </Panel>
          )}
        </div>
      </div>

      <Panel titulo="Línea de tiempo del caso" extra={<span className="font-mono text-[11px] text-texto-3">eventos de KYP y del agente de voz</span>}>
        <div className="overflow-x-auto">
          <ol className="flex min-w-[880px] px-4 py-5">
            {v.eventos.map((e, i) => (
              <li key={i} className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-center">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-[1px]" style={{ background: COLOR[e.nivel] }} />
                  <span className="h-px flex-1" style={{ background: i === v.eventos.length - 1 ? "transparent" : "#364657" }} />
                </div>
                <div className="pr-3">
                  <div className="font-mono text-[11px] text-texto-3">{fecha(e.fecha)}</div>
                  <div className={`text-[13px] font-medium ${e.nivel === "peligro" ? "text-peligro" : "text-texto"}`}>{e.titulo}</div>
                  <div className="text-[11px] text-texto-3">{e.fuente}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Panel>
    </div>
  );
}
