import { almacen } from "@/lib/almacen/index.ts";
import { simulacionPermitida } from "@/lib/voz/elevenlabs.ts";
import { integraciones } from "@/lib/integraciones.ts";

export function BannerModo() {
  const i = integraciones();
  const faltan = [!i.firecrawl && "Firecrawl", !i.ia && "IA (Claude)"].filter(Boolean);
  if (almacen().modo === "supabase" && faltan.length === 0 && i.voz) return null;
  return (
    <div className="border-b border-amber-200 bg-amber-50 text-sm text-amber-900">
      <div className="mx-auto max-w-6xl px-4 py-2">
        {almacen().modo === "memoria" && <strong>Modo demo: </strong>}
        {almacen().modo === "memoria" && "datos en memoria (se reinician al reiniciar el servidor). "}
        {faltan.length > 0 && `Sin configurar: ${faltan.join(", ")}. Se muestran como fuentes no consultadas. `}
        {!i.voz && (simulacionPermitida() ? "Telefonía simulada: no se realiza una llamada real. " : "Telefonía incompleta: revisa la configuración antes de llamar. ")}
        {!i.voz && i.elevenlabs_agente && "Agente ElevenLabs configurado; la demo no lo consulta en vivo. "}
        {i.demo_local && "Ejecución local; las APIs externas configuradas necesitan internet."}
      </div>
    </div>
  );
}
