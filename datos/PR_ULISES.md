# Título propuesto

Ulises: corregir puntaje, robustecer SAT/OFAC y reproducir demo 470/30

# Descripción propuesta

El motor duplicaba puntos por evidencias repetidas y no sumaba los 10 por falta de sitio del PDF. OFAC perdía variantes de una sola palabra y consideraba exactos algunos nombres distintos con Dice 1. La demo no verificaba el objetivo de 470 liberables y 30 excepciones.

Aplica cada regla una sola vez con motivos estables, conserva contratos/decisión humana, valida importaciones SAT por encabezados y eventos, amplía candidatos OFAC mediante bigramas sin cambiar el umbral .82 y genera 500 RFC únicos con selección sin reemplazo, semilla de 12 compatible y manifiesto de resultados calculados. Los snapshots oficiales permanecen históricos e intactos; el caso web de 80 puntos se entrega únicamente como fixture simulado separado.

Validación posterior a la corrección del marcador, en copia aislada: 86/86 en npm test, npm run lint, npm run build y git diff --check correctos. Regeneración npm run demo idéntica byte a byte; actualización de listas ejercida offline en directorio temporal con fetch de fixtures, sin cambios al código de compañeros. Sin modificaciones de API/UI/voz/n8n/Supabase/configuraciones/dependencias y sin credenciales detectadas en los archivos cambiados.

Corrige también el rollback del marcador de generación: journal v2 con bytes anteriores/ausencia, escritura de marcador mediante temporal y rename, y restauración antes de retirar el bloqueo. Tres pruebas nuevas cubren fallo posterior al marcador, recuperación abrupta/idempotente y rechazo seguro de journals antiguos sin metadatos; no se elimina el bloqueo si no se puede recuperar. Los respaldos del formato anterior requieren intervención manual. La auditoría estructurada de 83 pruebas se conserva como evidencia histórica previa a esta corrección.

Límites de integración: no se verificó una edición SAT reciente ni sus encabezados actuales por inaccesibilidad de la descarga; no se comprobaron webhooks, servicios externos, voz, UI ni persistencia en vivo. Sin alias OFAC. Revisión técnica ante fuentes oficiales fallidas, vigencia y conflictos quedan como políticas pendientes de Oswaldo, sin puntos nuevos. Entrega y guion fiscal en datos/ENTREGA_ULISES.md.
