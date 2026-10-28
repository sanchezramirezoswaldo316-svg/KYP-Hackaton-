// Motor de verificación: consulta todas las fuentes en paralelo y calcula el puntaje con reglas.

import { calcularPuntaje } from "../puntaje/reglas.ts";
import type { Hallazgo, Proveedor, Verificacion } from "../tipos.ts";
import { fechaRegistroDominio } from "./dominio.ts";
import { buscar, firecrawlConfigurado, leerPagina } from "./firecrawl.ts";
import { compararGiro, evaluarNoticias, iaConfigurada, redactarResumen } from "./ia.ts";
import { revisar69, revisar69B, revisarOfac } from "./listas.ts";

const SEIS_MESES_MS = 182 * 24 * 3600 * 1000;

async function revisarWeb(p: Proveedor): Promise<Hallazgo> {
  if (!p.sitio_web) return { fuente: "web", resultado: "sin_sitio", detalle: "El proveedor no registró página web", fecha_fuente: null };
  if (!firecrawlConfigurado()) return { fuente: "web", resultado: "no_consultado", detalle: "Firecrawl no está configurado (FIRECRAWL_API_KEY)", fecha_fuente: null };

  const hoy = new Date().toISOString().slice(0, 10);
  const pagina = await leerPagina(p.sitio_web);
  if (!pagina.markdown.trim()) return { fuente: "web", resultado: "sin_contenido", detalle: "La página no devolvió contenido legible", fecha_fuente: hoy, evidencia_url: p.sitio_web };
  if (!p.giro_declarado || !iaConfigurada()) {
    return { fuente: "web", resultado: "consultado", detalle: `Página leída: "${pagina.titulo ?? p.sitio_web}". Sin comparación de giro (falta giro declarado o IA)`, fecha_fuente: hoy, evidencia_url: p.sitio_web };
  }
  const c = await compararGiro(p.razon_social, p.giro_declarado, pagina.markdown);
  if (!c) return { fuente: "web", resultado: "no_concluyente", detalle: "No se pudo comparar el giro con la IA", fecha_fuente: hoy, evidencia_url: p.sitio_web };
  const resultado = c.coincide === "si" ? "giro_coincide" : c.coincide === "no" ? "giro_no_coincide" : "no_concluyente";
  return { fuente: "web", resultado, detalle: `Giro observado: ${c.giro_observado}. ${c.explicacion}`, fecha_fuente: hoy, evidencia_url: p.sitio_web };
}

async function revisarNoticias(p: Proveedor): Promise<Hallazgo> {
  if (!firecrawlConfigurado()) return { fuente: "noticias", resultado: "no_consultado", detalle: "Firecrawl no está configurado (FIRECRAWL_API_KEY)", fecha_fuente: null };
  const hoy = new Date().toISOString().slice(0, 10);
  const resultados = await buscar(`"${p.razon_social}" (fraude OR demanda OR EFOS OR "69-B" OR lavado OR sanción)`);
  if (resultados.length === 0) return { fuente: "noticias", resultado: "sin_noticias", detalle: "La búsqueda no encontró noticias negativas", fecha_fuente: hoy };
  if (!iaConfigurada()) return { fuente: "noticias", resultado: "no_concluyente", detalle: `${resultados.length} resultados sin evaluar (IA no configurada)`, fecha_fuente: hoy, evidencia_url: resultados[0].url };
  const e = await evaluarNoticias(p.razon_social, p.rfc, resultados);
  if (!e) return { fuente: "noticias", resultado: "no_concluyente", detalle: "No se pudieron evaluar los resultados con la IA", fecha_fuente: hoy };
  return {
    fuente: "noticias",
    resultado: e.negativas ? "noticias_negativas" : "sin_noticias",
    detalle: e.explicacion,
    fecha_fuente: hoy,
    evidencia_url: e.urls_relevantes[0] ?? null,
  };
}

async function revisarDominio(p: Proveedor): Promise<Hallazgo> {
  if (!p.sitio_web) return { fuente: "dominio", resultado: "no_aplica", detalle: "Sin página web", fecha_fuente: null };
  const registro = await fechaRegistroDominio(p.sitio_web);
  if (!registro) return { fuente: "dominio", resultado: "no_consultado", detalle: "No se encontró la fecha de registro del dominio", fecha_fuente: null };
  const reciente = Date.now() - new Date(registro).getTime() < SEIS_MESES_MS;
  return {
    fuente: "dominio",
    resultado: reciente ? "dominio_reciente" : "dominio_antiguo",
    detalle: `Dominio registrado el ${registro.slice(0, 10)}`,
    fecha_fuente: registro.slice(0, 10),
  };
}

async function seguro(fuente: Hallazgo["fuente"], fn: () => Promise<Hallazgo>): Promise<Hallazgo> {
  try {
    return await fn();
  } catch (error) {
    return { fuente, resultado: "error", detalle: `No se pudo consultar: ${(error as Error).message}`, fecha_fuente: null };
  }
}

function resumenPorReglas(p: Proveedor, puntaje: number, decision: string, motivos: { descripcion: string; puntos: number }[]): string {
  if (motivos.filter((m) => m.puntos > 0).length === 0) return `${p.razon_social} no presenta alertas en las fuentes consultadas. Se sugiere liberar.`;
  const lista = motivos.filter((m) => m.puntos > 0).map((m) => `${m.descripcion} (+${m.puntos})`).join("; ");
  return `Puntaje ${puntaje}, decisión sugerida: ${decision}. Motivos: ${lista}.`;
}

export interface OpcionesVerificacion {
  // false = solo listas oficiales (rápido, para cargas masivas).
  fuentesExternas?: boolean;
  hallazgosExtra?: Hallazgo[];
}

export async function verificarProveedor(p: Proveedor, opciones: OpcionesVerificacion = {}): Promise<Omit<Verificacion, "id">> {
  const { fuentesExternas = true, hallazgosExtra = [] } = opciones;
  const hallazgos: Hallazgo[] = [revisar69B(p.rfc), revisar69(p.rfc), revisarOfac(p.razon_social)];

  if (fuentesExternas) {
    hallazgos.push(...(await Promise.all([
      seguro("web", () => revisarWeb(p)),
      seguro("noticias", () => revisarNoticias(p)),
      seguro("dominio", () => revisarDominio(p)),
    ])));
  } else if (!p.sitio_web) {
    hallazgos.push({ fuente: "web", resultado: "sin_sitio", detalle: "El proveedor no registró página web", fecha_fuente: null });
  }
  hallazgos.push(...hallazgosExtra);

  const resultado = calcularPuntaje(hallazgos);
  let resumen: string | null = null;
  // El resumen con IA solo vale la pena cuando el caso llega a la bandeja.
  if (fuentesExternas && iaConfigurada() && resultado.decision !== "liberar") {
    resumen = await redactarResumen({
      razon_social: p.razon_social,
      rfc: p.rfc,
      puntaje: resultado.puntaje,
      decision: resultado.decision,
      motivos: resultado.motivos.map((m) => `${m.descripcion} (+${m.puntos})`),
      hallazgos: hallazgos.map((h) => `${h.fuente}: ${h.detalle}`),
    }).catch(() => null);
  }

  return {
    proveedor_id: p.id,
    fecha: new Date().toISOString(),
    hallazgos,
    ...resultado,
    resumen: resumen ?? resumenPorReglas(p, resultado.puntaje, resultado.decision, resultado.motivos),
    resumen_origen: resumen ? "ia" : "reglas",
  };
}
