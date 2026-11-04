<p align="center">
  <img src="img/logo-universidad.png" width="110" alt="Universidad Central del Ecuador">
</p>

<h1 align="center">Terra · Análisis estadístico de la producción terrestre de hidrocarburos en Brasil</h1>

<p align="center">
  <a href="index.html"><img alt="HTML5" src="https://img.shields.io/badge/HTML5-sem%C3%A1ntico-E34F26?logo=html5&logoColor=white"></a>
  <a href="css/styles.css"><img alt="CSS3" src="https://img.shields.io/badge/CSS3-responsive-1572B6?logo=css3&logoColor=white"></a>
  <a href="js"><img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-vanilla%20ES2020-F7DF1E?logo=javascript&logoColor=black"></a>
  <a href="scripts/1_preprocesamiento_mapa.py"><img alt="Python" src="https://img.shields.io/badge/Python-pandas-3776AB?logo=python&logoColor=white"></a>
  <a href="https://leafletjs.com/"><img alt="Leaflet" src="https://img.shields.io/badge/Leaflet-1.9.4-199900?logo=leaflet&logoColor=white"></a>
  <a href="https://plotly.com/javascript/"><img alt="Plotly" src="https://img.shields.io/badge/Plotly-2.35.2-3F4F75?logo=plotly&logoColor=white"></a>
</p>

Sitio web académico que analiza la **producción terrestre de petróleo y gas natural en Brasil** a partir de los datos abiertos de la ANP correspondientes a **enero de 2023**. El proyecto recorre, con una página por bloque, la estadística descriptiva, la estadística inferencial y la visualización geoespacial de la producción por Estado, cuenca y campo.

Es un sitio **estático, sin frameworks ni paso de compilación**: HTML, CSS y JavaScript puro, con un script de Python (pandas) que preprocesa el CSV de origen y genera los JSON que consume el front-end.

---

## Contenido del sitio

| Página | Qué muestra |
| --- | --- |
| [`index.html`](index.html) | Portada con video de fondo, recorrido interactivo oeste→este por los Estados productores y las secciones de misión, visión y motivación. |
| [`introduccion.html`](introduccion.html) | Planteamiento del problema y objetivos (general + 3 específicos), cargados desde `data/contexto.json`. |
| [`mapa.html`](mapa.html) | Mapa Leaflet interactivo de Brasil: óleo producido y pozos únicos por Estado, con métrica conmutable, umbral mínimo, panel de detalle y ranking. |
| [`Estadistica.html`](Estadistica.html) | Estadística descriptiva: resumen en cifras, población y muestra, variables, TDF y GDF (nominal, ordinal, discreta y continua), indicadores de óleo, gas y agua, y resumen por Estado. |
| [`estadisticaInferencial.html`](estadisticaInferencial.html) | Estadística inferencial: resumen y veredicto por modelo, VAD, modelo discreto, VAC, modelos continuos, tests de ajuste, probabilidades, estimación, tamaño muestral, segunda VAC (agua) y VAD (pozos por campo), χ² en submuestras y validación con 2023 completo. |
| [`regresion.html`](regresion.html) | 4.3.1 Regresión clásica, índice: galería de modelos, x e y, pares, dispersión, conjetura, comparación de indicadores con criterios comunes y restricciones generales. |
| `regresion-lineal.html`, `regresion-potencial.html`, `regresion-exponencial.html`, `regresion-logaritmica.html`, `regresion-polinomica.html` | Una página por modelo simple: dictamen, linealización, parámetros paso a paso, ajuste gráfico, Pearson, determinación, no determinación y prueba t, residuos y distancia de Cook, restricciones y calculadora. |
| `regresion-multiple.html` | y = f(x₁, x₂): tripletas, ecuaciones normales, modelos lineal y logarítmico comparados, plano 3D y calculadora. |
| [`conclusiones.html`](conclusiones.html) | Conclusiones descriptivas e inferenciales, limitaciones y trabajo futuro. |
| [`herramientas.html`](herramientas.html) | Herramientas, fuente de datos y pasos para reproducir el análisis. |
| [`equipo.html`](equipo.html) | Integrantes del proyecto. |

Las quince páginas comparten una **barra lateral colapsable** (estado persistido en `localStorage`), cabecera, pie con la fuente de datos y un diseño responsive con soporte de `prefers-reduced-motion`.

## Contenido estadístico

### 4.1 Estadística descriptiva (`Estadistica.html`)

