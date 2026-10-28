import { NextResponse } from "next/server";
import { almacen } from "@/lib/almacen/index.ts";
import { listo } from "@/lib/demo.ts";
import { cargarExpediente, huellaEvidencia } from "@/lib/expediente.ts";
import { actorDe } from "@/lib/http.ts";
import { generarPdf } from "@/lib/pdf.ts";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await listo();
  const e = await cargarExpediente((await params).id);
  if (!e) return NextResponse.json({ error: "No existe" }, { status: 404 });
  const huella = huellaEvidencia(e);
  const pdf = await generarPdf(e, huella);
  await almacen().bitacora.crear({ actor: actorDe(req), accion: "pdf_generado", entidad: "proveedor", entidad_id: e.proveedor.id, detalle: { sha256: huella }, creado_en: new Date().toISOString() });
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="expediente-${e.proveedor.rfc}.pdf"`,
      "X-Evidencia-SHA256": huella,
    },
  });
}
