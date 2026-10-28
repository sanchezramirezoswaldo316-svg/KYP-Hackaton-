import { NextResponse } from "next/server";
import { listo } from "@/lib/demo.ts";
import { manejarError } from "@/lib/http.ts";
import { registrarResultadoLlamada } from "@/lib/servicios.ts";
import type { ResultadoLlamada } from "@/lib/tipos.ts";
import { vozConfigurada } from "@/lib/voz/elevenlabs.ts";

const TRANSCRIPCION: Record<ResultadoLlamada, string> = {
  confirmado: "[SIMULACIÓN] El proveedor confirmó la solicitud, el folio, el monto y los últimos 4 dígitos de la cuenta anterior.",
  no_reconoce: "[SIMULACIÓN] El proveedor indicó que NO solicitó ningún cambio de cuenta.",
  datos_no_coinciden: "[SIMULACIÓN] El proveedor no pudo confirmar el folio ni el monto de su última factura.",
  sin_respuesta: "[SIMULACIÓN] Nadie contestó en el teléfono registrado.",
};

// Solo disponible cuando ElevenLabs NO está configurado: permite mostrar el flujo sin llamada real.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (vozConfigurada()) return NextResponse.json({ error: "La voz está configurada: usa una llamada real" }, { status: 409 });
  try {
    await listo();
    const { resultado } = (await req.json()) as { resultado: ResultadoLlamada };
    if (!(resultado in TRANSCRIPCION)) return NextResponse.json({ error: "Resultado inválido" }, { status: 400 });
    const llamada = await registrarResultadoLlamada({ solicitud_id: (await params).id, resultado, transcripcion: TRANSCRIPCION[resultado], simulada: true });
    return NextResponse.json(llamada);
  } catch (error) {
    return manejarError(error);
  }
}
