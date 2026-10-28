import type { Llamada, SolicitudClabe } from '../tipos.ts';

export function avisoVoz(s: SolicitudClabe, llamada?: Llamada, fallo = false, ahora = Date.now()): string | null {
  if (llamada || ['verificada','rechazada'].includes(s.estado)) return null;
  if (fallo) return 'No se pudo confirmar la llamada. El pago sigue pausado. Revisa el caso en la bandeja y la llamada en ElevenLabs antes de volver a marcar.';
  if (s.estado === 'en_llamada' && ahora - Date.parse(s.creado_en) > 10 * 60 * 1000) {
    return 'Aún no recibimos el resultado de la llamada. El pago sigue pausado. Revisa la conversación y la entrega del webhook; no inicies otra llamada hasta aclararlo.';
  }
  return null;
}
