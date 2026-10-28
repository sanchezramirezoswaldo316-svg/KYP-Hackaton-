"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ICONOS, Icono, type NombreIcono } from "@/components/Icono";
import { Semaforo } from "@/components/Semaforo";
import { explicarHallazgo, SEMAFORO, type Nivel } from "@/lib/explicar.ts";
import type { Decision, Fuente, Hallazgo, ResultadoPuntaje } from "@/lib/tipos.ts";
import { Velocimetro } from "./Velocimetro";

// Grafo de vínculos en tiempo real (análisis de enlaces): el servidor transmite cada consulta y
// cada dato extraído; cada dato se vuelve un nodo unido a la fuente que lo devolvió.

type IdBase = Fuente | "ia" | "reglas" | "veredicto";
type Estado = "inactivo" | "consultando" | "listo" | "omitido";
type EstadoNodo = { estado: Estado; nivel?: Nivel; texto?: string };
type Evento =
  | { tipo: "inicio"; proveedor: { razon_social: string; rfc: string } }
  | { tipo: "consultando"; fuente: Fuente; t: number }
  | { tipo: "hallazgo"; fuente: Fuente; hallazgo: Hallazgo; ms: number; t: number }
  | { tipo: "puntaje"; resultado: ResultadoPuntaje; t: number }
  | { tipo: "ia"; estado: "redactando" | "listo" | "omitido"; t: number }
  | { tipo: "fin"; proveedor: { id: string }; verificacion: { puntaje: number; decision: Decision; resumen: string; resumen_origen: string } }
  | { tipo: "error"; mensaje: string };

type Disposicion = "radial" | "circular" | "cuadricula";
type TipoNodo = "proveedor" | "fuente" | "dato" | "motor" | "motivo" | "veredicto";
interface Nodo { id: string; tipo: TipoNodo; padre?: string; rotulo: string; valor: string; icono: NombreIcono; nivel?: Nivel; estado: Estado; fuente?: Fuente; texto?: string }
interface Punto { x: number; y: number }

const W = 1200, H = 720;
const FUENTES: Fuente[] = ["sat_69b", "sat_69", "ofac", "web", "noticias", "dominio"];
const BASE: Record<IdBase, { icono: NombreIcono; nombre: string }> = {
  sat_69b: { icono: "factura", nombre: "SAT · Lista negra" },
  sat_69: { icono: "banco", nombre: "SAT · Art. 69" },
  ofac: { icono: "escudo", nombre: "OFAC · EE. UU." },
  web: { icono: "web", nombre: "Página web" },
  noticias: { icono: "noticias", nombre: "Noticias" },
  dominio: { icono: "calendario", nombre: "Dominio" },
  ia: { icono: "ia", nombre: "IA (Claude)" },
  reglas: { icono: "balanza", nombre: "Motor de reglas" },
  veredicto: { icono: "escudoOk", nombre: "Veredicto" },
};
const COLOR: Record<Nivel | "azul" | "gris", string> = { ok: "#2fb37a", info: "#a7b4c2", alerta: "#e3a33b", peligro: "#ef5350", azul: "#2d8cf0", gris: "#364657" };
const NIVEL_DECISION: Record<Decision, Nivel> = { liberar: "ok", revisar: "alerta", bloquear: "peligro" };
// Fondo y borde de cada tipo de entidad (el borde cambia a ámbar o rojo si la entidad tiene alerta).
const ESTILO: Record<TipoNodo, { fondo: string; borde: string }> = {
  proveedor: { fondo: "#0f2a4a", borde: "#6cb2ff" },
  fuente: { fondo: "#10261d", borde: "#2f7d5a" },
  dato: { fondo: "#131b33", borde: "#34427a" },
  motor: { fondo: "#1b1733", borde: "#6d5bd0" },
  motivo: { fondo: "#331417", borde: "#ef5350" },
  veredicto: { fondo: "#18212a", borde: "#758595" },
};
const VIAJE_MS = 800;

interface Paquete { id: number; de: Punto; a: Punto; color: string; inicio: number }
interface Linea { t: string; texto: string; nivel: Nivel | "azul" }
interface Marca { t: number; tipo: "consulta" | "dato" | "puntaje"; nivel: Nivel | "azul" }

const inicial = (): Record<IdBase, EstadoNodo> =>
  Object.fromEntries(Object.keys(BASE).map((k) => [k, { estado: "inactivo" }])) as Record<IdBase, EstadoNodo>;

const seg = (ms: number) => `${(ms / 1000).toFixed(3).padStart(6, "0")}s`;
const corto = (s: string, n = 24) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const grados = (g: number) => (g * Math.PI) / 180;

