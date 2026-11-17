# Página de referencia: contenido y adaptación

Referencia consultada: https://eldarioyautibug.github.io/valewebc/descriptiva.html

## Organización visible
1. Navegación y título: Estadística descriptiva / Caracterización de datos.
2. Metodología estadística: población, individuo, muestra y caso de estudio.
3. Documentación: tablas de variables e indicadores, con enlaces para abrir dos Google Sheets.
4. Clasificación de variables con tarjetas que enlazan informes RPubs:
   - Nominales (8): Produce Petróleo, Produce Gas, Nombre del Operador, Nombre del Campo, Formación Productora, Fuente de Coordenadas, Código de Condado, Dirección de Range.
   - Ordinales (4): Nivel de Profundidad, Etapa de Vida, Nivel de Producción, Nivel de Producción Promedio.
   - Discretas (4): Sección, Township, Años Activo, Range.
   - Continuas (5): Latitud, Longitud, Profundidad del Pozo, Producción Acumulada, Producción Promedio Anual.

Las tarjetas incluyen variable, clasificación y enlace al informe; no equivalen a resultados numéricos incrustados. El intento de abrir el RPubs de «Produce Oil» devolvió solo el título, sin el análisis: no se afirma haber auditado el contenido interno de todos los RPubs. Las dos plantillas recibidas sí se inspeccionaron directamente.

## Qué se conserva como idea (sin copiar)
Metodología + dos documentos descargables + análisis por los cuatro subtipos. Se recomienda mantener los resultados importantes en la web y abrir los análisis locales, no depender de RPubs.

## Qué no se traslada a Brasil
No hay coordenadas, profundidad de pozo, vida útil ni producción acumulada en el CSV analizado de Brasil. No se inventan esas variables. Los códigos de identificación no se clasifican como mediciones cuantitativas por contener dígitos. No se calculan CV de coordenadas ni de API, ni medias de variables nominales. Los umbrales ordinales de producción de Kansas no se reutilizan.

## Contenido preparado para Brasil
- Nominales: Estado, Cuenca, Campo principal, Operador principal, Tipo de instalación, Produce óleo y Produce gas total.
- Ordinales: Clase de crudo por API.
- Discretas: Días equivalentes completos y Horas de producción registradas.
- Continuas: Óleo, Condensado, Gas asociado, Gas no asociado, Gas total, Agua y Grado API.

Los dos Excel conservan los campos conceptuales de las plantillas originales, reemplazando íntegramente las cifras de Kansas por resultados reproducibles del archivo ANP de enero de 2023. Se agregan hojas metodológicas y tablas de frecuencia para revisar los resultados.
