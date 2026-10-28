# KYP · Know Your Provider

Plataforma de verificación de proveedores con **gestión por excepción**: un solo gestor revisa lo que antes requería un equipo de 30 auditores.

- Revisa en automático los listados 69 y 69-B del SAT, la lista OFAC, la página web y las noticias de cada proveedor (Firecrawl).
- Calcula un **puntaje con reglas explicables**; la IA solo redacta el resumen.
- Libera en automático a los proveedores limpios y manda los dudosos a la **bandeja del gestor**.
- Verifica los **cambios de CLABE** con una llamada de voz (ElevenLabs) al teléfono registrado.
- Genera un **expediente PDF** con evidencia y hash.

## Equipo y responsabilidades

| Persona | Área | Carpetas principales |
|---|---|---|
| **Oswaldo** | Líder técnico: base, Supabase, API, panel de productividad, integración y pitch | `src/app/api`, `src/app/page.tsx`, `src/lib/supabase.ts`, `supabase/` |
| **Ulises** | Motor de verificación: SAT 69/69-B, OFAC, reglas de puntaje, datos de la demo | `src/lib/puntaje`, `datos/` |
| **Alan** | n8n + Firecrawl + resumen con IA | `n8n/` |
| **Axel** | Verificación por voz con ElevenLabs | `voz/` |
| **Samuel** | Interfaz: carga CSV, bandeja, expediente, ERP simulado, PDF | `src/app/bandeja`, `src/app/expediente`, `src/app/carga`, `src/app/erp`, `src/components` |

**Contratos compartidos:** `src/lib/tipos.ts`. Si los cambias, avisa al equipo.

## Arrancar en tu computadora

```bash
npm install
cp .env.example .env.local   # llena los valores
npm run dev                  # http://localhost:3000
npm test                     # pruebas del motor de reglas
```

Sin credenciales, la app funciona con **datos de prueba** (`src/lib/datos-prueba`).

## Forma de trabajar

1. Crea tu rama: `git checkout -b tu-nombre/tema` (ejemplo: `axel/voz`).
2. Haz commits pequeños y abre un pull request hacia `main`.
3. Vercel crea un enlace de prueba para cada pull request.
4. Oswaldo revisa e integra a `main`, que se publica automáticamente.

## Webhooks

| Ruta | Quién llama | Cuerpo |
|---|---|---|
| `POST /api/webhooks/verificacion` | n8n (Alan) | `WebhookVerificacion` |
| `POST /api/webhooks/llamada` | Flujo de voz (Axel) | `WebhookLlamada` |

Ambos requieren el header `x-kyp-secret` con el valor de `WEBHOOK_SECRET`.

## Alcance

- **MVP (hackathon):** carga, verificación SAT/OFAC/Firecrawl, puntaje, bandeja, llamada de voz, PDF, ERP simulado y panel.
- **Fase 2:** portal del proveedor, opinión 32-D, más listas, transferencia de prueba con CEP y monitoreo continuo.
- **Enterprise:** e.firma, NOM-151 con PSC acreditado, red de conflictos de interés y conexión real con el ERP.
