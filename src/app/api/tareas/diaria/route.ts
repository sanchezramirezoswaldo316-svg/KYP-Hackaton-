// Tarea diaria: monitoreo de listas, recordatorios a proveedores y resumen.
// GET: la ejecuta Vercel Cron (requiere CRON_SECRET). POST: botón "Ejecutar ahora" de la app.
import { NextResponse } from "next/server";
import { listo } from "@/lib/demo.ts";
import { actorDe, manejarError } from "@/lib/http.ts";
import { tareaDiaria } from "@/lib/monitoreo.ts";

export const maxDuration = 60;

export async function GET(req: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || req.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    await listo();
    const r = await tareaDiaria("Tarea diaria (automática)");
    return NextResponse.json({ revisados: r.revisados, cambios: r.cambios, recordatorios: r.recordatorios, solicitudes_vencidas: r.solicitudes_vencidas, resumen_enviado: r.resumen_enviado });
  } catch (error) {
    return manejarError(error);
  }
}

export async function POST(req: Request) {
  try {
    await listo();
    return NextResponse.json(await tareaDiaria(`Tarea diaria (manual · ${actorDe(req)})`));
  } catch (error) {
    return manejarError(error);
  }
}
