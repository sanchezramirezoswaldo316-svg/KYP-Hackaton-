// Contratos compartidos. Si cambias algo aquí, avisa al equipo: todos dependen de estos tipos.

export type Decision = "liberar" | "revisar" | "bloquear";

export type Fuente = "sat_69b" | "sat_69" | "ofac" | "web" | "noticias" | "dominio";

export type Estatus69B = "presunto" | "definitivo" | "desvirtuado" | "sentencia_favorable";

export interface Proveedor {
  id: string;
  rfc: string;
  razon_social: string;
  sitio_web: string | null;
  telefono_registrado: string;
  clabe: string | null;
  giro_declarado: string | null;
  monto_anual: number;
}

// Un hallazgo es el resultado de una sola fuente. Lo producen Ulises (listas) y Alan (n8n/Firecrawl).
export interface Hallazgo {
  fuente: Fuente;
  // Valor normalizado. Ejemplos: "presunto", "sin_coincidencia", "coincidencia_exacta",
  // "coincidencia_parecida", "giro_no_coincide", "noticias_negativas", "dominio_reciente".
  resultado: string;
  detalle: string;
  fecha_fuente: string | null;
}

export interface Motivo {
  regla: string;
  puntos: number;
  descripcion: string;
}

export interface ResultadoPuntaje {
  puntaje: number;
  decision: Decision;
  bloqueo_directo: boolean;
  motivos: Motivo[];
}

export interface Verificacion extends ResultadoPuntaje {
  id: string;
  proveedor_id: string;
  fecha: string;
  hallazgos: Hallazgo[];
  resumen_ia: string | null;
}

export type TipoCaso = "alta" | "clabe";
export type EstadoCaso = "pendiente" | "aprobado" | "pausado" | "bloqueado";

export interface Caso {
  id: string;
  proveedor_id: string;
  tipo: TipoCaso;
  prioridad: number; // riesgo × monto, mayor = más urgente
  estado: EstadoCaso;
  decidido_por: string | null;
  decidido_en: string | null;
}

export type ResultadoLlamada = "confirmado" | "no_reconoce" | "datos_no_coinciden" | "sin_respuesta";

export interface Llamada {
  id: string;
  solicitud_id: string;
  resultado: ResultadoLlamada;
  transcripcion: string;
  audio_url: string | null;
}

// Cuerpo que n8n envía a POST /api/webhooks/verificacion
export interface WebhookVerificacion {
  proveedor_id: string;
  hallazgos: Hallazgo[];
  resumen_ia: string | null;
}

// Cuerpo que el flujo de voz envía a POST /api/webhooks/llamada
export interface WebhookLlamada {
  solicitud_id: string;
  resultado: ResultadoLlamada;
  transcripcion: string;
  audio_url: string | null;
}
