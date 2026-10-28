# Verificación por voz (Axel)

El código ya está listo (`src/lib/voz/elevenlabs.ts`). Falta configurar el agente en ElevenLabs.

## Flujo

1. Se registra una solicitud de cambio de CLABE (pantalla **Cambios de CLABE**) → el pago queda **en pausa**.
2. La app llama a `POST https://api.elevenlabs.io/v1/convai/twilio/outbound-call` al **`telefono_registrado` del alta**. El teléfono que venga en la solicitud se guarda como evidencia, pero nunca se usa.
3. ElevenLabs envía el webhook post-llamada a `/api/webhooks/elevenlabs`. La app verifica la firma, guarda la transcripción y:
   - `confirmado` → la CLABE nueva queda verificada y se reactiva el pago.
   - cualquier otro resultado → caso de **alto riesgo** en la bandeja (sugerencia: bloquear).

Sin variables de ElevenLabs, la app muestra botones para **simular** el resultado. Quedan marcados como "Simulada" en el expediente y en el PDF.

## Configuración en ElevenLabs

1. **Agente** (Conversational AI): idioma español y voz natural. El prompt está en `guion-agente.md`.
2. **Variables dinámicas** que envía la app: `{{empresa}}`, `{{proveedor}}`, `{{folio_factura}}`, `{{monto_factura}}`, `{{ultimos4_anterior}}`, `{{solicitud_id}}`.
3. **Análisis → Data collection:** crea un campo llamado exactamente `resultado` (tipo string) con esta descripción:
   > "Uno de: confirmado (reconoce la solicitud y los tres datos coinciden), no_reconoce (dice que no pidió el cambio), datos_no_coinciden (algún dato no coincide), sin_respuesta (no contestó o no era el representante)."
4. **Número de teléfono:** importa un número de Twilio en ElevenLabs y copia su `phone_number_id`.
5. **Webhook post-llamada:** en la configuración de webhooks del workspace, apunta a `https://<tu-app>.vercel.app/api/webhooks/elevenlabs` y copia el secreto de firma.
6. **Variables en Vercel:** `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `ELEVENLABS_PHONE_NUMBER_ID`, `ELEVENLABS_WEBHOOK_SECRET`, `EMPRESA_NOMBRE`.

## Para la demo

- Da de alta un proveedor con **tu teléfono** como "teléfono del representante", con folio y monto de factura.
- Ensaya los cuatro resultados.
- Ten grabada una llamada exitosa como plan B.
