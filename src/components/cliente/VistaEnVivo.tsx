"use client";

import { useState } from "react";
import { MapaVivo } from "./MapaVivo";

const EJEMPLOS = [
  { id: "peligro", texto: "Empresa fantasma", detalle: "Confirmada por el SAT" },
  { id: "sospecha", texto: "Bajo sospecha", detalle: "El SAT la investiga" },
  { id: "homonimo", texto: "Nombre parecido", detalle: "a una sancionada por EE. UU." },
  { id: "confiable", texto: "Proveedor limpio", detalle: "Sin señales de riesgo" },
];

export function VistaEnVivo({ proveedores, inicial }: { proveedores: { id: string; razon_social: string }[]; inicial?: string }) {
  const [cuerpo, setCuerpo] = useState<{ proveedor_id?: string; ejemplo?: string } | null>(inicial ? { proveedor_id: inicial } : null);
  const [corrida, setCorrida] = useState(0);
  const [ocupado, setOcupado] = useState(!!inicial);
  const [seleccion, setSeleccion] = useState("");

  const iniciar = (c: { proveedor_id?: string; ejemplo?: string }) => {
    setCuerpo(c);
    setCorrida((n) => n + 1);
    setOcupado(true);
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-2xl border border-borde bg-white p-4">
        <p className="text-sm font-medium text-tinta">Elige un caso para ver cómo se extrae la información en tiempo real:</p>
        <div className="grid gap-2 sm:grid-cols-4">
          {EJEMPLOS.map((e) => (
            <button key={e.id} disabled={ocupado} onClick={() => iniciar({ ejemplo: e.id })} className="rounded-xl border-2 border-borde p-3 text-left transition hover:border-acento hover:bg-hover disabled:opacity-50">
              <div className="font-semibold">{e.texto}</div>
              <div className="text-xs text-tinta-3">{e.detalle}</div>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-tinta-3">o cualquier proveedor:</span>
          <select value={seleccion} onChange={(e) => setSeleccion(e.target.value)} className="max-w-xs flex-1 rounded border border-borde-fuerte px-3 py-2 text-sm">
            <option value="">Selecciona…</option>
            {proveedores.map((p) => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
          </select>
          <button disabled={!seleccion || ocupado} onClick={() => iniciar({ proveedor_id: seleccion })} className="rounded bg-marca px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Analizar</button>
        </div>
      </div>

      {cuerpo ? (
        <MapaVivo key={corrida} cuerpo={cuerpo} alTerminar={() => setTimeout(() => setOcupado(false), 1500)} />
      ) : (
        <div className="flex aspect-[1040/600] items-center justify-center rounded-2xl border border-tinta bg-tinta text-center text-tinta-3">
          <div><p className="mt-2">El mapa se activa al elegir un caso</p></div>
        </div>
      )}
    </div>
  );
}
