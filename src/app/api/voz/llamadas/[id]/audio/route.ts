import { almacen } from "@/lib/almacen/index.ts";
import { obtenerAudio } from "@/lib/voz/audio.ts";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Exige autenticación aun cuando el resto de la demo sea pública.
  const clave = process.env.APP_PASSWORD;
  let pass = "";
  try { pass = atob((req.headers.get("authorization") ?? "").replace(/^Basic /, "")).split(":").slice(1).join(":"); } catch {}
  if (!req.headers.get("authorization")?.startsWith("Basic ") || !clave || pass !== clave) return new Response("No autorizado", { status: 401 });
  try {
  const llamada = await almacen().llamadas.obtener((await params).id);
  if (!llamada || llamada.simulada || !llamada.conversation_id) return new Response("Sin audio de llamada real", { status: 404 });
  return obtenerAudio(llamada.conversation_id);
  } catch { return new Response("No se pudo consultar la grabación. Intenta más tarde.", { status: 503 }); }
}
