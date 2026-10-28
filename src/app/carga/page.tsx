import { Tarjeta } from "@/components/Tarjeta";
import { CargaCsv } from "@/components/cliente/CargaCsv";
import { COLUMNAS } from "@/lib/csv.ts";

export default function Carga() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Carga masiva de proveedores</h1>
        <p className="text-sm text-slate-600">Sube un CSV y el sistema revisa a todos contra las listas oficiales. Los limpios se liberan solos; los dudosos llegan a tu bandeja.</p>
      </div>
      <Tarjeta>
        <CargaCsv />
      </Tarjeta>
      <Tarjeta titulo="Formato">
        <p className="text-sm text-slate-600">Columnas (por nombre, en cualquier orden): <code className="text-xs">{COLUMNAS.join(", ")}</code>. Obligatorias: rfc, razon_social y telefono_registrado.</p>
        <p className="mt-2 text-sm">
          <a href="/demo/proveedores-demo.csv" download className="text-blue-800 underline">Descargar CSV de ejemplo (500 proveedores)</a>
          <span className="text-slate-500"> · incluye RFC reales de los listados 69 y 69-B del SAT y un homónimo de OFAC; teléfonos, CLABE y montos son ficticios.</span>
        </p>
      </Tarjeta>
    </div>
  );
}
