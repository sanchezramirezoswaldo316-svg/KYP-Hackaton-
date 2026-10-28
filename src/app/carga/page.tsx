import { Tarjeta } from "@/components/Tarjeta";
import { Termino } from "@/components/Termino";
import { CargaCsv } from "@/components/cliente/CargaCsv";
import { COLUMNAS } from "@/lib/csv.ts";

export default function Carga() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Revisar muchos proveedores a la vez</h1>
        <p className="text-slate-600">
          El sistema revisa a todos contra la lista negra del SAT (<Termino t="69-B" />) y las sanciones internacionales (<Termino t="OFAC" />).
          Los confiables se aprueban solos; los dudosos llegan a la bandeja.
        </p>
      </div>
      <Tarjeta>
        <CargaCsv />
      </Tarjeta>
      <details className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <summary className="cursor-pointer font-medium">Formato del archivo</summary>
        <p className="mt-2 text-slate-600">Columnas (por nombre, en cualquier orden): <code className="text-xs">{COLUMNAS.join(", ")}</code>. Obligatorias: rfc, razon_social y telefono_registrado.</p>
        <p className="mt-2">
          <a href="/demo/proveedores-demo.csv" download className="text-blue-800 underline">Descargar el archivo de ejemplo</a>
          <span className="text-slate-500"> · incluye empresas reales de las listas públicas del SAT y un nombre parecido a uno sancionado por EE. UU.; teléfonos, cuentas y montos son ficticios.</span>
        </p>
      </details>
    </div>
  );
}
