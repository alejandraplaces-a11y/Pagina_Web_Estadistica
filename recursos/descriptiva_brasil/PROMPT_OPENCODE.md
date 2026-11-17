# Prompt para OpenCode: integración de la descriptiva de Brasil

## Preparación
Descomprime este paquete y coloca su carpeta completa en `recursos/descriptiva_brasil/` del proyecto. Conserva sus subcarpetas. Los Excel están en `documentos/`, los informes autónomos en `analisis/` y los resultados en `datos/descriptiva_brasil.json`. No hace falta ejecutar Python para mostrar estos resultados. Los informes HTML ya contienen tablas, gráficas e interpretación; abren incluso sin Internet ni JavaScript.

Copia el siguiente texto en OpenCode:

---

Trabaja sobre `Estadistica.html` del proyecto de producción terrestre de Brasil. Lee AGENTS.md y las convenciones locales antes de editar. Tu tarea es el diseño, navegación e integración: los cálculos y los documentos están preparados en `recursos/descriptiva_brasil/`. No cambies modelos inferenciales, regresiones ni Machine Learning en esta tarea.

OBJETIVO VISUAL Y ESTRUCTURAL
Toma como referencia de organización https://eldarioyautibug.github.io/valewebc/descriptiva.html, sin copiar su código ni sus textos. Esa página tiene metodología (población, individuo y muestra), enlaces a dos Excel y cuatro grupos de tarjetas: nominales, ordinales, discretas y continuas. Aquí usamos exclusivamente variables y datos de Brasil, no las variables de Kansas de esa referencia.

Respeta la identidad actual del proyecto: menú lateral, colores, fuentes locales, accesibilidad, footer y soporte móvil. No añadas frameworks ni build. La referencia no obliga a usar RPubs: los informes ya están disponibles como HTML local. El archivo principal se sigue llamando exactamente `Estadistica.html` (respeta las mayúsculas).

ESTRUCTURA DE LA PÁGINA
1. Resumen inicial, estático en HTML: enero 2023, 5.471 registros y 5.308 pozos únicos, 143 pozos con varias filas, 9 estados, media del óleo 11,95 y mediana 4,42 bbl/día. Estas cifras siguen disponibles si falla JavaScript.
2. Metodología: conserva 4.1.1 y 4.1.2 y la distinción registro ≠ pozo. Población objetivo: pozos terrestres de Brasil; muestra administrativa por corte temporal enero 2023, no aleatoria y sin cobertura nacional garantizada. No afirmar independencia comprobada ni precisión nacional. Los volúmenes se suman por pozo; horas = máximo entre filas (aproximación, no tiempo único reconstruido); categorías de la fila con mayor óleo, desempate por orden original. El API es el primer dato no nulo al ordenar por óleo descendente.
3. «Tablas de variables e indicadores» (4.1.3 / documentación): dos tarjetas claras con descripción breve y enlaces reales:
   - «Abrir tabla de variables» y «Descargar Excel»: recursos/descriptiva_brasil/documentos/Tabla_Variables_Brasil.xlsx
   - «Abrir tabla de indicadores» y «Descargar Excel»: recursos/descriptiva_brasil/documentos/Tabla_Indicadores_Brasil.xlsx
   Los enlaces deben funcionar con archivos locales; no inventes URLs de Google Sheets. Un navegador puede descargar el Excel en vez de previsualizarlo: explícalo. No subir documentos a servicios externos. Si se desea vista previa, muestra las tablas HTML a partir del JSON.
4. «Análisis por tipo de variable»: cuatro grupos bien diferenciados y con anclas para el índice. Construye las tarjetas desde el JSON entregado, usando `subtipo`, `nombre`, `lectura`, `ruta` e `indicadores`. Puede ser HTML estático generado desde el JSON; no inventar cifras:
   A. Cualitativas nominales (7): Estado, Cuenca, Campo principal, Operador principal, Tipo de instalación, Produce óleo, Produce gas total.
   B. Cualitativas ordinales (1): Clase de crudo por API.
   C. Cuantitativas discretas (2): Días equivalentes completos; Horas de producción registradas.
   D. Cuantitativas continuas (7): Óleo, Condensado, Gas asociado, Gas no asociado, Gas total, Agua y Grado API.
   Cada tarjeta: nombre, subtipo, una frase de resultado (sin jerga), tamaño válido/sin dato y enlace «Ver análisis». Forma la URL como `recursos/descriptiva_brasil/` + `ruta` del JSON. No enlaces las 17 tarjetas a la misma página, ni a informes de Kansas. Los informes locales ya contienen frecuencias, gráficas, indicadores y límites, por lo que no hace falta RPubs.
