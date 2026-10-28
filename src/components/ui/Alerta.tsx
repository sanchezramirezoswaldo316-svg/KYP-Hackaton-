export function Alerta({ tipo = "info", children }: { tipo?: "info" | "medio" | "alto" | "ok"; children: React.ReactNode }) {
  const estilos = { info: "border-info bg-info-fondo text-tinta", medio: "border-medio bg-medio-fondo text-tinta", alto: "border-alto bg-alto-fondo text-tinta", ok: "border-ok bg-ok-fondo text-tinta" };
  return <div className={`border-l-4 px-3 py-2 text-sm ${estilos[tipo]}`}>{children}</div>;
}
