## Tarjetas de variables y correcciones · Proyecto Brasil

N ov 16, 2026

·

@gaby

## Resumen

Las variables de interés se reparten en 25 tarjetas, agrupadas como en los ejemplos: 7 nominales, 4 ordinales, 2 discretas y 12 continuas. Tres de las ordinales son nuevas y se derivan de variables que ya tienen. Cada tarjeta trae su título, la columna y el código, un texto corto y el dato clave, listos para pegar; solo falta el enlace de RPubs.

En la página quedan 10 correcciones. Lo más urgente es la página de Equipo, que muestra textos de relleno, y cambiar la tabla de variables al formato de 13 columnas.

Formato de cada tarjeta, como en los ejemplos: un ícono, el título de la variable y el enlace a RPubs. Si el diseño lo permite, añadan el texto corto y el dato clave debajo del título: eso las hace más claras que las de los ejemplos, que solo muestran el enlace.

## 1. Cualitativas · Nominales (7 tarjetas)

Categorías sin orden. En RPubs, cada una lleva: tabla de frecuencias (fᵢ, hᵢ, %), diagrama de barras, diagrama circular y moda. Si tiene muchas categorías (Campo, Operador), muestren las 10 más frecuentes y agrupen el resto en «Otros».

| Tarjeta | Columna · código | Texto de la tarjeta | Dato clave |
| --- | --- | --- | --- |
| Estado | Estado · estado | Unidad federativa | 9 estados · moda: Rio Grande |
|   |   | donde está el pozo. | do Norte (3.195 pozos, 60,2 |
|   |   |   | %) |
| Cuenca | Bacia · cuenca | Cuenca geológica | 12 cuencas · moda: Potiguar |
| sedimentaria |   | de la que se extrae | (3.397 pozos, 64,0 %) |
|   |   | el crudo. |   |
| Campo de | Campo · campo | Campo petrolero al | 213 campos · moda: Estreito |
| producción |   | que pertenece el | (949 pozos, 17,9 %) |
|   |   | pozo (el de mayor |   |
|   |   | óleo si aporta a |   |
|   |   | varios). |   |


| Tarjeta | Columna · código | Texto de la tarjeta | Dato clave |
| --- | --- | --- | --- |
| Empresa | Operador · | Empresa | 39 operadores · moda: |
| operadora | operador | responsable de | Petrobras (3.099 pozos, 58,4 |
|   |   | operar el pozo. | %) |
| Tipo de | Tipo Instalação · | Instalación que | 2 categorías · moda: |
| instalación | tipo_instalacion | recibe la | Instalación de |
|   |   | producción del | embarque/desembarque |
|   |   | pozo. | (5.108 pozos, 99,6 %) · 180 sin |
|   |   |   | dato |
| Categoría del | CATEGORIA · | Propósito con que | 8 categorías · moda: |
| pozo | categoria | se perforó el pozo: | Desarrollo (4.811 pozos, 90,6 |
|   |   | desarrollo, | %) |
|   |   | extensión, |   |
|   |   | exploración, |   |
|   |   | inyección… |   |
| Dirección del | DIRECAO · | Trayectoria de la | 3 categorías · Vertical 4.036 |
| pozo | direccion | perforación. | (76,0 %) · Direccional 1.178 · |
|   |   |   | Horizontal 94 |

Todas las cifras son por pozo (n = 5.308), con los datos de enero de 2023 y la Tabela de Poços de la ANP.

## 2. Cualitativas · Ordinales (4 tarjetas)

Categorías con orden. En RPubs, cada una lleva: tabla de frecuencias con las categorías en su orden (fᵢ, hᵢ, Fᵢ, Hᵢ), diagrama de barras ordenado, moda y mediana. Solo la clase de crudo está hoy en la tabla de variables; las otras tres son nuevas y se derivan de variables que ya tienen, así que hay que añadirlas como filas 40 a 42.

