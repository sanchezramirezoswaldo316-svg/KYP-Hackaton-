# Entrega de Ulises — revisión del MVP

Fecha: 2026-10-28. Rama `ulises/puntaje`; base `cc67a9a`. Revisión contra secciones 8 y 15 de `Proyecto_KYP_Documento_General.pdf`, README, contratos y línea base local. `main` no tiene commits adicionales respecto de esa base; no se consultó el remoto en esta etapa. No se encontraron AGENTS.md aplicables en las revisiones del workspace.

**Estado: corregido el rollback del marcador de generación y añadidas pruebas de regresión.** La auditoría original de 83 pruebas se conserva como evidencia histórica; la corrección posterior pasa 86 pruebas en una copia aislada del workspace. La descarga oficial reciente y la integración en vivo tampoco se certifican.

## Qué cambió y qué se comprobó

| Área | Resultado |
|---|---|
| Puntaje | Cada regla cuenta una vez aunque existan evidencias duplicadas; tres SAT69/listado dan 30/revisar, antes 90/bloquear. Sin sitio 0 → 10 conforme al PDF. Resto de pesos, tope 100, límites y contrato conservados. Entradas intactas y motivos independientes del orden. |
| SAT | RFC normalizados, cuatro estatus 69-B, fechas de calendario y DOF de su propio estatus, parser puro con encabezados y errores explícitos. Desconocidos o conflictos ambiguos rechazan importación con conteos/causas. Agrupación de causas Art. 69 sin duplicados. Descarga con timeout, preparación de conjunto, respaldo y bloqueo de lectores. |
| OFAC | TRANSPORTES/TRANSPORTEZ produce parecida con Dice .90; Dice 1 no convierte ABC DEF XYZ/ABCDEF XYZ en exacta. Igualdad canónica no vacía, índice por bigramas, umbral .82 intacto, desempate estable, SDN ID/programa/URL y aclaración de identidad no confirmada. Solo nombres principales SDN, sin alias. |
| Demo | 500 RFC únicos, selección sin reemplazo y cruce de fuentes, semilla explícita 20261028, 12 filas iniciales incluidas en CSV. Manifiesto contrastado con consultas reales y motor. Fixture web simulado separado, no inyectado. |
| Decisión humana | `servicios.ts` permanece idéntico: crea caso pendiente con `decision_sugerida` y estado en revisión, y exige comentario para aprobar contra bloqueo sugerido. Pruebas existentes de servicios/CLABE pasan. No se modifican pagos ni llamadas. |

Los valores 21/61 no son construibles con pesos múltiplos de cinco: se documenta esa cobertura y se prueban los alcanzables 20/25 y 60/65. No se inventan pesos ni se cambia el contrato para probarlos.

## Verificación ejecutada en este cierre

Entorno: macOS arm64, Apple M2, 8 GiB, Node v24.3.0, npm 11.4.2. Dependencias ya disponibles. No hubo bloqueo de entorno en test/lint/build.

| Comando / comprobación | Resultado |
|---|---|
| `npm test` | 83/83, sin red. Línea base de preparación: 24/24; se conservan las pruebas originales. |
| `npm run lint` | Exit 0. |
| `npm run build` | Exit 0; compilación, tipos y generación de páginas correctas. No equivale a integración en vivo. |
| `npm run demo` | Exit 0; CSV, semilla, manifiesto y fixture idénticos byte a byte al regenerarlos con valores por defecto. Hashes del resto del workspace sin cambios. |
| CLI `scripts/actualizar-listas.mjs` en directorio temporal, con fetch sustituido por fixtures | Exit 0; valida cuatro estados 69-B, tres causas Art. 69 y un registro OFAC. Escribe solo listas y metadatos de publicación temporales. El workspace y código de compañeros no cambian. No fue una descarga real. |
| `git diff --check` | Sin errores. |
| Comparación de contratos/dependencias/snapshots con `cc67a9a` | Idénticos byte a byte. |
| Revisión de rutas y escaneo de credenciales | Sin rutas fuera de perímetro; no se detectaron credenciales en los archivos cambiados mediante revisión y patrones de claves privadas/tokens conocidos. No equivale a auditar todo el historial. |
| Recuperación tras interrupción posterior al marcador | Hallazgo de la auditoría original, corregido posteriormente con tres pruebas nuevas; véase la sección de corrección. |

El primer intento del auxiliar de auditoría excedió el buffer predeterminado de Node al leer un JSON histórico vía git. Se repitió con buffer suficiente y terminó correctamente; no fue un fallo del módulo ni dejó un bloqueo pendiente. Persiste la advertencia previa MODULE_TYPELESS_PACKAGE_JSON; no se cambió package.json.

