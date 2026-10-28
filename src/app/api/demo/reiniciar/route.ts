import { NextResponse } from "next/server";
import { almacen, reiniciarAlmacenMemoria } from "@/lib/almacen/index.ts";
import { listo, olvidarSemilla } from "@/lib/demo.ts";

// Solo en modo memoria: borra todo y vuelve a cargar los datos de ejemplo.
export async function POST() {
  if (almacen().modo !== "memoria") return NextResponse.json({ error: "Solo disponible en modo demo" }, { status: 409 });
  reiniciarAlmacenMemoria();
  olvidarSemilla();
  await listo();
  return NextResponse.json({ ok: true });
}
