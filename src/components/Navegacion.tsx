"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BotonTour } from "./cliente/Tour";

const enlaces = [
  { href: "/panel", texto: "📊 Panel" },
  { href: "/bandeja", texto: "👩‍💼 Bandeja" },
  { href: "/proveedores", texto: "🏢 Proveedores" },
  { href: "/carga", texto: "📥 Revisar muchos" },
  { href: "/clabe", texto: "🏦 Cambios de cuenta" },
  { href: "/erp", texto: "💳 Pagos" },
];

export function Navegacion() {
  const ruta = usePathname();
  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:flex-nowrap">
        <Link href="/" className="font-bold text-blue-900">🛡️ KYP</Link>
        <div className="order-last -mx-4 flex w-[calc(100%+2rem)] gap-x-4 overflow-x-auto whitespace-nowrap px-4 pb-1 sm:order-none sm:mx-0 sm:w-auto sm:flex-1 sm:flex-wrap sm:px-0 sm:pb-0">
          {enlaces.map((e) => (
            <Link key={e.href} href={e.href} className={`text-sm ${ruta.startsWith(e.href) ? "font-semibold text-blue-800" : "text-slate-600 hover:text-slate-900"}`}>
              {e.texto}
            </Link>
          ))}
        </div>
        <BotonTour />
      </div>
    </nav>
  );
}
