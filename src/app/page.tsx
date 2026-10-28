// Portada: explica el problema y la solución en 10 segundos.
import Link from "next/link";
import { Termino } from "@/components/Termino";
import { BotonTour } from "@/components/cliente/Tour";
import { infoListas } from "@/lib/verificacion/listas.ts";

export const dynamic = "force-dynamic";

export default function Portada() {
  const listas = infoListas();
  const efos = listas.find((l) => l.fuente.includes("69-B"))?.registros ?? 0;
  const ofac = listas.find((l) => l.fuente.includes("OFAC"))?.registros ?? 0;

  const tarjetas = [
    {
      icono: "🧾💸", titulo: "El problema",
      texto: <>Algunas empresas venden <strong>facturas falsas</strong> (<Termino t="EFOS" />). Si les pagas, el SAT te quita la deducción. Y hay estafadores que se hacen pasar por tus proveedores para que <strong>pagues a otra cuenta</strong>.</>,
      color: "border-red-200 bg-red-50",
    },
    {
      icono: "🔍⚡", titulo: "La solución",
      texto: <>KYP revisa a <strong>cada proveedor en segundos</strong> contra las listas oficiales del SAT y de EE. UU., su página web y las noticias. Si alguien pide cambiar una cuenta bancaria, <strong>congela el pago y llama</strong> al proveedor real.</>,
      color: "border-blue-200 bg-blue-50",
    },
    {
      icono: "👩‍💼✅", titulo: "El resultado",
      texto: <>Los confiables se aprueban solos. <strong>Una sola persona</strong> revisa únicamente los casos dudosos: el trabajo que antes hacían <strong>30 auditores</strong>, con evidencia lista para el SAT.</>,
      color: "border-emerald-200 bg-emerald-50",
    },
  ];

  return (
    <div className="space-y-10">
      <section className="animar-aparecer py-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">KYP · Know Your Provider</p>
        <h1 className="mx-auto mt-2 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">¿Sabes a quién le estás pagando?</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">Revisamos a todos tus proveedores en segundos para que no pagues facturas falsas ni caigas en fraudes de cuentas bancarias.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <BotonTour grande />
          <Link href="/en-vivo" className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 hover:bg-slate-50">🛰️ Ver cómo funciona por dentro</Link>
          <Link href="/panel" className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 hover:bg-slate-50">Entrar al panel</Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {tarjetas.map((t, i) => (
          <div key={t.titulo} className={`animar-aparecer rounded-2xl border-2 p-6 ${t.color}`} style={{ animationDelay: `${200 + i * 200}ms` }}>
            <div className="text-4xl" aria-hidden>{t.icono}</div>
            <div className="mt-1 text-sm font-semibold uppercase tracking-wide text-slate-500">{i + 1}. {t.titulo}</div>
            <p className="mt-2 text-slate-800">{t.texto}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 rounded-2xl bg-slate-900 p-6 text-center text-white sm:grid-cols-3">
        <div><div className="text-3xl font-bold">{efos.toLocaleString("es-MX")}</div><div className="text-sm opacity-80">empresas en la lista negra del SAT</div></div>
        <div><div className="text-3xl font-bold">{ofac.toLocaleString("es-MX")}</div><div className="text-sm opacity-80">personas y empresas sancionadas por EE. UU.</div></div>
        <div><div className="text-3xl font-bold">&lt; 1 s</div><div className="text-sm opacity-80">para revisar a un proveedor contra todas</div></div>
      </section>
    </div>
  );
}
