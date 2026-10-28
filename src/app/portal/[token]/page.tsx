// Portal del proveedor: página pública (enlace único) para subir lo que se le pidió.
import type { Metadata } from "next";
import { SubirDocumento } from "@/components/cliente/SubirDocumento";
import { listo } from "@/lib/demo.ts";
import { solicitudPorToken } from "@/lib/documentos.ts";
import { fecha } from "@/lib/formato.ts";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Portal de proveedores", robots: { index: false } };

export default async function Portal({ params }: { params: Promise<{ token: string }> }) {
  await listo();
  const { token } = await params;
  const e = await solicitudPorToken(token);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="text-center">
        <div className="text-sm font-semibold uppercase tracking-widest text-blue-700">Portal de proveedores</div>
        <h1 className="mt-1 text-2xl font-bold">{process.env.EMPRESA_NOMBRE ?? "Verificación de proveedores"}</h1>
      </div>
      {!e ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <div className="text-4xl">🔗</div>
          <p className="mt-2">Este enlace no es válido. Pide uno nuevo a tu contacto de compras.</p>
        </div>
      ) : e.solicitud.estado === "recibida" ? (
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-6 text-center">
          <div className="text-5xl">✅</div>
          <h2 className="mt-2 text-xl font-semibold">¡Gracias, {e.proveedor.razon_social}!</h2>
          <p className="mt-1 text-slate-700">Recibimos tu documento el {fecha(e.solicitud.recibida_en)}; nuestro equipo lo revisará; no necesitas hacer nada más.</p>
        </div>
      ) : (
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
          <div>
            <p className="text-slate-600">Hola,</p>
            <h2 className="text-xl font-semibold">{e.proveedor.razon_social}</h2>
            <p className="mt-2 text-slate-700">
              Como parte de nuestra revisión de proveedores, te pedimos tu <strong>Opinión del Cumplimiento de Obligaciones Fiscales (32-D)</strong> vigente, emitida por el SAT.
            </p>
          </div>
          <details className="rounded-lg bg-slate-50 p-3 text-sm">
            <summary className="cursor-pointer font-medium">¿Cómo la obtengo?</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-700">
              <li>Entra a sat.gob.mx con tu RFC y contraseña o e.firma.</li>
              <li>Busca &quot;Opinión del cumplimiento de obligaciones fiscales&quot;.</li>
              <li>Descarga el PDF y súbelo aquí.</li>
            </ol>
          </details>
          <SubirDocumento token={token} />
          {e.solicitud.estado === "vencida" && <p className="text-center text-xs text-amber-700">El plazo venció, pero todavía puedes enviarlo.</p>}
          <p className="text-center text-xs text-slate-500">Solicitado el {fecha(e.solicitud.enviada_en)} · RFC {e.proveedor.rfc}</p>
        </div>
      )}
    </div>
  );
}
