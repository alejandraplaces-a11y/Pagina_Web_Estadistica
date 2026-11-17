# Descriptiva de Brasil: documentos para integrar con OpenCode

Este paquete NO modifica `Estadistica.html`. Contiene los documentos y análisis; OpenCode se encarga del diseño y conexión.

## Contenido
- `documentos/Tabla_Variables_Brasil.xlsx`: las 10 columnas principales de la plantilla recibida, más válidos, nulos y ceros. Incluye método e inventario del CSV.
- `documentos/Tabla_Indicadores_Brasil.xlsx`: los grupos de tendencia central, dispersión y forma de la plantilla, con indicadores calculados para Brasil. Incluye frecuencias completas por variable y una hoja de válidos, cuartiles, límites y atípicos.
- `analisis/`: 17 informes HTML autónomos, con gráficos incrustados, tablas de frecuencia, interpretación en español e indicadores aplicables. No necesitan Colab, RPubs, conexión ni JavaScript.
- `datos/descriptiva_brasil.json`: datos exactos, definiciones y rutas para las tarjetas y tablas de la web; `frecuencias_brasil.csv`: copia tabular de frecuencias.
- `reproducibilidad/`: generador y requisitos. Necesita el CSV original que ya está en el proyecto; no descarga datos ni requiere credenciales.
- `PROMPT_OPENCODE.md`: instrucciones completas de integración.
- `REVISION_REFERENCIA.md`: análisis de lo que contiene la página de referencia y qué se adapta.

## Cómo usar
1. Abre `LEEME.html` para revisar los dos Excel y los informes antes de integrarlos.
2. Copia la carpeta completa como `recursos/descriptiva_brasil/` de tu repositorio.
3. Pega el texto de `PROMPT_OPENCODE.md` en OpenCode.

## Recalcular (opcional)
Desde la raíz del repositorio, con Python 3 y las dependencias de requirements.txt:

    python recursos/descriptiva_brasil/reproducibilidad/generar_descriptiva.py data/2023_01_producao_Terra.csv recursos/descriptiva_brasil

No reemplaza las plantillas originales ni páginas del proyecto. La estructura de los Excel se adapta de las plantillas, sin conservar sus valores, errores, filas vacías ni formato excesivo.

## Límites metodológicos
Las plantillas originales son de Kansas y no se trasladan sus valores a Brasil. Se estudian 17 variables originales o derivadas pertinentes, no se afirma analizar cada columna de laboratorio del CSV. Identificadores y columnas redundantes se documentan en el inventario. Se conserva enero de 2023, sin incorporar los meses usados para ML.

Los instrumentos físicos de medición no se identifican en el CSV. Los días son equivalentes completos a partir de horas, no calendario. La selección de campo principal (213 categorías) no conserva las 221 asociaciones distintas de los registros. Las medidas de API representan una corriente y no el API calculado de la mezcla de un pozo.
