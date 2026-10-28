// Línea de tiempo de un cambio de CLABE y la conversación de la llamada como chat.
import type { Llamada, SolicitudClabe } from "@/lib/tipos.ts";
import { pesos } from "@/lib/formato.ts";
import { enmascararClabe } from "@/lib/validacion.ts";
import { avisoVoz } from "@/lib/voz/estado.ts";
import { AudioLlamada } from "./cliente/AudioLlamada";
import { SimularLlamada } from "./cliente/SimularLlamada";
import { Icono, type NombreIcono } from "./Icono";

type Paso = { icono: NombreIcono; titulo: string; texto: string; estado: "hecho" | "actual" | "pendiente" | "fraude" | "ok" };

function pasos(s: SolicitudClabe, l: Llamada | undefined): Paso[] {
  const llamando = s.estado === "en_llamada" && !l;
  const resultado: Paso = !l
    ? { icono: "espera", titulo: "Resultado", texto: "Esperando la llamada", estado: "pendiente" }
    : l.resultado === "confirmado"
      ? { icono: "ok", titulo: "Confirmado", texto: "El proveedor reconoció el cambio. Consulta el estado actual del pago en el expediente.", estado: "ok" }
      : { icono: "escudoX", titulo: "Revisión necesaria", texto: l.resultado === "sin_respuesta" ? "No se completó la verificación. El pago sigue pausado." : l.resultado === "datos_no_coinciden" ? "Los datos no coinciden. El pago sigue pausado." : "El proveedor no reconoce el cambio. El pago sigue pausado.", estado: "fraude" };
  return [
    { icono: "correo", titulo: "Solicitud recibida", texto: `Piden cambiar la cuenta a ${enmascararClabe(s.clabe_nueva)}`, estado: "hecho" },
    { icono: "pausa", titulo: "Pago congelado", texto: "Nadie puede pagar a la cuenta nueva todavía", estado: "hecho" },
    { icono: "llamada", titulo: "Llamada al número registrado", texto: llamando ? "Llamando ahora…" : l ? "Llamada terminada" : "Pendiente", estado: llamando ? "actual" : l ? "hecho" : "pendiente" },
    resultado,
  ];
}

const ESTILO = {
  hecho: "border-acento/50 bg-acento/8 [&_svg]:text-acento-2",
  actual: "border-acento bg-panel ring-2 ring-acento/30 [&_svg]:text-acento-2",
  pendiente: "border-dashed border-borde-fuerte bg-panel text-texto-3",
  ok: "border-ok/60 bg-ok/10 [&_svg]:text-ok",
  fraude: "border-peligro/60 bg-peligro/10 [&_svg]:text-peligro",
};

export function LineaTiempoClabe({ s, llamada, monto, simular, fallo = false }: { s: SolicitudClabe; llamada?: Llamada; monto: number | null; simular: boolean; fallo?: boolean }) {
  const aviso = avisoVoz(s, llamada, fallo);
  const ps = pasos(s, llamada);
  const fraude = llamada?.resultado === "no_reconoce";
  const mensajes = (llamada?.transcripcion ?? "").split("\n").filter(Boolean);
  return (
    <div className="space-y-4">
      {aviso && <p role="alert" className="rounded border border-alerta/40 bg-alerta/10 p-3 text-sm text-alerta">{aviso}</p>}
      {llamada && !llamada.simulada && llamada.conversation_id && <AudioLlamada llamadaId={llamada.id} />}
      <ol className="grid gap-2 sm:grid-cols-4">
        {ps.map((p, i) => (
          <li key={i} className={`animar-aparecer rounded border p-3 ${ESTILO[p.estado]}`} style={{ animationDelay: `${i * 150}ms` }}>
            <div className="mb-2 flex items-center justify-between">
              <span className={p.estado === "actual" ? "animar-llamando" : ""}><Icono nombre={p.icono} className="h-5 w-5" /></span>
              <span className="font-mono text-[10px] text-texto-3">{String(i + 1).padStart(2, "0")}</span>
            </div>
            <div className="font-semibold">{p.titulo}</div>
            <div className="text-xs text-texto-2">{p.texto}</div>
          </li>
        ))}
      </ol>

      {fraude && monto !== null && (
        <div className="animar-aparecer rounded-md border border-peligro bg-peligro/15 p-4 text-center text-peligro">
          <div className="rotulo text-peligro!">Posible fraude detenido</div>
          <div className="font-mono text-3xl font-bold tabular-nums">Monto bajo revisión: {pesos(monto)}</div>
          <div className="text-sm text-texto-2">monto de su última factura</div>
        </div>
      )}

      {mensajes.length > 0 && (
        <div className="rounded-md border border-borde bg-panel-2 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-texto-2">
            <Icono nombre="llamada" className="h-3.5 w-3.5 text-voz" /><span className="rotulo">Conversación de la llamada</span> {llamada?.simulada && <span className="rounded bg-alerta/25 px-1.5 text-xs text-alerta">Simulada (demo)</span>}
          </div>
          <div className="space-y-2">
            {mensajes.map((m, i) => {
              const agente = m.startsWith("Agente:");
              const texto = m.replace(/^(Agente|Proveedor):\s*/, "");
              return (
                <div key={i} className={`animar-aparecer flex ${agente ? "justify-start" : "justify-end"}`} style={{ animationDelay: `${300 + i * 700}ms` }}>
                  <div className={`max-w-[80%] rounded-md px-3 py-2 text-sm  ${agente ? "rounded-bl-sm border border-borde bg-panel" : "rounded-br-sm border border-ok/30 bg-ok/10"}`}>
                    <div className="mb-0.5 flex items-center gap-1 font-mono text-[10px] font-semibold uppercase text-texto-3"><Icono nombre={agente ? "robot" : "persona"} className="h-3 w-3" />{agente ? "Agente KYP" : "Proveedor"}</div>
                    {texto}
                  </div>
                </div>
              );
            })}
          </div>
          {llamada?.resumen && <p className="mt-2 text-xs text-texto-2">Resumen: {llamada.resumen}</p>}
        </div>
      )}

      {simular && !llamada && (s.estado === "pausada" || s.estado === "en_llamada") && (
        <div data-tour="simular" className="rounded border border-alerta/40 bg-alerta/10 p-3">
          <p className="mb-2 text-sm text-alerta">La voz real no está conectada. Elige qué respondería el proveedor en la llamada:</p>
          <SimularLlamada solicitudId={s.id} />
        </div>
      )}
    </div>
  );
}
