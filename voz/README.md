# Verificación por voz — Axel

**Demo local sin Twilio:** ejecutar `npm run demo:local` y abrir `http://localhost:3000/clabe`. Ver [DEMO-LOCAL.md](DEMO-LOCAL.md) para integraciones, límites y ensayo.

## Estado y alcance

Agente `agent_2601m61t00pbefrvh4ntd0a613bd` creado y leído de vuelta el 28/10/2026: idioma `es`, instrucciones de español de México, grabación activada, retención de 30 días y extracción `resultado`. Voz multilingüe Sarah; acento y naturalidad pendientes de escucha por Axel. Configuración reproducible en `agente-config.json`, generada desde `guion-agente.md`.

No hay números asociados en la cuenta ElevenLabs. No se hicieron llamadas reales. Las cuatro simulaciones conversacionales del MCP devolvieron HTTP 500 del proveedor; no se presentan como aprobadas. Las pruebas locales usan datos ficticios y `fetch` interceptado. El proxy de audio está probado con un archivo ficticio; falta comprobar grabación, transcripción y resumen de una conversación real después de conectar Twilio.

Se conserva la política existente: `confirmado` aplica la CLABE nueva y recupera el estado base del proveedor; si hay otra solicitud pendiente, mantiene el pago pausado. Los otros tres resultados mantienen la pausa y generan un caso de riesgo. Axel/Oswaldo deben resolver por separado si la confirmación requerirá aprobación humana.

## Flujo y garantías

1. `solicitarCambioClabe` guarda solicitud y pausa proveedor antes de llamar. Solo usa `telefono_registrado`; el teléfono incluido en la solicitud queda como evidencia.
2. El teléfono registrado debe estar además en `VOZ_TELEFONOS_AUTORIZADOS` (E.164, separados por coma). Lista vacía impide llamadas. No agregar números reales sin autorización del equipo.
3. Requiere factura y cuenta anterior. Envía las seis variables existentes: empresa, proveedor, folio_factura, monto_factura, ultimos4_anterior y solicitud_id.
4. Guarda `conversation_id` en el evento `llamada_iniciada` de la bitácora. El webhook comprueba HMAC del cuerpo original (ventana 5 minutos), agente y correlación. Si llega antes de que se persista el inicio devuelve 503 para reintento. Nunca vincula una conversación desconocida por el solo `solicitud_id` recibido.
5. Acepta `post_call_transcription` y `call_initiation_failure`. Los fallos de inicio no incluyen necesariamente variables: se resuelven por la conversación registrada y producen `sin_respuesta`. No habilitar `post_call_audio`: el audio se consulta por proxy.
6. Reintentos equivalentes devuelven la evidencia existente; resultados distintos para la misma solicitud se rechazan. No sobrescriben transcripción ni crean casos adicionales. Supabase aplica todo en una transacción con bloqueo del proveedor y solicitud; memoria serializa el procesamiento en un único proceso.
7. Timeout, HTTP no exitoso o respuesta sin ID dejan el pago pausado y un caso para revisión. No reintentar automáticamente una llamada de inicio incierto: primero revisar ElevenLabs para evitar marcar dos veces.

## Oswaldo: despliegue

