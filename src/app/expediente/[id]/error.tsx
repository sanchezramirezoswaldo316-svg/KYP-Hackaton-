"use client";

export default function ErrorExpediente({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6">
      <h1 className="text-lg font-semibold text-red-900">No se pudo cargar el expediente</h1>
      <p className="mt-1 text-sm text-red-800">{error.message || "Error inesperado."}</p>
      <button type="button" onClick={reset} className="mt-4 rounded bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800">
        Reintentar
      </button>
    </div>
  );
}
