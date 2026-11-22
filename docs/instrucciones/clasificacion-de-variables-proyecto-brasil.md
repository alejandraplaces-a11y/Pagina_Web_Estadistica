Clasificación de variables · Proyecto Brasil 

# Clasificación de variables · Proyecto Brasil 

Nov 16, 2026 · @gaby 

La clasificación de la página está bien en general; solo hay que mover las horas de producción de discretas a continuas. 

## Clasificación final 

✔ = ya está en la página y está bien · ✘ = hay que moverla · + = conviene agregarla 

|Grupo|Variable|Estado|
|---|---|---|
|Cualitativa nominal|Estado|✔|
|Cualitativa nominal|Cuenca|✔|
|Cualitativa nominal|Campo principal|✔|
|Cualitativa nominal|Operador principal|✔|
|Cualitativa nominal|Tipo de instalación|✔|
|Cualitativa nominal|Produce óleo|✔|
|Cualitativa nominal|Produce gas total|✔|
|Cualitativa nominal|Categoría del pozo|+ (Tabela de Poços)|
|Cualitativa nominal|Dirección del pozo|+ (Tabela de Poços)|
|Cualitativa ordinal|Clase de crudo por API|✔|
|Cualitativa ordinal|Nivel de actividad en el mes|+|
|Cualitativa ordinal|Nivel de producción de óleo|+|
|Cualitativa ordinal|Clase de profundidad|+|
|Cuantitativa discreta|Días equivalentes completos|✔|
|Cuantitativa discreta|Pozos por campo|+ (ya se usa en la inferencial)|
|Cuantitativa continua|Horas de producción|✘hoy está en discretas|
|Cuantitativa continua|Óleo|✔|
|Cuantitativa continua|Condensado|✔|
|Cuantitativa continua|Gas natural asociado|✔|



Page 1 of 2 

Clasificación de variables · Proyecto Brasil 

|Grupo|Variable|Estado|
|---|---|---|
|Cuantitativa continua|Gas natural no asociado|✔|
|Cuantitativa continua|Gas natural total|✔|
|Cuantitativa continua|Agua|✔|
|Cuantitativa continua|Grado API|✔|
|Cuantitativa continua|Latitud|+ (Tabela de Poços)|
|Cuantitativa continua|Longitud|+ (Tabela de Poços)|
|Cuantitativa continua|Altitud del terreno|+ (Tabela de Poços)|
|Cuantitativa continua|Profundidad perforada|+ (Tabela de Poços)|



Total: 9 nominales, 4 ordinales, 2 discretas y 12 continuas (27 variables), igual que la pestaña Indicadores de la hoja. 

## Por qué las horas son continuas y los días discretos 

**Horas de producción: continua.** El tiempo se mide, no se cuenta: un pozo puede producir 738,5 h aunque el archivo lo registre como 738. Que el dato venga en números enteros es una limitación del registro, no la naturaleza de la variable. La propia página lo reconoce («discretas por la resolución entera del archivo, no porque el tiempo físico sea discreto»), y la tabla de ejemplo del profesor clasifica el tiempo (Shutdown Time) como continua. 

**Días equivalentes completos: discreta.** Sale de contar días enteros (0, 1, 2, …, 31) a partir de las horas, por eso solo toma valores enteros. 

**Pozos por campo: discreta.** Es un conteo (1, 2, 3, … pozos). Su unidad es el campo (n = 221), no el pozo. 

Page 2 of 2 

