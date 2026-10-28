import { firecrawlConfigurado } from "./verificacion/firecrawl.ts";
import { iaConfigurada } from "./verificacion/ia.ts";
import { vozConfigurada } from "./voz/elevenlabs.ts";

export function integraciones() {
  return {
    demo_local: process.env.KYP_DEMO_LOCAL === "1",
    elevenlabs_agente: !!(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_AGENT_ID),
    n8n_notificaciones: !!process.env.N8N_WEBHOOK_NOTIFICACIONES,
    supabase: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    firecrawl: firecrawlConfigurado(),
    ia: iaConfigurada(),
    voz: vozConfigurada(),
    n8n: !!process.env.WEBHOOK_SECRET,
  };
}
