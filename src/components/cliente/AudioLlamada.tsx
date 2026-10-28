"use client";
import { useEffect, useState } from 'react';

export function AudioLlamada({ llamadaId }: { llamadaId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => () => { if (src) URL.revokeObjectURL(src); }, [src]);
  async function cargar() {
    setOcupado(true); setError(null);
    try {
      const r = await fetch(`/api/voz/llamadas/${encodeURIComponent(llamadaId)}/audio`, { signal: AbortSignal.timeout(20000) });
      if (!r.ok) throw new Error(r.status === 401 ? 'Tu acceso no permite escuchar este audio. Inicia sesión y vuelve a intentarlo.' : r.status === 404 ? 'Esta grabación todavía no está disponible o ya expiró.' : 'El servicio de audio no está disponible. Intenta cargarlo más tarde.');
      setSrc(URL.createObjectURL(await r.blob()));
    } catch (e) { setError(e instanceof Error && e.name !== 'TimeoutError' && e.name !== 'TypeError' ? e.message : 'No pudimos descargar el audio. Revisa tu conexión e intenta cargarlo de nuevo.'); }
    finally { setOcupado(false); }
  }
  return <div className="space-y-2 text-sm">
    {!src && <button disabled={ocupado} onClick={cargar} className="rounded border border-slate-300 px-3 py-2 disabled:opacity-50">{ocupado ? 'Cargando audio…' : 'Cargar grabación de la llamada'}</button>}
    {src && <audio aria-label="Grabación de verificación" controls src={src} onError={() => { setError('No se pudo reproducir la grabación. Vuelve a cargarla.'); setSrc(null); }} />}
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </div>;
}
