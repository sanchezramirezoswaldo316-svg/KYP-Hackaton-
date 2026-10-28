// Documentos que se le piden al proveedor por su portal (enlace único), con recordatorios automáticos.

import { createHash, randomBytes } from "node:crypto";
import { almacen } from "./almacen/index.ts";
import { registrar } from "./bitacora.ts";
import { notificar, urlBase } from "./notificaciones.ts";
import type { SolicitudDocumento } from "./tipos.ts";
import { analizarOpinion32D, iaConfigurada } from "./verificacion/ia.ts";

export const DIAS_ENTRE_RECORDATORIOS = 3;
export const MAX_RECORDATORIOS = 2;
export const MAX_PDF_BYTES = 5 * 1024 * 1024;
const DIA_MS = 86_400_000;

export class ErrorDocumento extends Error {}

export const enlacePortal = (token: string) => `${urlBase() ?? ""}/portal/${token}`;

export async function solicitarDocumentos(proveedorId: string, casoId: string | null, actor: string): Promise<SolicitudDocumento> {
  const db = almacen();
  const p = await db.proveedores.obtener(proveedorId);
  if (!p) throw new ErrorDocumento("El proveedor no existe");

  // Si ya hay una solicitud abierta, no se duplica.
  const abierta = (await db.documentos.listar({ proveedor_id: proveedorId })).find((d) => d.estado === "enviada");
  if (abierta) return abierta;

  const solicitud = await db.documentos.crear({
    proveedor_id: proveedorId,
    caso_id: casoId,
    token: randomBytes(18).toString("base64url"),
    documento: "opinion_32d",
    estado: "enviada",
    solicitada_por: actor,
    enviada_en: new Date().toISOString(),
    notificada: false,
    recordatorios: 0,
    ultimo_recordatorio_en: null,
    recibida_en: null,
    archivo_nombre: null,
    archivo_sha256: null,
    archivo_base64: null,
    analisis: null,
  });
  const envio = await notificar({
    tipo: "solicitud_documentos",
    para: { razon_social: p.razon_social, rfc: p.rfc, telefono: p.telefono_registrado },
    enlace: urlBase() ? enlacePortal(solicitud.token) : null,
    documento: "Opinión del cumplimiento de obligaciones fiscales (32-D)",
  });
  if (envio.enviada) await db.documentos.actualizar(solicitud.id, { notificada: true });
  await registrar(actor, "documentos_solicitados", "proveedor", proveedorId, { documento: "opinion_32d", notificada: envio.enviada, motivo: envio.motivo ?? null });
  return (await db.documentos.obtener(solicitud.id))!;
}

export async function solicitudPorToken(token: string) {
  const d = (await almacen().documentos.listar({ token }))[0] ?? null;
  if (!d) return null;
  const p = await almacen().proveedores.obtener(d.proveedor_id);
  return p ? { solicitud: d, proveedor: p } : null;
}

export async function recibirDocumento(token: string, nombre: string, bytes: Uint8Array): Promise<SolicitudDocumento> {
  const db = almacen();
  const encontrada = await solicitudPorToken(token);
  if (!encontrada) throw new ErrorDocumento("El enlace no es válido");
  const { solicitud, proveedor } = encontrada;
  if (solicitud.estado === "recibida") throw new ErrorDocumento("Ya recibimos este documento. Gracias.");
  if (bytes.length === 0 || bytes.length > MAX_PDF_BYTES) throw new ErrorDocumento("El archivo debe pesar entre 1 byte y 5 MB");
  if (Buffer.from(bytes.subarray(0, 5)).toString("latin1") !== "%PDF-") throw new ErrorDocumento("El archivo debe ser un PDF");

  const base64 = Buffer.from(bytes).toString("base64");
  const analisis = iaConfigurada() ? await analizarOpinion32D(base64).catch(() => null) : null;
  const actualizada = await db.documentos.actualizar(solicitud.id, {
    estado: "recibida",
    recibida_en: new Date().toISOString(),
    archivo_nombre: nombre.slice(0, 200),
    archivo_sha256: createHash("sha256").update(bytes).digest("hex"),
    archivo_base64: base64,
    analisis,
  });

  const rfcCoincide = analisis ? analisis.rfc.toUpperCase().replace(/\s/g, "") === proveedor.rfc : null;
  const resumen = !analisis
    ? "pendiente de revisar"
    : !analisis.es_opinion_32d
      ? "no parece una opinión 32-D"
      : `opinión ${analisis.sentido}${rfcCoincide === false ? ", pero de OTRO RFC" : ""}`;
  await db.alertas.crear({ tipo: "documento_recibido", proveedor_id: proveedor.id, mensaje: `📄 ${proveedor.razon_social} subió su opinión 32-D (${resumen})`, creado_en: new Date().toISOString(), leida: false });
  await registrar("Proveedor (portal)", "documento_recibido", "proveedor", proveedor.id, { sha256: actualizada.archivo_sha256, analisis_ia: !!analisis });
  return actualizada;
}

// Manda recordatorios a quien no ha respondido; tras el último, la solicitud vence y se avisa a la gestora.
export async function procesarRecordatorios(ahora = new Date()) {
  const db = almacen();
  let enviados = 0, vencidas = 0;
  for (const d of await db.documentos.listar({ estado: "enviada" })) {
    const ultimo = new Date(d.ultimo_recordatorio_en ?? d.enviada_en).getTime();
    if (ahora.getTime() - ultimo < DIAS_ENTRE_RECORDATORIOS * DIA_MS) continue;
    const p = await db.proveedores.obtener(d.proveedor_id);
    if (!p) continue;
    if (d.recordatorios >= MAX_RECORDATORIOS) {
      await db.documentos.actualizar(d.id, { estado: "vencida" });
      await db.alertas.crear({ tipo: "solicitud_vencida", proveedor_id: p.id, mensaje: `⏰ ${p.razon_social} no entregó su opinión 32-D tras ${d.recordatorios} recordatorios`, creado_en: ahora.toISOString(), leida: false });
      await registrar("Tarea diaria", "solicitud_vencida", "proveedor", p.id, null);
      vencidas++;
      continue;
    }
    const envio = await notificar({
      tipo: "recordatorio_documentos",
      para: { razon_social: p.razon_social, rfc: p.rfc, telefono: p.telefono_registrado },
      enlace: urlBase() ? enlacePortal(d.token) : null,
      documento: "Opinión del cumplimiento de obligaciones fiscales (32-D)",
      recordatorio: d.recordatorios + 1,
    });
    await db.documentos.actualizar(d.id, { recordatorios: d.recordatorios + 1, ultimo_recordatorio_en: ahora.toISOString() });
    await registrar("Tarea diaria", "recordatorio_documentos", "proveedor", p.id, { numero: d.recordatorios + 1, enviado: envio.enviada });
    enviados++;
  }
  return { enviados, vencidas };
}
