export async function enviar<T = unknown>(url: string, cuerpo?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((datos as { error?: string }).error ?? `Error ${res.status}`);
  return datos as T;
}
