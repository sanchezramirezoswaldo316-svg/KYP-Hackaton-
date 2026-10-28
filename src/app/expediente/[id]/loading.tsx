export default function CargandoExpediente() {
  return (
    <div className="space-y-4">
      <p className="text-slate-600">Cargando expediente…</p>
      <div className="h-28 animate-pulse rounded-2xl bg-slate-200" />
      <div className="h-40 animate-pulse rounded-xl bg-slate-200" />
    </div>
  );
}
