// Envío de avisos (al proveedor o a la gestora) a través de n8n, que decide el canal: correo, WhatsApp, Slack…
// Sin N8N_WEBHOOK_NOTIFICACIONES no se envía nada y la app lo indica para que el enlace se comparta a mano.

export type Notificacion =
  | { tipo: "solicitud_documentos" | "recordatorio_documentos"; para: { razon_social: string; rfc: string; telefono: string }; enlace: string | null; documento: string; recordatorio?: number }
  | { tipo: "resumen_diario"; texto: string; datos: Record<string, unknown> }
  | { tipo: "alerta"; texto: string; proveedor_id: string | null };

export function notificacionesConfiguradas(): boolean {
  return !!process.env.N8N_WEBHOOK_NOTIFICACIONES;
}

// URL pública de la app para armar enlaces (portal del proveedor).
export function urlBase(): string | null {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return null;
}

export async function notificar(n: Notificacion): Promise<{ enviada: boolean; motivo?: string }> {
  const url = process.env.N8N_WEBHOOK_NOTIFICACIONES;
  if (!url) return { enviada: false, motivo: "Canal de avisos no configurado (N8N_WEBHOOK_NOTIFICACIONES)" };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-kyp-secret": process.env.WEBHOOK_SECRET ?? "" },
      body: JSON.stringify(n),
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok ? { enviada: true } : { enviada: false, motivo: `n8n respondió ${res.status}` };
  } catch (error) {
    return { enviada: false, motivo: (error as Error).message };
  }
}