Evidencia estructurada de regeneración, perímetro y archivos protegidos: `datos/auditoria-ulises.json`. Las pruebas específicas se pueden repetir con:

```bash
node --test src/lib/puntaje/reglas.test.ts
node --test src/lib/verificacion/importacion-sat.test.ts src/lib/verificacion/listas.test.ts src/lib/verificacion/ofac.test.ts
node --test src/lib/verificacion/importacion-demo.test.ts
npm run demo
npm test
npm run lint
npm run build
```

No se ejecutó `npm run listas` contra fuentes de red ni se modificaron los snapshots oficiales. Se revisaron las escrituras estáticas de ambos generadores y se ejerció el CLI de listas offline aislado; no se afirma verificación de todos los comportamientos posibles de una descarga remota.

## Versiones, cobertura y límites

- Snapshot 69-B: 14,055 RFC, actualización declarada 2025-12-31. SAT69: 59,365 RFC. OFAC: 17,561 registros. Descarga declarada común 2026-10-28T05:26:28.518Z. Se conservaron los bytes JSON de la base.
- `actualizacion` es publicación/actualización declarada del archivo, distinta de descarga y de fecha DOF por contribuyente. Los bytes CSV históricos no están disponibles para recertificar sus hashes originales declarados. Los fixtures sí tienen hashes de sus bytes comprobados.
- Art. 69 solo no_localizado/exigible/sentencia. Firmes/cancelados no se consultan. No se agregaron SFP/ONU/REPSE u otras listas.
- La procedencia del servicio SAT se contrastó con portales oficiales en la etapa SAT; el CSV no pudo descargarse por timeout. Los encabezados del perfil estricto **no están certificados contra una edición reciente accesible**. Es un pendiente de validación, no motivo para sustituir publicación por la fecha de ejecución ni falsificar datos actuales.
- OFAC carece de alias ALT.CSV. Normalización y sus colisiones intencionales se documentan en `ofac-comparacion.md`. Una exacta es coincidencia de nombre; no identidad confirmada. Dice no es probabilidad de sanción.
- Medición OFAC registrada en la etapa anterior: ~1.318 s por 500 búsquedas locales, índice ~88 ms, mismo snapshot OFAC pero anterior composición del CSV. No se repitió con el nuevo CSV en este cierre y no se presenta como medición del endpoint ni rendimiento de producción.
- No se comprobó Firecrawl, n8n, LLM, Supabase, UI en navegador, llamadas, despliegue ni webhooks en vivo. La evidencia web del ensayo es simulada.

## Corrección de recuperación (Ulises)

El journal v2 guarda las tres listas y los bytes del marcador anterior (o su ausencia). Rollback restaura ambos antes de quitar el bloqueo; el marcador se escribe mediante temporal y rename. Si la recuperación falla, se conserva el journal para reintentar.

Las nuevas pruebas reproducen la ventana posterior al marcador con fallo controlado e interrupción abrupta, incluyendo marcador anterior presente/ausente, idempotencia y publicación posterior exitosa. Las pruebas de regresión fallan con el código original y pasan con la corrección. Suite posterior: 86/86 en copia aislada; lint correcto. La tabla de 83 pruebas anterior corresponde a la auditoría previa, no a esta corrección.

Journals antiguos sin copia del marcador se rechazan sin quitar el bloqueo ni modificar destinos; requieren recuperación manual. La recuperación sigue requiriendo ausencia de escritor activo. No se añade garantía ante corrupción física o pérdida de energía sin fsync.

## Resultados y reinicio de demo

| Versión | Liberar | Revisar | Bloquear sugerido |
|---|---:|---:|---:|
| Copia auditada antes de corregir sin_sitio | 478 | 15 | 7 |
| CSV anterior con reglas finales | 478 | 6 | 16 |
| CSV entregado | **470** | **5** | **25** |

470 liberables = 464 sintéticos sin coincidencias de listas + 4 desvirtuados + 2 sentencias favorables. Los seis informativos no son excepciones por el mero hecho de aparecer en 69-B. Treinta excepciones = 15 presuntos, 10 definitivos, 4 SAT69 y un homónimo OFAC sintético. Sin sitio suma 10: presunto total 70; definitivo 100 por tope; SAT69 40; homónimo 35. El manifiesto guarda también resultados solo listas 60/100/30/25.

