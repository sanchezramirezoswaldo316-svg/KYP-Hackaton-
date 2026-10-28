// Protección opcional con contraseña (APP_PASSWORD) para todo lo interno.
import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const clave = process.env.APP_PASSWORD;
  const ruta = req.nextUrl.pathname;
  // Sin contraseña de la app: webhooks (su propio secreto), portal del proveedor (enlace único) y la tarea de Vercel Cron (CRON_SECRET).
  const publica = ruta.startsWith("/api/webhooks/") || ruta.startsWith("/portal/") || ruta.startsWith("/api/portal/") || (ruta === "/api/tareas/diaria" && req.method === "GET");
  if (!clave || publica) return NextResponse.next();
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    const [, pass] = atob(auth.slice(6)).split(":");
    if (pass === clave) return NextResponse.next();
  }
  return new NextResponse("Acceso restringido", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="KYP"' } });
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
