// Genera el expediente en PDF con pdf-lib (funciona en funciones serverless, sin navegador).

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Expediente } from "./expediente.ts";
import { enmascararClabe } from "./validacion.ts";

const ANCHO = 612, ALTO = 792, MARGEN = 50;
const AZUL = rgb(0.09, 0.2, 0.44), GRIS = rgb(0.35, 0.39, 0.45), NEGRO = rgb(0.1, 0.12, 0.17);

// Las fuentes estándar usan WinAnsi: se reemplazan los caracteres que no puede representar.
function limpiar(s: string): string {
  return s
    .replace(/[•·]/g, "-").replace(/[→⟶]/g, "->").replace(/×/g, "x").replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/≥/g, ">=").replace(/≤/g, "<=")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "");
}

class Escritor {
  page!: PDFPage;
  y = 0;
  constructor(private doc: PDFDocument, private normal: PDFFont, private negrita: PDFFont) {
    this.nuevaPagina();
  }
  nuevaPagina() {
    this.page = this.doc.addPage([ANCHO, ALTO]);
    this.y = ALTO - MARGEN;
  }
  espacio(alto: number) {
    if (this.y - alto < MARGEN) this.nuevaPagina();
  }
  texto(t: string, { tam = 10, fuente = this.normal, color = NEGRO, sangria = 0 } = {}) {
    const ancho = ANCHO - 2 * MARGEN - sangria;
    for (const parrafo of limpiar(t).split("\n")) {
      let linea = "";
      for (const palabra of parrafo.split(" ")) {
        const prueba = linea ? `${linea} ${palabra}` : palabra;
        if (fuente.widthOfTextAtSize(prueba, tam) > ancho && linea) {
          this.linea(linea, tam, fuente, color, sangria);
          linea = palabra;
        } else linea = prueba;
      }
      this.linea(linea, tam, fuente, color, sangria);
    }
  }
  private linea(t: string, tam: number, fuente: PDFFont, color: ReturnType<typeof rgb>, sangria: number) {
    this.espacio(tam + 4);
    this.page.drawText(t, { x: MARGEN + sangria, y: this.y - tam, size: tam, font: fuente, color });
    this.y -= tam + 4;
  }
  titulo(t: string) {
    this.espacio(30);
    this.y -= 8;
    this.texto(t, { tam: 13, fuente: this.negrita, color: AZUL });
    this.page.drawLine({ start: { x: MARGEN, y: this.y }, end: { x: ANCHO - MARGEN, y: this.y }, thickness: 0.7, color: AZUL });
    this.y -= 6;
  }
}

export async function generarPdf(e: Expediente, huella: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Expediente KYP ${e.proveedor.rfc}`);
  doc.setSubject(`SHA-256 de la evidencia: ${huella}`);
  const w = new Escritor(doc, await doc.embedFont(StandardFonts.Helvetica), await doc.embedFont(StandardFonts.HelveticaBold));
  const negrita = await doc.embedFont(StandardFonts.HelveticaBold);
  const p = e.proveedor;
  const v = e.verificaciones[0];

  w.texto("Expediente de verificación de proveedor", { tam: 18, fuente: negrita, color: AZUL });
  w.texto(`Generado: ${new Date().toISOString().replace("T", " ").slice(0, 19)} UTC · Plataforma KYP`, { tam: 9, color: GRIS });

  w.titulo("Proveedor");
  w.texto(`${p.razon_social}`, { fuente: negrita, tam: 11 });
  w.texto(`RFC: ${p.rfc}    Estado actual: ${p.estado}`);
  w.texto(`Giro declarado: ${p.giro_declarado ?? "-"}    Página web: ${p.sitio_web ?? "-"}`);
  w.texto(`Monto anual: $${p.monto_anual.toLocaleString("es-MX")} MXN    CLABE: ${enmascararClabe(p.clabe)}`);

  if (v) {
    w.titulo("Resultado de la verificación más reciente");
    w.texto(`Fecha: ${v.fecha.replace("T", " ").slice(0, 19)} UTC    Puntaje: ${v.puntaje}    Decisión sugerida: ${v.decision}${v.bloqueo_directo ? " (bloqueo directo)" : ""}`);
    w.texto(`Resumen (${v.resumen_origen === "ia" ? "redactado por IA" : "generado por reglas"}): ${v.resumen}`);
    w.texto("Motivos del puntaje:", { fuente: negrita });
    if (v.motivos.length === 0) w.texto("- Sin motivos de riesgo", { sangria: 10 });
    for (const m of v.motivos) w.texto(`- +${m.puntos}  ${m.descripcion}`, { sangria: 10 });
    w.texto("Evidencia por fuente:", { fuente: negrita });
    for (const h of v.hallazgos) {
      w.texto(`- [${h.fuente}] ${h.resultado}: ${h.detalle}${h.fecha_fuente ? ` (fecha de la fuente: ${h.fecha_fuente})` : ""}${h.evidencia_url ? ` · ${h.evidencia_url}` : ""}`, { sangria: 10 });
    }
  }

  w.titulo("Casos y decisiones");
  if (e.casos.length === 0) w.texto("Sin casos: el proveedor se liberó automáticamente.");
  for (const c of e.casos) {
    w.texto(`- ${c.tipo === "clabe" ? "Cambio de CLABE" : "Alta"} · ${c.estado} · sugerido: ${c.decision_sugerida} · ${c.motivo}`, { sangria: 10 });
    if (c.decidido_por) w.texto(`  Decidió: ${c.decidido_por} el ${c.decidido_en?.slice(0, 19).replace("T", " ")}${c.comentario ? ` · "${c.comentario}"` : ""}`, { sangria: 20, color: GRIS });
  }

  if (e.solicitudes.length) {
    w.titulo("Solicitudes de cambio de CLABE y llamadas de verificación");
    for (const s of e.solicitudes) {
      w.texto(`- ${s.creado_en.slice(0, 19).replace("T", " ")} · nueva CLABE ${enmascararClabe(s.clabe_nueva)} · ${s.estado}`, { sangria: 10 });
      for (const l of e.llamadas.filter((x) => x.solicitud_id === s.id)) {
        w.texto(`  Llamada${l.simulada ? " SIMULADA (demo)" : ""}: ${l.resultado}${l.resumen ? ` · ${l.resumen}` : ""}`, { sangria: 20 });
        if (l.transcripcion) w.texto(l.transcripcion, { sangria: 30, tam: 8, color: GRIS });
      }
    }
  }

  w.titulo("Bitácora");
  for (const b of e.bitacora.slice(0, 40)) {
    w.texto(`${b.creado_en.slice(0, 19).replace("T", " ")} · ${b.actor} · ${b.accion}`, { tam: 8, color: GRIS });
  }

  w.titulo("Integridad");
  w.texto(`Huella SHA-256 de la evidencia de este expediente:`);
  w.texto(huella, { fuente: negrita, tam: 9 });
  w.texto("Este documento fortalece la evidencia de materialidad de las operaciones con el proveedor. No sustituye la firma electrónica avanzada (e.firma) ni la constancia de conservación NOM-151, previstas para la fase Enterprise.", { tam: 8, color: GRIS });

  return doc.save();
}
