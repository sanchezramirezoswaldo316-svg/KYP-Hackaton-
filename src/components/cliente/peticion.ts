export async function enviar<T = unknown>(url: string, cuerpo?: unknown, timeoutMs?: number): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
    headers: { "Content-Type": "application/json" },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  }).catch(() => { throw new Error("No se pudo confirmar la operación. Revisa la conexión y el estado del registro antes de volver a enviarla."); });
  const datos = await res.json().catch(() => null);
  if (!res.ok) throw new Error((datos as { error?: string } | null)?.error ?? (res.status === 401 ? "Tu sesión no permite realizar esta acción. Vuelve a iniciar sesión." : "El servicio no está disponible. Revisa el estado antes de repetir la operación."));
  if (datos === null) throw new Error("El servidor devolvió una respuesta inesperada. Revisa el estado antes de repetir la operación.");
  return datos as T;
}
