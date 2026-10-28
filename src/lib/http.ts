import { NextResponse } from "next/server";
import { ErrorValidacion } from "./servicios.ts";

// Nombre de quien actúa: el usuario de la autenticación básica, si está activa.
export function actorDe(req: Request): string {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    const usuario = atob(auth.slice(6)).split(":")[0];
    if (usuario) return usuario;
  }
  return "Gestor";
}

export function secretoValido(req: Request): boolean {
  const secreto = process.env.WEBHOOK_SECRET;
  return !!secreto && req.headers.get("x-kyp-secret") === secreto;
}

export function manejarError(error: unknown) {
  if (error instanceof ErrorValidacion) return NextResponse.json({ error: error.message }, { status: 400 });
  console.error(error);
  return NextResponse.json({ error: "Error interno" }, { status: 500 });
}
