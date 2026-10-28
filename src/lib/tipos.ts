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
  // Datos extraídos de la fuente, para mostrarlos (por ejemplo, "Estatus": "definitivo").
  datos?: Record<string, string>;
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
  // Fecha en que toca pagarla (ERP simulado). null si se desconoce.
  vence: string | null;
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

// ---------- Automatización ----------

export type AccionPolitica = "bloquear" | "solicitar_documentos";

// Estado de activación de una política del catálogo (src/lib/politicas.ts).
export interface Politica {
  id: string;
  clave: string;
  activa: boolean;
  actualizado_por: string | null;
  actualizado_en: string | null;
}

export type EstadoDocumento = "enviada" | "recibida" | "vencida";

export interface AnalisisDocumento {
  es_opinion_32d: boolean;
  sentido: "positivo" | "negativo" | "no_concluyente";
  rfc: string;
  fecha_emision: string;
  explicacion: string;
}

// Documento que se le pide al proveedor por su portal (enlace con token).
export interface SolicitudDocumento {
  id: string;
  proveedor_id: string;
  caso_id: string | null;
  token: string;
  documento: "opinion_32d";
  estado: EstadoDocumento;
  solicitada_por: string;
  enviada_en: string;
  notificada: boolean;
  recordatorios: number;
  ultimo_recordatorio_en: string | null;
  recibida_en: string | null;
  archivo_nombre: string | null;
  archivo_sha256: string | null;
  archivo_base64: string | null;
  analisis: AnalisisDocumento | null;
}

export type TipoAlerta = "cambio_lista" | "documento_recibido" | "solicitud_vencida" | "politica_aplicada";

export interface Alerta {
  id: string;
  tipo: TipoAlerta;
  proveedor_id: string | null;
  mensaje: string;
  creado_en: string;
  leida: boolean;
}
