// Portada: explica el problema y la solución en 10 segundos.
import Link from "next/link";
import { Icono, type NombreIcono } from "@/components/Icono";
import { Logo } from "@/components/Navegacion";
import { Termino } from "@/components/Termino";
import { BotonTour } from "@/components/cliente/Tour";
import { infoListas } from "@/lib/verificacion/listas.ts";

export const dynamic = "force-dynamic";

export default function Portada() {
  const listas = infoListas();
  const efos = listas.find((l) => l.fuente.includes("69-B"))?.registros ?? 0;
  const ofac = listas.find((l) => l.fuente.includes("OFAC"))?.registros ?? 0;

  const tarjetas: { icono: NombreIcono; titulo: string; texto: React.ReactNode; color: string }[] = [
    {
      icono: "escudoX", titulo: "El problema",
      texto: <>Algunas empresas venden <strong>facturas falsas</strong> (<Termino t="EFOS" />). Si les pagas, el SAT te quita la deducción. Y hay estafadores que se hacen pasar por tus proveedores para que <strong>pagues a otra cuenta</strong>.</>,
      color: "text-peligro bg-peligro",
    },
    {
      icono: "radar", titulo: "La solución",
      texto: <>KYP revisa a <strong>cada proveedor en segundos</strong> contra las listas oficiales del SAT y de EE. UU., su página web y las noticias. Si alguien pide cambiar una cuenta bancaria, <strong>congela el pago y llama</strong> al proveedor real.</>,
      color: "text-acento-2 bg-acento",
    },
    {
      icono: "escudoOk", titulo: "El resultado",
      texto: <>Los confiables se aprueban solos. <strong>Una sola persona</strong> revisa únicamente los casos dudosos: el trabajo que antes hacían <strong>30 auditores</strong>, con evidencia lista para el SAT.</>,
      color: "text-ok bg-ok",
    },
  ];

  const cifras = [
    { valor: efos.toLocaleString("es-MX"), texto: "empresas en la lista negra del SAT" },
    { valor: ofac.toLocaleString("es-MX"), texto: "personas y empresas sancionadas por EE. UU." },
    { valor: "< 1 s", texto: "para revisar a un proveedor contra todas" },
  ];

  return (
    <div className="space-y-8">
      <section className="reticula animar-aparecer relative overflow-hidden rounded-md border border-borde bg-panel px-6 py-12 sm:px-10">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-panel via-panel/90 to-panel/40" aria-hidden />
        <div className="relative max-w-3xl">
          <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] text-acento-2 uppercase"><Logo /> KYP · Know Your Provider</p>
          <h1 className="mt-4 text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">¿Sabes a quién le estás pagando?</h1>
          <p className="mt-4 max-w-2xl text-base text-texto-2">Revisamos a todos tus proveedores en segundos para que no pagues facturas falsas ni caigas en fraudes de cuentas bancarias.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <BotonTour grande />
            <Link href="/en-vivo" className="inline-flex items-center gap-2 rounded border border-borde-fuerte bg-panel-2 px-5 py-3 font-medium text-texto hover:border-acento/60"><Icono nombre="radar" />Ver cómo funciona por dentro</Link>
            <Link href="/panel" className="inline-flex items-center gap-2 rounded border border-borde-fuerte bg-panel-2 px-5 py-3 font-medium text-texto hover:border-acento/60"><Icono nombre="panel" />Entrar al panel</Link>
          </div>
        </div>
      </section>

      <section className="grid divide-borde overflow-hidden rounded-md border border-borde bg-panel sm:grid-cols-3 sm:divide-x">
        {cifras.map((c) => (
          <div key={c.texto} className="px-6 py-4">
            <div className="font-mono text-3xl font-semibold tabular-nums">{c.valor}</div>
            <div className="rotulo mt-1">{c.texto}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {tarjetas.map((t, i) => (
          <div key={t.titulo} className="animar-aparecer relative overflow-hidden rounded-md border border-borde bg-panel p-6" style={{ animationDelay: `${200 + i * 200}ms` }}>
            <span className={`absolute inset-x-0 top-0 h-0.5 ${t.color.split(" ")[1]}`} aria-hidden />
            <div className="flex items-center justify-between">
              <span className={`flex h-10 w-10 items-center justify-center rounded border border-borde bg-panel-2 ${t.color.split(" ")[0]}`}><Icono nombre={t.icono} className="h-5 w-5" /></span>
              <span className="font-mono text-xs text-texto-3">0{i + 1}</span>
            </div>
            <div className="rotulo mt-4">{t.titulo}</div>
            <p className="mt-2 text-texto-2 [&_strong]:text-texto">{t.texto}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
