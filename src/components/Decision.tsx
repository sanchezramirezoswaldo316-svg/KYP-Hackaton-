import type { Decision } from "@/lib/tipos.ts";

const estilos: Record<Decision, string> = {
  liberar: "bg-green-100 text-green-800",
  revisar: "bg-amber-100 text-amber-800",
  bloquear: "bg-red-100 text-red-800",
};

export function EtiquetaDecision({ decision }: { decision: Decision }) {
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${estilos[decision]}`}>{decision}</span>;
}
