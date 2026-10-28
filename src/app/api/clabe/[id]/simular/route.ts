import { NextResponse } from "next/server";
import { almacen } from "@/lib/almacen/index.ts";
import { listo } from "@/lib/demo.ts";
import { pesos } from "@/lib/formato.ts";
import { manejarError } from "@/lib/http.ts";
import { registrarResultadoLlamada } from "@/lib/servicios.ts";
import type { ResultadoLlamada } from "@/lib/tipos.ts";
import { simulacionPermitida } from "@/lib/voz/elevenlabs.ts";

const RESULTADOS: ResultadoLlamada[] = ["confirmado", "no_reconoce", "datos_no_coinciden", "sin_respuesta"];

// Conversación de ejemplo con los datos del proveedor. Se guarda marcada como SIMULADA.
function conversacion(r: ResultadoLlamada, d: { empresa: string; proveedor: string; folio: string; monto: string; ultimos4: string }): string {
  const inicio = [
    `Agente: Hola, le llamo de ${d.empresa} para verificar una solicitud sobre los pagos a ${d.proveedor}. Esta llamada se graba por seguridad. ¿Hablo con el representante?`,
    "Proveedor: Sí, soy yo.",
    "Agente: Recibimos una solicitud para cambiar la cuenta donde le depositamos. ¿Usted la pidió?",
  ];
  switch (r) {
    case "confirmado":
      return [...inicio,
        "Proveedor: Sí, cambiamos de banco este mes.",
        "Agente: Gracias. Para confirmar, ¿me dice el folio de su última factura?",
        `Proveedor: Es la ${d.folio}.`,
        "Agente: ¿Y el monto aproximado?",
        `Proveedor: Alrededor de ${d.monto}.`,
        "Agente: Por último, ¿los últimos 4 dígitos de la cuenta anterior?",
        `Proveedor: ${d.ultimos4}.`,
        "Agente: Todo coincide. La solicitud queda confirmada. ¡Gracias!",
      ].join("\n");
    case "no_reconoce":
      return [...inicio,
        "Proveedor: ¿Cambiar la cuenta? No, nosotros no pedimos ningún cambio.",
        "Agente: Entendido. Bloquearemos esa solicitud y un analista se comunicará con usted.",
        "Proveedor: Gracias por avisar, alguien debe estar haciéndose pasar por nosotros.",
      ].join("\n");
    case "datos_no_coinciden":
      return [...inicio,
        "Proveedor: Sí, sí, fui yo.",
        "Agente: Para confirmar, ¿me dice el folio de su última factura?",
        "Proveedor: Eh… no lo tengo a la mano, creo que era la F-1000.",
        "Agente: ¿Y los últimos 4 dígitos de la cuenta anterior?",
        "Proveedor: No los recuerdo.",
        "Agente: Gracias. Un analista revisará la solicitud antes de hacer cualquier cambio.",
      ].join("\n");
    case "sin_respuesta":
      return "Agente: (Se marcó al teléfono registrado. Nadie contestó en esta simulación.)";
  }
}

// Solo disponible cuando ElevenLabs NO está configurado: permite mostrar el flujo sin llamada real.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!simulacionPermitida()) return NextResponse.json({ error: "La voz está configurada: usa una llamada real" }, { status: 409 });
  try {
    await listo();
    const body = await req.json().catch(() => null);
    const resultado = body?.resultado as ResultadoLlamada;
    if (!RESULTADOS.includes(resultado)) return NextResponse.json({ error: "Resultado inválido" }, { status: 400 });
    const db = almacen();
    const s = await db.solicitudes.obtener((await params).id);
    if (!s) return NextResponse.json({ error: "La solicitud no existe" }, { status: 404 });
    const p = (await db.proveedores.obtener(s.proveedor_id))!;
    const f = (await db.facturas.listar({ proveedor_id: p.id })).sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
    const transcripcion = conversacion(resultado, {
      empresa: process.env.EMPRESA_NOMBRE ?? "la empresa",
      proveedor: p.razon_social,
      folio: f?.folio ?? "F-0000",
      monto: f ? pesos(f.monto) : "$0",
      ultimos4: p.clabe?.slice(-4).split("").join(" ") ?? "0 0 0 0",
    });
    const llamada = await registrarResultadoLlamada({ solicitud_id: s.id, resultado, transcripcion, simulada: true });
    return NextResponse.json(llamada);
  } catch (error) {
    return manejarError(error);
  }
}
