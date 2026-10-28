# Pendientes de integración — diagnóstico de Ulises

## Caso de demo: presunto 69-B + giro no coincidente

- Responsable: Alan (web/Firecrawl y hallazgos); Oswaldo (integración y decisión humana).
- Contrato vigente: `Hallazgo` en `src/lib/tipos.ts`; `WebhookVerificacion` recibe `proveedor_id` y `hallazgos`. No requiere cambios de tipos.
- Ejemplo de hallazgo para un proveedor presunto: `{"fuente":"web","resultado":"giro_no_coincide","detalle":"La actividad observada no coincide con el giro declarado; incluir evidencia de la consulta real o identificar explícitamente el fixture como simulado","fecha_fuente":"2026-10-28","evidencia_url":null}`.
- Resultado esperado con reglas de la sección 8: presunto +60 y giro no coincidente +20 = 80; decisión sugerida `bloquear`. Si además llega `sin_sitio`, aporta +10 con la corrección implementada. El motor no confirma un bloqueo: el gestor decide en el flujo de Oswaldo.
- Situación actual: los 500 registros CSV tienen sitio vacío y la semilla usa `null`; por sí solos no reproducen la evidencia web del guion de la sección 17.
- Entrega independiente de Ulises en etapas posteriores: fixture explícitamente simulado y resultado esperado del motor; Alan aporta evidencia web real cuando esté disponible. No cambiar `verificacion/index.ts`, servicios, API, interfaz ni flujos n8n desde este módulo.

## Diferencia documental en el webhook

- Responsables: Oswaldo y Alan.
- El ejemplo de la sección 12 del PDF incluye `resumen_ia`; el contrato vigente `WebhookVerificacion` contiene únicamente `proveedor_id` y `hallazgos`. `verificacion/index.ts` genera el resumen después de calcular el puntaje.
- Ejemplo compatible actual: `{"proveedor_id":"ID_DEL_PROVEEDOR","hallazgos":[{"fuente":"web","resultado":"giro_no_coincide","detalle":"Fixture simulado para demo","fecha_fuente":"2026-10-28"}]}`.
- Mantener el contrato actual en el trabajo de Ulises. Cualquier alineación adicional del webhook o del documento queda a cargo de integración; la IA no calcula el puntaje.

## Políticas adicionales al PDF: pendientes de Oswaldo

- Comportamiento vigente preservado: `calcularPuntaje([])` devuelve 0 / `liberar`; hallazgos con `resultado: "error"` o `no_consultado` no aportan puntos ni motivos. Ejemplo: `[{"fuente":"sat_69b","resultado":"error","detalle":"No se pudo consultar","fecha_fuente":null}]` devuelve 0 / `liberar`. Esto no demuestra ausencia de riesgo.
- Propuesta, no implementada: ante fallos de fuentes oficiales SAT/OFAC, generar revisión técnica sin puntos adicionales. Oswaldo debe definir su representación y flujo con Alan; no cambiar contratos ni introducir una regla de riesgo desde este módulo. El resultado de puntaje y la disponibilidad técnica son conceptos distintos.
- Antigüedad de los datos: pendiente definir vigencia por fuente, tolerancia y acción ante fechas ausentes o listas antiguas; no se aplica una penalización nueva.
- Datos contradictorios: pendiente definir precedencia, versión y tratamiento de hallazgos incompatibles. Actualmente reglas distintas conservan sus motivos y efectos; solo se deduplican copias de la misma regla. Ejemplo: `definitivo` y `sentencia_favorable` conservan ambos motivos, 100 puntos y bloqueo sugerido; no se selecciona silenciosamente un estatus como vigente.
- Estas políticas exceden las reglas del PDF; requieren decisión explícita de integración y no autorizan cambios de contratos compartidos.

## Persistencia de listas y actualización concurrente

- Responsable: Oswaldo. Contrato actual: `revisar69B/revisar69` devuelven `Hallazgo`; las tres listas se capturan juntas y mantienen en caché por proceso. Un lector frío rechaza cargas si existe `datos/ulises-publicacion` o cambia la generación durante lectura; no convertir ese fallo técnico en `sin_coincidencia`.
- Ejemplo: una actualización interrumpida requiere detener al escritor y ejecutar `npm run listas -- --recuperar`; después reiniciar procesos para adoptar la versión publicada. Los procesos con caché siguen sirviendo su conjunto anterior íntegro.
- Persistencia futura multiinstancia debe ofrecer versión inmutable de las tres fuentes y activación atómica de una generación; no depender de tres escrituras independientes. Sin cambios de tablas, migraciones ni contratos en esta entrega.
- Generadores o consumidores directos de `src/data/*.json` deben correr fuera de la ventana de publicación. Detalles operativos y limitaciones en `sat-importacion.md`.

## OFAC: cobertura de nombres y decisión humana

- Responsables: Oswaldo (revisión humana e integración), Ulises (matching).
- Contrato conservado: `revisarOfac(razonSocial): Hallazgo`; resultados `coincidencia_exacta`, `coincidencia_parecida`, `sin_coincidencia`. Ejemplo: nombre `TRANSPORTEZ` frente a `TRANSPORTES` produce parecida, +25 sin bloqueo directo. Dice 1 tampoco garantiza igualdad canónica.
- Solo se consultan nombres principales SDN, sin alias ALT.CSV. Una futura incorporación requerirá conservar relación SDN ID/hashes y pruebas; no está implementada aquí. No se agregan listas no-SDN.
- `evidencia_url` enlaza la ficha oficial por ID; igualdad canónica significa coincidencia de nombre, nunca identidad confirmada. Los motivos del motor y la acción humana mantienen el contrato vigente. Véase `ofac-comparacion.md` para límites de normalización y medición local.

## Demo final 470/30 y escena fiscal separada

- Responsables: Alan (evidencia web), Samuel (presentación), Oswaldo (integración).
- `datos/demo-manifiesto.json` documenta los 500 RFC y resultados finales: 470 liberar, 5 revisar, 25 bloquear sugerido. La semilla de 12 es subconjunto de ese CSV; reiniciar en memoria antes de cargar el lote, con fuentes externas desactivadas. Guía en `datos/README.md`.
- `datos/fixtures/demo-presunto-giro-simulado.json` entrega un RFC presunto real del snapshot y un hallazgo web explícitamente simulado, con resultado 80 calculado. El ensayo sustituye `sin_sitio` por `giro_no_coincide`; no sumar ambas señales si se pretende mostrar 80.
- El flujo CSV actual no inyecta este fixture ni evidencia web. Pendiente decidir cómo presentarlo, identificado como simulado, o aportar web real. No alterar API/pantallas/servicios desde el módulo de Ulises. Esta escena es independiente del lote 470/30.

## Hallazgo del cierre: marcador durante recuperación

- Responsable: Ulises, revisión de integración por Oswaldo.
- Reproducción aislada: interrupción después de escribir `datos/ulises-generacion.json` y antes de quitar journal. `recuperar` restaura los tres JSON anteriores, pero deja el marcador nuevo.
- Pendiente técnico: guardar/restaurar el marcador o distinguir commit completo inequívocamente; agregar prueba de esta ventana. No se ha corregido en la auditoría ni queda cubierto por las 83 pruebas verdes. Contratos compartidos no requieren cambios.
- No certificar aún publicación/recuperación completamente terminada. Detalles en `datos/ENTREGA_ULISES.md`.
