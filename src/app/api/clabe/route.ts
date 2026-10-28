import { z } from "zod";
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
    const parsed = z.object({ proveedor_id: z.string().uuid(), clabe_nueva: z.string().trim().regex(/^\d{18}$/), telefono_en_solicitud: z.string().max(50).optional() }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Revisa el proveedor, la CLABE de 18 dígitos y el teléfono de la solicitud" }, { status: 400 });
    const { proveedor_id, clabe_nueva, telefono_en_solicitud } = parsed.data;
    return NextResponse.json(await solicitarCambioClabe(proveedor_id, clabe_nueva?.trim() ?? "", telefono_en_solicitud ?? null, actorDe(req)), { status: 201 });
  } catch (error) {
    return manejarError(error);
  }
}
