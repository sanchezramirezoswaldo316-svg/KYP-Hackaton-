import { firecrawlConfigurado } from "./verificacion/firecrawl.ts";
import { iaConfigurada } from "./verificacion/ia.ts";
import { vozConfigurada } from "./voz/elevenlabs.ts";

export function integraciones() {
  return {
    supabase: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    firecrawl: firecrawlConfigurado(),
    ia: iaConfigurada(),
    voz: vozConfigurada(),
    n8n: !!process.env.WEBHOOK_SECRET,
  };
}
