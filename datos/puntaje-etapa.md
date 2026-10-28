# Etapa: motor de puntaje y pruebas

Rama: `ulises/puntaje`, base `cc67a9a`. Se mantiene `calcularPuntaje(Hallazgo[]): ResultadoPuntaje` y sus campos. No cambia el flujo humano, pagos ni el papel de la IA.

## Cambios

- Reproducción previa: tres hallazgos SAT 69 / `listado` daban 90, tres motivos y decisión `bloquear`. Corregido: 30, un motivo y `revisar`, incluso si cambian fecha, detalle o URL de evidencia.
- Cada regla del catálogo se aplica una sola vez. Los motivos siguen el orden del catálogo, por lo que el resultado completo es independiente del orden de entrada. No se modifican, eliminan ni ordenan los hallazgos originales; la integración conserva su evidencia.
- `sin_sitio`: 0 → 10 conforme a sección 8 del PDF. Los demás pesos, bloqueos sugeridos, tope 100 y umbrales permanecen iguales.
- Estatus informativos siguen generando motivos de cero puntos. Reglas distintas no se fusionan ni se interpretan como resolución de contradicciones.

## Cobertura

41 pruebas específicas (las seis originales permanecen): todas las reglas y estatus, exacta/aproximada OFAC, duplicados de cada regla con evidencias distintas, regresión 90 → 30, límites alcanzables, presunto + giro = 80, tope con y sin bloqueo directo, inmutabilidad, orden estable y comportamiento vigente ante errores/ausencias.

Los pesos son múltiplos de cinco; ninguna suma ni el tope genera 21 o 61. Se cubren 15/20/25 y 55/60/65, incluidos 20 y 60 por combinación. No se inventan pesos ni se amplía la API para fabricar valores inalcanzables.

## Impacto medido en la demo incluida

Evaluación local de las 500 filas del CSV contra los JSON incluidos, usando listas oficiales y ausencia de web (sin llamadas externas). Para aislar el cambio se comparó la misma función con los hallazgos de listas, y con esos hallazgos más `web/sin_sitio`.

| Decisión sugerida | Sin penalización web | Con +10 sin web |
|---|---:|---:|
| liberar | 478 | 478 |
| revisar | 15 | 6 |
| bloquear | 7 | 16 |

Nueve filas cambian de revisión a bloqueo sugerido. Un presunto sin otros riesgos pasa de 60 a 70; un limpio sin web pasa de 0 a 10 y sigue liberable. La semilla también usa sitios nulos: debe interpretarse con estos nuevos puntajes. Estos resultados dependen del snapshot incluido y no son una promesa de proporciones para otras listas. No se regeneraron datos ni se cambiaron servicios para mantener el guion anterior.

## Validación ejecutada

- `node --test src/lib/puntaje/reglas.test.ts`: 41/41.
- `npm test`: 59/59, incluidas las pruebas existentes de servicios y CLABE sin modificarlas.
- `npm run lint`: pasa.
- Advertencia previa de Node `MODULE_TYPELESS_PACKAGE_JSON`: persiste; configuración fuera de alcance.

Las políticas de fallos oficiales, antigüedad y contradicciones se describen en `pendientes-integracion.md`; no se activaron en esta etapa.
