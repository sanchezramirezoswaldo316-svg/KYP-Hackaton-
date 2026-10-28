// Línea de tiempo de un cambio de CLABE y la conversación de la llamada como chat.
import type { Llamada, SolicitudClabe } from "@/lib/tipos.ts";
import { pesos } from "@/lib/formato.ts";
import { enmascararClabe } from "@/lib/validacion.ts";
import { TranscripcionLlamada } from "./TranscripcionLlamada";
import { AudioLlamada } from "./cliente/AudioLlamada";
import { SimularLlamada } from "./cliente/SimularLlamada";
import { Alerta } from "./ui/Alerta";

type Paso = { icono: string; titulo: string; texto: string; estado: "hecho" | "actual" | "pendiente" | "fraude" | "ok" };

function pasos(s: SolicitudClabe, l: Llamada | undefined): Paso[] {
  const llamando = s.estado === "en_llamada" && !l;
  const resultado: Paso = !l
    ? { icono: "4", titulo: "Resultado", texto: "Esperando la llamada", estado: "pendiente" }
    : l.resultado === "confirmado"
      ? { icono: "4", titulo: "Confirmado", texto: "El proveedor reconoció el cambio. Pagos reactivados.", estado: "ok" }
      : { icono: "4", titulo: "Fraude detenido", texto: l.resultado === "sin_respuesta" ? "Nadie contestó: el pago sigue congelado." : "El proveedor NO pidió el cambio. El pago sigue congelado.", estado: "fraude" };
  return [
    { icono: "1", titulo: "Solicitud recibida", texto: `Piden cambiar la cuenta a ${enmascararClabe(s.clabe_nueva)}`, estado: "hecho" },
    { icono: "2", titulo: "Pago congelado", texto: "Nadie puede pagar a la cuenta nueva todavía", estado: "hecho" },
    { icono: "3", titulo: "Llamada al número registrado", texto: llamando ? "Llamando ahora…" : l ? "Llamada terminada" : "Pendiente", estado: llamando ? "actual" : l ? "hecho" : "pendiente" },
    resultado,
  ];
}

const ESTILO = {
  hecho: "border-borde bg-panel",
  actual: "border-acento bg-acento-fondo ring-2 ring-acento-fondo",
  pendiente: "border-dashed border-borde-fuerte bg-panel text-tinta-3",
  ok: "border-borde-fuerte bg-panel",
  fraude: "border-tinta bg-superficie",
};

export function LineaTiempoClabe({ s, llamada, monto, simular, demo = false }: { s: SolicitudClabe; llamada?: Llamada; monto: number | null; simular: boolean; demo?: boolean }) {
  const ps = pasos(s, llamada);
  const fraude = llamada && llamada.resultado !== "confirmado";
  const llamando = s.estado === "en_llamada" && !llamada;
  return (
    <div className="space-y-4">
      <Alerta tipo="medio">Pago en pausa hasta confirmar por llamada al teléfono registrado.</Alerta>
      <ol className="grid gap-2 sm:grid-cols-4">
        {ps.map((p, i) => (
          <li key={i} className={`animar-aparecer rounded-lg border-2 p-3 ${ESTILO[p.estado]}`} style={{ animationDelay: `${i * 150}ms` }}>
            <div className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${p.estado === "actual" ? "animar-llamando border-acento bg-acento text-white" : "border-borde-fuerte"}`} aria-hidden>{p.icono}</div>
            <div className="font-semibold">{p.titulo}</div>
            <div className="text-xs">{p.texto}</div>
          </li>
        ))}
      </ol>

      {fraude && monto !== null && (
        <div className="animar-aparecer rounded-panel bg-tinta p-4 text-center text-white">
          <div className="text-sm uppercase tracking-wide">Posible fraude detenido</div>
          <div className="text-3xl font-bold">Se evitó desviar {pesos(monto)}</div>
          <div className="text-sm opacity-90">monto de su última factura</div>
        </div>
      )}

      {llamando && (
        <p className="rounded-control border border-acento bg-acento-fondo px-3 py-2 text-sm text-acento">Llamando al teléfono registrado…</p>
      )}
      {!llamada && !llamando && s.estado !== "pausada" && (
        <p className="text-sm text-tinta-3">Aún no hay llamada registrada.</p>
      )}
      {llamada && (
        <div className="rounded-panel bg-superficie p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-tinta-2">
            Conversación de la llamada {llamada.simulada && <span className="rounded-control border border-borde-fuerte px-1.5 text-xs text-tinta-2">Simulada (demo)</span>}
          </div>
          <AudioLlamada llamada={llamada} demo={demo} />
          <div className="mt-2">
            <div className="max-w-prose"><TranscripcionLlamada texto={llamada.transcripcion} /></div>
          </div>
          <p className="mt-2 text-xs text-tinta-3">Llamada grabada con aviso al proveedor.</p>
          {llamada.resumen && <p className="mt-2 text-xs text-tinta-2">Resumen: {llamada.resumen}</p>}
        </div>
      )}

      {simular && !llamada && (s.estado === "pausada" || s.estado === "en_llamada") && (
        <div data-tour="simular" className="rounded-panel border border-borde bg-superficie p-3">
          <p className="mb-2 text-sm text-tinta-2">La voz real no está conectada. Elige qué respondería el proveedor en la llamada:</p>
          <SimularLlamada solicitudId={s.id} />
        </div>
      )}
    </div>
  );
}
