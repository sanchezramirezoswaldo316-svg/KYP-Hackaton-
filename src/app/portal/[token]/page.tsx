// Portal del proveedor: página pública (enlace único) para subir lo que se le pidió.
import type { Metadata } from "next";
import { SubirDocumento } from "@/components/cliente/SubirDocumento";
import { listo } from "@/lib/demo.ts";
import { solicitudPorToken } from "@/lib/documentos.ts";
import { fecha } from "@/lib/formato.ts";
import { Icono } from "@/components/Icono";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Portal de proveedores", robots: { index: false } };

export default async function Portal({ params }: { params: Promise<{ token: string }> }) {
  await listo();
  const { token } = await params;
  const e = await solicitudPorToken(token);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="text-center">
        <div className="font-mono text-[11px] tracking-[0.2em] text-acento-2 uppercase">Portal de proveedores</div>
        <h1 className="mt-1 text-2xl font-bold">{process.env.EMPRESA_NOMBRE ?? "Verificación de proveedores"}</h1>
      </div>
      {!e ? (
        <div className="rounded-md border border-borde bg-panel p-6 text-center">
          <Icono nombre="enlace" className="mx-auto h-9 w-9 text-texto-3" trazo={1.5} />
          <p className="mt-2">Este enlace no es válido. Pide uno nuevo a tu contacto de compras.</p>
        </div>
      ) : e.solicitud.estado === "recibida" ? (
        <div className="rounded-md border border-ok/40 bg-ok/8 p-6 text-center">
          <Icono nombre="ok" className="mx-auto h-10 w-10 text-ok" trazo={1.5} />
          <h2 className="mt-2 text-xl font-semibold">¡Gracias, {e.proveedor.razon_social}!</h2>
          <p className="mt-1 text-texto-2">Recibimos tu documento el {fecha(e.solicitud.recibida_en)}; nuestro equipo lo revisará; no necesitas hacer nada más.</p>
        </div>
      ) : (
        <div className="space-y-5 rounded-md border border-borde bg-panel p-6">
          <div>
            <p className="text-texto-2">Hola,</p>
            <h2 className="text-xl font-semibold">{e.proveedor.razon_social}</h2>
            <p className="mt-2 text-texto-2">
              Como parte de nuestra revisión de proveedores, te pedimos tu <strong>Opinión del Cumplimiento de Obligaciones Fiscales (32-D)</strong> vigente, emitida por el SAT.
            </p>
          </div>
          <details className="rounded bg-panel-2 p-3 text-sm">
            <summary className="cursor-pointer font-medium">¿Cómo la obtengo?</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-texto-2">
              <li>Entra a sat.gob.mx con tu RFC y contraseña o e.firma.</li>
              <li>Busca &quot;Opinión del cumplimiento de obligaciones fiscales&quot;.</li>
              <li>Descarga el PDF y súbelo aquí.</li>
            </ol>
          </details>
          <SubirDocumento token={token} />
          {e.solicitud.estado === "vencida" && <p className="text-center text-xs text-alerta">El plazo venció, pero todavía puedes enviarlo.</p>}
          <p className="text-center text-xs text-texto-3">Solicitado el {fecha(e.solicitud.enviada_en)} · RFC {e.proveedor.rfc}</p>
        </div>
      )}
    </div>
  );
}
