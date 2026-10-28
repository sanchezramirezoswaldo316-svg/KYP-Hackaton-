import { Tarjeta } from "@/components/Tarjeta";
import { FormularioAlta } from "@/components/cliente/FormularioAlta";

export default function NuevoProveedor() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Alta de proveedor</h1>
        <p className="text-sm text-slate-600">Se revisa contra SAT (Art. 69 y 69-B) y OFAC; si hay página web, Firecrawl la analiza y la IA compara el giro.</p>
      </div>
      <Tarjeta><FormularioAlta /></Tarjeta>
    </div>
  );
}
