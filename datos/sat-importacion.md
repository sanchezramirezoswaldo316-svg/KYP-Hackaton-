# Importación SAT — entrega de Ulises

## Procedencia y snapshot conservado

El portal oficial SAT de operaciones presuntamente inexistentes enlaza a `omawww.sat.gob.mx` y describe el listado completo:
https://wwwmat.sat.gob.mx/consultas/76674/consulta-la-relacion-de-contribuyentes-con-operaciones-presuntamente-inexistentes

El portal oficial de no localizados también remite a ese servicio:
https://wwwmat.sat.gob.mx/consultas/40227/consulta-la-publicacion-de-la-relacion-de-los-contribuyentes-no-localizados

Las rutas heredadas del repositorio son `http://omawww.sat.gob.mx/cifras_sat/Documents/` más `Listado_Completo_69-B.csv`, `No%20localizados.csv`, `Exigibles.csv` y `Sentencias.csv`. Se conserva esa procedencia oficial, sin Firecrawl, LLM ni mirrors de terceros. La comprobación directa del servicio y del CSV vía web falló; la descarga HTTPS con curl agotó 25 segundos. No se certificaron disponibilidad actual, encabezados actuales ni una edición reciente de los cuatro archivos. No se ejecutó la actualización del conjunto productivo. El parser estricto debe rechazar cambios de formato hasta revisar un CSV oficial real; no adaptar encabezados por conjetura.

Los JSON incluidos permanecen byte por byte sin cambios: **snapshot histórico**, no edición reciente verificada. `actualizacion: 2025-12-31` es la fecha declarada de actualización/publicación de la lista; `descargado_en: 2026-10-28T05:26:28.518Z` es la descarga declarada. Ninguna es necesariamente la fecha DOF de un contribuyente. Los bytes originales históricos no están incluidos: su hash declarado no puede recertificarse a partir del JSON. Los fixtures sí tienen sus bytes y manifiesto SHA-256 comprobado por pruebas.

Cobertura MVP Art. 69: `no_localizado`, `exigible`, `sentencia`. **Firmes y cancelados no se consultan**. No se agregaron otras listas.

## Perfil CSV estricto (sat-2)

`RFC`, y para 69-B `Nombre del Contribuyente`, `Situación del contribuyente`, `Publicación DOF presuntos`, `Publicación DOF desvirtuados`, `Publicación DOF definitivos`, `Publicación DOF sentencia favorable`. Para Art. 69: `Fecha de primera publicación`. Se toleran mayúsculas, acentos y espacios repetidos en los encabezados, pero no se adivinan columnas por posición. Columnas adicionales pueden existir y cada fila debe tener el ancho del encabezado. El prefacio puede declarar `actualizada al D de MES de AAAA`; sin declaración, publicación queda nula. Estos nombres constituyen el perfil documentado a contrastar con la próxima descarga oficial accesible.

Decodificación: UTF-8 estricto (incluido BOM); si no es UTF-8, Windows-1252, compatible con fixtures latin1. CSV con comillas escapadas, comas y saltos internos. HTML, archivo vacío, comillas incompletas, filas de ancho incorrecto, RFC inválido, fechas imposibles y estatus desconocidos rechazan **todo el archivo**. El error contiene filas, causas y conteos válidos/rechazados/duplicados; no publica un subconjunto aparentemente limpio. Los conteos válidos incluyen filas duplicadas aceptadas; `registros` cuenta RFC únicos.

Cada registro 69-B usa exclusivamente la fecha DOF de su propio estatus; no hereda la presunción. Un estatus declarado con evento posterior incompatible rechaza la fila. Duplicados idénticos se cuentan; estados distintos solo se ordenan por fechas DOF inequívocas del mismo RFC y nombre. Sin fechas, con empate o nombres incompatibles se rechaza la ambigüedad. No existe prioridad por gravedad ni por orden de fila. Art. 69 agrupa causas distintas sin duplicarlas; fechas contradictorias para una misma causa se rechazan.

Las nuevas importaciones guardan fuente/URL, publicación si existe, descarga, SHA-256 de **bytes recibidos antes de decodificar**, conteos y versión del parser; el agregado Art. 69 conserva esa evidencia por cada sublista. Los campos consumidos por `listas.ts` permanecen disponibles.

## Publicación y recuperación

`npm run listas` descarga y valida SAT completo y OFAC antes de tocar los JSON. Timeout 30 s por petición (incluye lectura del cuerpo mediante AbortSignal), HTTP no exitoso, HTML y vacío producen errores explícitos. Importar auxiliares o el script en pruebas no ejecuta descargas/escrituras.

La publicación toma el directorio exclusivo `datos/ulises-publicacion`, guarda los tres originales y prepara los tres nuevos. Solo después de escribir atómicamente `preparado.json` empieza los reemplazos. Un fallo restaura originales antes de quitar el bloqueo. `datos/ulises-generacion.json` marca la generación completa; nunca se marca válida una generación parcial. El lector carga de una vez las tres listas, comprueba bloqueo y generación antes/después y mantiene ese conjunto completo en caché hasta reiniciar el proceso. Durante una publicación o recuperación, un lector nuevo falla explícitamente, en vez de declarar un proveedor limpio con datos mezclados.

Tras caída del proceso, **asegurar primero que no hay escritor activo**, ejecutar `npm run listas -- --recuperar`. Es idempotente: si existe respaldo preparado restaura las tres copias, si no se alcanzó la preparación solo limpia el staging (todavía no había reemplazos). Si la restauración falla, conserva el bloqueo para reintentar. No ejecutar recuperación concurrentemente con publicación. Las rutas staging y destino deben estar en el mismo filesystem para `rename`; no se promete transacción ante corrupción de disco o pérdida física de energía sin garantías de fsync del almacenamiento. No borrar el respaldo manualmente durante recuperación.

Límite de integración: lectores ajenos a `listas.ts` que abran JSON directamente deben ejecutarse fuera de una actualización. La demo no se regenera en esta etapa. Persistencia multiinstancia, despliegue y almacenamiento transaccional quedan a Oswaldo; no se agregaron tablas ni migraciones.

## Pruebas

Fixtures sintéticos, sin datos personales reales, bajo `datos/fixtures/sat/`. Pruebas offline con fetch inyectado, hashes calculados sobre bytes del disco, eventos reordenados, rechazo por ambigüedad, rollback tras segundo reemplazo e interrupción simulada. Nunca se accede a red en `npm test`.

Resultados de cierre: 10/10 pruebas específicas de importación/lectura, 69/69 en `npm test`, `npm run lint` y `npm run build` correctos; `git diff --check` sin errores. La última incorporación solo añade la prueba del lector frío/caché; el build pasó con el código de implementación final. Los cambios de puntaje y sus documentos de la etapa anterior se conservaron.
