# Listas oficiales y datos de la demo (Ulises)

- `sat/`: listados 69 y 69-B descargados del SAT (CSV). Guarda la fecha de publicación.
- `ofac/`: lista SDN de OFAC (CSV).
- `demo/proveedores-demo.csv`: 500 proveedores para la demo. Incluye:
  - RFC reales en 69-B, tanto presuntos como definitivos.
  - Proveedores limpios.
  - Un homónimo de OFAC.
  - Un proveedor cuya página web no coincide con lo que factura.

Cada lista descargada se registra en la tabla `listas_oficiales` con su hash SHA-256, como evidencia.

El motor de reglas está en `src/lib/puntaje/reglas.ts`. Corre las pruebas con `npm test`.
