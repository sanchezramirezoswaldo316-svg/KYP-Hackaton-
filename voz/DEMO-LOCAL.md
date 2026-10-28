# Demo local del hackathon, sin Twilio

## Arranque

Desde la raíz de KYP-Hackaton-, con Node 24 y las dependencias instaladas (`npm ci`):

```sh
npm run demo:local
# Alternativa directa (también evita problemas por el ':' de la ruta):
node scripts/demo-local.mjs
# Si el puerto está ocupado:
node scripts/demo-local.mjs --port=3001
```

Abrir `http://localhost:3000/clabe` (o el puerto elegido). El servidor escucha solo en 127.0.0.1. Detener con Ctrl+C. No arrancar a la vez otro Next dev/build en este checkout.

El lanzador lee los archivos de entorno normales de Next y **no los modifica**. Solo en el proceso local vacía ELEVENLABS_PHONE_NUMBER_ID y las dos variables de Supabase. Conserva Firecrawl, Claude, ElevenLabs, n8n, sus secretos y APP_PASSWORD. Usa datos en memoria, desactiva telefonía y establece APP_URL al localhost del puerto elegido. Al detener/reiniciar se pierde la evidencia de esa sesión. Las cuentas de prueba de los compañeros y las credenciales guardadas quedan intactas.

## Qué sigue funcionando y qué es simulado

| Componente | Comportamiento |
| --- | --- |
| Alta, puntaje, políticas, bandeja, documentos y expediente | Código integrado de main; datos locales en memoria |
| SAT/OFAC | Archivos ya versionados, sin descargar listas nuevas al arrancar |
| Firecrawl y Claude | Continúan consultando sus APIs si tienen claves y la acción pide fuentes externas; necesitan internet y pueden consumir sus cuotas |
| n8n: notificaciones salientes | POST a N8N_WEBHOOK_NOTIFICACIONES si está configurado, manteniendo x-kyp-secret |
| n8n: hallazgos entrantes | Mismo /api/webhooks/verificacion y contrato; necesita WEBHOOK_SECRET y conectividad desde n8n a la app |
| ElevenLabs | Clave y agente conservados. Esta demo NO mantiene una conversación en vivo: reproduce el MP3 sintético generado previamente |
| Telefonía | Sin llamadas Twilio. Se elige resultado y se guarda simulada=true |
| Audio de respaldo | En /clabe, “Escuchar demostración de voz pregrabada”; también descargable, explícitamente separado de la evidencia real |

En este checkout, al preparar la entrega, solo estaban configurados ElevenLabs/agente y Twilio. Faltaban FIRECRAWL_API_KEY, ANTHROPIC_API_KEY, WEBHOOK_SECRET y N8N_WEBHOOK_NOTIFICACIONES. No afirmar que esas APIs están activas solo porque la aplicación sea local. `/api/estado` informa configuración, no certifica disponibilidad ni credenciales válidas.

## Ensayo de 3 minutos

1. Abrir Cambios de cuenta. Seleccionar un proveedor ficticio que no esté bloqueado.
2. Usar la CLABE de prueba `012180001234567899`, registrar y ver el pago pausado. No usar datos bancarios reales.
3. Elegir “No reconoce el cambio”. Ver cuenta anterior intacta, caso y conversación marcada Simulada.
4. Abrir expediente y PDF. Mostrar que el origen de prueba queda visible.
5. Repetir con una solicitud nueva para los otros resultados; una solicitud ya procesada no admite cambiar su resultado.
6. Reproducir el audio sintético como explicación del guion, anunciando que no es llamada de esa solicitud.

## Conectar n8n sin confusiones

- n8n ejecutado directamente en esta misma máquina puede usar `http://localhost:3000`.
- n8n en Docker requiere configurar conectividad hacia el host; `localhost` dentro del contenedor es el contenedor. El lanzador está limitado a loopback: no prometer acceso desde Docker sin comprobar esa red.
- n8n Cloud puede recibir avisos salientes desde nuestra app local, pero NO devolver callbacks a `localhost`. Para callbacks remotos se necesita una URL de desarrollo accesible y protegida; no se abre ningún túnel automáticamente.
- Los enlaces al portal que genere APP_URL=localhost solo sirven desde esta máquina. Para proveedores remotos se necesita una URL pública.
- Si existe APP_PASSWORD, usar Basic Auth en las rutas internas; webhooks usan x-kyp-secret y el portal su token.
- El prototipo de alta de Alan conserva su retorno desactivado. Antes de activarlo acordar con Oswaldo quién consulta cada fuente para no crear verificaciones duplicadas. Ver n8n/README.md.

Para habilitar las integraciones pendientes, cada responsable guarda las credenciales y URL de su instancia en `.env` y se reinicia la demo. Nunca subirlas a Git. El modo local no ofrece créditos gratuitos de Firecrawl, Claude o ElevenLabs: evita la telefonía de Twilio y permite ensayar sin consultas externas.

## Prueba reproducible

```sh
node --test 'src/**/*.test.ts'
node voz/probar-demo-local.mjs
node voz/probar-http.mjs
node voz/probar-http.mjs --sin-password
node node_modules/typescript/bin/tsc --noEmit
node node_modules/next/dist/bin/next build
```

La prueba de demo inicia un servidor temporal y un receptor n8n ficticio local. Usa claves ficticias, alta por lote sin fuentes externas y verifica cuatro resultados, duplicados, pausa, expediente/PDF, MP3, portal y contratos n8n. No es una prueba de las cuentas reales ni de voz en vivo.

## Migraciones e integración del equipo

`main` ya tiene `0002_automatizacion.sql`. Para evitar IDs repetidos, las migraciones de voz pendientes del PR se renombraron:

- `0002_resultado_voz.sql` → `0003_resultado_voz.sql`.
- `0003_solicitud_voz_atomica.sql` → `0004_solicitud_voz_atomica.sql`.

Para una base nueva, aplicar 0001, 0002_automatizacion, 0003_resultado_voz y 0004_solicitud_voz_atomica en orden. La demo local no necesita ejecutarlas. Si alguien aplicó los nombres anteriores manualmente o con la CLI, reconciliar el historial de migraciones con Oswaldo antes de hacer db push; no volver a ejecutar a ciegas. Los RPC de voz son create or replace y las pruebas verifican el esquema conjunto.
