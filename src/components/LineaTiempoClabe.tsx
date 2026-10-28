// Línea de tiempo de un cambio de CLABE y la conversación de la llamada como chat.
import type { Llamada, SolicitudClabe } from "@/lib/tipos.ts";
import { pesos } from "@/lib/formato.ts";
import { enmascararClabe } from "@/lib/validacion.ts";
import { avisoVoz } from "@/lib/voz/estado.ts";
import { AudioLlamada } from "./cliente/AudioLlamada";
import { SimularLlamada } from "./cliente/SimularLlamada";

type Paso = { icono: string; titulo: string; texto: string; estado: "hecho" | "actual" | "pendiente" | "fraude" | "ok" };

function pasos(s: SolicitudClabe, l: Llamada | undefined): Paso[] {
  const llamando = s.estado === "en_llamada" && !l;
  const resultado: Paso = !l
    ? { icono: "❔", titulo: "Resultado", texto: "Esperando la llamada", estado: "pendiente" }
    : l.resultado === "confirmado"
      ? { icono: "✅", titulo: "Confirmado", texto: "El proveedor reconoció el cambio. Consulta el estado actual del pago en el expediente.", estado: "ok" }
      : { icono: "🚫", titulo: "Revisión necesaria", texto: l.resultado === "sin_respuesta" ? "No se completó la verificación. El pago sigue pausado." : l.resultado === "datos_no_coinciden" ? "Los datos no coinciden. El pago sigue pausado." : "El proveedor no reconoce el cambio. El pago sigue pausado.", estado: "fraude" };
  return [
    { icono: "📩", titulo: "Solicitud recibida", texto: `Piden cambiar la cuenta a ${enmascararClabe(s.clabe_nueva)}`, estado: "hecho" },
    { icono: "⏸️", titulo: "Pago congelado", texto: "Nadie puede pagar a la cuenta nueva todavía", estado: "hecho" },
    { icono: "📞", titulo: "Llamada al número registrado", texto: llamando ? "Llamando ahora…" : l ? "Llamada terminada" : "Pendiente", estado: llamando ? "actual" : l ? "hecho" : "pendiente" },
    resultado,
  ];
}

const ESTILO = {
  hecho: "border-blue-300 bg-blue-50",
  actual: "border-blue-500 bg-white ring-4 ring-blue-200",
  pendiente: "border-dashed border-slate-300 bg-white text-slate-400",
  ok: "border-emerald-400 bg-emerald-50",
  fraude: "border-red-400 bg-red-50",
};

export function LineaTiempoClabe({ s, llamada, monto, simular, fallo = false }: { s: SolicitudClabe; llamada?: Llamada; monto: number | null; simular: boolean; fallo?: boolean }) {
  const aviso = avisoVoz(s, llamada, fallo);
  const ps = pasos(s, llamada);
  const fraude = llamada?.resultado === "no_reconoce";
  const mensajes = (llamada?.transcripcion ?? "").split("\n").filter(Boolean);
  return (
    <div className="space-y-4">
      {aviso && <p role="alert" className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{aviso}</p>}
      {llamada && !llamada.simulada && llamada.conversation_id && <AudioLlamada llamadaId={llamada.id} />}
      <ol className="grid gap-2 sm:grid-cols-4">
        {ps.map((p, i) => (
          <li key={i} className={`animar-aparecer rounded-lg border-2 p-3 ${ESTILO[p.estado]}`} style={{ animationDelay: `${i * 150}ms` }}>
            <div className={`text-2xl ${p.estado === "actual" ? "animar-llamando" : ""}`} aria-hidden>{p.icono}</div>
            <div className="font-semibold">{p.titulo}</div>
            <div className="text-xs">{p.texto}</div>
          </li>
        ))}
      </ol>

      {fraude && monto !== null && (
        <div className="animar-aparecer rounded-xl bg-red-600 p-4 text-center text-white">
          <div className="text-sm uppercase tracking-wide">Posible fraude detenido</div>
          <div className="text-3xl font-bold">Monto bajo revisión: {pesos(monto)}</div>
          <div className="text-sm opacity-90">monto de su última factura</div>
        </div>
      )}

      {mensajes.length > 0 && (
        <div className="rounded-xl bg-slate-100 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600">
            🎙️ Conversación de la llamada {llamada?.simulada && <span className="rounded bg-amber-200 px-1.5 text-xs text-amber-900">Simulada (demo)</span>}
          </div>
          <div className="space-y-2">
            {mensajes.map((m, i) => {
              const agente = m.startsWith("Agente:");
              const texto = m.replace(/^(Agente|Proveedor):\s*/, "");
              return (
                <div key={i} className={`animar-aparecer flex ${agente ? "justify-start" : "justify-end"}`} style={{ animationDelay: `${300 + i * 700}ms` }}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${agente ? "rounded-bl-sm bg-white" : "rounded-br-sm bg-emerald-200"}`}>
                    <div className="text-[10px] font-semibold uppercase text-slate-500">{agente ? "🤖 Agente KYP" : "👤 Proveedor"}</div>
                    {texto}
                  </div>
                </div>
              );
            })}
          </div>
          {llamada?.resumen && <p className="mt-2 text-xs text-slate-600">Resumen: {llamada.resumen}</p>}
        </div>
      )}

      {simular && !llamada && (s.estado === "pausada" || s.estado === "en_llamada") && (
        <div data-tour="simular" className="rounded-lg border border-amber-300 bg-amber-50 p-3">
          <p className="mb-2 text-sm text-amber-900">La voz real no está conectada. Elige qué respondería el proveedor en la llamada:</p>
          <SimularLlamada solicitudId={s.id} />
        </div>
      )}
    </div>
  );
}
