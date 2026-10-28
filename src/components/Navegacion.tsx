import Link from "next/link";

const enlaces = [
  { href: "/", texto: "Panel" },
  { href: "/bandeja", texto: "Bandeja" },
  { href: "/carga", texto: "Carga CSV" },
  { href: "/erp", texto: "ERP" },
];

export function Navegacion() {
  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
        <span className="font-semibold">KYP</span>
        {enlaces.map((e) => (
          <Link key={e.href} href={e.href} className="text-sm text-slate-600 hover:text-slate-900">
            {e.texto}
          </Link>
        ))}
      </div>
    </nav>
  );
}
