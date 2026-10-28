"use client";
import Link from 'next/link';

export function ErrorOperacion({ reset }: { reset: () => void }) {
  return <section role="alert" className="mx-auto my-8 max-w-xl space-y-4 rounded-md border border-tinta/30 bg-tinta/10 p-6">
    <h1 className="text-xl font-semibold">No pudimos cargar esta información</h1>
    <p>Puede haber un problema de conexión o del servicio. No podemos confirmar si tu última operación se guardó. Revisa el estado antes de volver a enviarla.</p>
    <div className="flex gap-4">
      <button onClick={reset} className="rounded bg-acento px-4 py-2 text-white">Volver a cargar</button>
      <Link href="/bandeja" className="self-center text-acento underline">Ir a la bandeja</Link>
    </div>
    <p className="text-sm">Si continúa, avisa a Oswaldo con la hora y la acción que intentabas realizar. No compartas claves ni datos bancarios completos.</p>
  </section>;
}
