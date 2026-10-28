import type { Decision, EstadoProveedor, Fuente } from "./tipos.ts";

export const pesos = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

export const millones = (n: number) => `$${(n / 1_000_000).toLocaleString("es-MX", { maximumFractionDigits: 1 })} M`;

export const fecha = (iso: string | null) => {
  if (!iso) return "—";
  // Las fechas sin hora (AAAA-MM-DD) se muestran tal cual, sin convertir de zona horaria.
  if (iso.length === 10) return new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-MX", { dateStyle: "medium", timeZone: "UTC" });
  return new Date(iso).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" });
};

// "1 caso" / "3 casos"
export const plural = (n: number, singular: string, varios = `${singular}s`) => `${n.toLocaleString("es-MX")} ${n === 1 ? singular : varios}`;

// Días para un pago: "hoy", "mañana", "en 5 días".
export const enDias = (d: number) => (d <= 0 ? "hoy" : d === 1 ? "mañana" : `en ${d} días`);

export const esSimulacion = (detalle: string) => detalle.startsWith("[SIMULACIÓN");

export const NOMBRE_FUENTE: Record<Fuente, string> = {
  sat_69b: "SAT · Art. 69-B",
  sat_69: "SAT · Art. 69",
  ofac: "OFAC",
  web: "Página web (Firecrawl)",
  noticias: "Noticias (Firecrawl)",
  dominio: "Dominio (RDAP)",
};

export const NOMBRE_DECISION: Record<Decision, string> = { liberar: "Liberar", revisar: "Revisar", bloquear: "Bloquear" };

export const NOMBRE_ESTADO: Record<EstadoProveedor, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  en_revision: "En revisión",
  pausado: "Pago en pausa",
  bloqueado: "Bloqueado",
};
