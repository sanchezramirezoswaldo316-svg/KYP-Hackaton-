"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MAX_CSV_BYTES, validarFilasCsv, type FilaValidada } from "@/lib/csv.ts";
import { DatoClave } from "@/components/ui/DatoClave";
import { enviar } from "./peticion.ts";

const BLOQUE = 50;
const CONCURRENCIA = 2;
const COLOR = { liberar: "bg-emerald-500", revisar: "bg-amber-400", bloquear: "bg-red-600", error: "bg-slate-700" } as const;

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
        <div className="rounded-control border border-dashed border-borde-fuerte bg-lienzo p-6 text-center">
          <p className="text-sm font-medium">Arrastra un CSV o selecciona un archivo</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <button data-tour="carga-ejemplo" onClick={usarEjemplo} className="min-h-9 rounded-control bg-marca px-4 py-2 text-sm font-medium text-white transition-transform duration-150 active:scale-[.97] hover:bg-marca-2">
            Usar proveedores de ejemplo
          </button>
          <label className="cursor-pointer rounded-control border border-borde-fuerte bg-panel px-4 py-2 text-sm font-medium hover:bg-white"><span>Seleccionar CSV</span><input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && desdeArchivo(e.target.files[0])} className="sr-only" /></label>
          </div>
        </div>
      )}
      {estado === "inicio" && (
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={externas} onChange={(e) => setExternas(e.target.checked)} />
          Incluir página web, noticias y dominio (más lento)
        </label>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}

      {estado !== "inicio" && (
        <div data-tour="embudo" className="space-y-5">
          <div>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold">Cada cuadrito es un proveedor</h3>
              <span className="text-sm text-slate-600">{mostrados} de {total} procesados{terminado && ` en ${segundos.toFixed(1)} segundos`}</span>
            </div>
            <div role="progressbar" aria-label="Progreso de carga" aria-valuemin={0} aria-valuemax={100} aria-valuenow={porcentaje} className="mb-3 h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-blue-700 transition-[width]" style={{ width: `${porcentaje}%` }} />
            </div>
            <div className="grid gap-[3px]" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(12px, 1fr))" }} aria-hidden>
              {Array.from({ length: total }, (_, i) => {
                const r = visibles[i];
                const c = r ? COLOR[r.ok ? r.decision! : "error"] : "bg-slate-200";
                return <span key={i} className={`aspect-square rounded-[3px] transition-colors duration-300 ${c} ${r && r.decision !== "liberar" ? "ring-2 ring-offset-1 ring-amber-300" : ""}`} />;
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600">
              <span><span className="mr-1 inline-block h-3 w-3 rounded-sm bg-emerald-500 align-middle" />Confiable</span>
              <span><span className="mr-1 inline-block h-3 w-3 rounded-sm bg-amber-400 align-middle" />Revisar</span>
              <span><span className="mr-1 inline-block h-3 w-3 rounded-sm bg-red-600 align-middle" />Peligro</span>
              <span><span className="mr-1 inline-block h-3 w-3 rounded-sm bg-slate-200 align-middle" />En espera</span>
            </div>
          </div>

          <div className="grid gap-4 border-y border-borde py-4 sm:grid-cols-3">
            <DatoClave etiqueta="Válidas / aprobadas" valor={aprobados} detalle="Resueltas automáticamente" />
            <DatoClave etiqueta="Revisión humana" valor={dudosos} detalle={`${cuenta("bloquear")} bloqueo · ${cuenta("revisar")} revisión`} />
            <DatoClave etiqueta="Con errores" valor={cuenta("error")} detalle="No se enviaron" />
          </div>

          {terminado && (
            <div className="animar-aparecer rounded-xl bg-blue-900 p-5 text-center text-white">
              <p className="text-lg">De {total} proveedores, solo <strong className="text-2xl">{dudosos}</strong> necesitan atención humana.</p>
              <p className="text-sm opacity-80">Eso es el {total ? Math.round((aprobados / total) * 100) : 0}% resuelto en automático.</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <Link href="/bandeja" className="rounded bg-white px-4 py-2 font-medium text-blue-900 hover:bg-blue-50">Ver los {dudosos} casos →</Link>
                <button onClick={() => setEstado("inicio")} className="rounded border border-white/40 px-4 py-2 text-sm hover:bg-white/10">Cargar otro archivo</button>
              </div>
            </div>
          )}
          {cuenta("error") > 0 && terminado && (
            <details className="text-sm">
              <summary className="cursor-pointer text-red-700">{cuenta("error")} filas con errores</summary>
              <ul className="mt-2 list-disc pl-5">{visibles.filter((r) => !r.ok).map((e) => <li key={`${e.fila}-${e.rfc}`}>Fila {e.fila} · {e.rfc}: {e.error}</li>)}</ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
