"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BotonTour } from "./cliente/Tour";

const enlaces = [
  { href: "/panel", texto: "Panel" },
  { href: "/en-vivo", texto: "En vivo" },
  { href: "/bandeja", texto: "Bandeja" },
  { href: "/proveedores", texto: "Proveedores" },
  { href: "/carga", texto: "Carga CSV" },
  { href: "/clabe", texto: "Cambios de cuenta" },
  { href: "/llamadas", texto: "Monitor de llamadas" },
  { href: "/erp", texto: "Cuentas por pagar" },
  { href: "/automatizacion", texto: "Automatización" },
];

export function Navegacion() {
  const ruta = usePathname();
  const [pendientes, setPendientes] = useState<number | null>(null);

  useEffect(() => {
    let activo = true;
    fetch("/api/casos").then((respuesta) => respuesta.json()).then((casos: unknown) => {
      if (activo && Array.isArray(casos)) setPendientes(casos.length);
    }).catch(() => { /* la navegación funciona aunque el contador no esté disponible */ });
    return () => { activo = false; };
  }, []);

  return (
    <nav className="border-b border-borde bg-superficie lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:flex lg:w-[200px] lg:flex-col lg:border-b-0 lg:border-r lg:text-tinta-2">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:flex-nowrap lg:mx-0 lg:flex-col lg:items-stretch lg:gap-8 lg:px-4 lg:py-6">
        <Link href="/" className="text-lg font-semibold tracking-tight text-tinta lg:border-b lg:border-borde lg:pb-5">KYP</Link>
        <div className="order-last -mx-4 flex w-[calc(100%+2rem)] gap-x-4 overflow-x-auto whitespace-nowrap px-4 pb-1 sm:order-none sm:mx-0 sm:w-auto sm:flex-1 sm:flex-wrap sm:px-0 sm:pb-0 lg:order-none lg:mx-0 lg:block lg:w-auto lg:space-y-1 lg:overflow-visible">
          {enlaces.map((e) => (
            <Link key={e.href} href={e.href} className={`flex items-center justify-between rounded-control px-3 py-2 text-sm transition-colors ${ruta.startsWith(e.href) ? "bg-seleccion font-medium text-tinta" : "text-tinta-2 hover:bg-hover hover:text-tinta"}`}>
              <span>{e.texto}</span>
              {e.href === "/bandeja" && <span className="tabular-nums text-xs text-tinta-3">{pendientes ?? "—"}</span>}
            </Link>
          ))}
        </div>
        <div className="lg:border-t lg:border-borde lg:pt-4"><BotonTour /></div>
      </div>
    </nav>
  );
}