function iconoDato(clave: string): NombreIcono {
  const k = clave.toLowerCase();
  if (k.includes("rfc")) return "huella";
  if (k.includes("nombre") || k.includes("parecido")) return "persona";
  if (k.includes("fecha") || k.includes("publicado") || k.includes("registrado") || k.includes("antigüedad")) return "calendario";
  if (k.includes("página") || k.includes("título") || k.includes("texto")) return "web";
  if (k.includes("búsqueda") || k.includes("buscado")) return "buscar";
  if (k.includes("estatus") || k.includes("coincidencia")) return "escudoAlerta";
  if (k.includes("vende") || k.includes("factura")) return "factura";
  if (k.includes("registros") || k.includes("resultados") || k.includes("candidatos") || k.includes("relevantes")) return "datos";
  return "numero";
}

// Arma las entidades y vínculos a partir de lo que ha llegado del servidor.
function construir(
  nombre: { razon_social: string; rfc: string } | null,
  estados: Record<IdBase, EstadoNodo>,
  hallazgos: Partial<Record<Fuente, { h: Hallazgo; ms: number }>>,
  motivos: { descripcion: string; puntos: number }[],
): { nodos: Nodo[]; aristas: [string, string][] } {
  const nodos: Nodo[] = [{
    id: "centro", tipo: "proveedor", rotulo: nombre ? `Proveedor · ${nombre.rfc}` : "Proveedor", valor: nombre?.razon_social ?? "Conectando…",
    icono: "empresa", estado: "listo", nivel: estados.veredicto.estado === "listo" ? estados.veredicto.nivel : undefined,
  }];
  const aristas: [string, string][] = [];
  for (const f of FUENTES) {
    const e = estados[f];
    nodos.push({ id: f, tipo: "fuente", rotulo: "Fuente", valor: BASE[f].nombre, icono: BASE[f].icono, estado: e.estado, nivel: e.nivel, fuente: f });
    aristas.push([f, "centro"]);
    const r = hallazgos[f];
    if (!r) continue;
    const x = explicarHallazgo(r.h);
    const riesgo = x.nivel === "alerta" || x.nivel === "peligro" ? x.nivel : undefined;
    const entradas = r.h.datos && Object.keys(r.h.datos).length ? Object.entries(r.h.datos) : [["Resultado", x.titulo] as [string, string]];
    entradas.forEach(([k, v], i) => {
      nodos.push({ id: `${f}:${i}`, tipo: "dato", padre: f, rotulo: k, valor: v, icono: iconoDato(k), estado: "listo", nivel: riesgo, fuente: f });
      aristas.push([`${f}:${i}`, f]);
    });
  }
  nodos.push({ id: "ia", tipo: "motor", rotulo: "Motor", valor: BASE.ia.nombre, icono: "ia", ...estados.ia });
  nodos.push({ id: "reglas", tipo: "motor", rotulo: "Motor", valor: BASE.reglas.nombre, icono: "balanza", ...estados.reglas });
  nodos.push({ id: "veredicto", tipo: "veredicto", rotulo: "Veredicto", valor: estados.veredicto.texto ?? "Pendiente", icono: estados.veredicto.nivel === "peligro" ? "escudoX" : estados.veredicto.nivel === "alerta" ? "escudoAlerta" : "escudoOk", ...estados.veredicto });
  aristas.push(["ia", "centro"], ["reglas", "centro"], ["ia", "veredicto"], ["reglas", "veredicto"]);
  motivos.filter((m) => m.puntos > 0).forEach((m, i) => {
    nodos.push({ id: `m:${i}`, tipo: "motivo", padre: "reglas", rotulo: `+${m.puntos} puntos`, valor: m.descripcion, icono: "alerta", estado: "listo", nivel: m.puntos >= 50 ? "peligro" : "alerta" });
    aristas.push([`m:${i}`, "reglas"]);
  });
  return { nodos, aristas };
}

// Tres acomodos del mismo grafo, como en las herramientas de análisis de vínculos.
function acomodar(nodos: Nodo[], modo: Disposicion): Map<string, Punto> {
  const pos = new Map<string, Punto>();
  if (modo === "circular") {
    const resto = nodos.filter((n) => n.id !== "centro");
    pos.set("centro", { x: 540, y: H / 2 });
    resto.forEach((n, i) => {
      const a = (i / resto.length) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 ? 0.8 : 1;
      pos.set(n.id, { x: 540 + 450 * r * Math.cos(a), y: H / 2 + 310 * r * Math.sin(a) });
    });
    return pos;
  }
  if (modo === "cuadricula") {
    pos.set("centro", { x: 520, y: 50 });
    const columnas: string[][] = [...FUENTES.map((f) => [f, ...nodos.filter((n) => n.padre === f).map((n) => n.id)]), ["veredicto", "ia", "reglas", ...nodos.filter((n) => n.padre === "reglas").map((n) => n.id)]];
    columnas.forEach((col, c) => col.forEach((id, f) => pos.set(id, { x: 30 + c * 166, y: 140 + f * 64 })));
    return pos;
  }
  // Radial: el proveedor al centro, las fuentes en un anillo y sus datos hacia afuera.
  const cx = 520, cy = H / 2, ex = 1.12, ey = 0.84;
  const anillo = (r: number, g: number) => ({ x: cx + r * ex * Math.cos(grados(g)), y: cy - r * ey * Math.sin(grados(g)) });
  pos.set("centro", { x: cx, y: cy });
  const angulos = [62, 110, 158, 202, 250, 298];
  FUENTES.forEach((f, i) => {
    pos.set(f, anillo(170, angulos[i]));
    const hijos = nodos.filter((n) => n.padre === f);
    hijos.forEach((n, j) => pos.set(n.id, anillo(j % 2 ? 390 : 300, angulos[i] + (j - (hijos.length - 1) / 2) * 14)));
  });
  pos.set("ia", { x: 930, y: 170 });
  pos.set("reglas", { x: 930, y: 500 });
  pos.set("veredicto", { x: 1060, y: 330 });
  nodos.filter((n) => n.padre === "reglas").forEach((n, i) => pos.set(n.id, { x: 1000, y: 580 + i * 50 }));
  return pos;
}

