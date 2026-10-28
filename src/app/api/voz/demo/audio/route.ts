import { readFile } from 'node:fs/promises';
import path from 'node:path';
// Solo material sintético ya versionado; nunca descarga una conversación real.
export async function GET() {
  try {
    const audio = await readFile(path.join(process.cwd(), 'voz/demo/DEMO-PREGRABADA-SINTETICA.mp3'));
    return new Response(new Uint8Array(audio), { headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': 'inline; filename="DEMO-PREGRABADA-SINTETICA.mp3"',
      'Cache-Control': 'private, max-age=3600',
    } });
  } catch { return new Response('La demostración pregrabada no está disponible.', { status: 503 }); }
}
