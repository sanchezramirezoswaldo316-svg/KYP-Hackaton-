"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Semaforo } from "@/components/Semaforo";
import { explicarHallazgo, SEMAFORO, type Nivel } from "@/lib/explicar.ts";
import type { Decision, Fuente, Hallazgo, ResultadoPuntaje } from "@/lib/tipos.ts";
import { Velocimetro } from "./Velocimetro";

// Mapa de extracción en tiempo real: el servidor transmite cada consulta y cada dato extraído;
// aquí se dibujan como paquetes que viajan entre el proveedor y cada fuente.

type IdNodo = Fuente | "ia" | "reglas" | "veredicto";
type EstadoNodo = { estado: "inactivo" | "consultando" | "listo" | "omitido"; nivel?: Nivel; texto?: string };
type Evento =
  | { tipo: "inicio"; proveedor: { razon_social: string; rfc: string } }
  | { tipo: "consultando"; fuente: Fuente; t: number }
  | { tipo: "hallazgo"; fuente: Fuente; hallazgo: Hallazgo; ms: number; t: number }
  | { tipo: "puntaje"; resultado: ResultadoPuntaje; t: number }
  | { tipo: "ia"; estado: "redactando" | "listo" | "omitido"; t: number }
  | { tipo: "fin"; proveedor: { id: string }; verificacion: { puntaje: number; decision: Decision; resumen: string; resumen_origen: string } }
  | { tipo: "error"; mensaje: string };

const CENTRO = { x: 560, y: 300 };
const POS: Record<IdNodo, { x: number; y: number }> = {
  sat_69b: { x: 494, y: 92 }, sat_69: { x: 306, y: 145 }, ofac: { x: 195, y: 242 },
  web: { x: 195, y: 358 }, noticias: { x: 306, y: 456 }, dominio: { x: 494, y: 508 },
  ia: { x: 800, y: 170 }, reglas: { x: 800, y: 430 }, veredicto: { x: 955, y: 300 },
};
const NODO: Record<IdNodo, { icono: string; nombre: string }> = {
  sat_69b: { icono: "1", nombre: "SAT · Lista negra" },
  sat_69: { icono: "2", nombre: "SAT · Art. 69" },
  ofac: { icono: "3", nombre: "OFAC · EE. UU." },
  web: { icono: "4", nombre: "Página web" },
  noticias: { icono: "5", nombre: "Noticias" },
  dominio: { icono: "6", nombre: "Dominio" },
  ia: { icono: "7", nombre: "IA (Claude)" },
  reglas: { icono: "8", nombre: "Motor de reglas" },
  veredicto: { icono: "9", nombre: "Veredicto" },
};
const FUENTES: Fuente[] = ["sat_69b", "sat_69", "ofac", "web", "noticias", "dominio"];
const COLOR: Record<Nivel | "azul" | "gris", string> = { ok: "#10b981", info: "#94a3b8", alerta: "#f59e0b", peligro: "#ef4444", azul: "#3b82f6", gris: "#cbd5e1" };
const NIVEL_DECISION: Record<Decision, Nivel> = { liberar: "ok", revisar: "alerta", bloquear: "peligro" };
const VIAJE_MS = 800;

interface Paquete { id: number; de: { x: number; y: number }; a: { x: number; y: number }; color: string; inicio: number }
interface Linea { t: string; texto: string; nivel: Nivel | "azul" }

const inicial = (): Record<IdNodo, EstadoNodo> =>
  Object.fromEntries(Object.keys(POS).map((k) => [k, { estado: "inactivo" }])) as Record<IdNodo, EstadoNodo>;

const seg = (ms: number) => `${(ms / 1000).toFixed(3).padStart(6, "0")}s`;
const corto = (s: string, n = 24) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