function Chip({ n, seleccionado, etiquetas }: { n: Nodo; seleccionado: boolean; etiquetas: boolean }) {
  const I = ICONOS[n.icono];
  const e = ESTILO[n.tipo];
  const borde = n.nivel === "peligro" ? COLOR.peligro : n.nivel === "alerta" ? COLOR.alerta : n.estado === "consultando" ? COLOR.azul : n.tipo === "veredicto" && n.nivel === "ok" ? COLOR.ok : e.borde;
  const valor = corto(n.valor, n.tipo === "proveedor" ? 30 : 22);
  const rotulo = corto(n.rotulo.toUpperCase(), 26);
  const ancho = Math.max(valor.length * 7, rotulo.length * 5.9) + 14;
  const grande = n.tipo === "proveedor";
  const t = grande ? 19 : 14;
  return (
    <g opacity={n.estado === "inactivo" || n.estado === "omitido" ? 0.5 : 1}>
      {n.estado === "consultando" && (
        <rect x={-t - 4} y={-t - 4} width={2 * t + 8} height={2 * t + 8} rx={3} fill="none" stroke={COLOR.azul} strokeWidth="1.5">
          <animate attributeName="opacity" values="1;0.2;1" dur="0.9s" repeatCount="indefinite" />
        </rect>
      )}
      <rect x={-t} y={-t} width={2 * t} height={2 * t} rx={2} fill="#18212a" stroke={borde} strokeWidth={seleccionado ? 2 : 1} />
      <I x={-t * 0.62} y={-t * 0.62} width={t * 1.24} height={t * 1.24} strokeWidth={1.7} color={n.estado === "inactivo" ? "#758595" : borde === e.borde && n.tipo === "dato" ? "#a7b4c2" : borde} />
      {etiquetas && (
        <g transform={`translate(${t + 3}, ${-16})`}>
          <rect width={ancho} height={32} rx={2} fill={e.fondo} stroke={seleccionado ? "#6cb2ff" : borde} strokeWidth={seleccionado ? 1.5 : 1} strokeOpacity={seleccionado ? 1 : 0.8} />
          <text x={6} y={12} fontSize="8.5" letterSpacing="0.6" fill="#8696a7" className="font-mono">{rotulo}</text>
          <text x={6} y={26} fontSize="12.5" fontWeight={grande ? 700 : 500} fill="#e3eaf1" className="font-sans">{valor}</text>
        </g>
      )}
      {seleccionado && <rect x={-t - 6} y={-t - 6} width={2 * t + 12} height={2 * t + 12} fill="none" stroke="#6cb2ff" strokeDasharray="3 3" />}
    </g>
  );
}

function Herramienta({ icono, texto, activo = false, onClick }: { icono: NombreIcono; texto: string; activo?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={activo} title={texto}
      className={`flex w-16 flex-col items-center gap-1 rounded-sm px-1 py-1.5 transition ${activo ? "bg-acento/15 text-acento-2" : "text-texto-3 hover:bg-realce hover:text-texto"}`}>
      <span className={`flex h-7 w-7 items-center justify-center rounded-sm border ${activo ? "border-acento/60" : "border-borde-fuerte bg-panel-2"}`}><Icono nombre={icono} className="h-4 w-4" /></span>
      <span className="font-mono text-[9.5px] tracking-wide uppercase">{texto}</span>
    </button>
  );
}

