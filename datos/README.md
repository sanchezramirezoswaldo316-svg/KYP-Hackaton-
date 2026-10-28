# Listas oficiales y datos de la demo (Ulises)

## Listas oficiales (`src/data/`)

`npm run listas` descarga y procesa:

| Archivo | Fuente | Registros |
|---|---|---|
| `sat-69b.json` | SAT · Listado completo Art. 69-B (presunto, definitivo, desvirtuado, sentencia favorable) | ~14,000 RFC |
| `sat-69.json` | SAT · Art. 69: no localizados, exigibles, sentencias | ~59,000 RFC |
| `ofac-sdn.json` | OFAC · lista SDN (sin barcos ni aeronaves) | ~17,500 |

Cada archivo guarda el SHA-256 del archivo original y la fecha de descarga, que funcionan como evidencia.

Los listados "Firmes" y "Cancelados" del Art. 69 (~19 MB cada uno) quedan para la fase 2, en Supabase.

## Datos de la demo

`npm run demo` genera:

- `public/demo/proveedores-demo.csv`: 500 proveedores para la carga masiva.
  - ~473 limpios ficticios.
  - 10 presuntos, 6 definitivos, 4 desvirtuados y 2 con sentencia favorable del 69-B.
  - 4 no localizados del Art. 69.
  - 1 homónimo de OFAC.
- `src/data/demo-semilla.json`: 12 proveedores con los que arranca el modo demo.

Los RFC y nombres de riesgo son **reales y públicos** (solo personas morales). Los teléfonos, CLABE, montos y facturas son ficticios.

## Reglas de puntaje

Están en `src/lib/puntaje/reglas.ts`. Pruebas: `npm test`.
