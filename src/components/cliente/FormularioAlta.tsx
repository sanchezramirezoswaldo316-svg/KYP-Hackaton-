"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Escaner } from "./Escaner";
import { enviar } from "./peticion.ts";

const CAMPOS = [
  { nombre: "rfc", etiqueta: "RFC", requerido: true, ayuda: "La identificación fiscal: 12 caracteres (empresa) o 13 (persona)" },
  { nombre: "razon_social", etiqueta: "Nombre de la empresa", requerido: true },
  { nombre: "telefono_registrado", etiqueta: "Teléfono del representante", requerido: true, ayuda: "A este número llamaremos si alguien pide cambiar su cuenta" },
  { nombre: "sitio_web", etiqueta: "Página web", ayuda: "Revisaremos si lo que dice hacer coincide con lo que vende" },
  { nombre: "giro_declarado", etiqueta: "¿Qué nos vende?", ayuda: "Ej.: harina de trigo, transporte, empaques" },
  { nombre: "clabe", etiqueta: "Cuenta bancaria (CLABE)", ayuda: "18 dígitos" },
  { nombre: "monto_anual", etiqueta: "¿Cuánto le compramos al año? (MXN)", tipo: "number" },
  { nombre: "factura_folio", etiqueta: "Folio de su última factura", ayuda: "Sirve para confirmar su identidad por teléfono" },
  { nombre: "factura_monto", etiqueta: "Monto de su última factura (MXN)", tipo: "number" },
] as const;

type Respuesta = { proveedor: { id: string; razon_social: string }; verificacion: never };

export function FormularioAlta() {
  const [datos, setDatos] = useState<Record<string, string> | null>(null);
  const [id, setId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ejecutar = useCallback(async () => {
    try {
      const r = await enviar<Respuesta>("/api/proveedores", {
        ...datos,
        monto_anual: Number(datos!.monto_anual) || 0,
        factura_monto: Number(datos!.factura_monto) || null,
      });
      setId(r.proveedor.id);
      return r;
    } catch (e) {
      setError((e as Error).message);
      setDatos(null);
      throw e;
    }
  }, [datos]);

  if (datos) {
    return (
      <Escaner
        nombre={datos.razon_social}
        ejecutar={ejecutar}
        alTerminar={() => id && (
          <Link href={`/expediente/${id}`} className="inline-block rounded bg-marca px-4 py-2 font-medium text-white hover:bg-marca">Ver expediente completo →</Link>
        )}
      />
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); setError(null); setDatos(Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>); }} className="grid gap-4 sm:grid-cols-2">
      {CAMPOS.map((c) => (
        <label key={c.nombre} className="block text-sm">
          <span className="font-medium">{c.etiqueta}{"requerido" in c && c.requerido && " *"}</span>
          <input name={c.nombre} type={"tipo" in c ? c.tipo : "text"} required={"requerido" in c && c.requerido} className="mt-1 w-full rounded border border-borde-fuerte px-3 py-2" />
          {"ayuda" in c && <span className="text-xs text-tinta-3">{c.ayuda}</span>}
        </label>
      ))}
      <div className="sm:col-span-2">
        <button className="rounded bg-marca px-4 py-2 text-sm font-medium text-white hover:bg-marca">Dar de alta y revisar</button>
        {error && <p className="mt-2 text-sm text-error">{error}</p>}
      </div>
    </form>
  );
}