- Población: pozos terrestres de Brasil (N no fijado). Muestra: pozos con reporte en enero de 2023, n = 5.308. Los 143 pozos repetidos aportan a varios campos: sus volúmenes se suman y sus horas toman el máximo.
- Tabla de variables con traducción, descripción, tipo, subtipo, dominio, rango observado, escala, instrumento, unidad, válidos, nulos y ceros calculados desde los datos.
- TDF con hᵢ = fᵢ / n para Estado (nominal), clase de crudo por API (ordinal), días de producción (discreta) y óleo (continua: clase {0} + clases de igual ancho en log₁₀).
- GDF: barras, bastones, histograma con polígono en escala log₁₀ y ojiva sobre los límites superiores de clase.
- Indicadores de óleo, gas y agua (clase modal, atípicos con 1,5·RIC, CV solo en escala de razón) y de días, grado API y clase de crudo.
- Resumen descriptivo del óleo por Estado.

### 4.2 Estadística inferencial (`estadisticaInferencial.html`)

- Variable aleatoria discreta: **días completos de producción por pozo** (0–31 días, n = 5 308).
- TDF y gráfica de barras; contraste de los modelos **binomial** y **beta-binomial** con test de ajuste chi-cuadrado.
- Variable aleatoria continua: **óleo por pozo productor** (n = 4 888, excluye ceros).
- Histogramas de frecuencia relativa y de densidad de probabilidad.
- Conjetura del modelo continuo y comparación de candidatos (**lognormal**, gamma, Weibull) con parámetros estimados, ajuste gráfico y chi-cuadrado.
- Restricciones del modelo, cálculos de probabilidad, estimación puntual y por intervalos de confianza (sin corrección por población finita), y cálculo del tamaño muestral.
- Segunda VAC (agua por pozo: gamma frente a lognormal y Weibull), segunda VAD (pozos por campo: Poisson frente a binomial negativa), χ² en submuestras aleatorias de n = 300 y validación de los intervalos de enero con los 12 meses de 2023.

### 4.3 Relación entre variables

- **4.3.1 Regresión clásica** (`regresion.html` y una página por modelo): unidad = campo con óleo > 0 (n = 165). x = pozos del campo, y = óleo del campo (bbl/día). Se elige el modelo potencial ŷ = 8,818·x^1,057 (r = 0,801; sin campos con D de Cook > 1). Los modelos se comparan con criterios comunes: R² en ln y, error relativo mediano y campos influyentes. Para la múltiple con x₂ = gas natural total se recomienda la forma logarítmica, ŷ = 21,14·x₁^0,678·x₂^0,327 (R² = 0,809); el múltiple lineal (R² = 0,781) depende de cuatro campos.
- Machine learning multivariable (4.3.2) y serie de tiempo (4.3.3) siguen pendientes.

## Datos

| Indicador | Valor |
| --- | --- |
| Fuente | ANP (Brasil) — *Dados Abertos*, producción por pozo |
| Período | Enero 2023 (`2023/01`) |
| Registros | 5 471 |
| Pozos únicos | 5 308 |
| Estados con registros | 9 |
| Cuencas | 12 |
| Campos | 221 |
| Operadores | 39 |

Todos los JSON de ejecución viven en [`data/`](data). El CSV original se conserva en `data/2023_01_producao_Terra.csv` (separador `;`, decimal `,`, separador de miles `.`, codificación `utf-8-sig` y una fila extra de subencabezados).

## Tecnologías

- **HTML5 semántico** con regiones de estado, `aria-*`, enlace de salto y tablas con `caption`/`scope`.
- **CSS3** con variables, Grid/Flexbox y breakpoints en 1000, 760, 560 y 520 px.
- **JavaScript vanilla** (ES2020) organizado en módulos por página; sin bundler ni dependencias de instalación.
- **Leaflet 1.9.4** (CDN) y teselas de OpenStreetMap para el mapa interactivo.
- **Plotly 2.35.2** (CDN) para las gráficas estadísticas.
- **Python 3 + pandas, NumPy y SciPy** para el preprocesamiento, los modelos y el cálculo de los JSON.
- **Fuentes autoalojadas** Archivo y Fraunces (subconjuntos latinos, SIL OFL 1.1) en [`fonts/`](fonts).

## Estructura del repositorio

