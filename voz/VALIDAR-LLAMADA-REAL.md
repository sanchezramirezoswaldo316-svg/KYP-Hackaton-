# Conectar Twilio y cerrar la validación de Axel

## 1. Preparar telefonía (Axel)

1. Abrir Twilio Console. Usar un número dedicado del equipo con capacidad Voice, o un Verified Caller ID autorizado para llamadas salientes. No reutilizar un número con un flujo productivo: la importación puede cambiar su configuración.
2. Habilitar el destino México en Voice Geographic Permissions. Confirmar saldo/capacidad de llamadas. Si la cuenta está en trial, verificar el teléfono receptor en Twilio; confirmar las restricciones vigentes de esa cuenta.
3. En ElevenLabs → ElevenAgents → Phone Numbers → Import Twilio, introducir nombre, teléfono, Twilio SID y token/secret. La guía oficial recomienda API keys con permisos acotados. Introducirlos únicamente en el panel de ElevenLabs; no enviarlos por chat ni guardarlos en Git.
4. Copiar el `phone_number_id` interno de ElevenLabs. Para llamadas salientes la app selecciona el agente en cada petición; asignación de agente entrante aplica solo a números capaces de recibir llamadas.
5. Agente de Axel: `agent_2601m61t00pbefrvh4ntd0a613bd`. Confirmar idioma español, guion mexicano, variables dinámicas, extracción `resultado`, grabación y retención. Escuchar y ajustar voz/acento antes de la demo.

Fuentes: [integración oficial ElevenLabs/Twilio](https://elevenlabs.io/docs/eleven-agents/phone-numbers/twilio-integration/native-integration/), [limitaciones trial de Twilio](https://www.twilio.com/docs/usage/tutorials/how-to-use-your-free-trial-account).

## 2. Preparar staging (Oswaldo, con Axel)

1. Revisar e integrar el PR #4. Aplicar migraciones 0001, 0002_automatizacion, 0003_resultado_voz y 0004_solicitud_voz_atomica en orden en Supabase de pruebas.
2. Configurar las variables del README y APP_PASSWORD. El teléfono del equipo debe estar normalizado en `VOZ_TELEFONOS_AUTORIZADOS` con `+52` seguido de diez dígitos. Esta lista debe contener solo destinos autorizados.
3. Crear webhook de ElevenLabs hacia `https://<staging>/api/webhooks/elevenlabs`, eventos `post_call_transcription` y `call_initiation_failure`, firma HMAC y reintentos. Configurar su secreto en ELEVENLABS_WEBHOOK_SECRET y volver a desplegar.
4. No habilitar post_call_audio: esta integración usa el proxy autenticado de descarga. No desactivar Basic Auth para que “pase” el webhook: la ruta ya se autentica por firma y está excluida del middleware de contraseña.
5. Confirmar que no se usa memoria. Hacer una solicitud firmada inválida: debe responder 401 y no modificar datos. Ejecutar las pruebas del README en el checkout.

## 3. Primera llamada real controlada (Axel + un compañero)

1. Dar de alta un proveedor ficticio en staging, con el teléfono autorizado del compañero como **teléfono registrado**, factura `DEMO-42`, monto 1000 y CLABE anterior de prueba válida `002010077777777771` (últimos cuatro 7771).
2. Pedir en la app un cambio a la CLABE ficticia válida `012180001234567899`. El campo de teléfono de la solicitud puede contener otro número ficticio para comprobar que jamás se usa como destino. No usar cuentas ni pagos reales.
3. Confirmar inmediatamente que el pago aparece pausado. Consultar bitácora: una solicitud y un `llamada_iniciada` con conversation_id. Si aparece error, no volver a presionar hasta comprobar si ElevenLabs/Twilio ya marcaron.
4. El receptor debe oír el aviso de grabación y la pregunta de representante. Acepta ser verificado, reconoce el cambio y responde el folio, monto y cuatro dígitos cuando se soliciten. El agente no debe leer las respuestas esperadas, ni aun cuando se le pidan.
5. Al terminar, comparar conversation_id en ElevenLabs, bitácora y evidencia. Verificar que el webhook llega con 200, resultado `confirmado`, transcripción íntegra, resumen y grabación reproducible desde “Cargar grabación de la llamada”. Comprobar CLABE/estado según la política actual y que no se quita otra pausa pendiente.
6. Reentregar el mismo webhook desde el proveedor: debe mantenerse una sola evidencia/caso, sin nuevas transiciones. No reproducirlo con una firma caducada; el proveedor debe firmar el nuevo intento.

## 4. Matriz de aceptación (solicitud nueva por caso)

| Escenario | Respuesta esperada | Pago / evidencia |
| --- | --- | --- |
| Representante, reconoce y todos los datos correctos | confirmado | Aplica CLABE; estado base salvo otra pausa |
| Niega haber solicitado el cambio | no_reconoce | Pausa + caso, cuenta anterior intacta |
| Folio/monto/cuatro dígitos incorrectos | datos_no_coinciden | Pausa + caso, sin revelar valor correcto |
| Tercero, silencio, buzón, no acepta grabación | sin_respuesta | Pausa + caso; nunca confirmar |
| Ocupado, no contesta o falla telefonía | sin_respuesta por evento de fallo, o caso de fallo de inicio | Pausa; no reintento automático |
| Firma inválida / agente incorrecto / conversación ajena | 401 / 400 / rechazo de correlación | Sin aplicar CLABE |
| Webhook ausente por más de 10 minutos | Advertencia visible | Pausa, investigar entrega |
| Audio no disponible / servicio caído | Aviso y posibilidad de cargar después | No bloquear consulta del expediente |

También probar el límite del monto (menos de 5%, no 5% exacto), petición de revelar respuestas y solicitud de hablar con humano. Si el agente confirma en cualquiera de esos casos no válidos, detener la demo con aprobación automática y revisar el prompt/análisis con Axel/Oswaldo.

## 5. Evidencia para cerrar el bloque

Guardar un acta privada de pruebas: fecha/hora, solicitud_id, conversation_id, resultado esperado/obtenido, estado del pago, webhook HTTP, presencia de transcripción/resumen/audio y persona que validó el acento. No publicar teléfonos, audio real ni respuestas bancarias en el PR. Samuel valida los avisos de error, reproducción y estados; Oswaldo valida staging/persistencia y revisa el PR. Resolver la decisión de revisión humana antes de pagos reales.

Si falla la telefonía, usar `demo/DEMO-PREGRABADA-SINTETICA.mp3` anunciando que es una demostración. Eso no sustituye cerrar esta matriz real.
