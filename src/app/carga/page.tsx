import { Panel } from "@/components/ui/Panel";
import { Termino } from "@/components/Termino";
import { CargaCsv } from "@/components/cliente/CargaCsv";
import { COLUMNAS, MAX_CSV_BYTES, MAX_CSV_FILAS } from "@/lib/csv.ts";

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
      <Panel titulo="Importar proveedores">
        <CargaCsv />
      </Panel>
      <Panel titulo="Reglas del archivo">
        <div className="space-y-1 text-sm text-tinta-2">
          <p>Máximo {Math.floor(MAX_CSV_BYTES / 1024 / 1024)} MB y {MAX_CSV_FILAS.toLocaleString("es-MX")} filas.</p>
          <p>Columnas obligatorias: rfc, razon_social y telefono_registrado. El resto puede venir en cualquier orden.</p>
          <p>Se validan RFC y CLABE; no se aceptan celdas que empiecen con =, +, - o @.</p>
        </div>
        <a href="/demo/proveedores-demo.csv" download className="mt-3 inline-block text-sm font-medium text-marca underline">Descargar plantilla de ejemplo</a>
        <code className="mt-2 block break-words text-xs text-tinta-3">Columnas disponibles: {COLUMNAS.join(", ")}</code>
      </Panel>
    </div>
  );
}
