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

## Pensada para cualquier persona

- **Portada** que explica el problema, la solución y el resultado en 10 segundos.
- **Demo guiada "El lunes de Ana"** (botón ▶ en el menú): 9 pasos que resaltan cada parte de la pantalla.
- **🛰️ Extracción en vivo** (`/en-vivo`):
  - Un mapa que muestra en tiempo real cómo se consulta cada fuente, con paquetes que viajan entre el proveedor y cada fuente.
  - Tarjetas con los datos extraídos y una consola con los tiempos reales del servidor.
  - El servidor transmite cada evento al momento (`POST /api/en-vivo`, NDJSON).
- **Lenguaje simple:** semáforo 🟢🟡🔴, frases cotidianas en lugar de términos técnicos y explicaciones ⓘ al pasar el cursor. El detalle técnico queda a un clic.
- **Animaciones que muestran el proceso:**
  - el escaneo fuente por fuente al dar de alta un proveedor;
  - el velocímetro de riesgo;
  - la cuadrícula de 500 proveedores pintándose;
  - la llamada como conversación de chat;
  - 30 auditores que se vuelven 1.
- Las animaciones respetan la preferencia del sistema de "reducir movimiento".

## Automatización (⚙️ en el menú)

- **Políticas:** la gestora las activa y el sistema actúa solo, por ejemplo:
  - "bloquear empresas fantasma confirmadas";
  - "pedir la opinión 32-D a los que el SAT investiga".

  Cada acción queda en la bitácora con el nombre de la política. Los casos dudosos siempre los decide una persona.
- **Portal del proveedor** (`/portal/<token>`): un enlace único, sin contraseña, para que el proveedor suba su opinión 32-D en PDF.
  - Con `ANTHROPIC_API_KEY`, Claude lee el PDF: si es una 32-D, su sentido, su RFC y su fecha. La decisión sigue siendo de la gestora.
  - Si el proveedor no responde, recibe recordatorios cada 3 días; tras 2 recordatorios la solicitud vence y se avisa.
- **Bandeja más rápida:**
  - primero los cambios de cuenta, luego los proveedores **con un pago esta semana**;
  - antigüedad visible: en rojo a las 48 h;
  - estado del documento pedido;
  - avisos nuevos arriba.
- **Tarea diaria** (Vercel Cron a las 8:23 a. m. hora del centro, o botón "Ejecutar ahora"). Hace tres cosas:
  1. **Monitoreo:** vuelve a revisar a todos contra las listas y avisa solo si alguien cambió, incluyendo cuánto se le debe pagar.
  2. **Recordatorios** a proveedores.
  3. **Resumen del día**, enviado por n8n.
- **Demo:** el botón "Simular que el SAT publicó a un proveedor" marca a un proveedor aprobado como presunto. Aparece etiquetado como **simulación** en el expediente y en el aviso.
- En el ERP simulado, si el archivo no trae la fecha de pago de la factura (`factura_vence`), se asigna una entre 1 y 30 días derivada del folio.

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
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Datos persistentes en Supabase. Primero ejecuta `supabase/migrations/0001_inicial.sql` y `0002_automatizacion.sql` |
| `FIRECRAWL_API_KEY` | Análisis de la página web y búsqueda de noticias |
| `GROQ_API_KEY` | Comparación de giro, evaluación de noticias y resúmenes con Qwen vía Groq |
| `ELEVENLABS_*`, `EMPRESA_NOMBRE` | Llamadas reales de verificación (ver `voz/README.md`) |
| `WEBHOOK_SECRET` | Webhooks para n8n (ver `n8n/README.md`) |
| `APP_PASSWORD` | Contraseña para todo el sitio. Recomendado si la URL es pública. El portal del proveedor y el cron quedan fuera |
| `N8N_WEBHOOK_NOTIFICACIONES` | Avisos al proveedor, recordatorios y resumen diario a través de n8n |
| `CRON_SECRET` | Permite a Vercel Cron ejecutar la tarea diaria |
| `APP_URL` | URL pública para los enlaces del portal; en Vercel se detecta sola |

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

## Demo local sin telefonía (Axel)

Ejecuta `npm run demo:local` y abre `http://localhost:3000/clabe`. Mantiene las integraciones externas configuradas, usa memoria y simula solo la telefonía. Instrucciones y límites en [voz/DEMO-LOCAL.md](voz/DEMO-LOCAL.md).