5. Conserva el acceso a 4.1.4–4.1.7: TDF, GDF, indicadores y resumen por Estado. Reorganiza lo existente en secciones o desplegables para evitar una página interminable, pero no borres los resultados ni rompas los IDs que usan los JS. Mantén la navegación por teclado y el índice. Evita duplicar la misma tabla en varios bloques sin propósito.
6. Si modificas copias de tablas o textos existentes, alínealos con los Excel/JSON de este paquete; no mezcles definiciones antiguas y nuevas.

CORRECCIONES ESTADÍSTICAS QUE SE DEBEN RESPETAR
- 5.308 es el total de pozos. Los n válidos pueden ser menores; nunca ocultarlos ni asumir nulos=0. Un cero observado no es un nulo.
- Hay 221 campos en los registros originales, pero 213 campos principales al elegir una sola fila por pozo. Para la variable «Campo principal» usa 213. Puedes mantener 221 como contexto del archivo si lo etiquetas expresamente.
- Días equivalentes completos = floor(max_horas/24); no son un conteo de días calendario en los que hubo producción. Horas es discreta por la resolución entera registrada: el tiempo físico es continuo. La regla del máximo es una aproximación que debe declararse.
- Clase API: pesado <22,3; mediano 22,3–31,1 inclusive; ligero >31,1. Clasificación operativa del proyecto; no presentarla como única clasificación universal. No inventar otras ordinales.
- Grado API es cuantitativa continua de intervalo, no de razón; CV no aplica. Nominales sin medias, medianas ni desviaciones; ordinales con moda y mediana categórica, no promedio de códigos.
- Instrumento de medida: el CSV no identifica el equipo físico. ANP es la fuente administrativa, no afirmar un instrumento específico.
- Gas total = asociado + no asociado: ceros total 239, asociado 466, óleo 420, agua 353. Conserva las unidades tal como las declara el archivo; no transformar unidades por suposición.
- Continuas de producción: clase {0} separada y Sturges en log10 de los positivos; hᵢ = fᵢ/n válido incluyendo ceros. Última clase cerrada; ojiva en límites superiores. API usa clases lineales.
- Clase modal depende de los intervalos y no equivale a moda exacta. Atípicos son valores fuera de Q1−1,5·RIC y Q3+1,5·RIC: no eliminarlos por defecto.
- Cuartiles interpolados linealmente en numéricas; sd/varianza muestrales con n−1; curtosis en exceso. CV solo en razón y media distinta de cero.
- Los cambios del número de clases o de la regla de selección de categorías no deben alterar inadvertidamente el resto de inferencial/regresión.

INTERACCIÓN CON LOS INFORMES
Al abrir un análisis, debe ser fácil volver a la descriptiva: los informes incluyen un enlace relativo a `../LEEME.html`, que es un índice de entregables. Cambia ese enlace (en los informes que integres) por `../../../Estadistica.html#analisis-variables`, o añade un botón de retorno adicional. Si abres otra pestaña indícalo en el nombre accesible y usa rel="noopener". No uses iframes inaccesibles ni dependas de recursos privados de Google.

COMPROBACIÓN OBLIGATORIA
- Ejecuta el servidor estático del proyecto y navega a Estadistica.html.
- Abre los 2 Excel y las 17 tarjetas: ninguna ruta debe devolver 404.
- Verifica que no quedan Cargando… ni errores de consola; pruebas a 1360 y 375 px, sin scroll horizontal de toda la página (tablas dentro de table-scroll).
- Comprueba hᵢ, n y nulos contra el JSON y que los ceros de gas asociado/total no se confunden.
- Conserva otras páginas y enlaces existentes; no hagas push ni merge a menos que te lo solicite.
- Al terminar, explica qué archivos creaste/modificaste y cómo verificaste los enlaces y el diseño.
