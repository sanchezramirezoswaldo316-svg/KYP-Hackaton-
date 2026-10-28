# n8n (Alan)

La app ya hace la verificación completa por sí sola: listas SAT/OFAC, Firecrawl, dominio e IA. n8n sirve para **orquestar flujos alrededor** de la app y para mostrar los flujos de forma visual en la demo.

Exporta aquí cada flujo como JSON (`monitoreo-sat.json`, `alertas.json`, etc.) para que quede versionado.

## API disponible

| Acción | Llamada |
|---|---|
| Alta y verificación completa | `POST /api/proveedores` con el cuerpo de `EntradaAlta` (ver `src/lib/servicios-tipos.ts`) |
| Carga por bloques (hasta 50) | `POST /api/proveedores/lote` `{ proveedores: [...], fuentesExternas: false }` |
| Re-verificar un proveedor | `POST /api/proveedores/{id}/verificar` |
| Agregar hallazgos externos | `POST /api/webhooks/verificacion` con header `x-kyp-secret` y `{ proveedor_id, hallazgos: Hallazgo[] }` |
| Casos pendientes | `GET /api/casos` |
| Estado e integraciones | `GET /api/estado` |

Si la app tiene `APP_PASSWORD`, n8n debe usar autenticación básica en todo, excepto en `/api/webhooks/*`.

## Flujos propuestos

1. **Monitoreo SAT (fase 2):** un cron semanal ejecuta `npm run listas` (o descarga el CSV del 69-B), detecta RFC nuevos y llama a `/api/proveedores/{id}/verificar` solo para los proveedores afectados.
2. **Alertas:** un cron cada hora consulta `GET /api/casos` y avisa por Slack o Teams cuando hay casos nuevos de "bloquear" o de "Cambio de CLABE".
3. **Fuentes adicionales:** listas SFP, ONU o REPSE, enviadas como hallazgos a `/api/webhooks/verificacion` (requiere agregar sus reglas en `src/lib/puntaje/reglas.ts`).
