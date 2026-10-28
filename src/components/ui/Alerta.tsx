export function Alerta({ tipo = "info", children }: { tipo?: "info" | "medio" | "alto" | "ok"; children: React.ReactNode }) {
  const estilos = { info: "border border-borde bg-superficie text-tinta-2", medio: "border border-acento bg-acento text-white font-medium", alto: "border border-borde bg-superficie text-tinta-2", ok: "border border-borde bg-superficie text-tinta-2" };
  return <div className={`px-3 py-2 text-sm ${estilos[tipo]}`}>{children}</div>;
}
