"use client";

export default function ErrorExpediente({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-xl border border-borde bg-tinta p-6">
      <h1 className="text-lg font-semibold text-error">No se pudo cargar el expediente</h1>
      <p className="mt-1 text-sm text-error">{error.message || "Error inesperado."}</p>
      <button type="button" onClick={reset} className="mt-4 rounded bg-tinta px-3 py-2 text-sm font-medium text-white hover:bg-tinta">
        Reintentar
      </button>
    </div>
  );
}