export function MapaVivo({ cuerpo, alTerminar }: { cuerpo: { proveedor_id?: string; ejemplo?: string }; alTerminar?: () => void }) {
  const [nombre, setNombre] = useState<{ razon_social: string; rfc: string } | null>(null);
  const [estados, setEstados] = useState(inicial);
  const [hallazgos, setHallazgos] = useState<Partial<Record<Fuente, { h: Hallazgo; ms: number }>>>({});
  const [motivos, setMotivos] = useState<{ descripcion: string; puntos: number }[]>([]);
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [final, setFinal] = useState<Extract<Evento, { tipo: "fin" }> | null>(null);
  const [ahora, setAhora] = useState(0);
  const [modo, setModo] = useState<Disposicion>("radial");
  const [halos, setHalos] = useState(true);
  const [etiquetas, setEtiquetas] = useState(true);
  const [vista, setVista] = useState({ k: 1, x: 0, y: 0 });
  const [sel, setSel] = useState<string | null>(null);
  const [pestana, setPestana] = useState<"tiempo" | "registro">("tiempo");
  const cola = useRef<Evento[]>([]);
  const idPaquete = useRef(0);
  const consola = useRef<HTMLDivElement>(null);
  const lienzo = useRef<SVGSVGElement>(null);
  const arrastre = useRef<{ x: number; y: number } | null>(null);
  const iniciado = useRef(false);

  const { nodos, aristas } = useMemo(() => construir(nombre, estados, hallazgos, motivos), [nombre, estados, hallazgos, motivos]);
  const pos = useMemo(() => acomodar(nodos, modo), [nodos, modo]);
  const posRef = useRef(pos);
  posRef.current = pos;

  const nodo = (id: IdBase, e: EstadoNodo) => setEstados((n) => ({ ...n, [id]: e }));
  const lanzar = (de: string, a: string, color: string) => {
    const p = posRef.current;
    const d = p.get(de), h = p.get(a);
    if (d && h) setPaquetes((ps) => [...ps, { id: ++idPaquete.current, de: d, a: h, color, inicio: performance.now() }]);
  };
  const log = (t: number | null, texto: string, nivel: Linea["nivel"]) => setLineas((l) => [...l, { t: t === null ? "      " : seg(t), texto, nivel }]);
  const marcar = (m: Marca) => setMarcas((ms) => [...ms, m]);

  const procesar = useCallback((e: Evento) => {
    switch (e.tipo) {
      case "inicio":
        setNombre(e.proveedor);
        log(0, `Expediente abierto: ${e.proveedor.razon_social} · RFC ${e.proveedor.rfc}`, "azul");
        break;
      case "consultando":
        nodo(e.fuente, { estado: "consultando", texto: "consultando…" });
        lanzar("centro", e.fuente, COLOR.azul);
        marcar({ t: e.t, tipo: "consulta", nivel: "azul" });
        log(e.t, `▸ ${BASE[e.fuente].nombre}: enviando consulta…`, "azul");
        break;
      case "hallazgo": {
        const x = explicarHallazgo(e.hallazgo);
        nodo(e.fuente, { estado: "listo", nivel: x.nivel, texto: x.titulo });
        setHallazgos((h) => ({ ...h, [e.fuente]: { h: e.hallazgo, ms: e.ms } }));
        lanzar(e.fuente, "centro", COLOR[x.nivel]);
        marcar({ t: e.t, tipo: "dato", nivel: x.nivel });
        const n = e.hallazgo.datos ? Object.keys(e.hallazgo.datos).length : 0;
        log(e.t, `◂ ${BASE[e.fuente].nombre}: ${x.titulo} · ${n} datos extraídos en ${e.ms} ms`, x.nivel);
        break;
      }
      case "puntaje":
        lanzar("centro", "reglas", COLOR.azul);
        nodo("reglas", { estado: "listo", nivel: NIVEL_DECISION[e.resultado.decision], texto: `${e.resultado.puntaje} puntos` });
        setMotivos(e.resultado.motivos);
        marcar({ t: e.t, tipo: "puntaje", nivel: NIVEL_DECISION[e.resultado.decision] });
        log(e.t, `Reglas: ${e.resultado.puntaje} puntos → ${SEMAFORO[e.resultado.decision].texto}${e.resultado.bloqueo_directo ? " (bloqueo directo)" : ""}`, NIVEL_DECISION[e.resultado.decision]);
        break;
      case "ia":
        if (e.estado === "redactando") {
          nodo("ia", { estado: "consultando", texto: "redactando resumen…" });
          lanzar("centro", "ia", COLOR.azul);
          log(e.t, "IA: redactando el resumen para la gestora…", "azul");
        } else if (e.estado === "listo") {
          nodo("ia", { estado: "listo", nivel: "ok", texto: "resumen listo" });
          lanzar("ia", "veredicto", COLOR.ok);
          log(e.t, "IA: resumen listo (no cambia el puntaje)", "ok");
        } else {
          nodo("ia", { estado: "omitido", texto: "no fue necesaria" });
        }
        break;
      case "fin":
        lanzar("reglas", "veredicto", COLOR[NIVEL_DECISION[e.verificacion.decision]]);
        nodo("veredicto", { estado: "listo", nivel: NIVEL_DECISION[e.verificacion.decision], texto: SEMAFORO[e.verificacion.decision].texto });
        log(null, `Veredicto: ${SEMAFORO[e.verificacion.decision].texto} · guardado en el expediente`, NIVEL_DECISION[e.verificacion.decision]);
        setTimeout(() => setFinal(e), VIAJE_MS);
        alTerminar?.();
        break;
      case "error":
        log(null, `ERROR ${e.mensaje}`, "peligro");
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
  }, [lineas.length, pestana]);

  // Acercar con la rueda del ratón alrededor del puntero (listener no pasivo para evitar el scroll de la página).
  const aLienzo = (clientX: number, clientY: number) => {
    const r = lienzo.current!.getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * W, y: ((clientY - r.top) / r.height) * H };
  };
  const zoom = useCallback((factor: number, centro: Punto = { x: W / 2, y: H / 2 }) => {
    setVista((v) => {
      const k = Math.min(3, Math.max(0.4, v.k * factor));
      return { k, x: centro.x - (centro.x - v.x) * (k / v.k), y: centro.y - (centro.y - v.y) * (k / v.k) };
    });
  }, []);
  useEffect(() => {
    const svg = lienzo.current;
    if (!svg) return;
    const rueda = (e: WheelEvent) => {
      e.preventDefault();
      const r = svg.getBoundingClientRect();
      zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12, { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H });
    };
    svg.addEventListener("wheel", rueda, { passive: false });
    return () => svg.removeEventListener("wheel", rueda);
  }, [zoom]);

  const exportar = () => {
    const svg = lienzo.current;
    if (!svg) return;
    const texto = new XMLSerializer().serializeToString(svg);
    const url = URL.createObjectURL(new Blob([texto], { type: "image/svg+xml" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `grafo-${nombre?.rfc ?? "kyp"}.svg` });
    a.click();
    URL.revokeObjectURL(url);
  };

  const conRiesgo = nodos.filter((n) => n.nivel === "alerta" || n.nivel === "peligro");
  const datos = nodos.filter((n) => n.tipo === "dato").length;
  const elegido = sel ? nodos.find((n) => n.id === sel) ?? null : null;
  const tiempos = FUENTES.map((f) => ({ f, r: hallazgos[f] })).filter((x) => x.r);
  const maxMs = Math.max(1, ...tiempos.map((x) => x.r!.ms));

  // Línea de tiempo: eventos agrupados en intervalos del tiempo real del servidor.
  const tMax = Math.max(1, ...marcas.map((m) => m.t));
  const CUBETAS = 48;
  const cubetas = Array.from({ length: CUBETAS }, () => ({ consultas: 0, datos: 0, peor: "ok" as Nivel }));
  const peso: Record<Nivel, number> = { info: 0, ok: 1, alerta: 2, peligro: 3 };
  for (const m of marcas) {
    if (m.tipo === "puntaje") continue;
    const c = cubetas[Math.min(CUBETAS - 1, Math.floor((m.t / tMax) * CUBETAS))];
    if (m.tipo === "consulta") c.consultas++;
    else {
      c.datos++;
      if (m.nivel !== "azul" && peso[m.nivel] > peso[c.peor]) c.peor = m.nivel;
    }
  }
  const altoMax = Math.max(1, ...cubetas.map((c) => c.consultas + c.datos));
  const puntaje = marcas.find((m) => m.tipo === "puntaje");

  return (
    <div className="space-y-4">
      <div data-tour="mapa" className="overflow-hidden rounded-md border border-borde bg-panel">
        {/* Barra de herramientas */}
        <div className="flex flex-wrap items-center gap-1 border-b border-borde bg-panel-2 px-2 py-1">
          <Herramienta icono="red" texto="Radial" activo={modo === "radial"} onClick={() => setModo("radial")} />
          <Herramienta icono="circular" texto="Circular" activo={modo === "circular"} onClick={() => setModo("circular")} />
          <Herramienta icono="cuadricula" texto="Cuadrícula" activo={modo === "cuadricula"} onClick={() => setModo("cuadricula")} />
          <span className="mx-1 h-10 w-px bg-borde" aria-hidden />
          <Herramienta icono="acercar" texto="Acercar" onClick={() => zoom(1.25)} />
          <Herramienta icono="alejar" texto="Alejar" onClick={() => zoom(0.8)} />
          <Herramienta icono="ajustar" texto="Ajustar" onClick={() => setVista({ k: 1, x: 0, y: 0 })} />
          <span className="mx-1 h-10 w-px bg-borde" aria-hidden />
          <Herramienta icono="halo" texto="Halos" activo={halos} onClick={() => setHalos((h) => !h)} />
          <Herramienta icono="etiqueta" texto="Etiquetas" activo={etiquetas} onClick={() => setEtiquetas((e) => !e)} />
          <Herramienta icono="camara" texto="Captura" onClick={exportar} />
          <div className="ml-auto hidden items-center gap-4 pr-2 font-mono text-[11px] text-texto-3 md:flex">
            <span><span className="text-texto">{nodos.length}</span> entidades</span>
            <span><span className="text-texto">{aristas.length}</span> vínculos</span>
            <span><span className="text-texto">{datos}</span> datos</span>
            <span className={conRiesgo.length ? "text-peligro" : ""}><span className="font-semibold">{conRiesgo.length}</span> con riesgo</span>
          </div>
        </div>

        <div className="grid xl:grid-cols-[1fr_300px]">
          {/* Lienzo del grafo */}
          <div className="relative min-w-0 border-borde bg-fondo xl:border-r">
            <svg
              ref={lienzo}
              viewBox={`0 0 ${W} ${H}`}
              className="h-auto w-full cursor-grab touch-none select-none active:cursor-grabbing"
              role="img"
              aria-label="Grafo de vínculos: proveedor, fuentes consultadas y datos extraídos en tiempo real"
              onPointerDown={(e) => {
                if ((e.target as Element).closest("[data-nodo]")) return;
                arrastre.current = aLienzo(e.clientX, e.clientY);
                (e.currentTarget as Element).setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (!arrastre.current) return;
                const p = aLienzo(e.clientX, e.clientY);
                const d = { x: p.x - arrastre.current.x, y: p.y - arrastre.current.y };
                arrastre.current = p;
                setVista((v) => ({ ...v, x: v.x + d.x, y: v.y + d.y }));
              }}
              onPointerUp={() => { arrastre.current = null; }}
              onClick={(e) => { if (!(e.target as Element).closest("[data-nodo]")) setSel(null); }}
            >
              <defs>
                <pattern id="cuadricula" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#151d26" strokeWidth="1" /></pattern>
                <radialGradient id="halo-peligro"><stop offset="0%" stopColor="#ef5350" stopOpacity="0.55" /><stop offset="60%" stopColor="#ef5350" stopOpacity="0.18" /><stop offset="100%" stopColor="#ef5350" stopOpacity="0" /></radialGradient>
                <radialGradient id="halo-alerta"><stop offset="0%" stopColor="#e3a33b" stopOpacity="0.45" /><stop offset="60%" stopColor="#e3a33b" stopOpacity="0.14" /><stop offset="100%" stopColor="#e3a33b" stopOpacity="0" /></radialGradient>
                <filter id="brillo" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              </defs>
              <rect width={W} height={H} fill="url(#cuadricula)" />

              <g transform={`translate(${vista.x} ${vista.y}) scale(${vista.k})`}>
                {/* Halos de riesgo detrás de todo */}
                {halos && conRiesgo.map((n) => {
                  const p = pos.get(n.id);
                  if (!p) return null;
                  const r = n.tipo === "dato" ? 34 : 54;
                  return <circle key={`h-${n.id}`} r={r} fill={`url(#halo-${n.nivel})`} style={{ transform: `translate(${p.x}px, ${p.y}px)`, transition: "transform 700ms cubic-bezier(.2,.8,.2,1)" }} />;
                })}

                {/* Vínculos */}
                {aristas.map(([a, b]) => {
                  const p = pos.get(a), q = pos.get(b);
                  if (!p || !q) return null;
                  const hijo = nodos.find((n) => n.id === a)!;
                  const activa = hijo.estado === "consultando";
                  const color = hijo.tipo === "dato" || hijo.tipo === "motivo" ? "#3a4a5c" : activa ? COLOR.azul : hijo.estado === "listo" && hijo.nivel ? COLOR[hijo.nivel] : COLOR.gris;
                  return (
                    <path key={`${a}-${b}`} fill="none" stroke={color} strokeWidth={hijo.tipo === "dato" ? 1 : 1.6} strokeOpacity={hijo.tipo === "dato" ? 0.9 : 0.85}
                      className={activa ? "linea-viva" : ""} strokeDasharray={hijo.estado === "inactivo" || hijo.estado === "omitido" ? "4 6" : undefined}
                      style={{ d: `path("M ${p.x} ${p.y} L ${q.x} ${q.y}")`, transition: "d 700ms cubic-bezier(.2,.8,.2,1)" } as React.CSSProperties} />
                  );
                })}

                {/* Paquetes en vuelo */}
                {paquetes.map((p) => {
                  const k = Math.min(1, Math.max(0, (ahora - p.inicio) / VIAJE_MS));
                  const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
                  return <circle key={p.id} cx={p.de.x + (p.a.x - p.de.x) * e} cy={p.de.y + (p.a.y - p.de.y) * e} r={5} fill={p.color} filter="url(#brillo)" />;
                })}

                {/* Entidades */}
                {nodos.map((n) => {
                  const p = pos.get(n.id);
                  if (!p) return null;
                  return (
                    <g key={n.id} data-nodo className="cursor-pointer" style={{ transform: `translate(${p.x}px, ${p.y}px)`, transition: "transform 700ms cubic-bezier(.2,.8,.2,1)" }}
                      onClick={() => setSel((s) => (s === n.id ? null : n.id))}>
                      <g className="aparecer-nodo"><Chip n={n} seleccionado={sel === n.id} etiquetas={etiquetas} /></g>
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* Control de acercamiento vertical */}
            <div className="absolute top-3 right-3 flex flex-col items-center gap-1 rounded-sm border border-borde bg-panel/90 p-1">
              <button type="button" onClick={() => zoom(1.25)} className="text-texto-3 hover:text-texto" aria-label="Acercar"><Icono nombre="acercar" className="h-4 w-4" /></button>
              <input type="range" min={40} max={300} value={Math.round(vista.k * 100)} onChange={(e) => zoom(Number(e.target.value) / 100 / vista.k)}
                aria-label="Nivel de acercamiento" className="h-28 w-4 accent-acento [direction:rtl] [writing-mode:vertical-lr]" />
              <button type="button" onClick={() => zoom(0.8)} className="text-texto-3 hover:text-texto" aria-label="Alejar"><Icono nombre="alejar" className="h-4 w-4" /></button>
              <span className="font-mono text-[9px] text-texto-3">{Math.round(vista.k * 100)}%</span>
            </div>
            <p className="pointer-events-none absolute bottom-2 left-3 font-mono text-[10px] text-texto-3">Arrastra para mover · rueda para acercar · toca una entidad para ver su detalle</p>
          </div>

          {/* Inspector y tiempos por fuente */}
          <aside className="flex flex-col border-t border-borde xl:border-t-0">
            <div className="border-b border-borde px-3 py-2"><span className="rotulo">Inspector</span></div>
            <div className="min-h-[180px] p-3 text-sm">
              {elegido ? <Inspector n={elegido} hallazgos={hallazgos} nodos={nodos} /> : (
                <div className="space-y-2">
                  <div className="font-semibold">{nombre?.razon_social ?? "Conectando…"}</div>
                  {nombre && <div className="font-mono text-xs text-texto-3">RFC {nombre.rfc}</div>}
                  <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-borde bg-borde font-mono text-xs">
                    {[["Entidades", nodos.length], ["Vínculos", aristas.length], ["Datos", datos], ["Con riesgo", conRiesgo.length]].map(([k, v]) => (
                      <div key={k} className="bg-panel-2 px-2 py-1.5"><dt className="text-[9.5px] tracking-wider text-texto-3 uppercase">{k}</dt><dd className="text-base text-texto">{v}</dd></div>
                    ))}
                  </dl>
                  <p className="text-xs text-texto-3">Toca una entidad del grafo para ver de qué fuente viene y qué significa.</p>
                </div>
              )}
            </div>
            <div className="border-y border-borde px-3 py-2"><span className="rotulo">Tiempo de respuesta</span></div>
            <ul className="flex-1 space-y-2 p-3 font-mono text-[11px]">
              {FUENTES.map((f) => {
                const r = hallazgos[f];
                const nivel = r ? explicarHallazgo(r.h).nivel : null;
                return (
                  <li key={f} className="space-y-0.5">
                    <div className="flex justify-between text-texto-3"><span>{BASE[f].nombre}</span><span className="text-texto">{r ? `${r.ms} ms` : "—"}</span></div>
                    <div className="h-1.5 bg-realce"><div className="h-full transition-[width] duration-500" style={{ width: r ? `${Math.max(3, (r.ms / maxMs) * 100)}%` : "0%", background: nivel ? COLOR[nivel] : "transparent" }} /></div>
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>

        {/* Línea de tiempo y registro */}
        <div className="border-t border-borde">
          <div className="flex items-center border-b border-borde bg-panel-2 px-2" role="tablist">
            {([["tiempo", "Línea de tiempo"], ["registro", "Registro"]] as const).map(([id, texto]) => (
              <button key={id} role="tab" aria-selected={pestana === id} onClick={() => setPestana(id)}
                className={`border-b-2 px-3 py-1.5 font-mono text-[11px] tracking-wide uppercase ${pestana === id ? "border-acento text-texto" : "border-transparent text-texto-3 hover:text-texto-2"}`}>{texto}</button>
            ))}
            <span className="ml-auto flex items-center gap-2 pr-2 font-mono text-[10px] text-texto-3"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ok" />tiempos reales del servidor</span>
          </div>
          {pestana === "tiempo" ? (
            <div className="px-3 pt-3 pb-2">
              <svg viewBox="0 0 960 110" className="h-28 w-full" preserveAspectRatio="none" role="img" aria-label="Consultas y datos recibidos a lo largo del tiempo">
                {[0, 0.5, 1].map((k) => <line key={k} x1={0} x2={960} y1={10 + 80 * k} y2={10 + 80 * k} stroke="#1f2a35" strokeWidth="1" />)}
                {cubetas.map((c, i) => {
                  const ancho = 960 / CUBETAS;
                  const hc = (c.consultas / altoMax) * 80, hd = (c.datos / altoMax) * 80;
                  return (
                    <g key={i}>
                      <title>{`${c.consultas} consultas · ${c.datos} respuestas`}</title>
                      {hc > 0 && <rect x={i * ancho + 1} y={90 - hc} width={ancho - 2} height={hc} fill={COLOR.azul} opacity={0.75} />}
                      {hd > 0 && <rect x={i * ancho + 1} y={90 - hc - hd} width={ancho - 2} height={hd} fill={COLOR[c.peor]} />}
                    </g>
                  );
                })}
                {puntaje && (
                  <g>
                    <line x1={(puntaje.t / tMax) * 960} x2={(puntaje.t / tMax) * 960} y1={4} y2={92} stroke="#e3eaf1" strokeDasharray="2 3" />
                    <text x={(puntaje.t / tMax) * 960 + ((puntaje.t / tMax) > 0.85 ? -4 : 4)} y={12} fontSize="9" fill="#a7b4c2" textAnchor={(puntaje.t / tMax) > 0.85 ? "end" : "start"} className="font-mono">PUNTAJE</text>
                  </g>
                )}
                <text x={0} y={106} fontSize="9" fill="#758595" className="font-mono">0 ms</text>
                <text x={480} y={106} fontSize="9" fill="#758595" textAnchor="middle" className="font-mono">{(tMax / 2).toFixed(1)} ms</text>
                <text x={960} y={106} fontSize="9" fill="#758595" textAnchor="end" className="font-mono">{tMax.toFixed(1)} ms</text>
              </svg>
              <div className="flex flex-wrap gap-4 font-mono text-[10px] text-texto-3 uppercase">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-acento" />Consultas</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-ok" />Respuesta sin riesgo</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-alerta" />Alerta</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-peligro" />Crítico</span>
              </div>
            </div>
          ) : (
            <div ref={consola} className="h-[150px] space-y-1 overflow-y-auto bg-fondo p-3 font-mono text-[11px] leading-relaxed">
              {lineas.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <span className="shrink-0 text-texto-3">{l.t}</span>
                  <span style={{ color: l.nivel === "azul" ? "#6cb2ff" : COLOR[l.nivel] }}>{l.texto}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {final && (
        <div className="animar-aparecer grid items-center gap-6 rounded-md border border-borde bg-panel p-6 md:grid-cols-[auto_1fr]">
          <Velocimetro valor={final.verificacion.puntaje} />
          <div className="space-y-3">
            <Semaforo decision={final.verificacion.decision} grande />
            <p className="text-base">{SEMAFORO[final.verificacion.decision].frase}</p>
            <p className="text-sm text-texto-2">{final.verificacion.resumen}</p>
            <Link href={`/expediente/${final.proveedor.id}`} className="inline-block rounded bg-acento px-4 py-2 font-medium text-white hover:bg-acento/85">Ver expediente →</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Inspector({ n, hallazgos, nodos }: { n: Nodo; hallazgos: Partial<Record<Fuente, { h: Hallazgo; ms: number }>>; nodos: Nodo[] }) {
  const r = n.fuente ? hallazgos[n.fuente] : undefined;
  const x = r ? explicarHallazgo(r.h) : null;
  const tono = n.nivel === "peligro" ? "text-peligro" : n.nivel === "alerta" ? "text-alerta" : n.nivel === "ok" ? "text-ok" : "text-texto-2";
  const TIPO: Record<TipoNodo, string> = { proveedor: "Proveedor", fuente: "Fuente consultada", dato: "Dato extraído", motor: "Motor", motivo: "Motivo del puntaje", veredicto: "Veredicto" };
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-sm border border-borde bg-panel-2"><Icono nombre={n.icono} className={`h-4 w-4 ${tono}`} /></span>
        <div className="min-w-0">
          <div className="font-mono text-[9.5px] tracking-wider text-texto-3 uppercase">{TIPO[n.tipo]}</div>
          <div className="truncate font-semibold" title={n.valor}>{n.tipo === "dato" ? n.rotulo : n.valor}</div>
        </div>
      </div>
      {n.tipo === "dato" && <p className="rounded-sm border border-borde bg-fondo px-2 py-1.5 font-mono text-xs break-words text-texto">{n.valor}</p>}
      {n.tipo === "motivo" && <p className="text-xs text-texto-2"><span className={`font-mono font-semibold ${tono}`}>{n.rotulo}</span> · {n.valor}</p>}
      {x && (
        <div className="space-y-1 text-xs">
          <div className={`font-medium ${tono}`}>{x.titulo}</div>
          <p className="text-texto-2">{x.frase}</p>
          <div className="font-mono text-[10.5px] text-texto-3">{BASE[n.fuente!].nombre} · {r!.ms} ms · {nodos.filter((m) => m.padre === n.fuente).length} datos</div>
        </div>
      )}
      {n.tipo === "fuente" && r?.h.datos && (
        <dl className="space-y-0.5 font-mono text-[10.5px]">
          {Object.entries(r.h.datos).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2 border-b border-dashed border-borde pb-0.5"><dt className="shrink-0 text-texto-3">{k}</dt><dd className="truncate text-right" title={v}>{v}</dd></div>
          ))}
        </dl>
      )}
      {r?.h.evidencia_url && <a href={r.h.evidencia_url} target="_blank" rel="noreferrer" className="block truncate font-mono text-[10.5px] text-acento-2 hover:underline">{r.h.evidencia_url}</a>}
      {(n.tipo === "motor" || n.tipo === "veredicto") && n.texto && <p className={`text-xs ${tono}`}>{n.texto}</p>}
    </div>
  );
}
