"use client";
export default function ErrorGlobal({ reset }: { reset: () => void }) {
  return <html lang="es"><body style={{ fontFamily: '"IBM Plex Sans", sans-serif', background: "#fff", color: "#171717" }}><main style={{ maxWidth: 640, margin: "4rem auto", padding: 24 }} role="alert"><h1>No pudimos abrir la aplicación</h1><p>Revisa el estado de la solicitud antes de repetirla.</p><button onClick={reset}>Volver a cargar</button></main></body></html>;
}
