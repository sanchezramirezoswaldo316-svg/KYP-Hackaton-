import { NextResponse } from "next/server";
import { listo } from "@/lib/demo.ts";
import { ErrorDocumento, solicitarDocumentos } from "@/lib/documentos.ts";
import { actorDe, manejarError } from "@/lib/http.ts";

// La gestora pide manualmente la opinión 32-D a un proveedor.
export async function POST(req: Request) {
  try {
    await listo();
    const { proveedor_id, caso_id } = (await req.json()) as { proveedor_id: string; caso_id?: string };
    const d = await solicitarDocumentos(proveedor_id, caso_id ?? null, actorDe(req));
    return NextResponse.json({ id: d.id, token: d.token, notificada: d.notificada }, { status: 201 });
  } catch (error) {
    if (error instanceof ErrorDocumento) return NextResponse.json({ error: error.message }, { status: 400 });
    return manejarError(error);
  }
}
