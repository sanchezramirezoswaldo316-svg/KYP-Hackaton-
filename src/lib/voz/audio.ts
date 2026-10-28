// Proxy del servidor: nunca entrega la API key ni una URL pública de grabación.
export async function obtenerAudio(conversationId: string): Promise<Response> {
  if (!process.env.ELEVENLABS_API_KEY) return new Response("Audio no configurado", { status: 503 });
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(conversationId)}/audio`, {
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY }, signal: AbortSignal.timeout(15000), cache: "no-store",
    });
    if (!res.ok) return new Response("Audio no disponible", { status: res.status === 404 ? 404 : 502 });
    return new Response(res.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, no-store" } });
  } catch { return new Response("Audio temporalmente no disponible", { status: 502 }); }
}
