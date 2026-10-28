import { NextResponse } from "next/server";
import { listo } from "@/lib/demo.ts";
import { actorDe } from "@/lib/http.ts";
import { altaProveedor, type EntradaAlta } from "@/lib/servicios.ts";

export const maxDuration = 60;
const MAXIMO = 50;

// Carga masiva por bloques. El cliente envía hasta 50 filas por petición.
export async function POST(req: Request) {
  await listo();
  const { proveedores, fuentesExternas = false } = (await req.json()) as { proveedores: EntradaAlta[]; fuentesExternas?: boolean };
  if (!Array.isArray(proveedores) || proveedores.length > MAXIMO) {
    return NextResponse.json({ error: `Envía entre 1 y ${MAXIMO} proveedores por petición` }, { status: 400 });
  }
  const actor = actorDe(req);
  const resultados = [];
  for (const p of proveedores) {
    try {
      const r = await altaProveedor(p, actor, fuentesExternas);
      resultados.push({ rfc: r.proveedor.rfc, ok: true, decision: r.verificacion.decision, puntaje: r.verificacion.puntaje });
    } catch (error) {
      resultados.push({ rfc: p.rfc, ok: false, error: (error as Error).message });
    }
  }
  return NextResponse.json({ resultados });
}
