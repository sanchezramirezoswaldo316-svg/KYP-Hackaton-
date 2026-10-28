"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { filasAAltas } from "@/lib/csv.ts";
import type { EntradaAlta } from "@/lib/servicios-tipos.ts";
import { enviar } from "./peticion.ts";

const BLOQUE = 50;
const COLOR = { liberar: "bg-emerald-500", revisar: "bg-amber-400", bloquear: "bg-red-600", error: "bg-slate-700" } as const;

interface Resultado { rfc: string; ok: boolean; decision?: "liberar" | "revisar" | "bloquear"; error?: string }

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

  async function procesar(filas: EntradaAlta[]) {
    setError(null);
    setTotal(filas.length);
    setRecibidos([]);
    setMostrados(0);
    setEstado("cargando");
    const t0 = Date.now();
    for (let i = 0; i < filas.length; i += BLOQUE) {
      try {
        const r = await enviar<{ resultados: Resultado[] }>("/api/proveedores/lote", { proveedores: filas.slice(i, i + BLOQUE), fuentesExternas: externas });
        setRecibidos((prev) => [...prev, ...r.resultados]);
      } catch (e) {
        setError((e as Error).message);
        break;
      }
    }
    setSegundos((Date.now() - t0) / 1000);
    setEstado("listo");
  }

  async function desdeArchivo(archivo: File) {
    try {
      await procesar(filasAAltas(await archivo.text()));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function usarEjemplo() {
    const texto = await (await fetch("/demo/proveedores-demo.csv")).text();
    await procesar(filasAAltas(texto));
  }

  const visibles = recibidos.slice(0, mostrados);
  const cuenta = (d: string) => visibles.filter((r) => (r.ok ? r.decision : "error") === d).length;
  const aprobados = cuenta("liberar");
  const dudosos = cuenta("revisar") + cuenta("bloquear");
  const terminado = estado === "listo" && mostrados >= recibidos.length;

  return (
    <div className="space-y-5">
      {estado === "inicio" && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <button data-tour="carga-ejemplo" onClick={usarEjemplo} className="animar-latido rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white shadow hover:bg-blue-800">
            ▶ Usar los 500 proveedores de ejemplo
          </button>
          <span className="text-sm text-slate-500">o sube tu archivo:</span>
          <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && desdeArchivo(e.target.files[0])} className="text-sm" />
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
              <span className="text-sm text-slate-600">{mostrados} de {total} revisados{terminado && ` en ${segundos.toFixed(1)} segundos`}</span>
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-5 text-center">
              <div className="text-5xl font-bold text-emerald-700">{aprobados}</div>
              <div className="text-lg font-semibold text-emerald-900">✅ Aprobados solos</div>
              <p className="text-sm text-emerald-800">Nadie tuvo que revisarlos: no hay señales de riesgo.</p>
            </div>
            <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-5 text-center">
              <div className="text-5xl font-bold text-amber-700">{dudosos}</div>
              <div className="text-lg font-semibold text-amber-900">👩‍💼 Necesitan a una persona</div>
              <p className="text-sm text-amber-800">{cuenta("bloquear")} con señales graves y {cuenta("revisar")} por revisar.</p>
            </div>
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
              <ul className="mt-2 list-disc pl-5">{recibidos.filter((r) => !r.ok).map((e, i) => <li key={i}>{e.rfc}: {e.error}</li>)}</ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
