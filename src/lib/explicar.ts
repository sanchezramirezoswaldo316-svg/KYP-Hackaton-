// Traduce los resultados técnicos a lenguaje simple para cualquier persona.
// Sin dependencias de servidor: se usa también en componentes del navegador.

import type { NombreIcono } from "../components/Icono.tsx";
import type { Decision, EstadoProveedor, Fuente, Hallazgo } from "./tipos.ts";

export type Nivel = "ok" | "info" | "alerta" | "peligro";

export const SEMAFORO: Record<Decision, { icono: NombreIcono; texto: string; frase: string; nivel: Nivel }> = {
  liberar: { icono: "escudoOk", texto: "Confiable", frase: "No encontramos señales de riesgo. Se aprueba solo.", nivel: "ok" },
  revisar: { icono: "escudoAlerta", texto: "Revisar", frase: "Hay señales que una persona debe revisar antes de pagarle.", nivel: "alerta" },
  bloquear: { icono: "escudoX", texto: "Peligro", frase: "Hay señales graves. Se recomienda no pagarle.", nivel: "peligro" },
};

export const ESTADO_SIMPLE: Record<EstadoProveedor, { icono: NombreIcono; texto: string }> = {
  pendiente: { icono: "espera", texto: "Pendiente" },
  aprobado: { icono: "ok", texto: "Pagos activos" },
  en_revision: { icono: "buscar", texto: "En revisión" },
  pausado: { icono: "pausa", texto: "Pagos congelados" },
  bloqueado: { icono: "prohibido", texto: "Bloqueado" },
};

export const FUENTE_SIMPLE: Record<Fuente, { icono: NombreIcono; titulo: string; revisando: string }> = {
  sat_69b: { icono: "factura", titulo: "Lista negra del SAT (facturas falsas)", revisando: "Revisando la lista negra del SAT…" },
  sat_69: { icono: "banco", titulo: "Problemas fiscales con el SAT", revisando: "Revisando si tiene problemas con el SAT…" },
  ofac: { icono: "escudo", titulo: "Sanciones internacionales", revisando: "Revisando sanciones de EE. UU. (OFAC)…" },
  web: { icono: "web", titulo: "Su página web", revisando: "Leyendo su página web…" },
  noticias: { icono: "noticias", titulo: "Noticias", revisando: "Buscando noticias negativas…" },
  dominio: { icono: "calendario", titulo: "Antigüedad de su página", revisando: "Revisando desde cuándo existe su página…" },
};

type Explicacion = { nivel: Nivel; titulo: string; frase: string };

const TABLA: Record<Fuente, Record<string, Explicacion>> = {
  sat_69b: {
    sin_coincidencia: { nivel: "ok", titulo: "No está en la lista negra del SAT", frase: "El SAT no lo ha señalado por vender facturas falsas." },
    presunto: { nivel: "alerta", titulo: "El SAT sospecha que vende facturas falsas", frase: "El SAT lo está investigando. Todavía puede defenderse, pero si se confirma, sus facturas no servirían." },
    definitivo: { nivel: "peligro", titulo: "El SAT confirmó que vende facturas falsas", frase: "Es una \"empresa fantasma\". Sus facturas no sirven para deducir impuestos y pagarle es un riesgo fiscal." },
    desvirtuado: { nivel: "ok", titulo: "El SAT lo investigó y salió limpio", frase: "Demostró que sus operaciones eran reales. No suma riesgo." },
    sentencia_favorable: { nivel: "ok", titulo: "Un tribunal le dio la razón frente al SAT", frase: "Ganó su caso. No suma riesgo." },
  },
  sat_69: {
    sin_coincidencia: { nivel: "ok", titulo: "Sin problemas fiscales publicados", frase: "No aparece como no localizado ni con deudas fiscales." },
    listado: { nivel: "alerta", titulo: "Tiene problemas con el SAT", frase: "El SAT no lo encuentra en su domicilio, tiene deudas fiscales o una sentencia por delito fiscal." },
  },
  ofac: {
    sin_coincidencia: { nivel: "ok", titulo: "No está sancionado por EE. UU.", frase: "Su nombre no aparece en la lista de sanciones internacionales." },
    coincidencia_parecida: { nivel: "alerta", titulo: "Su nombre se parece al de una empresa sancionada", frase: "Puede ser solo coincidencia de nombres. Una persona debe confirmarlo." },
    coincidencia_exacta: { nivel: "peligro", titulo: "Está en la lista de sanciones de EE. UU.", frase: "Hacer negocios con esta empresa puede traer multas y bloqueos de cuentas bancarias." },
  },
  web: {
    giro_coincide: { nivel: "ok", titulo: "Su página coincide con lo que nos vende", frase: "Lo que dice hacer en internet corresponde a lo que factura." },
    giro_no_coincide: { nivel: "alerta", titulo: "Su página no coincide con lo que nos factura", frase: "Dice dedicarse a una cosa, pero nos factura otra. Es una señal típica de facturas falsas." },
    sin_sitio: { nivel: "info", titulo: "No tiene página web", frase: "Es normal en empresas pequeñas. No suma riesgo." },
    consultado: { nivel: "info", titulo: "Página web leída", frase: "Se leyó su página, pero no se comparó con lo que factura." },
    sin_contenido: { nivel: "info", titulo: "Su página está vacía", frase: "No se pudo leer contenido de su página." },
  },
  noticias: {
    sin_noticias: { nivel: "ok", titulo: "Sin noticias negativas", frase: "No encontramos noticias de fraudes o demandas sobre esta empresa." },
    noticias_negativas: { nivel: "alerta", titulo: "Aparece en noticias negativas", frase: "Hay noticias de fraudes, demandas o sanciones que lo mencionan." },
  },
  dominio: {
    dominio_antiguo: { nivel: "ok", titulo: "Su página web tiene historia", frase: "Existe desde hace más de 6 meses." },
    dominio_reciente: { nivel: "alerta", titulo: "Su página web es muy nueva", frase: "Se creó hace menos de 6 meses. Es común en empresas fantasma." },
    no_aplica: { nivel: "info", titulo: "Sin página que revisar", frase: "No registró página web." },
  },
};

