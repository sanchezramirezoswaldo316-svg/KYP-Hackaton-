# Título propuesto

Ulises: corregir puntaje, robustecer SAT/OFAC y reproducir demo 470/30

# Descripción propuesta

El motor duplicaba puntos por evidencias repetidas y no sumaba los 10 por falta de sitio del PDF. OFAC perdía variantes de una sola palabra y consideraba exactos algunos nombres distintos con Dice 1. La demo no verificaba el objetivo de 470 liberables y 30 excepciones.

Aplica cada regla una sola vez con motivos estables, conserva contratos/decisión humana, valida importaciones SAT por encabezados y eventos, amplía candidatos OFAC mediante bigramas sin cambiar el umbral .82 y genera 500 RFC únicos con selección sin reemplazo, semilla de 12 compatible y manifiesto de resultados calculados. Los snapshots oficiales permanecen históricos e intactos; el caso web de 80 puntos se entrega únicamente como fixture simulado separado.

Validación: 83/83 en npm test, npm run lint, npm run build y git diff --check correctos. Regeneración npm run demo idéntica byte a byte; actualización de listas ejercida offline en directorio temporal con fetch de fixtures, sin cambios al código de compañeros. Sin modificaciones de API/UI/voz/n8n/Supabase/configuraciones/dependencias y sin credenciales detectadas en los archivos cambiados.

Pendiente antes de cerrar la recuperación: una interrupción después de escribir el marcador nuevo y antes de retirar el journal permite restaurar JSON anteriores sin restaurar el marcador de generación. Hallazgo reproducido y documentado en datos/ENTREGA_ULISES.md; requiere corrección y prueba de esa ventana. No se presenta el mecanismo como completamente cerrado.

Límites de integración: no se verificó una edición SAT reciente ni sus encabezados actuales por inaccesibilidad de la descarga; no se comprobaron webhooks, servicios externos, voz, UI ni persistencia en vivo. Sin alias OFAC. Revisión técnica ante fuentes oficiales fallidas, vigencia y conflictos quedan como políticas pendientes de Oswaldo, sin puntos nuevos. Entrega y guion fiscal en datos/ENTREGA_ULISES.md.
