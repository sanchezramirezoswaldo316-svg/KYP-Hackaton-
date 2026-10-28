// Lectura de CSV en el navegador (con soporte de comillas) y conversión a filas de alta.

import type { EntradaAlta } from "./servicios-tipos.ts";
import { clabeValida, rfcValido } from "./validacion.ts";

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
export const MAX_CSV_BYTES = 5 * 1024 * 1024;
export const MAX_CSV_FILAS = 5000;

interface FilaImportada {
  proveedor: EntradaAlta;
  celdas: string[];
  indiceTelefono: number;
}

export interface FilaValidada {
  numero: number;
  proveedor: EntradaAlta;
  errores: string[];
}

function leerFilas(texto: string): FilaImportada[] {
  const [encabezado, ...filas] = parseCsv(texto.replace(/^\uFEFF/, ""));
  const idx = (c: string) => encabezado.findIndex((h) => h.trim().toLowerCase() === c);
  const col = Object.fromEntries(COLUMNAS.map((c) => [c, idx(c)])) as Record<(typeof COLUMNAS)[number], number>;
  if (col.rfc < 0 || col.razon_social < 0) throw new Error("El CSV debe tener al menos las columnas rfc y razon_social");
  const v = (f: string[], c: (typeof COLUMNAS)[number]) => (col[c] >= 0 ? (f[col[c]] ?? "").trim() : "");
  return filas.map((f) => ({
    celdas: f,
    indiceTelefono: col.telefono_registrado,
    proveedor: {
      rfc: v(f, "rfc"),
      razon_social: v(f, "razon_social"),
      sitio_web: v(f, "sitio_web") || null,
      telefono_registrado: v(f, "telefono_registrado"),
      clabe: v(f, "clabe") || null,
      giro_declarado: v(f, "giro_declarado") || null,
      monto_anual: Number(v(f, "monto_anual")) || 0,
      factura_folio: v(f, "factura_folio") || null,
      factura_monto: Number(v(f, "factura_monto")) || null,
    },
  }));
}

export function filasAAltas(texto: string): EntradaAlta[] {
  return leerFilas(texto).map(({ proveedor }) => proveedor);
}

export function validarFilasCsv(texto: string): FilaValidada[] {
  const filas = leerFilas(texto);
  if (filas.length > MAX_CSV_FILAS) throw new Error(`El CSV supera el límite de ${MAX_CSV_FILAS} filas`);
  return filas.map(({ proveedor, celdas, indiceTelefono }, indice) => {
    const errores: string[] = [];
    const tieneFormula = celdas.some((celda, indiceCelda) => {
      if (!/^[=+\-@]/.test(celda.trimStart())) return false;
      return !(indiceCelda === indiceTelefono && /^\+\d{10,15}$/.test(celda.trim()));
    });
    if (tieneFormula) {
      errores.push("Se rechazó una celda que comienza con un prefijo de fórmula.");
    }
    if (!rfcValido(proveedor.rfc)) errores.push("RFC inválido.");
    if (!proveedor.razon_social.trim()) errores.push("Falta la razón social.");
    if (!proveedor.telefono_registrado.trim()) errores.push("Falta el teléfono registrado.");
    if (proveedor.clabe && !clabeValida(proveedor.clabe)) errores.push("CLABE inválida (debe tener 18 dígitos y verificador correcto).");
    return { numero: indice + 2, proveedor, errores };
  });
}
