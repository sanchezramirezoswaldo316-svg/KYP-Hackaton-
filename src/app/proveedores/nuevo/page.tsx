import { Tarjeta } from "@/components/Tarjeta";
import { FormularioAlta } from "@/components/cliente/FormularioAlta";

export default function NuevoProveedor() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Nuevo proveedor</h1>
        <p className="text-tinta-3">Llena sus datos y verás en vivo cómo lo revisamos en cada fuente.</p>
      </div>
      <Tarjeta><FormularioAlta /></Tarjeta>
    </div>
  );
}
