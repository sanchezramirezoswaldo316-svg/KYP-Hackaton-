// Protección opcional con contraseña (APP_PASSWORD). Los webhooks quedan fuera: se autentican con su propio secreto.
import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const clave = process.env.APP_PASSWORD;
  // Con telefonía real, fallar cerrado si olvidaron proteger el despliegue.
  if (!clave && (process.env.ELEVENLABS_PHONE_NUMBER_ID || process.env.SUPABASE_SERVICE_ROLE_KEY) && !req.nextUrl.pathname.startsWith("/api/webhooks/")) {
    return new NextResponse("Servicio temporalmente no disponible. Falta configurar el acceso seguro.", { status: 503 });
  }
  if (req.nextUrl.pathname.startsWith("/api/webhooks/")) return NextResponse.next();
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.headers.get("origin");
    if (req.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== req.nextUrl.origin)) {
      return NextResponse.json({ error: "Origen de la solicitud no permitido" }, { status: 403 });
    }
  }
  if (!clave) return NextResponse.next();
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    try {
      const pass = atob(auth.slice(6)).split(":").slice(1).join(":");
      if (pass === clave) return NextResponse.next();
    } catch { /* Credenciales malformadas: responder 401, no 500. */ }
  }
  return new NextResponse("Acceso restringido", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="KYP"' } });
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
