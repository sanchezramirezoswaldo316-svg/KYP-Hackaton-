// Bandeja de excepciones (Samuel).
import Link from "next/link";
import { EtiquetaDecision } from "@/components/Decision";
import { casos, proveedores, verificaciones } from "@/lib/datos-prueba/index.ts";

export default function Bandeja() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Bandeja de excepciones</h1>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="p-3">Proveedor</th>
              <th className="p-3">RFC</th>
              <th className="p-3">Puntaje</th>
              <th className="p-3">Decisión sugerida</th>
            </tr>
          </thead>
          <tbody>
            {casos.map((c) => {
              const p = proveedores.find((x) => x.id === c.proveedor_id)!;
              const v = verificaciones.find((x) => x.proveedor_id === c.proveedor_id)!;
              return (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="p-3">
                    <Link href={`/expediente/${p.id}`} className="text-blue-700 hover:underline">
                      {p.razon_social}
                    </Link>
                  </td>
                  <td className="p-3 font-mono">{p.rfc}</td>
                  <td className="p-3">{v.puntaje}</td>
                  <td className="p-3"><EtiquetaDecision decision={v.decision} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
