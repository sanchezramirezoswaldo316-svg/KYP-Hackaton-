import { almacen } from "@/lib/almacen/index.ts";
import { integraciones } from "@/lib/integraciones.ts";

export function BannerModo() {
  const i = integraciones();
  const faltan = [!i.firecrawl && "Firecrawl", !i.ia && "IA (Claude)", !i.voz && "voz (ElevenLabs)"].filter(Boolean);
  if (almacen().modo === "supabase" && faltan.length === 0) return null;
  return (
    <div className="border-b border-amber-200 bg-amber-50 text-sm text-amber-900">
      <div className="mx-auto max-w-6xl px-4 py-2">
        {almacen().modo === "memoria" && <strong>Modo demo: </strong>}
        {almacen().modo === "memoria" && "datos en memoria (se reinician al reiniciar el servidor). "}
        {faltan.length > 0 && `Sin configurar: ${faltan.join(", ")}. Esas fuentes aparecen como "no consultado"${!i.voz ? " y las llamadas se pueden simular" : ""}.`}
      </div>
    </div>
  );
}
