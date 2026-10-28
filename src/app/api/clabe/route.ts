import { NextResponse } from "next/server";
import { almacen } from "@/lib/almacen/index.ts";
import { listo } from "@/lib/demo.ts";
import { actorDe, manejarError } from "@/lib/http.ts";
import { solicitarCambioClabe } from "@/lib/servicios.ts";

export async function GET() {
  await listo();
  return NextResponse.json(await almacen().solicitudes.listar());
}

// Registra una solicitud de cambio de CLABE: pausa el pago y dispara la llamada al teléfono registrado.
export async function POST(req: Request) {
  try {
    await listo();
    const { proveedor_id, clabe_nueva, telefono_en_solicitud } = (await req.json()) as { proveedor_id: string; clabe_nueva: string; telefono_en_solicitud?: string };
    return NextResponse.json(await solicitarCambioClabe(proveedor_id, clabe_nueva?.trim() ?? "", telefono_en_solicitud ?? null, actorDe(req)), { status: 201 });
  } catch (error) {
    return manejarError(error);
  }
}
