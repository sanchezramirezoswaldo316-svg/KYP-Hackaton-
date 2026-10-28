"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icono } from "@/components/Icono";

// Demo guiada "El lunes de Ana": resalta partes de la pantalla y cuenta la historia paso a paso.

interface Paso {
  ruta: string | (() => Promise<string>);
  objetivo: string; // valor de data-tour
  titulo: string;
  texto: string;
  // Acción que se ejecuta una vez al llegar al paso (por ejemplo, crear un intento de fraude).
  preparar?: () => Promise<string | void>;
}

const CLAVE = "kyp-tour";

async function rutaPrimerCaso(): Promise<string> {
  const casos = (await (await fetch("/api/casos")).json()) as { proveedor_id: string; tipo: string }[];
  const c = casos.find((x) => x.tipo === "alta") ?? casos[0];
  return c ? `/expediente/${c.proveedor_id}` : "/bandeja";
}

async function rutaMapaPrimerCaso(): Promise<string> {
  const r = await rutaPrimerCaso();
  return r.startsWith("/expediente/") ? `/en-vivo?proveedor=${r.split("/").pop()}` : "/en-vivo";
}

async function crearIntentoFraude(): Promise<string> {
  const provs = (await (await fetch("/api/proveedores")).json()) as { id: string; estado: string; clabe: string | null }[];
  const p = provs.find((x) => x.estado === "aprobado" && x.clabe) ?? provs[0];
  const r = await fetch("/api/clabe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ proveedor_id: p.id, clabe_nueva: "002010077777777771", telefono_en_solicitud: "+52 55 9999 0000" }),
  });
  const datos = (await r.json().catch(() => null)) as { solicitud?: { id: string } } | null;
  return datos?.solicitud ? `/clabe/${datos.solicitud.id}` : `/expediente/${p.id}`;
}

const PASOS: Paso[] = [
  { ruta: "/carga", objetivo: "carga-ejemplo", titulo: "Este es el lunes de Ana", texto: "Ana es la única gestora de proveedores de su empresa. Hoy llegaron 500 proveedores nuevos. Toca el botón azul para revisarlos todos." },
  { ruta: "/carga", objetivo: "embudo", titulo: "500 revisados en segundos", texto: "Cada cuadrito es un proveedor. El sistema los compara con la lista negra del SAT y las sanciones internacionales. Los verdes se aprobaron solos: nadie tuvo que revisarlos." },
  { ruta: "/bandeja", objetivo: "bandeja", titulo: "Ana solo ve lo que importa", texto: "En lugar de 500, a Ana le llegan unos cuantos casos dudosos, ordenados del más peligroso al menos peligroso, explicados en palabras simples." },
  { ruta: rutaMapaPrimerCaso, objetivo: "mapa", titulo: "Así se extrae la información", texto: "Veamos por dentro el caso más urgente: el sistema consulta cada fuente en tiempo real. Cada dato extraído se vuelve un nodo unido a su fuente; los halos rojos marcan lo riesgoso. Toca cualquier nodo para ver su detalle." },
  { ruta: rutaPrimerCaso, objetivo: "velocimetro", titulo: "¿Qué tan riesgoso es?", texto: "El medidor va de 0 (confiable) a 100 (peligro). Este proveedor está en rojo." },
  { ruta: rutaPrimerCaso, objetivo: "evidencia", titulo: "Y por qué, con pruebas", texto: "Cada prueba viene de una fuente oficial y está explicada sin tecnicismos. Si quieres el detalle técnico, está un clic más abajo." },
  { ruta: rutaPrimerCaso, objetivo: "decision", titulo: "Ana decide en un clic", texto: "Aprobar, pausar o bloquear. Su decisión queda registrada con su nombre y la hora, y se genera un expediente listo para una auditoría del SAT." },
  { ruta: "", objetivo: "clabe-timeline", titulo: "Ahora, un intento de fraude", texto: "Alguien se hizo pasar por un proveedor y pidió cambiar su cuenta bancaria. El pago se congeló al instante y el agente de voz llama al teléfono REAL del proveedor, nunca al de la solicitud. Prueba: elige qué responde y mira cómo se ilumina la ruta.", preparar: crearIntentoFraude },
  { ruta: "/panel", objetivo: "personas", titulo: "El resultado", texto: "Lo que antes requería 30 auditores, hoy lo hace una sola persona, más rápido y con evidencia de cada decisión." },
];

function leer(): { paso: number; ruta?: string } | null {
  try { return JSON.parse(sessionStorage.getItem(CLAVE) ?? "null"); } catch { return null; }
}
function guardar(v: { paso: number; ruta?: string } | null) {
  try {
    if (v) sessionStorage.setItem(CLAVE, JSON.stringify(v));
    else sessionStorage.removeItem(CLAVE);
  } catch { /* sin almacenamiento: el tour solo vive en memoria */ }
  window.dispatchEvent(new Event("kyp-tour"));
}

export function iniciarTour() {
  guardar({ paso: 0 });
}

