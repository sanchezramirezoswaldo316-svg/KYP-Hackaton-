// Datos de prueba para construir las pantallas sin depender de Supabase ni de n8n.
// Los RFC son ficticios. Ulises reemplazará estos datos por los de la demo.

import type { Caso, Llamada, Proveedor, Verificacion } from "../tipos.ts";
import { calcularPuntaje } from "../puntaje/reglas.ts";

export const proveedores: Proveedor[] = [
  { id: "p1", rfc: "LIM010101AAA", razon_social: "Harinas Limpias SA de CV", sitio_web: "https://example.com", telefono_registrado: "+525500000001", clabe: "002180000000000001", giro_declarado: "Harina de trigo", monto_anual: 4_200_000 },
  { id: "p2", rfc: "PRE020202BBB", razon_social: "Servicios Presuntos SA de CV", sitio_web: "https://example.org", telefono_registrado: "+525500000002", clabe: "012180000000000002", giro_declarado: "Consultoría administrativa", monto_anual: 8_900_000 },
  { id: "p3", rfc: "HOM030303CCC", razon_social: "Transportes Homónimo SA de CV", sitio_web: null, telefono_registrado: "+525500000003", clabe: "014180000000000003", giro_declarado: "Flete terrestre", monto_anual: 2_100_000 },
  { id: "p4", rfc: "DEF040404DDD", razon_social: "Comercializadora Definitiva SA de CV", sitio_web: "https://example.net", telefono_registrado: "+525500000004", clabe: "021180000000000004", giro_declarado: "Material de empaque", monto_anual: 12_500_000 },
];

const hallazgosPorProveedor: Record<string, Verificacion["hallazgos"]> = {
  p1: [
    { fuente: "sat_69b", resultado: "sin_coincidencia", detalle: "No aparece en el listado 69-B", fecha_fuente: "2026-10-01" },
    { fuente: "ofac", resultado: "sin_coincidencia", detalle: "Sin coincidencias en SDN", fecha_fuente: "2026-10-20" },
    { fuente: "web", resultado: "giro_coincide", detalle: "La página describe venta de harinas", fecha_fuente: null },
  ],
  p2: [
    { fuente: "sat_69b", resultado: "presunto", detalle: "Publicado como presunto en el DOF", fecha_fuente: "2026-05-12" },
    { fuente: "ofac", resultado: "sin_coincidencia", detalle: "Sin coincidencias en SDN", fecha_fuente: "2026-10-20" },
    { fuente: "web", resultado: "giro_coincide", detalle: "Página de consultoría genérica", fecha_fuente: null },
  ],
  p3: [
    { fuente: "sat_69b", resultado: "sin_coincidencia", detalle: "No aparece en el listado 69-B", fecha_fuente: "2026-10-01" },
    { fuente: "ofac", resultado: "coincidencia_parecida", detalle: "Nombre similar a una entidad en SDN (posible homónimo)", fecha_fuente: "2026-10-20" },
    { fuente: "web", resultado: "sin_sitio", detalle: "No tiene página web", fecha_fuente: null },
  ],
  p4: [
    { fuente: "sat_69b", resultado: "definitivo", detalle: "Publicado como definitivo en el DOF", fecha_fuente: "2026-03-03" },
    { fuente: "web", resultado: "giro_no_coincide", detalle: "La página vende llantas, factura empaque", fecha_fuente: null },
  ],
};

export const verificaciones: Verificacion[] = proveedores.map((p) => {
  const hallazgos = hallazgosPorProveedor[p.id];
  return {
    id: `v-${p.id}`,
    proveedor_id: p.id,
    fecha: "2026-10-28T10:00:00Z",
    hallazgos,
    resumen_ia: null,
    ...calcularPuntaje(hallazgos),
  };
});

export const casos: Caso[] = verificaciones
  .filter((v) => v.decision !== "liberar")
  .map((v) => {
    const p = proveedores.find((x) => x.id === v.proveedor_id)!;
    return {
      id: `c-${p.id}`,
      proveedor_id: p.id,
      tipo: "alta" as const,
      prioridad: v.puntaje * p.monto_anual,
      estado: "pendiente" as const,
      decidido_por: null,
      decidido_en: null,
    };
  })
  .sort((a, b) => b.prioridad - a.prioridad);

export const llamadas: Llamada[] = [];