const GENERICO: Record<string, Explicacion> = {
  no_consultado: { nivel: "info", titulo: "No revisado", frase: "Esta revisión no está activada todavía." },
  no_concluyente: { nivel: "info", titulo: "Sin conclusión", frase: "No hubo información suficiente para concluir." },
  error: { nivel: "info", titulo: "No se pudo revisar", frase: "La fuente no respondió. Se puede volver a intentar." },
};

export function explicarHallazgo(h: Hallazgo): Explicacion & { icono: NombreIcono; fuente: string } {
  const e = TABLA[h.fuente]?.[h.resultado] ?? GENERICO[h.resultado] ?? { nivel: "info", titulo: h.resultado.replaceAll("_", " "), frase: h.detalle };
  return { ...e, icono: FUENTE_SIMPLE[h.fuente].icono, fuente: FUENTE_SIMPLE[h.fuente].titulo };
}

// Las alertas de un proveedor en una frase (para la bandeja).
export function resumenSimple(hallazgos: Hallazgo[]): string[] {
  return hallazgos
    .map(explicarHallazgo)
    .filter((e) => e.nivel === "alerta" || e.nivel === "peligro")
    .sort((a, b) => (a.nivel === "peligro" ? -1 : 0) - (b.nivel === "peligro" ? -1 : 0))
    .map((e) => e.titulo);
}

export const GLOSARIO: Record<string, string> = {
  "69-B": "Lista pública del SAT con empresas que venden facturas de operaciones que nunca ocurrieron (\"empresas fantasma\").",
  "Art. 69": "Listas del SAT de contribuyentes que no se encuentran en su domicilio, con deudas fiscales o con sentencias.",
  EFOS: "Empresa que Factura Operaciones Simuladas: vende facturas falsas. Si le pagas, pierdes la deducción de impuestos.",
  OFAC: "Oficina del gobierno de EE. UU. que publica la lista de personas y empresas sancionadas (narcotráfico, terrorismo, etc.).",
  CLABE: "Número de 18 dígitos de una cuenta bancaria en México. Si alguien la cambia con engaños, el pago se va a otra persona.",
  RFC: "Registro Federal de Contribuyentes: la \"identificación fiscal\" de cada persona o empresa ante el SAT.",
  Homónimo: "Dos empresas con nombres parecidos que no son la misma. Por eso una persona confirma antes de bloquear.",
  Puntaje: "Número de 0 a 100 que suma las señales de riesgo encontradas. Cada punto tiene una razón visible.",
  Materialidad: "Prueba de que una compra realmente ocurrió. El expediente ayuda a demostrarla ante el SAT.",
  "Gestión por excepción": "El sistema revisa a todos y solo pasa a una persona los casos dudosos.",
};
