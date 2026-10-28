# Listas y demo — Ulises

`npm run listas` descarga y valida SAT 69-B, SAT 69 (no localizado, exigible, sentencia) y OFAC SDN. Firmes/cancelados no se consultan. No incorpora alias OFAC ni otras listas. Operación y recuperación: `sat-importacion.md`; comparación OFAC: `ofac-comparacion.md`.

Los JSON oficiales incluidos siguen siendo snapshots históricos: no se verificó una edición reciente. La fecha publicada, la fecha de cada evento DOF y la descarga son conceptos separados. No presentan la situación fiscal actual de una empresa.

## Regenerar la demo offline

Desde la raíz del repositorio, con las dependencias instaladas:

```bash
npm run demo
node --test src/lib/verificacion/importacion-demo.test.ts
npm test
```

No ejecuta `npm run listas`, ni red, Firecrawl o LLM. Usa semilla entera explícita **20261028**. Se puede cambiar mediante `KYP_DEMO_SEMILLA`; los artefactos entregados y las pruebas de correspondencia usan la semilla por defecto. `KYP_DEMO_FECHA` cambia solo `generado_en` del manifiesto; el valor predeterminado `2026-10-28T00:00:00Z` es una **fecha de referencia reproducible**, no una afirmación de hora real de ejecución. Para conservar igualdad byte a byte del manifiesto se debe usar también esa misma fecha. La selección ordena por RFC/SDN ID antes de mezclar sin reemplazo; los candidatos se contrastan contra todas las listas. Si las fuentes no alcanzan para el objetivo, falla antes de escribir datos, sin inventar resultados oficiales.

Genera:

- `public/demo/proveedores-demo.csv`: nueve columnas originales compatibles con Carga CSV.
- `src/data/demo-semilla.json`: 12 proveedores compatibles con `demo.ts`, todos incluidos en el CSV.
- `datos/demo-manifiesto.json`: 500 casos con RFC, origen por campo, fuente, etiqueta histórica, hallazgos y resultados calculados. `origen.fuente` referencia la versión en `fuentes` (URL, publicación, descarga, hash original declarado y hash del JSON funcional).
- `datos/fixtures/demo-presunto-giro-simulado.json`: hallazgos separados para ensayo, no incorporados al CSV ni a fuentes oficiales.

## Resultado verificado y significado

La copia anterior auditada tenía 478 liberar / 15 revisar / 7 bloquear sugerido con sin_sitio=0. Antes de regenerar se recalculó con el motor final: **478 liberar / 6 revisar / 16 bloquear sugerido**. La nueva demo tiene **470 liberar / 5 revisar / 25 bloquear sugerido**: 500 RFC únicos y 30 excepciones. Bloquear siempre es una sugerencia para decisión humana.

| Categoría | Filas | Puntaje solo listas | Total con sin_sitio +10 |
|---|---:|---:|---:|
| Sintéticos sin coincidencias en listas | 464 | 0 | 10, liberar |
| 69-B desvirtuado | 4 | 0 informativo | 10, liberar |
| 69-B sentencia favorable | 2 | 0 informativo | 10, liberar |
| 69-B presunto | 15 | 60 | 70, bloqueo sugerido |
| 69-B definitivo | 10 | 100 | 100 por tope, bloqueo sugerido |
| SAT 69 no localizado | 4 | 30 | 40, revisar |
| Homónimo OFAC sintético | 1 | 25 | 35, revisar |

No se llama alerta a una fila únicamente por ser desvirtuado o sentencia favorable. “Sin coincidencias” se refiere a las fuentes oficiales de esta versión, no certificación de ausencia de riesgo. Todos carecen de sitio web y reciben +10 por ello. Los seis informativos SAT y los 464 sintéticos integran los 470 liberables.

Los casos 69-B usan RFC y razones sociales de personas morales reales del snapshot, con estatus y fecha de evento en el manifiesto. Los cuatro RFC SAT69 son de personas morales del snapshot, pero sus **nombres son etiquetas sintéticas**, porque el JSON compacto no conserva razón social. No deben presentarse como nombres oficiales. El homónimo usa RFC y nombre modificados sintéticamente; no representa a la entidad sancionada. Su nombre base/SDN ID y la coincidencia devuelta constan en el manifiesto.

**Teléfonos, CLABE, montos y facturas son sintéticos. No usar estas filas para llamadas reales, pagos o consultas a personas.** Cumplen formatos/dígito verificador de los validadores actuales, pero no se garantiza que un número generado sea inexistente ni que una CLABE no esté asignada. Para una escena de voz usar exclusivamente los datos controlados por Axel y el equipo, fuera de este conjunto.

## Reiniciar antes de importar 500

1. Usar un entorno local dedicado en modo memoria; en el panel pulsar **Reiniciar demo**. El endpoint actual borra la memoria y vuelve a cargar la semilla de 12, no deja la base vacía. Si se acaba de regenerar el archivo, reiniciar también el servidor para descartar memoria/cachés anteriores.
2. Abrir Carga CSV e importar `public/demo/proveedores-demo.csv`, con fuentes externas desactivadas. Los 12 RFC de semilla son subconjunto de los 500; el alta existente reutiliza el proveedor por RFC y vuelve a verificarlo. El total final de proveedores es 500, no 512. Las verificaciones y bitácoras no son un contador de proveedores únicos; pueden contener las entradas previas.
3. Verificar al terminar: 500 proveedores únicos; 470 liberables y 30 excepciones. No tomar los totales parciales de los bloques durante la carga. No agregar señales web o casos CLABE antes de comprobar este resultado.

No cargar sobre una demo vieja sin reiniciar: RFC ajenos al nuevo CSV permanecerían, y los ya existentes conservan sus datos originales en `altaProveedor`. En Supabase el endpoint de reinicio devuelve 409; la limpieza de un entorno de ensayo persistente corresponde a Oswaldo. No se modificaron endpoints ni se borraron datos reales.

## Escena presunto + giro = 80 (Alan / Samuel)

Usar el RFC y hallazgos de `datos/fixtures/demo-presunto-giro-simulado.json`. Incluye consultas reales al snapshot más `web/giro_no_coincide` marcado **SIMULADO**. `calcularPuntaje` da 80. El fixture sustituye la señal `sin_sitio` para este ensayo; agregar ambas señales daría 90 y no reproduce la escena de 80.

El CSV actual no suministra evidencia web y la pantalla no tiene un mecanismo específico para reproducir este fixture. Mostrarlo como fixture offline con su resultado calculado; para presentarlo en el flujo, Alan debe aportar evidencia web real o un mecanismo de ensayo identificado, y Samuel/Oswaldo integrar la escena. No se inyectó el hallazgo en API, servicios ni pantallas. Cargarlo junto al lote alteraría los totales del guion: mantener las escenas separadas.

## Pruebas

Las pruebas de importación demo regeneran offline, contrastan byte a byte los artefactos, cambian la fecha sin alterar filas/semilla, comprueban 500 RFC únicos, CLABE y formatos, semilla de 12 incluida en el CSV, selección sin reemplazo, cruces, 470/30 y escenarios. Ningún resultado esperado del manifiesto se toma como verdad sin contrastarlo con consultas reales y `calcularPuntaje`.
