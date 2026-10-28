// Verificación en tiempo real: transmite cada consulta y cada dato extraído como una línea JSON (NDJSON).
import { readFileSync } from "node:fs";
import path from "node:path";
import { almacen } from "@/lib/almacen/index.ts";
import { listo } from "@/lib/demo.ts";
import { actorDe } from "@/lib/http.ts";
import { altaProveedor, verificar, type EntradaAlta } from "@/lib/servicios.ts";
import { revisar69B, revisarOfac } from "@/lib/verificacion/listas.ts";

export const maxDuration = 60;

type Ejemplo = "peligro" | "sospecha" | "homonimo" | "confiable";

// Elige un proveedor de la semilla de demo según el tipo de caso (funciona aunque la memoria se haya reiniciado).
function proveedorEjemplo(tipo: Ejemplo): EntradaAlta | null {
  const semilla = JSON.parse(readFileSync(path.join(process.cwd(), "src", "data", "demo-semilla.json"), "utf8")) as EntradaAlta[];
  return semilla.find((p) => {
    const b = revisar69B(p.rfc).resultado;
    if (tipo === "peligro") return b === "definitivo";
    if (tipo === "sospecha") return b === "presunto";
    if (tipo === "homonimo") return revisarOfac(p.razon_social).resultado === "coincidencia_parecida";
    return b === "sin_coincidencia" && revisarOfac(p.razon_social).resultado === "sin_coincidencia" && !p.razon_social.startsWith("Contribuyente");
  }) ?? null;
}

export async function POST(req: Request) {
  await listo();
  const { proveedor_id, ejemplo } = (await req.json()) as { proveedor_id?: string; ejemplo?: Ejemplo };
  const actor = actorDe(req);

  const flujo = new ReadableStream<Uint8Array>({
    async start(control) {
      const codificador = new TextEncoder();
      const enviar = (obj: unknown) => control.enqueue(codificador.encode(JSON.stringify(obj) + "\n"));
      try {
        if (proveedor_id) {
          const p = await almacen().proveedores.obtener(proveedor_id);
          if (!p) throw new Error("El proveedor no existe");
          enviar({ tipo: "inicio", proveedor: p });
          const r = await verificar(p, actor, true, [], enviar);
          enviar({ tipo: "fin", proveedor: r.proveedor, verificacion: r.verificacion });
        } else {
          const entrada = ejemplo ? proveedorEjemplo(ejemplo) : null;
          if (!entrada) throw new Error("Ejemplo no disponible");
          enviar({ tipo: "inicio", proveedor: { ...entrada, id: null } });
          const r = await altaProveedor(entrada, actor, true, enviar);
          enviar({ tipo: "fin", proveedor: r.proveedor, verificacion: r.verificacion });
        }
      } catch (error) {
        enviar({ tipo: "error", mensaje: (error as Error).message });
      } finally {
        control.close();
      }
    },
  });

  return new Response(flujo, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}