```text
.
├── index.html                  # Portada, recorrido interactivo y motivación
├── introduccion.html           # Planteamiento y objetivos
├── mapa.html                   # Mapa Leaflet por Estado
├── Estadistica.html            # 4.1 Estadística descriptiva
├── estadisticaInferencial.html # 4.2 Estadística inferencial
├── regresion.html              # 4.3.1 Regresión clásica (índice)
├── regresion-*.html            # Una página por modelo (5 simples + múltiple)
├── conclusiones.html           # Conclusiones
├── herramientas.html           # Herramientas y reproducibilidad
├── equipo.html                 # Integrantes
├── css/
│   ├── styles.css              # Base compartida + fuentes
│   ├── ruta.css                # Recorrido de la portada
│   ├── ubicacion.css           # Ajustes de introduccion.html
│   ├── estadistica.css         # Página descriptiva
│   ├── estadisticaInferencial.css
│   ├── paginas.css             # Conclusiones, herramientas y equipo
│   └── regresion.css           # Regresión clásica
├── js/
│   ├── common.js               # leerJSON() y mostrarError()
│   ├── sidebar.js              # Barra lateral colapsable
│   ├── ruta.js                 # Recorrido oeste→este (index)
│   ├── main.js                 # Planteamiento y objetivos
│   ├── mapa.js                 # Mapa Leaflet
│   ├── estadistica.js          # Población, muestra y variables
│   ├── frecuencias.js          # TDF y GDF
│   ├── indicadores.js          # Indicadores y resumen
│   ├── estadisticaInferencial.js
│   ├── modeloDiscreto.js
│   ├── variableContinua.js
│   ├── modeloContinuo.js
│   ├── inferencialAmpliacion.js # 4.2.15 a 4.2.18
│   ├── regresionComun.js       # Utilidades de las páginas de regresión
│   ├── regresion.js            # Índice de la regresión
│   ├── regresionModelo.js      # Páginas de los modelos simples
│   ├── regresionMultiple.js    # Página de la regresión múltiple
│   └── indiceLateral.js        # Índice lateral de la página inferencial
├── data/                       # CSV de origen, GeoJSON y JSON de ejecución
├── scripts/
│   ├── 1_preprocesamiento_mapa.py   # Mapa, VAD, VAC y modelos
│   ├── 2_descriptiva_inferencial.py # Descriptiva, ampliación y validación anual
│   └── 3_regresion.py               # 4.3.1 Regresión clásica
├── img/                        # Logo y fotografía institucional
├── video/                      # Videos de los hero (uno por sección)
├── fonts/                      # Archivo y Fraunces (woff2)
├── proyecto.md                 # Estructura académica del informe
└── AGENTS.md                   # Guía técnica para agentes/colaboradores
```

## Cómo ejecutar el sitio

No hay instalación ni build. Solo necesitas un servidor estático (abrir el HTML con doble clic **no funciona**, porque el navegador bloquea `fetch()` sobre `file://`).

```bash
git clone https://github.com/alejandraplaces-a11y/Pagina_Web_Estadistica.git
cd Pagina_Web_Estadistica
python3 -m http.server 8000
```

Abre <http://localhost:8000/>. Requisitos: un navegador moderno y conexión a Internet para las teselas de OpenStreetMap, Leaflet y Plotly (ambos vía CDN).

## Regenerar los datos (opcional)

```bash
python3 -m venv .venv
.venv/bin/pip install pandas numpy scipy
.venv/bin/python scripts/1_preprocesamiento_mapa.py data/2023_01_producao_Terra.csv
cp scripts/data/*.json data/
.venv/bin/python scripts/2_descriptiva_inferencial.py data/2023_01_producao_Terra.csv --anual datos_2023/
.venv/bin/python scripts/3_regresion.py data/2023_01_producao_Terra.csv
```

> **Nota:** el script 1 escribe en `scripts/` y `scripts/data/`; solo se copian a `data/` los JSON de `scripts/data/`. No sobrescribas `data/map_data.json` ni `data/estadistica_descriptiva.json`: tienen campos que el script ya no genera. El script 2 escribe directamente en `data/`; con `--anual` descarga de la ANP los 12 CSV de 2023 si la carpeta no los tiene.

## Accesibilidad

- Enlace «Saltar al contenido» y landmarks (`header`, `nav`, `main`, `footer`).
- Regiones `role="status"` para los estados de carga y `role="alert"` para los errores.
- Barras y elementos decorativos con `aria-hidden="true"`; tablas con `caption` y `scope`.
- Foco visible (`:focus-visible`) y animaciones desactivadas con `prefers-reduced-motion`, mostrando los valores finales.

## Autores

Proyecto desarrollado por estudiantes de Ingeniería en Petróleos de la Universidad Central del Ecuador:

- Génesis Once
- Esther Places
- Evelyn Rodríguez
- Andrea Sarmiento
- Melany Zapata

**Docencia:** proyecto académico de la asignatura de Estadística · FIGEMPA · Universidad Central del Ecuador · 2026.

## Fuente de datos y licencias

- Datos: [ANP — Produção de petróleo e gás natural por poço](https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/producao-de-petroleo-e-gas-natural-por-poco) (Brasil), enero de 2023.
- Tipografías: Archivo y Fraunces, SIL Open Font License 1.1 (ver [`fonts/README.md`](fonts/README.md)).
- Librerías de terceros: Leaflet (BSD-2-Clause) y Plotly (MIT), cargadas por CDN.
- El código y los análisis de este repositorio se comparten con fines **académicos y educativos**.
