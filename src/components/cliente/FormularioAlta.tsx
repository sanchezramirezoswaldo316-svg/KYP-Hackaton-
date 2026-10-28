"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { enviar } from "./peticion.ts";

const CAMPOS = [
  { nombre: "rfc", etiqueta: "RFC", requerido: true, ayuda: "12 caracteres (moral) o 13 (física)" },
  { nombre: "razon_social", etiqueta: "Razón social", requerido: true },
  { nombre: "telefono_registrado", etiqueta: "Teléfono del representante", requerido: true, ayuda: "A este número llamará el agente de voz" },
  { nombre: "sitio_web", etiqueta: "Página web", ayuda: "Se analiza con Firecrawl" },
  { nombre: "giro_declarado", etiqueta: "Qué factura (giro)", ayuda: "Se compara con su página web" },
  { nombre: "clabe", etiqueta: "CLABE", ayuda: "18 dígitos" },
  { nombre: "monto_anual", etiqueta: "Monto anual estimado (MXN)", tipo: "number" },
  { nombre: "factura_folio", etiqueta: "Folio de su última factura", ayuda: "Lo usa el agente para confirmar identidad" },
  { nombre: "factura_monto", etiqueta: "Monto de su última factura (MXN)", tipo: "number" },
] as const;

export function FormularioAlta() {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviarFormulario(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setOcupado(true);
    setError(null);
    try {
      const r = await enviar<{ proveedor: { id: string } }>("/api/proveedores", {
        ...datos,
        monto_anual: Number(datos.monto_anual) || 0,
        factura_monto: Number(datos.factura_monto) || null,
      });
      router.push(`/expediente/${r.proveedor.id}`);
    } catch (e) {
      setError((e as Error).message);
      setOcupado(false);
    }
  }

  return (
    <form onSubmit={enviarFormulario} className="grid gap-4 sm:grid-cols-2">
      {CAMPOS.map((c) => (
        <label key={c.nombre} className="block text-sm">
          <span className="font-medium">{c.etiqueta}{"requerido" in c && c.requerido && " *"}</span>
          <input name={c.nombre} type={"tipo" in c ? c.tipo : "text"} required={"requerido" in c && c.requerido} className="mt-1 w-full rounded border border-slate-300 px-3 py-2" />
          {"ayuda" in c && <span className="text-xs text-slate-500">{c.ayuda}</span>}
        </label>
      ))}
      <div className="sm:col-span-2">
        <button disabled={ocupado} className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">
          {ocupado ? "Verificando en todas las fuentes…" : "Dar de alta y verificar"}
        </button>
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      </div>
    </form>
  );
}
