import { Tarjeta } from "@/components/Tarjeta";
import { FormularioAlta } from "@/components/cliente/FormularioAlta";

export default function NuevoProveedor() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Nuevo proveedor</h1>
        <p className="text-texto-2">Llena sus datos y verás en vivo cómo lo revisamos en cada fuente.</p>
      </div>
      <Tarjeta><FormularioAlta /></Tarjeta>
    </div>
  );
}
