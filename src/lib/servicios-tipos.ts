// Tipos de entrada compartidos entre el servidor y el navegador (sin dependencias de servidor).
import type { NuevoProveedor } from "./tipos.ts";

export interface EntradaAlta extends NuevoProveedor {
  factura_folio?: string | null;
  factura_monto?: number | null;
  // Fecha de pago de la factura (AAAA-MM-DD). Si no viene, el ERP simulado asigna una.
  factura_vence?: string | null;
}
