# Verificación por voz (Axel)

## Flujo de cambio de CLABE

1. Llega una solicitud de cambio de CLABE → el pago queda **pausado**.
2. El agente de ElevenLabs llama al **`telefono_registrado` del alta**, nunca a un número que venga en la solicitud.
3. Al terminar: `POST {APP_URL}/api/webhooks/llamada` con header `x-kyp-secret` y cuerpo `WebhookLlamada` (ver `src/lib/tipos.ts`).

Resultados posibles: `confirmado`, `no_reconoce`, `datos_no_coinciden`, `sin_respuesta`.

## Plan B para la demo

Tener una grabación de una llamada exitosa por si falla la red o el teléfono.
