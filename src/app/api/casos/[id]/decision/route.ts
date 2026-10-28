import { NextResponse } from "next/server";
import type { EstadoCaso } from "@/lib/tipos.ts";

const ESTADOS: EstadoCaso[] = ["aprobado", "pausado", "bloqueado"];

// Decisión en un clic del gestor.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { estado, motivo } = (await req.json()) as { estado: EstadoCaso; motivo?: string };
  if (!ESTADOS.includes(estado)) {
    return NextResponse.json({ error: "estado inválido" }, { status: 400 });
  }
  // TODO(Oswaldo): actualizar `casos`, registrar en `bitacora` y notificar al ERP simulado.
  return NextResponse.json({ id, estado, motivo: motivo ?? null });
}