export function BotonTour({ grande = false }: { grande?: boolean }) {
  return (
    <button onClick={iniciarTour} className={grande ? "inline-flex items-center gap-2 rounded bg-acento px-5 py-3 font-semibold text-white hover:bg-acento/85" : "inline-flex items-center gap-1.5 rounded-sm border border-acento/60 bg-acento/15 px-2.5 py-1 font-mono text-[11px] font-medium tracking-wide text-acento-2 uppercase hover:bg-acento/25"}>
      <Icono nombre="reproducir" className={grande ? "h-4 w-4" : "h-3.5 w-3.5"} />{grande ? "Ver demo guiada (2 min)" : "Demo guiada"}
    </button>
  );
}

export function Tour() {
  const router = useRouter();
  const ruta = usePathname();
  const [estado, setEstado] = useState<{ paso: number; ruta?: string } | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [cargando, setCargando] = useState(false);
  const preparando = useRef<number | null>(null);

  useEffect(() => {
    const actualizar = () => setEstado(leer());
    actualizar();
    window.addEventListener("kyp-tour", actualizar);
    return () => window.removeEventListener("kyp-tour", actualizar);
  }, []);

  const paso = estado ? PASOS[estado.paso] : null;

  // Navega a la ruta del paso (y ejecuta su preparación una sola vez).
  useEffect(() => {
    if (!estado || !paso) return;
    if (estado.ruta) {
      if (ruta !== estado.ruta) router.push(estado.ruta);
      return;
    }
    if (preparando.current === estado.paso) return;
    preparando.current = estado.paso;
    (async () => {
      setCargando(true);
      try {
        const destino = paso.preparar ? await paso.preparar() : typeof paso.ruta === "function" ? await paso.ruta() : paso.ruta;
        if (leer()?.paso === estado.paso) guardar({ paso: estado.paso, ruta: destino || ruta });
      } finally {
        setCargando(false);
        preparando.current = null;
      }
    })();
  }, [estado, paso, ruta, router]);

  // Sigue la posición del elemento resaltado.
  useEffect(() => {
    if (!paso || !estado?.ruta || ruta !== estado.ruta) { setRect(null); return; }
    let raf = 0, desplazado = false;
    const medir = () => {
      const el = document.querySelector(`[data-tour="${paso.objetivo}"]`);
      if (el) {
        if (!desplazado) { el.scrollIntoView({ behavior: "smooth", block: "center" }); desplazado = true; }
        setRect(el.getBoundingClientRect());
      } else setRect(null);
      raf = requestAnimationFrame(medir);
    };
    raf = requestAnimationFrame(medir);
    return () => cancelAnimationFrame(raf);
  }, [paso, estado, ruta]);

  const ir = useCallback((n: number) => {
    if (n < 0) return;
    if (n >= PASOS.length) { guardar(null); return; }
    const p = PASOS[n];
    // Los pasos con la misma ruta fija o el mismo expediente reutilizan la ruta actual.
    const mismaRuta = n > 0 && PASOS[n - 1].ruta === p.ruta && !p.preparar && estado?.ruta;
    guardar({ paso: n, ruta: typeof p.ruta === "string" && p.ruta ? p.ruta : mismaRuta ? estado!.ruta : undefined });
  }, [estado]);

  if (!estado || !paso) return null;

  const m = 8;
  const tarjetaAbajo = !rect || rect.bottom + 220 < window.innerHeight;
  return (
    <div className="pointer-events-none fixed inset-0 z-50" aria-live="polite">
      {rect ? (
        <div
          className="absolute rounded-md transition-all duration-300"
          style={{ left: rect.left - m, top: rect.top - m, width: rect.width + 2 * m, height: rect.height + 2 * m, boxShadow: "0 0 0 9999px rgba(5,8,12,0.72)", outline: "2px solid var(--color-acento-2)" }}
        />
      ) : (
        <div className="absolute inset-0 bg-fondo/70" />
      )}
      <div
        className="pointer-events-auto absolute left-1/2 w-[min(92vw,420px)] -translate-x-1/2 rounded-md border border-borde-fuerte bg-panel p-4 shadow-2xl shadow-black/60"
        style={rect ? (tarjetaAbajo ? { top: Math.min(rect.bottom + 16, window.innerHeight - 230) } : { top: Math.max(rect.top - 230, 12) }) : { top: "40%" }}
      >
        <div className="mb-1 font-mono text-[11px] tracking-widest text-acento-2 uppercase">Paso {String(estado.paso + 1).padStart(2, "0")} / {String(PASOS.length).padStart(2, "0")}</div>
        <h3 className="text-lg font-semibold">{paso.titulo}</h3>
        <p className="mt-1 text-sm text-texto-2">{cargando ? "Preparando…" : paso.texto}</p>
        <div className="mt-3 flex items-center justify-between">
          <button onClick={() => guardar(null)} className="text-sm text-texto-3 hover:text-texto">Salir</button>
          <div className="flex gap-2">
            {estado.paso > 0 && <button onClick={() => ir(estado.paso - 1)} className="rounded border border-borde-fuerte px-3 py-1.5 text-sm">Atrás</button>}
            <button onClick={() => ir(estado.paso + 1)} className="rounded bg-acento px-3 py-1.5 text-sm font-medium text-white hover:bg-acento/85">
              {estado.paso === PASOS.length - 1 ? "Terminar" : "Siguiente →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
