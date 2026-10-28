// El proveedor sube su documento desde el portal (enlace único, sin contraseña de la app).
import { NextResponse } from "next/server";
import { listo } from "@/lib/demo.ts";
import { ErrorDocumento, MAX_PDF_BYTES, recibirDocumento } from "@/lib/documentos.ts";

export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  await listo();
  const largo = Number(req.headers.get("content-length") ?? 0);
  if (largo > MAX_PDF_BYTES + 100_000) return NextResponse.json({ error: "El archivo debe pesar máximo 5 MB" }, { status: 413 });
  try {
    const form = await req.formData();
    const archivo = form.get("archivo");
    if (!(archivo instanceof File)) return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
    const d = await recibirDocumento((await params).token, archivo.name, new Uint8Array(await archivo.arrayBuffer()));
    return NextResponse.json({ estado: d.estado, analisis: d.analisis ? { es_opinion_32d: d.analisis.es_opinion_32d, sentido: d.analisis.sentido } : null });
  } catch (error) {
    if (error instanceof ErrorDocumento) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: "No se pudo recibir el archivo" }, { status: 500 });
  }
}
