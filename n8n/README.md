# n8n (Alan)

Exporta aquí cada flujo de n8n como JSON (`alta-proveedor.json`, `cambio-clabe.json`, `monitoreo-sat.json`) para que quede versionado.

## Flujo "Alta de proveedor"

1. **Entrada:** webhook que recibe el proveedor desde `POST /api/proveedores`.
2. **En paralelo:**
   - Revisar SAT 69 / 69-B y OFAC (con los datos procesados por Ulises).
   - **Firecrawl:** leer `sitio_web` y comparar el giro con `giro_declarado` → `giro_coincide` | `giro_no_coincide` | `sin_sitio`.
   - **Firecrawl (búsqueda):** noticias negativas → `noticias_negativas` | `sin_noticias`.
   - Antigüedad del dominio → `dominio_reciente` | `dominio_antiguo`.
3. **Resumen:** el modelo de IA redacta 2–3 líneas explicando los hallazgos (no decide).
4. **Salida:** `POST {APP_URL}/api/webhooks/verificacion` con header `x-kyp-secret` y cuerpo `WebhookVerificacion` (ver `src/lib/tipos.ts`).
