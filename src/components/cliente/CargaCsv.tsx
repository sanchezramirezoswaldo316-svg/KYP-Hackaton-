"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MAX_CSV_BYTES, validarFilasCsv, type FilaValidada } from "@/lib/csv.ts";
import { enviar } from "./peticion.ts";
import { Icono } from "@/components/Icono";

const BLOQUE = 50;
const CONCURRENCIA = 2;
const COLOR = { liberar: "bg-ok/45", revisar: "bg-alerta", bloquear: "bg-peligro", error: "bg-realce" } as const;

interface Resultado { fila?: number; rfc: string; ok: boolean; decision?: "liberar" | "revisar" | "bloquear"; error?: string }

export function CargaCsv() {
  const [externas, setExternas] = useState(false);
  const [total, setTotal] = useState(0);
  const [recibidos, setRecibidos] = useState<Resultado[]>([]);
  const [mostrados, setMostrados] = useState(0);
  const [estado, setEstado] = useState<"inicio" | "cargando" | "listo">("inicio");
  const [error, setError] = useState<string | null>(null);
  const [segundos, setSegundos] = useState(0);

  // Revela los resultados uno a uno (efecto de "escaneo"), aunque el servidor responda de golpe.
  const recibidosRef = useRef(0);
  recibidosRef.current = recibidos.length;
  useEffect(() => {
    if (estado === "inicio") return;
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setInterval(() => {
      setMostrados((m) => Math.min(recibidosRef.current, m + (reducir ? 1000 : 4)));
    }, 30);
    return () => clearInterval(t);
  }, [estado]);

  async function procesar(filas: FilaValidada[]) {
    setError(null);
    setTotal(filas.length);
    setRecibidos(filas.filter((f) => f.errores.length > 0).map((f) => ({
      fila: f.numero,
      rfc: f.proveedor.rfc,
      ok: false,
      error: f.errores.join(" "),
    })));
    setMostrados(0);
    setEstado("cargando");
    const t0 = Date.now();
    const validas = filas.filter((f) => f.errores.length === 0);
    const lotes = Array.from({ length: Math.ceil(validas.length / BLOQUE) }, (_, i) => validas.slice(i * BLOQUE, (i + 1) * BLOQUE));
    for (let i = 0; i < lotes.length; i += CONCURRENCIA) {
      const resultados = await Promise.all(lotes.slice(i, i + CONCURRENCIA).map(async (lote) => {
        try {
          const respuesta = await enviar<{ resultados: Resultado[] }>("/api/proveedores/lote", {
            proveedores: lote.map((f) => f.proveedor),
            fuentesExternas: externas,
          });
          return lote.map((f, indice) => ({
            ...(respuesta.resultados[indice] ?? { rfc: f.proveedor.rfc, ok: false, error: "No se recibió resultado para esta fila." }),
            fila: f.numero,
          }));
        } catch {
          return lote.map((f) => ({ fila: f.numero, rfc: f.proveedor.rfc, ok: false, error: "No se pudo procesar este bloque." }));
        }
      }));
      setRecibidos((prev) => [...prev, ...resultados.flat()]);
    }
    setSegundos((Date.now() - t0) / 1000);
    setEstado("listo");
  }

  async function desdeTexto(texto: string) {
    if (new TextEncoder().encode(texto).byteLength > MAX_CSV_BYTES) {
      throw new Error(`El archivo supera el límite de ${Math.floor(MAX_CSV_BYTES / 1024 / 1024)} MB.`);
    }
    await procesar(validarFilasCsv(texto));
  }

  async function desdeArchivo(archivo: File) {
    try {
      if (archivo.size > MAX_CSV_BYTES) throw new Error(`El archivo supera el límite de ${Math.floor(MAX_CSV_BYTES / 1024 / 1024)} MB.`);
      await desdeTexto(await archivo.text());
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function usarEjemplo() {
    try {
      const respuesta = await fetch("/demo/proveedores-demo.csv");
      if (!respuesta.ok) throw new Error("No se pudo cargar el archivo de ejemplo.");
      await desdeTexto(await respuesta.text());
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const visibles = recibidos.slice(0, mostrados);
  const cuenta = (d: string) => visibles.filter((r) => (r.ok ? r.decision : "error") === d).length;
  const aprobados = cuenta("liberar");
  const dudosos = cuenta("revisar") + cuenta("bloquear");
  const porcentaje = total ? Math.min(100, Math.round((mostrados / total) * 100)) : 0;
  const terminado = estado === "listo" && mostrados >= recibidos.length;

  return (
    <div className="space-y-5">
      {estado === "inicio" && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <button data-tour="carga-ejemplo" onClick={usarEjemplo} className="animar-latido rounded bg-acento px-5 py-3 font-semibold text-white shadow hover:bg-acento/85">
            <Icono nombre="reproducir" className="mr-1.5 inline h-4 w-4 align-[-3px]" />Usar los 500 proveedores de ejemplo
          </button>
          <span className="text-sm text-texto-3">o sube tu archivo:</span>
          <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && desdeArchivo(e.target.files[0])} className="text-sm" />
        </div>
      )}
      {estado === "inicio" && (
        <label className="flex items-center gap-2 text-sm text-texto-2">
          <input type="checkbox" checked={externas} onChange={(e) => setExternas(e.target.checked)} />
          Incluir página web, noticias y dominio (más lento)
        </label>
      )}
      {error && <p className="text-sm text-peligro">{error}</p>}

      {estado !== "inicio" && (
        <div data-tour="embudo" className="space-y-5">
          <div>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="rotulo">Cada cuadrito es un proveedor</h3>
              <span className="font-mono text-xs text-texto-2">{mostrados} de {total} procesados{terminado && ` en ${segundos.toFixed(1)} segundos`}</span>
            </div>
            <div role="progressbar" aria-label="Progreso de carga" aria-valuemin={0} aria-valuemax={100} aria-valuenow={porcentaje} className="mb-3 h-1 overflow-hidden rounded-sm bg-borde">
              <div className="h-full bg-acento transition-[width]" style={{ width: `${porcentaje}%` }} />
            </div>
            <div className="grid gap-[3px]" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(10px, 1fr))" }} aria-hidden>
              {Array.from({ length: total }, (_, i) => {
                const r = visibles[i];
                const c = r ? COLOR[r.ok ? r.decision! : "error"] : "bg-borde";
                return <span key={i} className={`aspect-square rounded-[1px] transition-colors duration-300 ${c} ${r && r.decision !== "liberar" ? "outline outline-1 outline-offset-1 outline-texto/40" : ""}`} />;
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-4 font-mono text-[11px] text-texto-3 uppercase">
              <span><span className="mr-1 inline-block h-3 w-3 rounded-sm bg-ok align-middle" />Confiable</span>
              <span><span className="mr-1 inline-block h-3 w-3 rounded-sm bg-alerta align-middle" />Revisar</span>
              <span><span className="mr-1 inline-block h-3 w-3 rounded-sm bg-peligro align-middle" />Peligro</span>
              <span><span className="mr-1 inline-block h-3 w-3 rounded-sm bg-borde align-middle" />En espera</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="relative overflow-hidden rounded border border-borde bg-panel-2 p-5">
              <span className="absolute inset-y-0 left-0 w-0.5 bg-ok" aria-hidden />
              <div className="flex items-center gap-2 text-ok"><Icono nombre="escudoOk" className="h-4 w-4" /><span className="rotulo text-ok!">Aprobados solos</span></div>
              <div className="mt-1 font-mono text-5xl font-semibold tabular-nums">{aprobados}</div>
              <p className="text-sm text-texto-3">Nadie tuvo que revisarlos: no hay señales de riesgo.</p>
            </div>
            <div className="relative overflow-hidden rounded border border-borde bg-panel-2 p-5">
              <span className="absolute inset-y-0 left-0 w-0.5 bg-alerta" aria-hidden />
              <div className="flex items-center gap-2 text-alerta"><Icono nombre="persona" className="h-4 w-4" /><span className="rotulo text-alerta!">Necesitan a una persona</span></div>
              <div className="mt-1 font-mono text-5xl font-semibold tabular-nums">{dudosos}</div>
              <p className="text-sm text-texto-3">{cuenta("bloquear")} con señales graves y {cuenta("revisar")} por revisar.</p>
            </div>
          </div>

          {terminado && (
            <div className="animar-aparecer rounded border border-acento/50 bg-acento/10 p-5 text-center">
              <p className="text-lg">De {total} proveedores, solo <strong className="font-mono text-2xl text-acento-2">{dudosos}</strong> necesitan atención humana.</p>
              <p className="text-sm text-texto-3">Eso es el {total ? Math.round((aprobados / total) * 100) : 0}% resuelto en automático.</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <Link href="/bandeja" className="rounded bg-acento px-4 py-2 font-medium text-white hover:bg-acento/85">Ver los {dudosos} casos →</Link>
                <button onClick={() => setEstado("inicio")} className="rounded border border-borde-fuerte px-4 py-2 text-sm text-texto-2 hover:bg-panel-2">Cargar otro archivo</button>
              </div>
            </div>
          )}
          {cuenta("error") > 0 && terminado && (
            <details className="text-sm">
              <summary className="cursor-pointer text-peligro">{cuenta("error")} filas con errores</summary>
              <ul className="mt-2 list-disc pl-5">{visibles.filter((r) => !r.ok).map((e) => <li key={`${e.fila}-${e.rfc}`}>Fila {e.fila} · {e.rfc}: {e.error}</li>)}</ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
