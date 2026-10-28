import Link from 'next/link';
export default function NoEncontrado() {
  return <section className="space-y-4 p-6">
    <h1 className="text-xl font-semibold">No encontramos esta página o expediente</h1>
    <p>El enlace puede ser incorrecto o el registro ya no estar disponible.</p>
    <Link href="/clabe" className="text-blue-800 underline">Volver a cambios de cuenta</Link>
  </section>;
}