Referencias: `datos/demo-manifiesto.json`, `public/demo/proveedores-demo.csv`, `src/data/demo-semilla.json`. Las razones sociales SAT69 son etiquetas sintéticas porque su JSON compacto no conserva nombres. El manifiesto distingue esos campos y los snapshots históricos. Teléfonos/CLABE/montos/facturas son sintéticos y de formato válido: **no usar para llamadas ni pagos reales**, no se garantiza que sean números inexistentes.

Para mostrar 500: entorno local dedicado en memoria → panel **Reiniciar demo** → cargar CSV con fuentes externas desactivadas. Reiniciar vuelve a sembrar 12; esos 12 están dentro del CSV y se reutilizan por RFC. No cargar sobre datos antiguos ajenos al CSV; altaProveedor conserva datos de proveedores ya existentes. El reinicio no funciona en Supabase (409): Oswaldo prepara su entorno de ensayo. No se modificaron endpoints ni se ejecutó limpieza de una base real.

## Contrato de entrega a Oswaldo y Alan

- Firmas conservadas: `calcularPuntaje(Hallazgo[]): ResultadoPuntaje`, `revisar69B(rfc)`, `revisar69(rfc)`, `revisarOfac(razonSocial)`, todas con sus campos vigentes. `Hallazgo`, `EntradaAlta` y `WebhookVerificacion` intactos; este último recibe `proveedor_id` y `hallazgos`, no requiere resumen_ia.
- Alan aporta hallazgos/evidencia web en el contrato vigente; IA puede describir/comparar contenido, nunca calcular puntos. El fixture separado identifica qué es simulado. No requiere modificaciones de tipos.
- Oswaldo conserva revisión humana, pagos, persistencia y decisión final. Un error del lector durante publicación debe tratarse como fallo técnico, no convertirse en sin_coincidencia. Procesos con caché conservan su conjunto; reiniciar para adoptar una nueva generación.
- Política del PDF implementada: pesos, umbrales, bloqueos sugeridos, revisión humana. Políticas **adicionales no activadas**: revisión técnica sin puntos ante fallo oficial, antigüedad máxima por fuente y precedencia entre hallazgos contradictorios. Hoy `[]` y solo `error` dan 0/liberar. Reglas contradictorias distintas conservan sus efectos; el motor no declara cuál estatus es vigente. El parser rechaza eventos ambiguos en una nueva importación; no depura silenciosamente hallazgos externos del contrato.
- Los pendientes detallados están en `datos/pendientes-integracion.md`, incluida la corrección del marcador de generación. Sin tablas/migraciones nuevas ni autorización global sobre verificacion.

## Guion fiscal de 40 segundos (ensayo offline identificado)

**0–12 s:** “Este caso corresponde al RFC SID1505291A4, Servicios Industriales Diseinco. El snapshot histórico lo registra como presunto 69-B, publicado en el DOF el 24 de octubre de 2025. Eso aporta 60 puntos; no afirmamos su situación actual.”

**12–28 s:** “Para este ensayo abrimos el fixture separado: la señal de giro no coincidente es explícitamente simulada y aporta 20. Sustituye la ausencia de sitio; no procede de Firecrawl. El motor calcula 80 y muestra ambos motivos.”

**28–40 s:** “Se sugiere bloquear, pero decide el gestor. La IA no calcula el puntaje. En el CSV, sin esa señal web simulada, este mismo proveedor suma 70 por presunto más falta de sitio.”

Material: `datos/fixtures/demo-presunto-giro-simulado.json`. Pendiente Alan/Samuel/Oswaldo para reproducir esa escena en el flujo visual; no anunciar que ya funciona en vivo.

## Perímetro, autoría y PR

La preparación encontró el repositorio anidado limpio en cc67a9a. El delta actual corresponde a las etapas de Ulises realizadas en esta sesión; no se detectaron cambios ajenos o fuera de perímetro y no se revirtieron archivos. Al ser cambios sin commit, Git no atribuye individualmente cada línea a una persona.

`src/lib/tipos.ts`, `servicios-tipos.ts`, `verificacion/index.ts`, `servicios.ts`, almacen, app, components, PDF, voz, n8n, Supabase, configuraciones, .env y dependencias están fuera del diff. No hubo push, PR abierto, merge ni despliegue. Los archivos nuevos sin seguimiento también forman parte de la entrega: deben incluirse al preparar el commit; `git diff` por sí solo no los muestra.

Título y descripción propuestos en `datos/PR_ULISES.md`. La revisión debe conservar visibles los límites de recuperación y la validación SAT reciente aún no realizada.
