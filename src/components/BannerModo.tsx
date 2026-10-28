import { almacen } from "@/lib/almacen/index.ts";
import { integraciones } from "@/lib/integraciones.ts";
import { simulacionPermitida } from "@/lib/voz/elevenlabs.ts";

function Senal({ ok, texto, aviso = false }: { ok: boolean; texto: string; aviso?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-ok" : aviso ? "bg-alerta" : "bg-texto-3"}`} aria-hidden />
      <span className={ok ? "text-texto-2" : "text-texto-3"}>{texto}</span>
      <span className="sr-only">{ok ? "activo" : "sin configurar"}</span>
    </span>
  );
}

// Franja de estado del sistema: qué integraciones están vivas y si los datos son de demo.
export function BannerModo() {
  const i = integraciones();
  const modo = almacen().modo;
  const faltan = [!i.firecrawl && "Firecrawl", !i.ia && "IA (Claude)"].filter(Boolean);
  if (modo === "supabase" && faltan.length === 0 && i.voz) return null;
  return (
    <div className="border-b border-borde bg-fondo font-mono text-[11px] tracking-wide">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-5 gap-y-1 px-4 py-1.5 sm:px-6">
        <span className={`rounded-sm px-1.5 py-px font-semibold ${modo === "memoria" ? "bg-alerta/15 text-alerta" : "bg-ok/15 text-ok"}`}>
          {modo === "memoria" ? "MODO DEMO" : "PRODUCCIÓN"}
        </span>
        <Senal ok={modo === "supabase"} texto={modo === "memoria" ? "Datos en memoria" : "Supabase"} aviso />
        <Senal ok={i.firecrawl} texto="Firecrawl" />
        <Senal ok={i.ia} texto="IA (Claude)" />
        <Senal ok={i.voz} texto={i.voz ? "Telefonía" : simulacionPermitida() ? "Telefonía simulada" : "Telefonía incompleta"} aviso={!simulacionPermitida()} />
        {!i.voz && i.elevenlabs_agente && <span className="text-texto-3">Agente ElevenLabs configurado; la demo no lo consulta en vivo.</span>}
        {i.demo_local && <span className="text-texto-3">Ejecución local: las APIs externas necesitan internet.</span>}
        {faltan.length > 0 && <span className="text-texto-3 sm:ml-auto">Fuentes sin configurar se muestran como no consultadas.</span>}
      </div>
    </div>
  );
}
