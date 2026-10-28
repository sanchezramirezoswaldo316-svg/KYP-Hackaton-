"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const enlaces = [
  { href: "/", texto: "Panel" },
  { href: "/bandeja", texto: "Bandeja" },
  { href: "/proveedores", texto: "Proveedores" },
  { href: "/carga", texto: "Carga CSV" },
  { href: "/clabe", texto: "Cambios de CLABE" },
  { href: "/erp", texto: "ERP" },
];

export function Navegacion() {
  const ruta = usePathname();
  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="font-semibold text-blue-900">KYP <span className="font-normal text-slate-500">· Know Your Provider</span></Link>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {enlaces.map((e) => {
            const activo = e.href === "/" ? ruta === "/" : ruta.startsWith(e.href);
            return (
              <Link key={e.href} href={e.href} className={`text-sm ${activo ? "font-medium text-blue-800" : "text-slate-600 hover:text-slate-900"}`}>
                {e.texto}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
