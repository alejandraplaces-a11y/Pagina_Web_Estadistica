# AGENTS.md — Terra (producción terrestre de Brasil)

Static, no-framework site: fifteen HTML pages at the repo root (`index.html`, `introduccion.html`, `mapa.html`, `Estadistica.html`, `estadisticaInferencial.html`, `regresion.html` + six `regresion-*.html` model pages, `conclusiones.html`, `herramientas.html`, `equipo.html`), `css/`, `js/`, self-hosted fonts in `fonts/`, JSON in `data/`, three pandas/scipy scripts in `scripts/`, images in `img/`, videos in `video/`. There is no `package.json`, build, test, lint, or CI — don't invent commands. `proyecto.md` is the graded Spanish outline the site must eventually cover (4.1 descriptive, 4.2 inferential, 4.3 regression/ML/time series); today the planteamiento, the map page, both statistics pages, and 4.3.1 (classical regression) are built; 4.3.2 ML and 4.3.3 time series are pending.

## Preview

- Serve from the repo root over HTTP: `python3 -m http.server 8000` → `http://localhost:8000/`. `file://` fails because the page fetches local JSON.
- Manual check: on `introduccion.html` the "Cargando planteamiento…" status disappears and the planteamiento text plus 1 objetivo general and 3 específicos render from `data/contexto.json`; on `mapa.html` the Leaflet map and the Estado ranking load; on `Estadistica.html` and `estadisticaInferencial.html` the Plotly tables/charts fill in.

## Sections (current)

- `introduccion.html` — `#planteamiento` (inner content div `#planteamiento-contenido`) and `#objetivos` (`#objetivo-general`, `#objetivos-especificos`). Both are fed by `js/main.js` from `data/contexto.json`.
- `index.html` — `#hero` (video hero), `#diagrama` (interactive west→east route, `js/ruta.js`), `#mision-vision`, `#motivacion`.
- `mapa.html` — Leaflet map of production per Estado (`js/mapa.js`), ranking panel and metric/threshold controls.
- `Estadistica.html` — descriptive statistics (static key-figures summary, población/muestra, variables, TDF/GDF for nominal, ordinal, discrete and continuous variables, indicadores for óleo/gas/agua, resumen) via `js/estadistica.js`, `js/frecuencias.js`, `js/indicadores.js`. Óleo classes are a `{0}` class plus Sturges classes of equal width in log10 (same as 4.2.6); the ogive uses upper class limits.
- `estadisticaInferencial.html` — inferential statistics via `js/estadisticaInferencial.js`, `js/modeloDiscreto.js`, `js/variableContinua.js`, `js/modeloContinuo.js`, `js/inferencialAmpliacion.js` (4.2.15–4.2.18), plus the `js/indiceLateral.js` side index. Population = onshore wells of Brazil (no fixed N), sample = January 2023 wells; no finite-population correction anywhere.
- Regression (4.3.1): `regresion.html` is the hub (gallery, pares, dispersión, conjetura, comparison, restricciones; `js/regresion.js` + `js/indiceLateral.js`). `regresion-{lineal,potencial,exponencial,logaritmica,polinomica}.html` share `js/regresionModelo.js`, which reads `<body data-modelo>` (keys: lineal, potencial, exponencial, logaritmico, polinomico). `regresion-multiple.html` uses `js/regresionMultiple.js`. All load `js/regresionComun.js` (`window.Regresion`) and `css/regresion.css` on top of `estadisticaInferencial.css`. Unit = Campo with óleo > 0 (n = 165); x = wells per field, y = field óleo, x₂ = field total gas. Linearized r/R² are not comparable across models; selection uses R² in ln y, median relative error and Cook's D > 1 (potencial chosen; log-log multiple recommended over linear multiple). Dictamen text and gallery numbers are static HTML — update them if `data/regresion.json` changes.
- `conclusiones.html`, `herramientas.html` (software, source and a `#reproducir` section with the exact commands), `equipo.html` (members plus generic contact placeholders) — static pages (no JSON).
- `#inicio` — Full-bleed background video: `video/video-completo.mp4` on `index.html`, `video/video-descriptiva.mp4` on `Estadistica.html`, `video/video-inferencial.mp4` on `estadisticaInferencial.html`; autoplay muted loop.
- Collapsible sidebar (`js/sidebar.js`, `.sidebar`): fixed left rail, collapsed 64px (logo only), expanded 240px (logo + name). State persisted in `localStorage('sidebar-expanded')`. Mobile becomes an off-canvas drawer opened by `.menu-toggle`. Included on all fifteen pages; the Regresión link stays active on every `regresion-*.html` page.
- Footer with self-hosted logo; every footer also carries “Universidad Central del Ecuador · FIGEMPA” and a link to `equipo.html`.