| Tarjeta | Columna · código | Texto de la tarjeta | Categorías y |
| --- | --- | --- | --- |
|   |   |   | conteo |
| Clase de crudo | Derivada de Grau API · | Clasifica el crudo | Pesado 468 < |
|   | clase_api | por su densidad: | Mediano 3.296 < |
|   |   | pesado < 22,3° API, | Ligero 671 · n = |
|   |   | mediano de 22,3° a | 4.435 · moda y |
|   |   | 31,1°, ligero > 31,1°. | mediana: Mediano |


| Tarjeta | Columna · código | Texto de la tarjeta | Categorías y |
| --- | --- | --- | --- |
|   |   |   | conteo |
| Nivel de | Derivada de los días de | Indica cuánto trabajó | Inactivo 356 < |
| actividad en el | producción · actividad | el pozo en enero: | Parcial 3.358 < |
| mes (nueva) |   | inactivo (0 días), | Continuo 1.594 · n = |
|   |   | parcial (1 a 30 días), | 5.308 · moda y |
|   |   | continuo (31 días). | mediana: Parcial |
| Nivel de | Derivada del óleo · | Clasifica el pozo por | Bajo 1.327 < Medio |
| producción de | nivel_oleo | cuartiles de su | 2.654 < Alto 1.327 · |
| óleo (nueva) |   | producción: bajo ≤ | n = 5.308 · moda y |
|   |   | Q₁ (1,45 bbl/día), | mediana: Medio |
|   |   | medio entre Q₁ y Q₃, |   |
|   |   | alto > Q₃ (10,64 |   |
|   |   | bbl/día). |   |
| Clase de | Derivada de la | Clasifica el pozo por | Somero 3.306 < |
| profundidad | profundidad perforada · | su profundidad: | Intermedio 1.380 < |
| (nueva) | clase_profundidad | somero < 1.000 m, | Profundo 120 · n = |
|   |   | intermedio de 1.000 | 4.806 · moda y |
|   |   | a 3.000 m, profundo | mediana: Somero |
|   |   | > 3.000 m. |   |

## Filas nuevas para la tabla de variables (mismo formato que las demás):

| N° | Nombre | Nombre específico Nombre en código Tipo |   | Subtipo Dominio | Rango | Escala Variable de |
| --- | --- | --- | --- | --- | --- | --- |
|   |   |   |   |   |   | interés |
| 40 | — (derivada | Nivel_actividad | actividad | Cualitativa Ordinal D = | R = | Ordinal Sí, resume la |
|   | de los días |   |   | {Inactivo, | {Inactivo < | actividad del |
|   | de |   |   | Parcial, | Parcial < | pozo en el |
|   | producción) |   |   | Continuo} | Continuo} | mes. |
| 41 | — (derivada | Nivel_producción | nivel_oleo | Cualitativa Ordinal D = {Bajo, | R = {Bajo < | Ordinal Sí, agrupa los |
|   | del óleo) |   |   | Medio, | Medio < | pozos por |
|   |   |   |   | Alto} | Alto} | cuartiles de |
|   |   |   |   |   |   | producción. |
| 42 | — (derivada | Clase_profundidad clase_profundidad Cualitativa Ordinal D = |   |   | R = | Ordinal Sí, permite |
|   | de la |   |   | {Somero, | {Somero < | comparar la |
|   | profundidad |   |   |   | Intermedio, Intermedio | producción |
|   | perforada) |   |   | Profundo} | < | según la |
|   |   |   |   |   | Profundo} | profundidad. |

En las tres, el instrumento es «Cálculo a partir de…» la variable de origen y el sistema de medidas es «Clasificación por días», «Clasificación por cuartiles» o «Clasificación por profundidad». Los cortes de profundidad (1.000 y 3.000 m) son un criterio del grupo: decirlo así en la tarjeta.


## 3. Cuantitativas · Discretas (2 tarjetas)

Conteos con valores enteros. En RPubs, cada una lleva: tabla de frecuencias por valor (o por intervalos si hay muchos valores), diagrama de bastones, media, mediana, moda, varianza, desviación estándar, CV, asimetría, curtosis y atípicos.

