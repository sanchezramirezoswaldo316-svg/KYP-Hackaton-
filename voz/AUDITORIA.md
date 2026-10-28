# Auditoría de Axel — 28/10/2026

Alcance: rama `codex/axel-verificacion-voz`, servicios de CLABE, callbacks, evidencia y capa de errores. Revisión manual de código, pruebas automatizadas y auditoría npm. No es una certificación de seguridad ni valida telefonía real.

## Hallazgos corregidos

| Severidad | Hallazgo | Corrección / evidencia |
| --- | --- | --- |
| Alta | Supabase podía guardar solicitud sin completar la pausa si fallaba la escritura siguiente | RPC `crear_solicitud_voz`, migración 0004; prueba de rollback al fallar bitácora |
| Alta | Telefonía parcialmente configurada habilitaba la simulación | La presencia de PHONE_NUMBER_ID impide simular; la solicitud deja pausa/caso con error de configuración |
| Alta | Despliegue con datos persistentes o telefonía podía quedar sin contraseña | Middleware devuelve 503 sin APP_PASSWORD si existe teléfono o service role; webhooks conservan autenticación propia |
| Alta | Avisos heredados de PostCSS bajo Next | Override de PostCSS 8.5.32, sin cambiar Next de versión mayor; npm audit final sin avisos |
| Media | Decisión manual podía quitar pausa con otra solicitud pendiente | Se conserva la pausa al decidir casos de CLABE y al aprobar/pausar un alta con solicitudes pendientes |
| Media | Solicitud directa permitía intentar cambio de un proveedor bloqueado | Validación en servicio y RPC antes de crear solicitud |
| Media | Basic Auth malformado daba excepción y contraseña con dos puntos fallaba | Parseo defensivo; HTTP 401 consistente |
| Media | Escrituras desde otro origen con credenciales del navegador | Validación Origin/Sec-Fetch-Site fuera de webhooks |
| Media | Simulación fallida quedaba sin mensaje | Catch, aviso accesible y posibilidad de volver a actuar tras revisar estado |
| Media | Interfaz confundía datos incorrectos con negativa y prometía pagos liberados | Mensajes distintos por resultado; consulta de estado actual; sin afirmar fraude confirmado |
| Media | Callback ausente dejaba “llamando” indefinidamente sin advertencia | Aviso a los 10 minutos, pago pausado, instrucciones de revisión sin repetir llamada |
| Media | Audio y errores de red no tenían recuperación visible | Carga de audio con estados de espera/error, mensajes de red/timeout; páginas error, global-error y 404 |
| Baja | JSON/campos incorrectos de solicitud causaban 500 | Validación de esquema; respuesta 400 legible |

## Validaciones

- 106 pruebas Node sobre el conjunto integrado: incluye cuatro resultados, teléfono registrado, pausa antes de marcar, correlación, firma, duplicados, conflictos, fallos, recuperación de estado, PostgreSQL y errores del cliente.
- 14 comprobaciones HTTP: firma, JSON, agente, correlación, webhook genérico, audio, Basic malformado, validación de CLABE, 404 y origen cruzado.
- Dos comprobaciones HTTP adicionales con `--sin-password`: página y POST bloqueados cuando hay telefonía sin contraseña.
- TypeScript, ESLint y build Next aprobados después de los cambios; lockfile comprobado con npm ci --dry-run.
- Prueba PostgreSQL con PGlite. No sustituye prueba sobre el Supabase real ni prueba de carga multiinstancia.
- El navegador de automatización no estuvo disponible. Queda pendiente revisar visualmente los avisos, audio y recuperación en navegador con el equipo.

## Límites que impiden declarar producción validada

1. No hay evidencia de llamada real con Twilio; transcripción/resumen/audio reales pendientes. Las simulaciones conversacionales previas de ElevenLabs devolvieron HTTP 500. Las pruebas locales de flujo usan respuestas interceptadas.
2. La clasificación de identidad/datos todavía depende del agente y su análisis LLM. No es autenticación fuerte ni comparación bancaria determinista en el servidor. No se alteró la aprobación automática actual: Axel y Oswaldo deben acordar revisión humana antes de usar pagos reales.
3. Los resultados de voz y el inicio de solicitud son transaccionales en Supabase. Las decisiones manuales del sistema compartido no son aún una transacción común con todos los cambios de alta/CLABE. Falta una prueba de concurrencia entre operadores, re-verificación y callbacks en staging; no afirmar exclusión global de esas carreras.
4. Basic Auth es acceso compartido para la demo, no roles por proveedor. Configurar controles de acceso y límites de tráfico en el despliegue antes de exposición amplia.
5. Retención de audio remota de 30 días, sin archivo privado de largo plazo. Un timeout al iniciar llamada tiene resultado incierto: revisar el proveedor antes de volver a marcar.
6. El almacén en memoria solo sirve para demo local de un proceso. No usarlo para callbacks reales en Vercel.

## Compatibilidad con el equipo

Se conservan los tipos y resultados compartidos, y las rutas previas. `enviar` mantiene sus dos argumentos existentes; el tercero (timeout) es opcional y solo lo usa voz. `LineaTiempoClabe` añade `fallo` opcional. No se modifican puntaje, SAT ni workflows n8n.

Cambios de integración que sí deben conocer: aplicar las migraciones de voz 0003 y 0004 después de 0002_automatizacion; configurar APP_PASSWORD con Supabase o teléfono; callbacks genéricos reales requieren conversación correlacionada; simulación deshabilitada si existe PHONE_NUMBER_ID aunque falten otras variables. Samuel debe conservar estos avisos al editar las pantallas.

La comprobación de merge con las ramas remotas conocidas se realiza antes de subir; no puede garantizar compatibilidad con commits futuros aún inexistentes. No se reescriben ramas ajenas ni se usa force-push.

## Actualización de integración local

Se incorporó main hasta bb5a259 (incluye la última integración de Samuel), preservando automatización, portal y puntaje. Las dos migraciones de voz se renombraron a 0003/0004 para no colisionar con 0002_automatizacion del equipo. Las 106 pruebas conjuntas pasan; también se verificó por HTTP el recorrido local y los contratos de n8n con un receptor ficticio. Ver DEMO-LOCAL.md. No se ha validado telefonía ni cuentas externas reales.
