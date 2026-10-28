// Lectura de CSV en el navegador (con soporte de comillas) y conversión a filas de alta.

import type { EntradaAlta } from "./servicios-tipos.ts";

export function parseCsv(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [], campo = "", comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === ",") { fila.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      fila.push(campo); filas.push(fila); fila = []; campo = "";
    } else campo += c;
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  return filas.filter((f) => f.some((x) => x.trim()));
}

export const COLUMNAS = ["rfc", "razon_social", "sitio_web", "telefono_registrado", "clabe", "giro_declarado", "monto_anual", "factura_folio", "factura_monto"] as const;

export function filasAAltas(texto: string): EntradaAlta[] {
  const [encabezado, ...filas] = parseCsv(texto.replace(/^﻿/, ""));
  const idx = (c: string) => encabezado.findIndex((h) => h.trim().toLowerCase() === c);
  const col = Object.fromEntries(COLUMNAS.map((c) => [c, idx(c)])) as Record<(typeof COLUMNAS)[number], number>;
  if (col.rfc < 0 || col.razon_social < 0) throw new Error("El CSV debe tener al menos las columnas rfc y razon_social");
  const v = (f: string[], c: (typeof COLUMNAS)[number]) => (col[c] >= 0 ? (f[col[c]] ?? "").trim() : "");
  return filas.map((f) => ({
    rfc: v(f, "rfc"),
    razon_social: v(f, "razon_social"),
    sitio_web: v(f, "sitio_web") || null,
    telefono_registrado: v(f, "telefono_registrado"),
    clabe: v(f, "clabe") || null,
    giro_declarado: v(f, "giro_declarado") || null,
    monto_anual: Number(v(f, "monto_anual")) || 0,
    factura_folio: v(f, "factura_folio") || null,
    factura_monto: Number(v(f, "factura_monto")) || null,
  }));
}
