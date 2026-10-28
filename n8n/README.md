# n8n (Alan)

La app ya hace la verificación completa por sí sola: listas SAT/OFAC, Firecrawl, dominio e IA. n8n sirve para **orquestar flujos alrededor** de la app y para mostrar los flujos de forma visual en la demo.

Exporta aquí cada flujo como JSON (`monitoreo-sat.json`, `alertas.json`, etc.) para que quede versionado.

## Prototipo de alta de Alan

`alta-proveedor-prototipo.json` es una copia exportada del flujo de n8n de Alan. Recibe `POST /kyp-alta`, usa una rama de datos ficticios solo con `modo_demo: true` y una rama real para Firecrawl, RDAP y Claude. El flujo está **inactivo** y el nodo que enviaría hallazgos a la app está **desactivado**.

La copia versionada no incluye referencias a las credenciales de la instancia de Alan. Después de importarla en otra instancia, hay que seleccionar las credenciales de Firecrawl y Claude antes de ejecutar la rama real. Tampoco incluye claves ni el valor de `WEBHOOK_SECRET`.

Se ajustó la salida real a los tipos de esta app: `fuente` usa `web`, `noticias` y `dominio`; el dominio de menos de 182 días produce `dominio_reciente` y los demás `dominio_antiguo`. El nodo de retorno, todavía desactivado, está preparado para enviar solo `{ proveedor_id, hallazgos }`. `resumen_ia` permanece en la salida de n8n, pero `/api/webhooks/verificacion` no lo acepta actualmente.

**Antes de conectar el prototipo:** acordar con Oswaldo si la app seguirá verificando las fuentes por sí misma o si delegará el alta a n8n. `POST /api/proveedores` ya consulta Firecrawl, noticias y dominio. Activar además el retorno de este flujo después del alta crearía otra verificación y podría contar dos veces las mismas señales de riesgo. El `proveedor_id` enviado a n8n debe ser un ID real creado por la app, no un ID ficticio de prueba.

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

## Flujo de avisos (pendiente de Alan)

La app envía un `POST` a `N8N_WEBHOOK_NOTIFICACIONES`, con el header `x-kyp-secret`, cada vez que hay que avisar a alguien. El flujo decide el canal (correo, WhatsApp, Slack) según `tipo`:

| `tipo` | Para quién | Campos |
|---|---|---|
| `solicitud_documentos` | Proveedor | `para: { razon_social, rfc, telefono }`, `enlace` (portal; `null` si la app no conoce su URL pública), `documento` |
| `recordatorio_documentos` | Proveedor | lo mismo + `recordatorio` (1 o 2) |
| `resumen_diario` | Gestora | `texto` (listo para enviar), `datos` (cifras) |
| `alerta` | Gestora | `texto`, `proveedor_id` |

Ejemplo:

```json
{ "tipo": "solicitud_documentos", "para": { "razon_social": "Transportes X SA de CV", "rfc": "TXX010101AB1", "telefono": "+525512345678" }, "enlace": "https://kyp-hackaton.vercel.app/portal/AbC123", "documento": "Opinión del cumplimiento de obligaciones fiscales (32-D)" }
```

Si n8n responde con un código distinto de 2xx, la app lo registra como "aviso no enviado" y muestra el enlace para compartirlo a mano.
