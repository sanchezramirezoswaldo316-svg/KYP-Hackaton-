export default function CargandoExpediente() {
  return (
    <div className="space-y-4">
      <p className="text-tinta-3">Cargando expediente…</p>
      <div className="h-28 animate-pulse rounded-2xl bg-superficie" />
      <div className="h-40 animate-pulse rounded-xl bg-superficie" />
    </div>
  );
}
