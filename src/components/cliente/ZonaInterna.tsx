"use client";

import { usePathname } from "next/navigation";

// Oculta el menú, avisos y demo guiada en páginas que ve el proveedor (portal).
export function ZonaInterna({ children }: { children: React.ReactNode }) {
  const ruta = usePathname();
  return ruta.startsWith("/portal") || ruta === "/" || ruta === "/inicio" ? null : <>{children}</>;
}
