import { NextResponse } from "next/server";
import { listo } from "@/lib/demo.ts";
import { actorDe, manejarError } from "@/lib/http.ts";
import { decidirCaso } from "@/lib/servicios.ts";

const ESTADOS = ["aprobado", "pausado", "bloqueado"] as const;

// Decisión en un clic del gestor.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await listo();
    const { estado, comentario } = (await req.json()) as { estado: (typeof ESTADOS)[number]; comentario?: string };
    if (!ESTADOS.includes(estado)) return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    return NextResponse.json(await decidirCaso((await params).id, estado, actorDe(req), comentario?.trim() || null));
  } catch (error) {
    return manejarError(error);
  }
}
