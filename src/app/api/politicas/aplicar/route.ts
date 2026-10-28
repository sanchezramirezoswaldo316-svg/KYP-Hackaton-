import { NextResponse } from "next/server";
import { listo } from "@/lib/demo.ts";
import { actorDe, manejarError } from "@/lib/http.ts";
import { aplicarPoliticasAPendientes } from "@/lib/servicios.ts";

export const maxDuration = 60;

// Aplica las políticas activas a los casos que ya estaban en la bandeja.
export async function POST(req: Request) {
  try {
    await listo();
    return NextResponse.json(await aplicarPoliticasAPendientes(actorDe(req)));
  } catch (error) {
    return manejarError(error);
  }
}
