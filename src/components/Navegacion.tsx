"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BotonTour } from "./cliente/Tour";

const enlaces = [
  { href: "/panel", texto: "Panel" },
  { href: "/en-vivo", texto: "En vivo" },
  { href: "/bandeja", texto: "Bandeja" },
  { href: "/proveedores", texto: "Proveedores" },
  { href: "/carga", texto: "Carga CSV" },
  { href: "/clabe", texto: "Cambios de cuenta" },
  { href: "/erp", texto: "Cuentas por pagar" },
  { href: "/automatizacion", texto: "Automatización" },
];

export function Navegacion() {
  const ruta = usePathname();
  return (
    <nav className="border-b border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:flex lg:w-[232px] lg:flex-col lg:border-0 lg:bg-marca lg:text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:flex-nowrap lg:mx-0 lg:flex-col lg:items-stretch lg:gap-8 lg:px-4 lg:py-6">
        <Link href="/" className="text-lg font-semibold lg:border-b lg:border-white/15 lg:pb-5">KYP <span className="hidden text-xs font-normal text-slate-500 lg:block lg:text-white/65">Know your provider</span></Link>
        <div className="order-last -mx-4 flex w-[calc(100%+2rem)] gap-x-4 overflow-x-auto whitespace-nowrap px-4 pb-1 sm:order-none sm:mx-0 sm:w-auto sm:flex-1 sm:flex-wrap sm:px-0 sm:pb-0 lg:order-none lg:mx-0 lg:block lg:w-auto lg:space-y-1 lg:overflow-visible">
          {enlaces.map((e) => (
            <Link key={e.href} href={e.href} className={`block rounded-control px-3 py-2 text-sm transition-colors ${ruta.startsWith(e.href) ? "border-l-2 border-white bg-white/10 font-semibold text-marca lg:text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:text-white/75 lg:hover:bg-white/10 lg:hover:text-white"}`}>
              {e.texto}
            </Link>
          ))}
        </div>
        <div className="lg:border-t lg:border-white/15 lg:pt-4"><BotonTour /></div>
      </div>
    </nav>
  );
}
