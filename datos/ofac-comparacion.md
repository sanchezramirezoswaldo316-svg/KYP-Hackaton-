# OFAC: comparación de nombres — Ulises

## Correcciones

Reproducidos antes del cambio:
- `TRANSPORTES` contra `TRANSPORTEZ`: Dice 0.90, pero el índice de palabras completas devolvía `sin_coincidencia`.
- `ABC DEF XYZ` contra `ABCDEF XYZ`: Dice 1, incorrectamente considerado exacto.

Ahora exacta exige igualdad de nombres canónicos **no vacíos**. Dice 1 con distinta separación de palabras se considera parecida. Umbral conservado: **0.82**. La coincidencia exacta de nombre no confirma identidad: mantiene 100/bloqueo sugerido según PDF y revisión humana. Una parecida aporta 25 sin bloqueo directo por sí sola. El valor Dice mide similitud, no probabilidad de sanción. No intervienen LLM.

El índice invertido almacena frecuencia de cada bigrama por nombre y número total de bigramas. Cada búsqueda acumula intersecciones multiconjunto desde las listas de bigramas compartidos; no reconstruye todos los nombres ni compara cada nombre completo. Una cota por longitud descarta candidatos cuyo máximo Dice posible está por debajo del umbral. Así cubre errores en la única palabra sin depender de tokens exactos, sin top-k ni recortes arbitrarios. Los nombres de una letra tienen recuperación por token. Igualdad canónica tiene prioridad sobre similitud; los empates se resuelven por SDN ID, nombre y programa, independientemente del orden de las filas. No se muta el snapshot.

Costo: indexación proporcional a los caracteres del snapshot; consulta proporcional a las listas de bigramas visitadas y candidatos. No se garantiza costo constante: nombres con bigramas muy frecuentes pueden visitar gran parte de la lista. No hay escaneo difuso de todos los nombres por consulta ni promesa de rendimiento de producción.

## Canonización documentada

- Mayúsculas, descomposición Unicode y eliminación de acentos combinantes. Se preserva `Ñ` distinta de `N`.
- Puntuación pasa a espacios; espacios repetidos se compactan. Se preservan límites entre palabras, letras individuales, cifras, letras no latinas y artículos (`DE`, `LOS`, `THE`, etc.). No se ordenan palabras ni se expanden alias.
- Se retiran **solo al final**, incluso repetidas, las formas reconocidas: SA / S A (opcional DE CV / DE C V), S DE RL / S DE R L (opcional DE CV / DE C V), SAPI DE CV, S A P I DE C V, SAB DE CV, SC / S C, AC / A C, LTD, LTDA, INC, CORP, CORPORATION, LLC, LIMITED, GMBH; para SAPI/SAB las terminaciones DE CV son opcionales. Véase el patrón exacto en `nombres.ts`.
- No se borran letras aisladas ni palabras internas por aparecer en una lista de sufijos. `A TRANSPORTES` y `B TRANSPORTES`, `BANCO DE CUBA` y `BANCO CUBA`, `LOS CUINIS` y `CUINIS`, `PEÑA` y `PENA` ya no son canónicamente iguales.
- Vacíos, puntuación sola y nombres reducidos a sufijos no coinciden.

Límites: quitar acentos, puntuación y formas legales terminales crea equivalencias intencionales; una empresa cuyo nombre termine literalmente en una abreviatura legal puede colisionar. Las iniciales `A C` terminales son ambiguas con la forma jurídica reconocida. No hay transliteración entre alfabetos, resolución de identidad, comparación de domicilio/fecha de nacimiento ni política para homónimos por persona/entidad. La revisión humana sigue siendo necesaria. Cambiar reglas de identidad o umbral requiere decisión explícita, no deducirla del porcentaje de similitud.

## Evidencia y alias

Se conservan nombre original, SDN ID y programa en `detalle`. `evidencia_url` usa `https://sanctionssearch.ofac.treas.gov/Details.aspx?id=ID`. Se verificó la ficha oficial 306 (BANCO NACIONAL DE CUBA, CUBA) como ejemplo real de esa ruta:
https://sanctionssearch.ofac.treas.gov/Details.aspx?id=306

La URL permite contrastar la fuente vigente; no implica que se verificó en red cada registro del snapshot durante el matching offline. Los ID sintéticos de las pruebas no representan designaciones reales.

**Solo nombres principales SDN**: el importador mantiene `sdn.csv`; no se incorporó `ALT.CSV`. OFAC documenta expresamente la relación de alias con SDN:
https://ofac.treasury.gov/sdn-list-data-formats-data-schemas/tutorial-on-the-use-of-list-related-legacy-flat-files

Hay falsos negativos posibles por alias ausentes. No se agregaron listas no-SDN, no se cambiaron hashes ni el formato de `ofac-sdn.json`. La ficha oficial puede mostrar alias que el snapshot del MVP no consulta.

## Medición reproducible offline

Ejecutar `node scripts/ulises/medir-ofac.mjs` desde la raíz del repositorio. Resultados de la ejecución final guardados en `datos/ofac-medicion.json` con hash del snapshot, hardware y runtime.

Apple M2, 8 núcleos, 8 GiB RAM, macOS arm64, Node v24.3.0. Snapshot de 17,561 registros. 500 filas del CSV demo, una pasada de calentamiento, cinco repeticiones; mediciones secuenciales con `performance.now()`:

| Operación | Resultado |
|---|---:|
| Lectura y JSON.parse OFAC (una ejecución) | 6.34 ms |
| Construcción del índice (una ejecución) | 88.03 ms |
| 500 búsquedas OFAC, mediana | 1,317.69 ms |
| 500 búsquedas OFAC, mínimo–máximo | 1,294.56–1,371.58 ms |
| Consulta individual, mediana / máximo observado | 2.68 / 13.04 ms |
| Lote de 500: SAT 69 + 69-B + OFAC + puntaje, mediana | 1,313.10 ms |

El lote se mide por separado, por lo que puede ser algo más rápido por cachés/JIT y ruido local. Resultados OFAC: 499 sin coincidencia, una parecida. El lote es la parte local de carga masiva en memoria, **no** la ruta HTTP de importación: excluye lectura/parseo CSV, persistencia, red, interfaz y fuentes externas. Indexación y lectura quedan fuera de los tiempos de consulta. No extrapolar a producción, concurrencia o hardware distinto.

## Verificación

15 pruebas específicas de listas/OFAC; ocho pruebas nuevas cubren las dos regresiones, igualdad real, puntuación/acentos, iniciales, sufijos, vacíos, homónimo, negativo, colisiones y orden determinista. También comparan resultados del índice con un barrido Dice de referencia para variantes de fixture. Todas son offline. Suite completa: 77 pruebas; lint y build correctos. Persiste la advertencia previa de Node sobre tipo de módulo, sin tocar configuración.
