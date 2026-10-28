// Uso de Qwen vía Groq: comparar giro, evaluar noticias y redactar el resumen del caso.
// La IA NUNCA calcula el puntaje ni decide; solo clasifica evidencia y redacta.

import { z } from "zod";

const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODELO = "qwen/qwen3.8-27b";

export function iaConfigurada(): boolean {
  return !!process.env.GROQ_API_KEY;
}

type RespuestaGroq = { choices?: { message?: { content?: string | null } }[] };

async function clasificar<T extends z.ZodType>(esquema: T, system: string, contenido: string): Promise<z.infer<T> | null> {
  const clave = process.env.GROQ_API_KEY;
  if (!clave) return null;

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clave}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODELO,
        messages: [
          { role: "system", content: `${system}\nResponde únicamente con un objeto JSON válido que cumpla este esquema: ${JSON.stringify(z.toJSONSchema(esquema))}` },
          { role: "user", content: contenido },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 1200,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      console.error(`Groq API respondió ${res.status}`);
      return null;
    }

    const respuesta = (await res.json()) as RespuestaGroq;
    const texto = respuesta.choices?.[0]?.message?.content;
    if (!texto) return null;

    const validado = esquema.safeParse(JSON.parse(texto));
    if (!validado.success) {
      console.error("Groq devolvió un JSON que no cumple el esquema esperado");
      return null;
    }
    return validado.data;
  } catch (error) {
    console.error("No se pudo consultar Groq:", error);
    return null;
  }
}

const EsquemaGiro = z.object({
  coincide: z.enum(["si", "no", "no_concluyente"]),
  giro_observado: z.string(),
  explicacion: z.string(),
});

export async function compararGiro(razonSocial: string, giroDeclarado: string, contenidoWeb: string) {
  return clasificar(
    EsquemaGiro,
    "Eres analista de cumplimiento de proveedores en México. Comparas el giro que un proveedor declara (lo que factura) con lo que su página web muestra que hace. Responde en español. Si la página no da información suficiente, responde no_concluyente.",
    `Proveedor: ${razonSocial}\nGiro declarado / lo que factura: ${giroDeclarado}\n\nContenido de su página web (markdown):\n${contenidoWeb.slice(0, 20000)}`,
  );
}

const EsquemaNoticias = z.object({
  negativas: z.boolean(),
  explicacion: z.string(),
  urls_relevantes: z.array(z.string()),
});

export async function evaluarNoticias(razonSocial: string, rfc: string, resultados: { titulo: string; url: string; descripcion: string }[]) {
  return clasificar(
    EsquemaNoticias,
    "Eres analista de cumplimiento en México. Decides si resultados de búsqueda contienen noticias negativas relevantes (fraude, facturación falsa, EFOS, lavado, demandas, sanciones) que se refieran claramente a ESTA empresa y no a otra con nombre similar. Si no es claro que se trata de la misma empresa, responde negativas=false. Responde en español.",
    `Empresa: ${razonSocial} (RFC ${rfc})\n\nResultados:\n${resultados.map((r, i) => `${i + 1}. ${r.titulo}\n${r.url}\n${r.descripcion}`).join("\n\n")}`,
  );
}

const EsquemaResumen = z.object({ resumen: z.string() });

export async function redactarResumen(datos: { razon_social: string; rfc: string; puntaje: number; decision: string; motivos: string[]; hallazgos: string[] }) {
  const r = await clasificar(
    EsquemaResumen,
    "Eres analista de cumplimiento de proveedores. Redacta en español un resumen de 2 o 3 frases para el gestor que decidirá sobre el caso. Explica el porqué del puntaje con base SOLO en los motivos y hallazgos dados; no inventes datos ni cambies la decisión sugerida.",
    JSON.stringify(datos),
  );
  return r?.resumen ?? null;
}

const EsquemaOpinion = z.object({
  es_opinion_32d: z.boolean(),
  sentido: z.enum(["positivo", "negativo", "no_concluyente"]),
  rfc: z.string(),
  fecha_emision: z.string(),
  explicacion: z.string(),
});

// Lee el PDF que subió el proveedor y extrae lo esencial de su opinión de cumplimiento 32-D.
export async function analizarOpinion32D(pdfBase64: string) {
  try {
    const res = await anthropic().beta.messages.parse({
      model: MODELO,
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(EsquemaOpinion) },
      system: "Eres analista fiscal en México. Revisas documentos que suben proveedores. Indica si el documento es una Opinión del Cumplimiento de Obligaciones Fiscales del SAT (32-D), su sentido (positivo o negativo), el RFC al que corresponde y su fecha de emisión (AAAA-MM-DD). Si no es una opinión 32-D o no se puede leer, dilo. Responde en español.",
      messages: [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
          { type: "text", text: "Analiza este documento." },
        ],
      }],
    });
    if (res.stop_reason === "refusal") return null;
    return res.parsed_output ?? null;
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error(`Claude API ${error.status}: ${error.message}`);
      return null;
    }
    throw error;
  }
}
