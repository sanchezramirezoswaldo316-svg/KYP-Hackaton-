"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icono, type NombreIcono } from "./Icono";
import { BotonTour } from "./cliente/Tour";

const enlaces: { href: string; texto: string; icono: NombreIcono }[] = [
  { href: "/panel", texto: "Panel", icono: "panel" },
  { href: "/en-vivo", texto: "En vivo", icono: "radar" },
  { href: "/bandeja", texto: "Bandeja", icono: "bandeja" },
  { href: "/proveedores", texto: "Proveedores", icono: "empresa" },
  { href: "/carga", texto: "Revisar muchos", icono: "subir" },
  { href: "/clabe", texto: "Cambios de cuenta", icono: "banco" },
  { href: "/erp", texto: "Pagos", icono: "tarjeta" },
  { href: "/automatizacion", texto: "Automatización", icono: "flujo" },
];

export function Logo() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path d="M12 2 21 7v10l-9 5-9-5V7z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7 16.5 9.5v5L12 17l-4.5-2.5v-5z" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

export function Navegacion() {
  const ruta = usePathname();
  return (
    <nav className="sticky top-0 z-40 border-b border-borde bg-panel/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-stretch justify-between gap-x-6 px-4 sm:flex-nowrap sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 py-2.5 text-acento-2">
          <Logo />
          <span className="font-mono text-[13px] font-semibold tracking-[0.18em] text-texto">KYP</span>
          <span className="hidden border-l border-borde-fuerte pl-2.5 font-mono text-[10px] tracking-[0.14em] text-texto-3 lg:inline">VERIFICACIÓN DE PROVEEDORES</span>
        </Link>
        <div className="order-last -mx-4 flex w-[calc(100%+2rem)] overflow-x-auto whitespace-nowrap px-4 sm:order-none sm:mx-0 sm:w-auto sm:flex-1 sm:px-0">
          {enlaces.map((e) => {
            const activo = ruta.startsWith(e.href);
            return (
              <Link
                key={e.href}
                href={e.href}
                aria-current={activo ? "page" : undefined}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-3 text-[13px] transition-colors ${activo ? "border-acento text-texto" : "border-transparent text-texto-3 hover:text-texto-2"}`}
              >
                <Icono nombre={e.icono} className={`h-3.5 w-3.5 ${activo ? "text-acento-2" : ""}`} />
                {e.texto}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center py-2"><BotonTour /></div>
      </div>
    </nav>
  );
}