| Tarjeta | Columna · código | Texto de la tarjeta | Dato clave |
| --- | --- | --- | --- |
| Días completos | Derivada de Tempo | Número de días | Recorrido 0 a 31 días · |
| de producción | de Produção · dias | completos que el pozo | media 24,0 · mediana |
|   |   | produjo en enero de | 30 · moda 31 (1.594 |
|   |   | 2023 (horas ÷ 24, parte | pozos) · n = 5.308 |
|   |   | entera). |   |
| Pozos por campo Derivada de Campo · |   | Número de pozos con | 221 campos · media |
|   | pozos_campo | producción en cada | 24,8 · mediana 3 · |
|   |   | campo. Aquí la unidad | máximo 950 (Estreito) |
|   |   | es el campo, no el pozo. | · 72 campos con un |
|   |   |   | solo pozo |

La tarjeta de pozos por campo debe aclarar que el individuo cambia de pozo a campo, y que un pozo que aporta a dos campos cuenta en ambos (por eso la suma da 5.471 y no 5.308). Es la segunda variable discreta que ya usan en la inferencial (4.2.16).

## 4. Cuantitativas · Continuas (12 tarjetas)

Mediciones con decimales. En RPubs, cada una lleva: tabla de frecuencias por intervalos (Sturges, o log₁₀ si es muy asimétrica), histograma, polígono, ojiva, diagrama de caja y todos los indicadores (media, mediana, moda, varianza, desviación, CV, asimetría, curtosis y atípicos).

| Tarjeta | Columna · código | Texto de la tarjeta | Dato clave (n |
| --- | --- | --- | --- |
|   |   |   | = 5.308 salvo |
|   |   |   | que se |
|   |   |   | indique) |
| Producción | Óleo (bbl/dia) · oleo | Volumen medio | 0 a 1.102,83 |
| de óleo |   | diario de petróleo | bbl/día · |
|   |   | del pozo. | media 11,95 · |
|   |   |   | mediana 4,42 |
|   |   |   | · 420 pozos |
|   |   |   | en 0 |


| Tarjeta | Columna · código | Texto de la tarjeta | Dato clave (n |
| --- | --- | --- | --- |
|   |   |   | = 5.308 salvo |
|   |   |   | que se |
|   |   |   | indique) |
| Producción | Água (bbl/dia) · agua | Agua que sale del | 0 a 5.074,23 |
| de agua |   | pozo junto con el | bbl/día · |
|   |   | petróleo. | media 244,65 |
|   |   |   | · mediana |
|   |   |   | 99,88 · 353 |
|   |   |   | pozos en 0 |
| Gas natural | Gás Total · gas_total | Gas asociado más | 0 a 550,69 |
| total |   | gas no asociado del | Mm³/día · |
|   |   | pozo. | media 3,79 · |
|   |   |   | mediana |
|   |   |   | 0,0057 · 239 |
|   |   |   | pozos en 0 |
| Gas natural | Gás Associado · gas_asociado | Gas que sale | 0 a 550,69 |
| asociado |   | disuelto con el | Mm³/día · |
|   |   | petróleo. | media 2,01 · |
|   |   |   | mediana |
|   |   |   | 0,0043 · 466 |
|   |   |   | pozos en 0 |
| Gas natural | Gás Não Associado · | Gas de yacimientos | 0 a 499,61 |
| no asociado | gas_no_asociado | de gas, sin | Mm³/día · |
|   |   | petróleo. | media 1,78 · |
|   |   |   | 5.081 pozos |
|   |   |   | en 0 (95,7 %) |
| Condensado Condensado (bbl/dia) · condensado Líquido que se |   |   | 0 a 722,73 |
|   |   | condensa del gas | bbl/día · |
|   |   | en superficie. | media 0,70 · |
|   |   |   | 5.209 pozos |
|   |   |   | en 0 (98,1 %) |
| Tiempo de | Tempo de Produção · horas | Horas que el pozo | 0 a 744 h · |
| producción |   | produjo en enero | media 585,4 · |
|   |   | (máximo 744). | mediana 738 · |
|   |   |   | 109 pozos en |
|   |   |   | 0 |


