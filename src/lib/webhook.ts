// Verifica el secreto compartido que envían n8n y el flujo de voz en el header x-kyp-secret.
export function webhookAutorizado(req: Request): boolean {
  const secreto = process.env.WEBHOOK_SECRET;
  return !!secreto && req.headers.get("x-kyp-secret") === secreto;
}
