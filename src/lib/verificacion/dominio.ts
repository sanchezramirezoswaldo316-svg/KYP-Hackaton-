// Antigüedad del dominio vía RDAP (registro público, sucesor de WHOIS).

export async function fechaRegistroDominio(sitio: string): Promise<string | null> {
  const host = new URL(sitio.startsWith("http") ? sitio : `https://${sitio}`).hostname.replace(/^www\./, "");
  const res = await fetch(`https://rdap.org/domain/${host}`, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) return null;
  const datos = (await res.json()) as { events?: { eventAction: string; eventDate: string }[] };
  return datos.events?.find((e) => e.eventAction === "registration")?.eventDate ?? null;
}