| Tarjeta | Columna · código | Texto de la tarjeta | Dato clave (n |
| --- | --- | --- | --- |
|   |   |   | = 5.308 salvo |
|   |   |   | que se |
|   |   |   | indique) |
| Grado API | Grau API · api | Densidad del | 13,20° a |
|   |   | crudo; a mayor | 64,64° · |
|   |   | °API, crudo más | media 25,20 · |
|   |   | liviano. | mediana 23,2 |
|   |   |   | · n = 4.435 |
| Profundidad | PROFUNDIDADE_SONDADOR_M · | Profundidad final | 181,4 a 4.618 |
| perforada | profundidad_m | del pozo. | m · media |
|   |   |   | 921,5 · |
|   |   |   | mediana 739 · |
|   |   |   | n = 4.806 |
| Altitud del | COTA_ALTIMETRICA_M · altitud_m Elevación del |   | 0 a 397,5 m · |
| terreno |   | terreno en la boca | media 47,1 · |
|   |   | del pozo. | mediana 37,7 |
|   |   |   | · n = 3.217 |
| Latitud | LATITUDE_BASE_DD · latitud | Posición norte-sur | −24,73° a |
|   |   | del pozo | −2,58° · |
|   |   | (SIRGAS2000). | media −7,76° · |
|   |   |   | mediana |
|   |   |   | −5,39° |
| Longitud | LONGITUDE_BASE_DD · longitud | Posición este- | −65,66° a |
|   |   | oeste del pozo | −35,58° · |
|   |   | (SIRGAS2000). | media |
|   |   |   | −37,76° · |
|   |   |   | mediana |
|   |   |   | −37,10° |

## Detalles para estas tarjetas

- Condensado y gas no asociado son casi siempre 0 (más del 95 % de los pozos). Si el profesor no pide todas, déjenlas al final o únanlas en una sola tarjeta «Condensado y gas no asociado», y expliquen que solo los pozos de gas los producen.

- No calculen el CV de latitud, longitud, altitud ni grado API: son de escala de intervalo y el CV solo vale para escala de razón.

- Para latitud y longitud, el mejor gráfico es el mapa de puntos; el histograma solo muestra en qué franjas se concentran los pozos (Rio Grande do Norte, cerca de −5° y −37°).


## 5. Correcciones de la página

Se revisó la versión publicada del 11 de noviembre. Casi todo lo de la revisión 2 ya está corregido: Plotly está en el repositorio, los encabezados ya no se ponen en mayúsculas, la última clase está cerrada, el criterio de Cook está unificado, se borró la restricción repetida y se añadió el IC de la mediana por estadísticos de orden. Quedan estos puntos:

