"use client";

import { useState } from "react";
import type { NombreIcono } from "@/components/Icono";
import { MapaVivo } from "./MapaVivo";
import { Icono } from "@/components/Icono";

const EJEMPLOS: { id: string; icono: NombreIcono; color: string; texto: string; detalle: string }[] = [
  { id: "peligro", icono: "escudoX", color: "text-peligro", texto: "Empresa fantasma", detalle: "Confirmada por el SAT" },
  { id: "sospecha", icono: "escudoAlerta", color: "text-alerta", texto: "Bajo sospecha", detalle: "El SAT la investiga" },
  { id: "homonimo", icono: "huella", color: "text-alerta", texto: "Nombre parecido", detalle: "a una sancionada por EE. UU." },
  { id: "confiable", icono: "escudoOk", color: "text-ok", texto: "Proveedor limpio", detalle: "Sin señales de riesgo" },
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
      <div className="space-y-3 rounded-md border border-borde bg-panel p-4">
        <p className="text-sm font-medium text-texto-2">Elige un caso para ver cómo se extrae la información en tiempo real:</p>
        <div className="grid gap-2 sm:grid-cols-4">
          {EJEMPLOS.map((e) => (
            <button key={e.id} disabled={ocupado} onClick={() => iniciar({ ejemplo: e.id })} className="rounded border border-borde bg-panel-2 p-3 text-left transition hover:border-acento/60 hover:bg-acento/10 disabled:opacity-50">
              <div className="flex items-center gap-2 font-semibold"><Icono nombre={e.icono} className={`h-4 w-4 ${e.color}`} />{e.texto}</div>
              <div className="text-xs text-texto-3">{e.detalle}</div>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-texto-3">o cualquier proveedor:</span>
          <select value={seleccion} onChange={(e) => setSeleccion(e.target.value)} className="max-w-xs flex-1 rounded border border-borde-fuerte px-3 py-2 text-sm">
            <option value="">Selecciona…</option>
            {proveedores.map((p) => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
          </select>
          <button disabled={!seleccion || ocupado} onClick={() => iniciar({ proveedor_id: seleccion })} className="rounded bg-acento px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Analizar</button>
        </div>
      </div>

      {cuerpo ? (
        <MapaVivo key={corrida} cuerpo={cuerpo} alTerminar={() => setTimeout(() => setOcupado(false), 1500)} />
      ) : (
        <div className="flex aspect-[1040/600] items-center justify-center reticula rounded-md border border-borde bg-fondo text-center text-texto-3">
          <div><Icono nombre="radar" className="mx-auto h-10 w-10 text-acento-2" trazo={1.25} /><p className="mt-3 font-mono text-xs tracking-widest uppercase">Sin objetivo · el mapa se activa al elegir un caso</p></div>
        </div>
      )}
    </div>
  );
}
