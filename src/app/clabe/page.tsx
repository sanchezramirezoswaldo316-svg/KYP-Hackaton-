// Cambios de cuenta bancaria: pago congelado + llamada al teléfono registrado.
import Link from "next/link";
import { LineaTiempoClabe } from "@/components/LineaTiempoClabe";
import { Tarjeta } from "@/components/Tarjeta";
import { Termino } from "@/components/Termino";
import { AutoRefrescar } from "@/components/cliente/AutoRefrescar";
import { FormularioClabe } from "@/components/cliente/FormularioClabe";
import { almacen } from "@/lib/almacen/index.ts";
import { listo } from "@/lib/demo.ts";
import { vozConfigurada } from "@/lib/voz/elevenlabs.ts";

export const dynamic = "force-dynamic";

export default async function Clabe({ searchParams }: { searchParams: Promise<{ proveedor?: string }> }) {
  await listo();
  const { proveedor } = await searchParams;
  const db = almacen();
  const [proveedores, solicitudes, llamadas, facturas] = await Promise.all([db.proveedores.listar(), db.solicitudes.listar(), db.llamadas.listar(), db.facturas.listar()]);
  const porId = new Map(proveedores.map((p) => [p.id, p]));
  const simular = !vozConfigurada();
  const enLlamada = solicitudes.some((s) => s.estado === "en_llamada" && !llamadas.some((l) => l.solicitud_id === s.id));

  return (
    <div className="space-y-5">
      <AutoRefrescar activo={enLlamada} />
      <div>
        <h1 className="text-2xl font-semibold">Cambios de cuenta bancaria</h1>
        <p className="text-tinta-3">
          Un fraude común: alguien se hace pasar por un proveedor y pide cambiar su <Termino t="CLABE" /> para quedarse con el pago.
          Cuando llega una solicitud, <strong>el pago se congela</strong> y nuestro agente de voz <strong>llama al teléfono que el proveedor registró desde el principio</strong>, nunca al número que viene en la solicitud.
        </p>
      </div>
      <Tarjeta titulo="Registrar una solicitud recibida">
        <div data-tour="form-clabe">
          <FormularioClabe
            seleccionado={proveedor}
            proveedores={proveedores.filter((p) => p.estado !== "bloqueado").sort((a, b) => a.razon_social.localeCompare(b.razon_social)).map(({ id, razon_social, rfc }) => ({ id, razon_social, rfc }))}
          />
        </div>
      </Tarjeta>
      {solicitudes.length === 0 ? (
        <p className="text-sm text-tinta-3">Aún no hay solicitudes.</p>
      ) : (
        solicitudes.sort((a, b) => b.creado_en.localeCompare(a.creado_en)).map((s) => {
          const p = porId.get(s.proveedor_id);
          const f = facturas.filter((x) => x.proveedor_id === s.proveedor_id).sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
          return (
            <Tarjeta key={s.id} titulo={p?.razon_social} acciones={<div className="flex gap-3"><Link href={`/clabe/${s.id}`} className="text-sm text-tinta underline">Monitor de llamada</Link><Link href={`/expediente/${s.proveedor_id}`} className="text-sm text-tinta underline">Ver expediente</Link></div>}>
              <LineaTiempoClabe s={s} llamada={llamadas.find((l) => l.solicitud_id === s.id)} monto={f?.monto ?? null} simular={simular} />
            </Tarjeta>
          );
        })
      )}
    </div>
  );
}