| # | Página | Qué está mal | Cómo corregirlo |
| --- | --- | --- | --- |
| 1 | Equipo | Se ven textos de relleno: «Rol por | Poner el rol real, el correo institucional |
|   |   | definir» y «correo@uce.edu.ec» en | de cada una, el nombre del docente y el |
|   |   | las 5 integrantes, «Nombre del | paralelo. Es lo primero que se nota. |
|   |   | docente» y «Paralelo por definir». |   |
| 2 | Estadística | La tabla tiene el formato anterior | Reemplazarla por la tabla de 13 |
|   | descriptiva · | (Válidos, Nulos, Ceros) y debajo | columnas de la hoja y borrar la lista; |
|   | Variables | sigue la lista «Columnas del archivo | añadir las filas 40 a 42 de las ordinales |
|   |   | que no se analizan». | nuevas. |
| 3 | Estadística | El rango de Campo dice 221 | Escribir 213 en la tabla por pozo, o |
|   | descriptiva · | campos, pero cada pozo tiene | explicar que 221 cuenta los campos con |
|   | Variables | asignado un solo campo (el de | al menos una fila. En la inferencial |
|   |   | mayor óleo) y así quedan 213. Los | (pozos por campo) sí son 221, porque |
|   |   | 221 salen de contar todas las filas. | ahí la unidad es el campo. |
| 4 | Inicio y Mapa | Leaflet se carga desde unpkg.com: | Guardar leaflet.js y leaflet.css en js/ y |
|   |   | sin internet el mapa no aparece, | css/, como hicieron con plotly.min.js. |
|   |   | igual que pasaba con Plotly. |   |
| 5 | Machine Learning La fuente dice |   | Cambiar a «Los 12 archivos mensuales |
|   |   | «2023_01_producao_Terra.csv», | de producción terrestre de la ANP, |
|   |   | pero el modelo usa los 12 archivos | enero a diciembre de 2023». |
|   |   | mensuales de 2023 (58.302 pares |   |
|   |   | pozo-mes). |   |
| 6 | Machine Learning Restricciones: dice «pozos que |   | Cambiar a «en el mes siguiente». |
|   |   | tienen producción reportada en los |   |
|   |   | tres meses siguientes», pero el |   |
|   |   | diseño predice un solo mes (t + 1). |   |
| 7 | Machine Learning Mezcla formatos de números |   | Usar punto de miles en toda la página y |
|   |   | («58.302» arriba y «58 302», «32 | escribir «incluidos». |
|   |   | 302», «1 583» abajo) y tiene una |   |
|   |   | falta: «no incluídos». |   |
| 8 | Machine Learning La frase «en otros proyectos usar la |   | Reescribirla en positivo: «Ninguna |
|   |   | producción para predecir… da un | variable de entrada se mide en el mes |
|   |   | acierto falso del 99 %» critica a | que se predice; así se evita un acierto |
|   |   | otros grupos sin citarlos. | artificial». |


| # | Página | Qué está mal | Cómo corregirlo |
| --- | --- | --- | --- |
| 9 | Repositorio | docs/referencias/test_anim.html es un archivo de | Borrar docs/referencias/test_anim.html y sacar del sitio |
|   | publicado | prueba y queda público en GitHub | los archivos de trabajo que no son parte |
|   |   | Pages; también se publican | de la página. |
|   |   | archivos de trabajo (AGENTS.md, |   |
|   |   | docs/proyecto.md, skills-lock.json). |   |
| 10 | Herramientas y | Al usar la Tabela de Poços, la fuente | Añadir la Tabela de Poços como |
|   | Mapa | de datos y el mapa quedan | segunda fuente y, si hay tiempo, dibujar |
|   |   | incompletos: solo nombran el | cada pozo con sus coordenadas reales |
|   |   | archivo de producción y el mapa | (archivo |
|   |   | agrupa por Estado. | pozos_brasil_coordenadas_ANP.csv). |

## Lo que ya está bien y conviene mantener

- Los resultados están en la propia página; en los ejemplos casi todo depende de RPubs. Las tarjetas con enlace a RPubs se suman a eso, no lo reemplazan.

- La página de Herramientas ya explica cómo reproducir el análisis paso a paso, con los comandos.

- Machine Learning separa entrenamiento, validación y prueba por meses y compara con un modelo base: está mejor planteado que en los ejemplos, que solo enlazan un cuaderno de Colab.

## 6. Lista de cambios

## Tarjetas (siguiendo los ejemplos)

- Crear la sección de tarjetas con cuatro grupos: Nominales (7), Ordinales (4), Discretas (2) y Continuas (12).

- Publicar en RPubs un análisis por tarjeta, con lo que pide cada grupo (tabla de frecuencias, gráficas e indicadores), y pegar el enlace en su tarjeta.

- Añadir a la tabla de variables las filas 40 a 42 (nivel de actividad, nivel de producción y clase de profundidad).

## Correcciones

- Completar Equipo: roles, correos, docente y paralelo (1).

- Cambiar la tabla de variables al formato de 13 columnas y borrar la lista de columnas que no se analizan (2).

- Corregir el número de campos: 213 por pozo (3).

- Guardar Leaflet en el repositorio (4).

- Corregir fuente, restricción, formato de números, «incluidos» y la frase sobre otros proyectos en Machine Learning (5 a 8).


Borrar docs/referencias/test_anim.html y los archivos de trabajo del sitio publicado (9).

Añadir la Tabela de Poços como fuente y, si se puede, los pozos en el mapa (10).