export function MapaVivo({ cuerpo, alTerminar }: { cuerpo: { proveedor_id?: string; ejemplo?: string }; alTerminar?: () => void }) {
  const [nombre, setNombre] = useState<{ razon_social: string; rfc: string } | null>(null);
  const [nodos, setNodos] = useState(inicial);
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [tarjetas, setTarjetas] = useState<{ h: Hallazgo; ms: number }[]>([]);
  const [final, setFinal] = useState<Extract<Evento, { tipo: "fin" }> | null>(null);
  const [ahora, setAhora] = useState(0);
  const cola = useRef<Evento[]>([]);
  const terminado = useRef(false);
  const idPaquete = useRef(0);
  const consola = useRef<HTMLDivElement>(null);
  const iniciado = useRef(false);

  const nodo = (id: IdNodo, e: EstadoNodo) => setNodos((n) => ({ ...n, [id]: e }));
  const lanzar = (de: IdNodo | "centro", a: IdNodo | "centro", color: string) => {
    const p = (x: IdNodo | "centro") => (x === "centro" ? CENTRO : POS[x]);
    setPaquetes((ps) => [...ps, { id: ++idPaquete.current, de: p(de), a: p(a), color, inicio: performance.now() }]);
  };
  const log = (t: number | null, texto: string, nivel: Linea["nivel"]) => setLineas((l) => [...l, { t: t === null ? "      " : seg(t), texto, nivel }]);

  const procesar = useCallback((e: Evento) => {
    switch (e.tipo) {
      case "inicio":
        setNombre(e.proveedor);
        log(0, `Expediente abierto: ${e.proveedor.razon_social} · RFC ${e.proveedor.rfc}`, "azul");
        break;
      case "consultando":
        nodo(e.fuente, { estado: "consultando", texto: "consultando…" });
        lanzar("centro", e.fuente, COLOR.azul);
        log(e.t, `▸ ${NODO[e.fuente].nombre}: enviando consulta…`, "azul");
        break;
      case "hallazgo": {
        const x = explicarHallazgo(e.hallazgo);
        nodo(e.fuente, { estado: "listo", nivel: x.nivel, texto: x.titulo });
        lanzar(e.fuente, "centro", COLOR[x.nivel]);
        setTarjetas((t) => [...t, { h: e.hallazgo, ms: e.ms }]);
        const n = e.hallazgo.datos ? Object.keys(e.hallazgo.datos).length : 0;
        log(e.t, `◂ ${NODO[e.fuente].nombre}: ${x.titulo} · ${n} datos extraídos en ${e.ms} ms`, x.nivel);
        break;
      }
      case "puntaje":
        lanzar("centro", "reglas", COLOR.azul);
        nodo("reglas", { estado: "listo", nivel: NIVEL_DECISION[e.resultado.decision], texto: `${e.resultado.puntaje} puntos · ${e.resultado.motivos.filter((m) => m.puntos > 0).length} motivos` });
        log(e.t, `⚖ Reglas: ${e.resultado.puntaje} puntos → ${SEMAFORO[e.resultado.decision].texto}${e.resultado.bloqueo_directo ? " (bloqueo directo)" : ""}`, NIVEL_DECISION[e.resultado.decision]);
        break;
      case "ia":
        if (e.estado === "redactando") {
          nodo("ia", { estado: "consultando", texto: "redactando resumen…" });
          lanzar("centro", "ia", COLOR.azul);
          log(e.t, "✨ IA: redactando el resumen para la gestora…", "azul");
        } else if (e.estado === "listo") {
          nodo("ia", { estado: "listo", nivel: "ok", texto: "resumen listo" });
          lanzar("ia", "veredicto", COLOR.ok);
          log(e.t, "✨ IA: resumen listo (no cambia el puntaje)", "ok");
        } else {
          nodo("ia", { estado: "omitido", texto: "no fue necesaria" });
        }
        break;
      case "fin":
        lanzar("reglas", "veredicto", COLOR[NIVEL_DECISION[e.verificacion.decision]]);
        nodo("veredicto", { estado: "listo", nivel: NIVEL_DECISION[e.verificacion.decision], texto: SEMAFORO[e.verificacion.decision].texto });
        log(null, `🏁 Veredicto: ${SEMAFORO[e.verificacion.decision].emoji} ${SEMAFORO[e.verificacion.decision].texto} · guardado en el expediente`, NIVEL_DECISION[e.verificacion.decision]);
        setTimeout(() => setFinal(e), VIAJE_MS);
        alTerminar?.();
        break;
      case "error":
        log(null, `✖ ${e.mensaje}`, "peligro");
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lee la transmisión del servidor y encola los eventos.
  useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;
    let cancelado = false;
    (async () => {
      const res = await fetch("/api/en-vivo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
      if (!res.body) return;
      const lector = res.body.getReader();
      const dec = new TextDecoder();
      let resto = "";
      for (;;) {
        const { done, value } = await lector.read();
        if (done || cancelado) break;
        resto += dec.decode(value, { stream: true });
        const partes = resto.split("\n");
        resto = partes.pop() ?? "";
        for (const p of partes) if (p.trim()) cola.current.push(JSON.parse(p) as Evento);
      }
      terminado.current = true;
    })().catch((e) => cola.current.push({ tipo: "error", mensaje: (e as Error).message }));
    return () => { cancelado = true; };
  }, [cuerpo]);

  // Procesa la cola a un ritmo que el ojo pueda seguir (los tiempos mostrados son los reales del servidor).
  useEffect(() => {
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setInterval(() => {
      const e = cola.current.shift();
      if (e) procesar(e);
    }, reducir ? 30 : 420);
    return () => clearInterval(t);
  }, [procesar]);

  // Anima los paquetes en vuelo.
  useEffect(() => {
    if (paquetes.length === 0) return;
    let raf = requestAnimationFrame(function paso(t) {
      setAhora(t);
      setPaquetes((ps) => ps.filter((p) => t - p.inicio < VIAJE_MS + 100));
      raf = requestAnimationFrame(paso);
    });
    return () => cancelAnimationFrame(raf);
  }, [paquetes.length]);

  useEffect(() => {
    consola.current?.scrollTo({ top: consola.current.scrollHeight, behavior: "smooth" });
  }, [lineas.length]);

  const colorNodo = (e: EstadoNodo) => (e.estado === "listo" && e.nivel ? COLOR[e.nivel] : e.estado === "consultando" ? COLOR.azul : COLOR.gris);
  const arista = (a: { x: number; y: number }, b: { x: number; y: number }, e: EstadoNodo, key: string) => (
    <line key={key} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colorNodo(e)} strokeWidth={e.estado === "inactivo" ? 1.5 : 3}
      className={e.estado === "consultando" ? "linea-viva" : ""} strokeDasharray={e.estado === "inactivo" || e.estado === "omitido" ? "4 6" : undefined} opacity={e.estado === "omitido" ? 0.4 : 1} />
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div data-tour="mapa" className="overflow-x-auto rounded-2xl border border-tinta bg-tinta">
          <svg viewBox="0 0 1040 600" className="h-auto w-full min-w-[680px]" role="img" aria-label="Mapa de extracción de información en tiempo real">
            <defs>
              <pattern id="cuadricula" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="1" /></pattern>
              <filter id="brillo" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>
            <rect width="1040" height="600" fill="url(#cuadricula)" />

            {FUENTES.map((f) => arista(CENTRO, POS[f], nodos[f], f))}
            {arista(CENTRO, POS.ia, nodos.ia, "c-ia")}
            {arista(CENTRO, POS.reglas, nodos.reglas, "c-reglas")}
            {arista(POS.ia, POS.veredicto, nodos.ia.estado === "listo" ? nodos.ia : { estado: "inactivo" }, "ia-v")}
            {arista(POS.reglas, POS.veredicto, nodos.veredicto, "r-v")}

            {paquetes.map((p) => {
              const k = Math.min(1, Math.max(0, (ahora - p.inicio) / VIAJE_MS));
              const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
              return <circle key={p.id} cx={p.de.x + (p.a.x - p.de.x) * e} cy={p.de.y + (p.a.y - p.de.y) * e} r={7} fill={p.color} filter="url(#brillo)" />;
            })}

            {(Object.keys(POS) as IdNodo[]).map((id) => {
              const e = nodos[id], { x, y } = POS[id], c = colorNodo(e);
              return (
                <g key={id} opacity={e.estado === "omitido" ? 0.45 : 1}>
                  {e.estado === "consultando" && (
                    <circle cx={x} cy={y} r={38} fill="none" stroke={c} strokeWidth="2">
                      <animate attributeName="r" values="38;58" dur="1s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.9;0" dur="1s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle cx={x} cy={y} r={36} fill="#0f172a" stroke={c} strokeWidth={e.estado === "inactivo" ? 2 : 4} filter={e.estado === "listo" ? "url(#brillo)" : undefined} />
                  <text x={x} y={y + 10} textAnchor="middle" fontSize="28">{NODO[id].icono}</text>
                  <text x={x} y={y + 56} textAnchor="middle" fontSize="15" fontWeight="600" fill="#e2e8f0" stroke="#020617" strokeWidth="5" paintOrder="stroke">{NODO[id].nombre}</text>
                  {e.texto && <text x={x} y={y + 75} textAnchor="middle" fontSize="13" fill={c} stroke="#020617" strokeWidth="5" paintOrder="stroke">{corto(e.texto)}</text>}
                </g>
              );
            })}

            <g>
              <circle cx={CENTRO.x} cy={CENTRO.y} r={58} fill="#1e3a8a" stroke="#60a5fa" strokeWidth="4" filter="url(#brillo)" />
              <text x={CENTRO.x} y={CENTRO.y + 2} textAnchor="middle" fontSize="38">🏢</text>
              <text x={CENTRO.x} y={CENTRO.y + 28} textAnchor="middle" fontSize="11" fill="#bfdbfe">EXPEDIENTE</text>
              <text x={CENTRO.x} y={CENTRO.y + 82} textAnchor="middle" fontSize="15" fontWeight="700" fill="#f8fafc" stroke="#020617" strokeWidth="5" paintOrder="stroke">{nombre ? corto(nombre.razon_social, 34) : "Conectando…"}</text>
              {nombre && <text x={CENTRO.x} y={CENTRO.y + 100} textAnchor="middle" fontSize="12" fill="#94a3b8" fontFamily="monospace">{nombre.rfc}</text>}
            </g>
          </svg>
        </div>

        <div className="flex max-h-[520px] flex-col overflow-hidden rounded-2xl border border-tinta bg-tinta">
          <div className="flex items-center gap-2 border-b border-tinta px-3 py-2 text-xs text-tinta-3">
            <span className="h-2 w-2 animate-pulse rounded-full bg-superficie" /> Registro en vivo · tiempos reales del servidor
          </div>
          <div ref={consola} className="flex-1 space-y-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed">
            {lineas.map((l, i) => (
              <div key={i} className="animar-aparecer flex gap-2">
                <span className="shrink-0 text-tinta-3">{l.t}</span>
                <span style={{ color: l.nivel === "azul" ? "#93c5fd" : l.nivel === "info" ? "#cbd5e1" : COLOR[l.nivel] }}>{l.texto}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {tarjetas.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold">Datos extraídos</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tarjetas.map(({ h, ms }, i) => {
              const x = explicarHallazgo(h);
              return (
                <div key={i} className="animar-aparecer rounded-xl border-2 bg-white p-3" style={{ borderColor: COLOR[x.nivel] }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{NODO[h.fuente].icono} {NODO[h.fuente].nombre}</span>
                    <span className="font-mono text-[10px] text-tinta-3">{ms} ms</span>
                  </div>
                  <div className="text-sm" style={{ color: COLOR[x.nivel] === COLOR.info ? "#475569" : COLOR[x.nivel] }}>{x.titulo}</div>
                  {h.datos && (
                    <dl className="mt-2 space-y-0.5 font-mono text-[11px]">
                      {Object.entries(h.datos).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2 border-b border-dashed border-borde pb-0.5">
                          <dt className="shrink-0 text-tinta-3">{k}</dt><dd className="truncate text-right text-tinta" title={v}>{v}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {!h.datos && <p className="mt-1 text-xs text-tinta-3">{x.frase}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {final && (
        <div className="animar-aparecer grid items-center gap-6 rounded-2xl border border-borde bg-white p-6 md:grid-cols-[auto_1fr]">
          <Velocimetro valor={final.verificacion.puntaje} />
          <div className="space-y-3">
            <Semaforo decision={final.verificacion.decision} grande />
            <p className="text-lg">{SEMAFORO[final.verificacion.decision].frase}</p>
            <p className="text-sm text-tinta-3">{final.verificacion.resumen}</p>
            <Link href={`/expediente/${final.proveedor.id}`} className="inline-block rounded bg-marca px-4 py-2 font-medium text-white hover:bg-marca">Ver expediente →</Link>
          </div>
        </div>
      )}
    </div>
  );
}
