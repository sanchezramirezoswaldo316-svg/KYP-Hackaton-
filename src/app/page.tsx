// Panel de productividad (Oswaldo).
import { casos, verificaciones } from "@/lib/datos-prueba/index.ts";

const HORAS_MANUAL_POR_REVISION = 2.6;
const MINUTOS_POR_EXCEPCION = 20;

export default function Panel() {
  const total = verificaciones.length;
  const automaticos = verificaciones.filter((v) => v.decision === "liberar").length;
  const horasManual = total * HORAS_MANUAL_POR_REVISION;
  const horasKyp = (casos.length * MINUTOS_POR_EXCEPCION) / 60;

  const tarjetas = [
    { titulo: "Proveedores revisados", valor: total },
    { titulo: "Resueltos en automático", valor: `${Math.round((automaticos / total) * 100)}%` },
    { titulo: "En tu bandeja", valor: casos.length },
    { titulo: "Horas: manual vs. KYP", valor: `${horasManual.toFixed(1)} h vs. ${horasKyp.toFixed(1)} h` },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Panel de productividad</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tarjetas.map((t) => (
          <div key={t.titulo} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-500">{t.titulo}</div>
            <div className="mt-1 text-2xl font-semibold">{t.valor}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