## Data pipeline

- Source: `data/2023_01_producao_Terra.csv` — `;`-separated, `,` decimal, `.` thousands, `utf-8-sig`, and a second subheader row. Keep those read options.
- Create the venv if missing: `python3 -m venv .venv && .venv/bin/pip install pandas numpy scipy`.
- `.venv/bin/python scripts/1_preprocesamiento_mapa.py data/2023_01_producao_Terra.csv` writes VAD/VAC/model JSON to `scripts/data/` (copy those to `data/`). Its `scripts/map_data.json` and `scripts/estadistica_descriptiva.json` lack fields present in `data/` — don't copy them over.
- `.venv/bin/python scripts/2_descriptiva_inferencial.py data/2023_01_producao_Terra.csv --anual <dir>` writes straight to `data/`: `variables_estadistica.json`, `distribucion_frecuencias.json`, `indicadores_descriptivos.json`, `inferencial_ampliacion.json`, `validacion_anual.json` (downloads the 12 monthly ANP ZIPs into `<dir>` if absent; April+ files rename `Nome Poço` → `Nome Poço ANP`, Oct–Dec are Latin-1). Run it after script 1 because it reads `data/vac_oleo.json` and `data/modelo_continuo.json`.
- `.venv/bin/python scripts/3_regresion.py data/2023_01_producao_Terra.csv` writes `data/regresion.json` (reuses the reader from script 2).
- Repeated wells (143) are one row per Campo with the same contract: volumes are summed, production hours take the max.
- `data/` is the single source of truth for runtime JSON. Every `leerJSON()`/`fetch()` in `js/` uses the `data/...` prefix, so don't re-add copies at the repo root or under `js/`.
- `data/contexto.json` is hand-written copy (`problema`, `objetivos.general`, `objetivos.especificos`), not generated by the script. `js/main.js` injects `#problema`, `#objetivo-general`, and `#objetivos-especificos` from it.

## Page wiring

- `js/main.js` fetches only `data/contexto.json`. `renderContext()` fills `#problema`, `#objetivo-general`, `#objetivos-especificos`; `initReveals()` handles the scroll reveals. The old table/balance-chart renderers were removed with the data table.
- `js/common.js` is the shared `leerJSON()`/`mostrarError()` helper loaded by every page (it replaced the duplicated `js/commonInf.js`).
- The `<section id="planteamiento">` and the inner `<div id="planteamiento-contenido">` are intentionally different IDs. Don't collapse them.
- Motion: hero entrance, stat count-up, `IntersectionObserver` reveals (`.will-reveal`). `prefers-reduced-motion` disables all and shows final values — preserve that path.
- Responsive breakpoints are 1000, 760, 560, and 520px. No horizontal scroll.
- Fonts are self-hosted (`fonts/archivo-latin.woff2`, `fonts/fraunces-latin.woff2`), preloaded in `index.html`, declared at top of `css/styles.css`. Don't reintroduce Google Fonts CDN.
- Accessibility: status regions, skip link, table caption/`scope`, decorative bars `aria-hidden`, `:focus-visible`, reduced-motion rule.

## Repo state

- All site files are tracked. Deleted working files (root-level JSON copies, `mapa_files/`, duplicate helper scripts) were only duplicates — don't recreate them.
- `.venv/` is a local, git-ignored env with pandas/numpy/scipy; use `.venv/bin/python`, don't edit or commit it. `.agents/skills/frontend-design/` is vendored and pinned by `skills-lock.json`.
