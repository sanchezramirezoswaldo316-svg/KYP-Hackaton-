// Contratos compartidos. Si cambias algo aquí, avisa al equipo: todos dependen de estos tipos.

export type Decision = "liberar" | "revisar" | "bloquear";

export type Fuente = "sat_69b" | "sat_69" | "ofac" | "web" | "noticias" | "dominio";

export type Estatus69B = "presunto" | "definitivo" | "desvirtuado" | "sentencia_favorable";

export type EstadoProveedor = "pendiente" | "aprobado" | "en_revision" | "pausado" | "bloqueado";

export interface Proveedor {
  id: string;
  rfc: string;
  razon_social: string;
  sitio_web: string | null;
  telefono_registrado: string;
  clabe: string | null;
  giro_declarado: string | null;
  monto_anual: number;
  estado: EstadoProveedor;
  creado_en: string;
}

export type NuevoProveedor = Omit<Proveedor, "id" | "estado" | "creado_en">;

// Un hallazgo es el resultado de una sola fuente.
export interface Hallazgo {
  fuente: Fuente;
  // Valor normalizado. Ejemplos: "presunto", "sin_coincidencia", "coincidencia_exacta",
  // "coincidencia_parecida", "giro_no_coincide", "noticias_negativas", "dominio_reciente",
  // "no_consultado" (la fuente no está configurada) o "error".
  resultado: string;
  detalle: string;
  fecha_fuente: string | null;
  evidencia_url?: string | null;
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
  resumen: string;
  // "ia" si lo redactó el modelo; "reglas" si se generó sin IA.
  resumen_origen: "ia" | "reglas";
}

export type TipoCaso = "alta" | "clabe";
export type EstadoCaso = "pendiente" | "aprobado" | "pausado" | "bloqueado";

export interface Caso {
  id: string;
  proveedor_id: string;
  tipo: TipoCaso;
  prioridad: number; // riesgo × monto, mayor = más urgente
  estado: EstadoCaso;
  decision_sugerida: Decision;
  motivo: string;
  solicitud_id: string | null;
  decidido_por: string | null;
  decidido_en: string | null;
  comentario: string | null;
  creado_en: string;
}

export interface Factura {
  id: string;
  proveedor_id: string;
  folio: string;
  monto: number;
  fecha: string;
}

export type EstadoSolicitud = "pausada" | "en_llamada" | "verificada" | "rechazada";

export interface SolicitudClabe {
  id: string;
  proveedor_id: string;
  clabe_nueva: string;
  // Teléfono que venía en la solicitud. Se guarda como evidencia, pero NUNCA se usa para llamar.
  telefono_en_solicitud: string | null;
  estado: EstadoSolicitud;
  creado_en: string;
}

export type ResultadoLlamada = "confirmado" | "no_reconoce" | "datos_no_coinciden" | "sin_respuesta";

export interface Llamada {
  id: string;
  solicitud_id: string;
  conversation_id: string | null;
  resultado: ResultadoLlamada;
  transcripcion: string;
  resumen: string | null;
  simulada: boolean;
  creado_en: string;
}

export interface EventoBitacora {
  id: string;
  actor: string;
  accion: string;
  entidad: string;
  entidad_id: string | null;
  detalle: Record<string, unknown> | null;
  creado_en: string;
}

// Cuerpo que n8n puede enviar a POST /api/webhooks/verificacion para agregar hallazgos externos.
export interface WebhookVerificacion {
  proveedor_id: string;
  hallazgos: Hallazgo[];
}

// Cuerpo genérico de resultado de llamada: POST /api/webhooks/llamada
export interface WebhookLlamada {
  solicitud_id: string;
  resultado: ResultadoLlamada;
  transcripcion: string;
  conversation_id?: string | null;
  resumen?: string | null;
}
