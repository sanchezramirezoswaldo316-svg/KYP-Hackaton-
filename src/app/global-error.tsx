"use client";
export default function ErrorGlobal({ reset }: { reset: () => void }) {
  return <html lang="es"><body><main style={{ maxWidth: 640, margin: '4rem auto', padding: 24, fontFamily: 'sans-serif' }} role="alert">
    <h1>No pudimos abrir la aplicación</h1>
    <p>Intenta cargarla de nuevo. Si acababas de enviar una solicitud, revisa su estado antes de repetirla.</p>
    <button onClick={reset}>Volver a cargar</button>
    <p>Si el problema continúa, avisa a Oswaldo con la hora del error.</p>
  </main></body></html>;
}
