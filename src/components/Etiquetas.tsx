import { NOMBRE_DECISION, NOMBRE_ESTADO } from "@/lib/formato.ts";
import type { Decision, EstadoProveedor } from "@/lib/tipos.ts";

const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap";

const DECISION: Record<Decision, string> = {
  liberar: "bg-emerald-100 text-emerald-800",
  revisar: "bg-amber-100 text-amber-800",
  bloquear: "bg-red-100 text-red-800",
};

export function EtiquetaDecision({ decision }: { decision: Decision }) {
  return <span className={`${base} ${DECISION[decision]}`}>{NOMBRE_DECISION[decision]}</span>;
}

const ESTADO: Record<EstadoProveedor, string> = {
  pendiente: "bg-slate-100 text-slate-700",
  aprobado: "bg-emerald-100 text-emerald-800",
  en_revision: "bg-amber-100 text-amber-800",
  pausado: "bg-orange-100 text-orange-800",
  bloqueado: "bg-red-100 text-red-800",
};

export function EtiquetaEstado({ estado }: { estado: EstadoProveedor }) {
  return <span className={`${base} ${ESTADO[estado]}`}>{NOMBRE_ESTADO[estado]}</span>;
}

export function Etiqueta({ children, tono = "gris" }: { children: React.ReactNode; tono?: "gris" | "verde" | "ambar" | "rojo" | "azul" }) {
  const tonos = {
    gris: "bg-slate-100 text-slate-700",
    verde: "bg-emerald-100 text-emerald-800",
    ambar: "bg-amber-100 text-amber-800",
    rojo: "bg-red-100 text-red-800",
    azul: "bg-blue-100 text-blue-800",
  };
  return <span className={`${base} ${tonos[tono]}`}>{children}</span>;
}
