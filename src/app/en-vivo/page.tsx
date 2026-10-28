// Mapa de extracción de información en tiempo real.
import { VistaEnVivo } from "@/components/cliente/VistaEnVivo";
import { almacen } from "@/lib/almacen/index.ts";
import { listo } from "@/lib/demo.ts";
import { integraciones } from "@/lib/integraciones.ts";

export const dynamic = "force-dynamic";

export default async function EnVivo({ searchParams }: { searchParams: Promise<{ proveedor?: string }> }) {
  await listo();
  const { proveedor } = await searchParams;
  const lista = (await almacen().proveedores.listar()).sort((a, b) => a.razon_social.localeCompare(b.razon_social)).map(({ id, razon_social }) => ({ id, razon_social }));
  const i = integraciones();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Extracción en vivo</h1>
        <p className="text-tinta-3">
          Mira cómo el sistema consulta cada fuente, qué datos extrae y cómo los convierte en una decisión. Los paquetes azules son consultas; los de color, datos que regresan.
        </p>
        {(!i.firecrawl || !i.ia) && <p className="mt-1 text-xs text-tinta-3">Página web, noticias e IA aparecen como &quot;no revisado&quot; hasta que se configuren sus claves.</p>}
      </div>
      <VistaEnVivo proveedores={lista} inicial={proveedor} />
    </div>
  );
}
