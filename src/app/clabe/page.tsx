// Solicitudes de cambio de CLABE: pausa del pago + verificación por voz al teléfono registrado.
import Link from "next/link";
import { Etiqueta } from "@/components/Etiquetas";
import { Tarjeta } from "@/components/Tarjeta";
import { FormularioClabe } from "@/components/cliente/FormularioClabe";
import { SimularLlamada } from "@/components/cliente/SimularLlamada";
import { almacen } from "@/lib/almacen/index.ts";
import { listo } from "@/lib/demo.ts";
import { fecha } from "@/lib/formato.ts";
import { enmascararClabe } from "@/lib/validacion.ts";
import { vozConfigurada } from "@/lib/voz/elevenlabs.ts";

export const dynamic = "force-dynamic";

export default async function Clabe() {
  await listo();
  const db = almacen();
  const [proveedores, solicitudes, llamadas] = await Promise.all([db.proveedores.listar(), db.solicitudes.listar(), db.llamadas.listar()]);
  const porId = new Map(proveedores.map((p) => [p.id, p]));
  const simular = !vozConfigurada();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Cambios de CLABE</h1>
        <p className="text-sm text-slate-600">
          Cuando llega una solicitud de cambio de cuenta, el pago se pausa y el agente de voz llama al teléfono <strong>registrado en el alta</strong> para confirmar el folio, el monto y los últimos dígitos de la cuenta anterior.
        </p>
      </div>
      <Tarjeta titulo="Registrar solicitud recibida">
        <FormularioClabe proveedores={proveedores.filter((p) => p.estado !== "bloqueado").sort((a, b) => a.razon_social.localeCompare(b.razon_social)).map(({ id, razon_social, rfc }) => ({ id, razon_social, rfc }))} />
      </Tarjeta>
      <Tarjeta titulo="Solicitudes">
        {solicitudes.length === 0 ? <p className="text-sm text-slate-600">Aún no hay solicitudes.</p> : (
          <ul className="divide-y divide-slate-100">
            {solicitudes.sort((a, b) => b.creado_en.localeCompare(a.creado_en)).map((s) => {
              const p = porId.get(s.proveedor_id);
              const ll = llamadas.filter((l) => l.solicitud_id === s.id);
              return (
                <li key={s.id} className="space-y-1 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/expediente/${s.proveedor_id}`} className="font-medium text-blue-800 hover:underline">{p?.razon_social}</Link>
                    <span className="font-mono text-xs">{enmascararClabe(s.clabe_nueva)}</span>
                    <Etiqueta tono={s.estado === "verificada" ? "verde" : s.estado === "rechazada" ? "rojo" : "ambar"}>{s.estado.replace("_", " ")}</Etiqueta>
                    <span className="text-xs text-slate-500">{fecha(s.creado_en)}</span>
                  </div>
                  {ll.map((l) => <p key={l.id} className="text-slate-700">Llamada: <strong>{l.resultado.replaceAll("_", " ")}</strong>{l.simulada && " (simulada)"}</p>)}
                  {simular && ll.length === 0 && (s.estado === "pausada" || s.estado === "en_llamada") && <SimularLlamada solicitudId={s.id} />}
                </li>
              );
            })}
          </ul>
        )}
      </Tarjeta>
    </div>
  );
}
