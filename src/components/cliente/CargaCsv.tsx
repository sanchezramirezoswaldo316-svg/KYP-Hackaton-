"use client";

import Link from "next/link";
import { useState } from "react";
import { filasAAltas } from "@/lib/csv.ts";
import { enviar } from "./peticion.ts";

const BLOQUE = 25;

interface Resultado { rfc: string; ok: boolean; decision?: "liberar" | "revisar" | "bloquear"; error?: string }

export function CargaCsv() {
  const [externas, setExternas] = useState(false);
  const [total, setTotal] = useState(0);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [estado, setEstado] = useState<"inicio" | "cargando" | "listo">("inicio");
  const [error, setError] = useState<string | null>(null);
  const [inicio, setInicio] = useState(0);
  const [duracion, setDuracion] = useState(0);

  async function procesar(archivo: File) {
    setError(null);
    let filas;
    try {
      filas = filasAAltas(await archivo.text());
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    setTotal(filas.length);
    setResultados([]);
    setEstado("cargando");
    const t0 = Date.now();
    setInicio(t0);
    for (let i = 0; i < filas.length; i += BLOQUE) {
      try {
        const r = await enviar<{ resultados: Resultado[] }>("/api/proveedores/lote", { proveedores: filas.slice(i, i + BLOQUE), fuentesExternas: externas });
        setResultados((prev) => [...prev, ...r.resultados]);
      } catch (e) {
        setError((e as Error).message);
        break;
      }
    }
    setDuracion((Date.now() - t0) / 1000);
    setEstado("listo");
  }

  const cuenta = (d: string) => resultados.filter((r) => r.decision === d).length;
  const errores = resultados.filter((r) => !r.ok);
  const avance = total ? Math.round((resultados.length / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={estado === "cargando"}
          onChange={(e) => e.target.files?.[0] && procesar(e.target.files[0])}
          className="text-sm file:mr-3 file:rounded file:border-0 file:bg-blue-700 file:px-4 file:py-2 file:text-white"
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={externas} onChange={(e) => setExternas(e.target.checked)} disabled={estado === "cargando"} />
          Incluir página web, noticias y dominio (más lento)
        </label>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {estado !== "inicio" && (
        <div className="space-y-3">
          <div className="h-3 w-full overflow-hidden rounded bg-slate-200">
            <div className="h-full bg-blue-700 transition-all" style={{ width: `${avance}%` }} />
          </div>
          <p className="text-sm text-slate-600">
            {resultados.length} de {total} proveedores revisados
            {estado === "cargando" && inicio > 0 && "…"}
            {estado === "listo" && ` en ${duracion.toFixed(1)} s`}
          </p>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded border border-emerald-200 bg-emerald-50 p-3"><div className="text-2xl font-semibold text-emerald-800">{cuenta("liberar")}</div><div className="text-sm text-emerald-800">Liberados en automático</div></div>
            <div className="rounded border border-amber-200 bg-amber-50 p-3"><div className="text-2xl font-semibold text-amber-800">{cuenta("revisar")}</div><div className="text-sm text-amber-800">A revisión</div></div>
            <div className="rounded border border-red-200 bg-red-50 p-3"><div className="text-2xl font-semibold text-red-800">{cuenta("bloquear")}</div><div className="text-sm text-red-800">Bloqueo sugerido</div></div>
            <div className="rounded border border-slate-200 bg-white p-3"><div className="text-2xl font-semibold">{errores.length}</div><div className="text-sm text-slate-600">Con errores</div></div>
          </div>
          {estado === "listo" && (
            <Link href="/bandeja" className="inline-block rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">
              Ir a la bandeja ({cuenta("revisar") + cuenta("bloquear")} casos)
            </Link>
          )}
          {errores.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-red-700">Ver filas con errores</summary>
              <ul className="mt-2 list-disc pl-5">{errores.map((e, i) => <li key={i}>{e.rfc}: {e.error}</li>)}</ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
