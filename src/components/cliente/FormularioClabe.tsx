"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { enviar } from "./peticion.ts";

export function FormularioClabe({ proveedores, seleccionado, simulada: _simulada }: { proveedores: { id: string; razon_social: string; rfc: string }[]; seleccionado?: string; simulada?: boolean }) {
  void _simulada;
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  async function enviarFormulario(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const datos = Object.fromEntries(new FormData(form)) as Record<string, string>;
    setOcupado(true);
    setMensaje(null);
    try {
      const r = await enviar<{ solicitud?: { id: string }; llamada: { iniciada: boolean; error?: string } }>("/api/clabe", datos);
      setMensaje(
        r.llamada.iniciada
          ? { tipo: "ok", texto: "Pago en pausa. El agente de voz está llamando al teléfono registrado en el alta." }
          : r.llamada.error
            ? { tipo: "error", texto: `Pago en pausa, pero la llamada falló: ${r.llamada.error}. El caso pasó a la bandeja.` }
            : { tipo: "ok", texto: "Pago congelado. La voz real no está conectada: abajo puedes simular qué responde el proveedor." },
      );
      form.reset();
      if (r.solicitud?.id) router.push(`/clabe/${r.solicitud.id}`);
      else router.refresh();
    } catch (e) {
      setMensaje({ tipo: "error", texto: (e as Error).message });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <form onSubmit={enviarFormulario} className="grid gap-4 sm:grid-cols-3">
      <label className="block text-sm sm:col-span-3">
        <span className="font-medium">Proveedor *</span>
        <select name="proveedor_id" required defaultValue={seleccionado ?? ""} className="mt-1 w-full rounded border border-borde-fuerte px-3 py-2">
          <option value="">Selecciona…</option>
          {proveedores.map((p) => <option key={p.id} value={p.id}>{p.razon_social} · {p.rfc}</option>)}
        </select>
      </label>
      <label className="block text-sm">
        <span className="font-medium">Cuenta nueva que piden (CLABE) *</span>
        <input name="clabe_nueva" required pattern="\d{18}" className="mt-1 w-full rounded border border-borde-fuerte px-3 py-2 font-mono" />
      </label>
      <label className="block text-sm sm:col-span-2">
        <span className="font-medium">Teléfono que viene en la solicitud</span>
        <input name="telefono_en_solicitud" className="mt-1 w-full rounded border border-borde-fuerte px-3 py-2" />
        <span className="text-xs text-tinta-3">Se guarda como evidencia, pero el sistema NUNCA llama a este número: llama al registrado en el alta.</span>
      </label>
      <div className="sm:col-span-3">
        <button disabled={ocupado} className="rounded bg-marca px-4 py-2 text-sm font-medium text-white hover:bg-marca disabled:opacity-50">
          {ocupado ? "Registrando…" : "Congelar pago y llamar al proveedor"}
        </button>
        {mensaje && <p className={`mt-2 text-sm ${mensaje.tipo === "ok" ? "text-tinta-2" : "text-error"}`}>{mensaje.texto}</p>}
      </div>
    </form>
  );
}