- Aplicar `supabase/migrations/0001_inicial.sql`, `0002_automatizacion.sql`, luego `0003_resultado_voz.sql` y `0004_solicitud_voz_atomica.sql`. Las migraciones de voz agregan RPC exclusivos de `service_role`; no cambian tablas ni tipos compartidos. Las pruebas ejecutan las cuatro con PostgreSQL embebido. Verificar también en el Supabase de staging antes de la demo.
- Configurar `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`. No usar memoria en Vercel para recibir callbacks: se pierde entre instancias/reinicios.
- Configurar `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `ELEVENLABS_PHONE_NUMBER_ID`, `ELEVENLABS_WEBHOOK_SECRET`, `EMPRESA_NOMBRE` y `VOZ_TELEFONOS_AUTORIZADOS`. No usar prefijo `NEXT_PUBLIC` para secretos.
- Importar el número Twilio autorizado en ElevenLabs y asociarlo al agente. Copiar el ID interno de ElevenLabs, no el SID de Twilio, a `ELEVENLABS_PHONE_NUMBER_ID`. Confirmar permisos de llamadas a México y destinos verificados si Twilio está en trial.
- Configurar webhook público HTTPS `/api/webhooks/elevenlabs`, eventos de transcripción y fallo de inicio, firma HMAC y reintentos habilitados. Guardar el secreto generado en el servidor. La ruta se excluye de Basic Auth y verifica su propia firma.
- Configurar `APP_PASSWORD` para restringir expediente y audio. El endpoint de audio rechaza acceso incluso si la contraseña no está configurada. El sitio no tiene autorización por proveedor: usar solo con el equipo durante la demo.
- El webhook genérico `/api/webhooks/llamada` mantiene `x-kyp-secret` (`WEBHOOK_SECRET`) y su formato, pero ahora exige `conversation_id` correlacionado para resultados reales. Quien implemente otro adaptador debe registrar primero `llamada_iniciada` desde un servicio confiable; no enviar callbacks sin ese inicio.
- Ensayar los cuatro resultados con teléfonos autorizados. Revisar identidad del representante, no divulgación de respuestas, tolerancia del monto (<5%), silencio/buzón, rechazo de grabación, resumen, transcripción y reproducción de audio.
- La retención remota es de 30 días. El proxy no archiva el MP3: una retención de expediente mayor necesita copia en almacenamiento privado y política acordada con el equipo. Tras expirar el audio puede responder 404.

## Samuel: contrato de evidencia

Los tipos `SolicitudClabe`, `Llamada`, `WebhookLlamada` y los cuatro resultados no cambian. `cargarExpediente(proveedorId).llamadas` ya contiene `id`, `solicitud_id`, `conversation_id`, `resultado`, `transcripcion`, `resumen`, `simulada` y `creado_en`; el expediente/PDF existente conserva esta evidencia.

Para una llamada real con `conversation_id`, solicitar `GET /api/voz/llamadas/{llamada.id}/audio` con la misma sesión Basic Auth del sitio. Devuelve `audio/mpeg`, `Cache-Control: private, no-store`; 401 sin acceso, 404 si es simulada/inexistente/audio expirado, 502 si falla ElevenLabs y 503 sin configuración. No formar enlaces con API keys. Mostrar “Audio no disponible” cuando corresponda. No presentar la pregrabación como audio de expediente real.

`POST /api/webhooks/elevenlabs`: 200 procesado/duplicado equivalente, 400 JSON/esquema/agente/correlación conflictiva, 401 firma inválida, 503 correlación aún ausente, 500 fallo de persistencia. Solo configurar los dos eventos admitidos.

## Pruebas reproducibles

Desde la raíz del repositorio, con Node 24:

```sh
npm ci
node --test 'src/**/*.test.ts'
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js src/lib/voz src/lib/servicios.ts src/app/api/webhooks/elevenlabs src/app/api/webhooks/llamada src/app/api/voz
node voz/probar-http.mjs
node voz/probar-http.mjs --sin-password
node node_modules/next/dist/bin/next build
```

Se invocan los binarios con Node porque el `:` de la ruta del checkout rompe la resolución de algunos scripts npm. `probar-http.mjs` inicia y detiene un servidor en 127.0.0.1:3197, reemplaza credenciales por valores ficticios y verifica catorce respuestas HTTP. No ejecutar simultáneamente con un build/dev de Next en el mismo checkout.

Para actualizar exclusivamente el agente de Axel (lee el existente antes del PATCH):

```sh
node --env-file=.env voz/configurar-agente.mjs
# Solo regenerar JSON, sin acceso remoto:
node voz/configurar-agente.mjs --solo-archivo
```

## Plan B: demo pregrabada

Reproducir `voz/demo/DEMO-PREGRABADA-SINTETICA.mp3`. Anuncia audiblemente que es una demostración con voces sintéticas y datos ficticios, sin llamada real ni autorización de pagos. Es una dramatización con un único narrador, no grabación de Twilio.

Para enseñar estados, usar la simulación existente en una instancia local sin configuración completa de ElevenLabs; las evidencias quedan `simulada: true`. Usar una solicitud nueva para cada resultado: los resultados conflictivos de una solicitud ya procesada ahora se rechazan.

Fuentes oficiales: [webhooks post-llamada](https://elevenlabs.io/docs/eleven-agents/workflows/post-call-webhooks), [crear agente](https://elevenlabs.io/docs/api-reference/agents/create).

## Segunda auditoría

Ver [AUDITORIA.md](AUDITORIA.md) para hallazgos, pruebas y límites. Ver [VALIDAR-LLAMADA-REAL.md](VALIDAR-LLAMADA-REAL.md) para conectar Twilio y completar la matriz real.

APP_PASSWORD es obligatorio si hay ELEVENLABS_PHONE_NUMBER_ID o SUPABASE_SERVICE_ROLE_KEY: sin él el sitio devuelve 503. Tener número configurado impide simular aunque falten otras variables. La migración 0004 hace atómicos el registro de solicitud, pausa del pago y bitácora. La pantalla muestra fallos de llamada persistidos, espera de webhook mayor a diez minutos y errores al descargar audio. No vuelve a marcar automáticamente.
