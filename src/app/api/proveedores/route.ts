// Oswaldo: cambiar datos de prueba por Supabase cuando esté configurado.
import { NextResponse } from "next/server";
import { proveedores } from "@/lib/datos-prueba/index.ts";

export async function GET() {
  return NextResponse.json(proveedores);
}

// Alta de proveedor: guarda y dispara el flujo de n8n (Alan).
export async function POST(req: Request) {
  const body = await req.json();
  // TODO(Oswaldo): validar e insertar en `proveedores`.
  const url = process.env.N8N_WEBHOOK_ALTA_URL;
  if (url) {
    await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  }
  return NextResponse.json({ ok: true, enviado_a_n8n: !!url }, { status: 202 });
}
