// Firecrawl: lectura de la página del proveedor y búsqueda de noticias.

const API = "https://api.firecrawl.dev/v2";

export function firecrawlConfigurado(): boolean {
  return !!process.env.FIRECRAWL_API_KEY;
}

async function llamar<T>(ruta: string, cuerpo: unknown): Promise<T> {
  const res = await fetch(`${API}${ruta}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`Firecrawl ${ruta} respondió ${res.status}`);
  return (await res.json()) as T;
}

export async function leerPagina(url: string): Promise<{ markdown: string; titulo: string | null }> {
  const r = await llamar<{ data?: { markdown?: string; metadata?: { title?: string } } }>("/scrape", {
    url,
    formats: ["markdown"],
    onlyMainContent: true,
  });
  return { markdown: r.data?.markdown ?? "", titulo: r.data?.metadata?.title ?? null };
}

export interface ResultadoBusqueda {
  titulo: string;
  url: string;
  descripcion: string;
}

export async function buscar(consulta: string, limite = 8): Promise<ResultadoBusqueda[]> {
  type Item = { title?: string; url?: string; description?: string; snippet?: string };
  const r = await llamar<{ data?: Item[] | { web?: Item[]; news?: Item[] } }>("/search", {
    query: consulta,
    limit: limite,
    sources: ["web", "news"],
  });
  const items = Array.isArray(r.data) ? r.data : [...(r.data?.web ?? []), ...(r.data?.news ?? [])];
  return items
    .filter((i) => i.url)
    .map((i) => ({ titulo: i.title ?? "", url: i.url!, descripcion: i.description ?? i.snippet ?? "" }));
}
