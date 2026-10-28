// Protección opcional con contraseña (APP_PASSWORD). Los webhooks quedan fuera: se autentican con su propio secreto.
import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const clave = process.env.APP_PASSWORD;
  if (!clave || req.nextUrl.pathname.startsWith("/api/webhooks/")) return NextResponse.next();
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    const [, pass] = atob(auth.slice(6)).split(":");
    if (pass === clave) return NextResponse.next();
  }
  return new NextResponse("Acceso restringido", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="KYP"' } });
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
