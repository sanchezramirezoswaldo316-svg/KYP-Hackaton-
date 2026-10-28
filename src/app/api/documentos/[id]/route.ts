import { NextResponse } from "next/server";
import { almacen } from "@/lib/almacen/index.ts";
import { listo } from "@/lib/demo.ts";

// Descarga del PDF que subió el proveedor (solo para la gestora: protegido por APP_PASSWORD si está activa).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await listo();
  const d = await almacen().documentos.obtener((await params).id);
  if (!d?.archivo_base64) return NextResponse.json({ error: "No existe" }, { status: 404 });
  return new NextResponse(Buffer.from(d.archivo_base64, "base64"), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${(d.archivo_nombre ?? "documento.pdf").replace(/[^\w.\- ]/g, "_")}"`,
      "X-Archivo-SHA256": d.archivo_sha256 ?? "",
    },
  });
}
