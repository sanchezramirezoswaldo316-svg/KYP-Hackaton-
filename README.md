# KYP · Know Your Provider

Plataforma de verificación de proveedores con **gestión por excepción**: un solo gestor revisa lo que antes requería un equipo de 30 auditores.

## Qué hace

- **Revisa a cada proveedor** contra:
  - los listados oficiales del SAT: Art. 69-B y Art. 69;
  - la lista OFAC, con detección de homónimos;
  - su página web y noticias (Firecrawl), comparando el giro con IA;
  - la antigüedad de su dominio.
- **Calcula un puntaje con reglas explicables.** La IA solo redacta el resumen; nunca decide.
- **Libera en automático** a los proveedores limpios y manda los dudosos a la **bandeja**. Ahí el gestor decide en un clic, y aprobar en contra de un bloqueo exige un comentario.
- **Cambios de CLABE:**
  1. El pago se pausa.
  2. El agente de voz (ElevenLabs) llama al **teléfono registrado en el alta**.
  3. Si el proveedor no confirma, el caso llega a la bandeja.
- **Expediente PDF** con toda la evidencia, la bitácora y una huella SHA-256.
- **ERP simulado** con facturas liberadas, en pausa o bloqueadas, y **panel de productividad** con horas manuales contra horas con KYP.

## Arrancar

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 24 pruebas
```

**Sin ninguna variable de entorno funciona en modo demo:**
- Datos en memoria con 12 proveedores de ejemplo.
- Las fuentes externas aparecen como "no consultado".
- Las llamadas se pueden simular, y quedan marcadas como simuladas.

Para la demo de 500 proveedores, sube `public/demo/proveedores-demo.csv` en **Carga CSV**.

## Configuración (`.env.example`)

| Variable | Qué activa |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Datos persistentes en Supabase. Primero ejecuta `supabase/migrations/0001_inicial.sql` |
| `FIRECRAWL_API_KEY` | Análisis de la página web y búsqueda de noticias |
| `ANTHROPIC_API_KEY` | Comparación de giro, evaluación de noticias y resúmenes con Claude |
| `ELEVENLABS_*`, `EMPRESA_NOMBRE` | Llamadas reales de verificación (ver `voz/README.md`) |
| `WEBHOOK_SECRET` | Webhooks para n8n (ver `n8n/README.md`) |
| `APP_PASSWORD` | Contraseña para todo el sitio. Recomendado si la URL es pública |

## Estructura

| Carpeta | Contenido |
|---|---|
| `src/lib/verificacion/` | Motor de verificación: listas, OFAC, Firecrawl, dominio, IA |
| `src/lib/puntaje/` | Reglas de puntaje (función pura, con pruebas) |
| `src/lib/servicios.ts` | Alta, decisiones, CLABE y llamadas, todo con bitácora |
| `src/lib/almacen/` | Supabase o memoria, con la misma interfaz |
| `src/lib/voz/` | Integración con ElevenLabs |
| `src/lib/pdf.ts` | Expediente PDF |
| `src/app/` | Pantallas y rutas `/api` |
| `src/data/` | Listas oficiales procesadas (`npm run listas`) y semilla de la demo (`npm run demo`) |
| `datos/`, `n8n/`, `voz/` | Guías de cada área |

## Equipo

| Persona | Área | Siguiente paso |
|---|---|---|
| **Oswaldo** | Integración, Supabase, Vercel, pitch | Crear Supabase, cargar variables en Vercel, ensayar la demo |
| **Ulises** | Listas y puntaje | Calibrar reglas, revisar los datos de la demo, agregar listas de la fase 2 |
| **Alan** | n8n + Firecrawl + IA | Clave de Firecrawl, flujos de n8n (monitoreo y alertas), proveedores demo con página web real |
| **Axel** | Voz | Configurar el agente de ElevenLabs y Twilio según `voz/README.md` y ensayar llamadas |
| **Samuel** | Interfaz | Pulir pantallas y textos, versión móvil, guion visual de la demo |

## Forma de trabajar

1. Crea tu rama: `git checkout -b tu-nombre/tema`.
2. Abre un pull request hacia `main`. Vercel genera un enlace de prueba.
3. `main` se publica automáticamente.
