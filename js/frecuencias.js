(() => {
  'use strict';

  const $ = (selector, root = document) => (root || document).querySelector(selector);

  const estadoTdf = $('#estado-tdf');
  const contenidoTdf = $('#contenido-tdf');
  const fuenteTdf = $('#fuente-tdf');
  const tdfK = $('#tdf-k');
  const tdfAmplitud = $('#tdf-amplitud');
  const tdfNcualitativa = $('#tdf-n-cualitativa');

  const estadoGdf = $('#estado-gdf');
  const contenidoGdf = $('#contenido-gdf');
  const gdfEstado = $('#gdf-estado');
  const gdfHistograma = $('#gdf-histograma');
  const gdfOjiva = $('#gdf-ojiva');
  const notaGdf = $('#nota-gdf');

  const COLOR_INK = '#17251f';
  const COLOR_MUTED = '#7d8b81';
  const COLOR_OIL = '#b6652f';

  function mostrarError(id, mensaje, error) {
    const estado = id ? $(id) : estadoTdf;
    if (!estado) return;
    estado.hidden = false;
    estado.textContent = mensaje;
    estado.className = 'status status-error';
    estado.setAttribute('role', 'alert');
    console.error(error);
  }

  // Agrupa los pozos consolidados por Estado: un registro por Estado con su n.
  function gruposPorEstado(datos) {
    const grupos = new Map();
    datos.forEach((fila) => {
      const estado = String(fila.Estado ?? '').trim();
      if (!estado) return;
      const grupo = grupos.get(estado) || { estado, n: 0 };
      grupo.n += 1;
      grupos.set(estado, grupo);
    });
    return [...grupos.values()].sort((a, b) => b.n - a.n);
  }

  function valoresPorPozo(datos) {
    const valores = datos.map((fila) => Number(fila['Óleo (bbl/dia)'])).filter((valor) => Number.isFinite(valor));
    return valores.length ? valores : [0];
  }

  // k = ⌈1 + 3,322 · log₁₀(n)⌉ (Sturges); A = ⌈(máximo − mínimo) / k⌉.
  function distribucionCuantitativa(valores) {
    const n = valores.length;
    const max = valores.length ? Math.max(...valores) : 0;
    const min = valores.length ? Math.min(...valores) : 0;
    const k = Math.ceil(1 + 3.322 * Math.log10(n || 1));
    const amplitud = Math.ceil((max - min) / k) || 1;

    const clases = [];
    for (let i = 1; i <= k; i += 1) {
      const limiteInferior = min + (i - 1) * amplitud;
      const f = valores.filter((valor) => valor >= limiteInferior && valor < limiteInferior + amplitud).length;
      clases.push({ clase: i, limiteInferior, amplitud, f, marca: limiteInferior + amplitud / 2 });
    }

    let acumulada = 0;
    const filas = clases.map((clase) => {
      acumulada += clase.f;
      return { ...clase, F: acumulada, H: n ? acumulada / n : 0 };
    });

    return { n, k, amplitud, clases, filas };
  }

  function renderTablaEstado(datos) {
    const tbody = document.getElementById('tabla-estado');
    if (!tbody) return;

    const grupos = gruposPorEstado(datos);
    const filas = [];
    let acumulada = 0;
    grupos.forEach((grupo) => {
      acumulada += grupo.n;
      filas.push({ etiqueta: grupo.estado, f: grupo.n, F: acumulada, H: datos.length ? acumulada / datos.length : 0 });
    });

    tbody.replaceChildren();
    filas.forEach((fila) => {
      const tr = document.createElement('tr');

      const tdEstado = document.createElement('th');
      tdEstado.scope = 'row';
      tdEstado.className = 'state-cell';
      tdEstado.textContent = fila.etiqueta;

      const celdas = [
        { clase: 'numero', texto: String(fila.f) },
        { clase: 'numero', texto: '1' },
        { clase: 'numero', texto: String(fila.F) },
        { clase: 'numero', texto: fila.H.toFixed(4) },
      ].map((celda) => {
        const td = document.createElement('td');
        td.className = celda.clase;
        td.textContent = celda.texto;
        return td;
      });

      tr.append(tdEstado, ...celdas);
      tbody.appendChild(tr);
    });
  }

  function renderTablaOleo(distribucion) {
    const tbody = document.getElementById('tabla-oleo');
    if (!tbody) return;

    tbody.replaceChildren();
    distribucion.filas.forEach((fila) => {
      const tr = document.createElement('tr');

      const tdClase = document.createElement('td');
      tdClase.textContent = String(fila.clase);

      const tdIntervalo = document.createElement('td');
      tdIntervalo.textContent = `[${fila.limiteInferior.toFixed(4)}; ${(fila.limiteInferior + fila.amplitud).toFixed(4)})`;

      const celdas = [
        { clase: 'numero', texto: fila.marca.toFixed(4) },
        { clase: 'numero', texto: String(fila.f) },
        { clase: 'numero', texto: String(fila.amplitud) },
        { clase: 'numero', texto: String(fila.F) },
        { clase: 'numero', texto: fila.H.toFixed(4) },
      ].map((celda) => {
        const td = document.createElement('td');
        td.className = celda.clase;
        td.textContent = celda.texto;
        return td;
      });

      tr.append(tdClase, tdIntervalo, ...celdas);
      tbody.appendChild(tr);
    });
  }

  function layoutPlotly(extra = {}) {
    return {
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: { family: 'Archivo, sans-serif', color: COLOR_INK, size: 11 },
      margin: { t: 12, r: 16, b: 40, l: 8 },
      ...extra,
    };
  }

  function renderGraficaBarras(datos) {
    const grupos = gruposPorEstado(datos);
    const nombres = grupos.map((grupo) => grupo.estado);
    const conteos = grupos.map((grupo) => grupo.n);

    Plotly.newPlot(
      gdfEstado,
      [
        {
          type: 'bar',
          orientation: 'h',
          y: nombres,
          x: conteos,
          marker: { color: COLOR_OIL },
          text: conteos.map((valor) => String(valor)),
          textPosition: 'end',
          textFont: { size: 10, color: COLOR_INK },
        },
      ],
      {
        ...layoutPlotly({ height: 360 }),
        yaxis: { grid: { color: 'rgba(23, 37, 31, 0.08)' }, tickfont: { color: COLOR_MUTED, size: 11 }, automargin: true },
        xaxis: { grid: { color: 'rgba(23, 37, 31, 0.08)' }, tickfont: { color: COLOR_MUTED, size: 11 } },
      },
      { responsive: true }
    );
  }

  function renderGraficaHistograma(valores, distribucion) {
    const { k, amplitud, filas } = distribucion;
    const inicio = distribucion.clases[0] ? distribucion.clases[0].limiteInferior : 0;
    const fin = inicio + amplitud * k;

    const bordes = [];
    const acumuladas = [];
    let acumulada = 0;
    for (let i = 1; i <= k; i += 1) {
      acumulada += filas[i - 1].f;
      bordes.push(filas[i - 1].limiteInferior + amplitud);
      acumuladas.push(acumulada);
    }

    Plotly.newPlot(
      gdfHistograma,
      [
        {
          type: 'histogram',
          x: valores,
          xbins: { start: inicio, end: fin, size: amplitud },
          marker: { color: COLOR_OIL, opacity: 0.85 },
        },
        {
          type: 'scatter',
          x: bordes,
          y: acumuladas,
          mode: 'lines',
          line: { color: COLOR_OIL, width: 2 },
          showlegend: false,
        },
      ],
      {
        ...layoutPlotly({ height: 360 }),
        xaxis: { grid: { color: 'rgba(23, 37, 31, 0.08)' }, tickfont: { color: COLOR_MUTED, size: 11 } },
        yaxis: { grid: { color: 'rgba(23, 37, 31, 0.08)' }, tickfont: { color: COLOR_MUTED, size: 11 } },
      },
      { responsive: true }
    );
  }

  function renderGraficaOjiva(distribucion) {
    const puntos = distribucion.filas.map((fila) => ({ x: fila.marca, y: fila.H }));

    Plotly.newPlot(
      gdfOjiva,
      [
        {
          type: 'scatter',
          mode: 'lines+markers',
          x: puntos.map((punto) => punto.x),
          y: puntos.map((punto) => punto.y),
          line: { color: COLOR_OIL, width: 2 },
          marker: { color: COLOR_OIL, size: 5 },
        },
      ],
      {
        ...layoutPlotly({ height: 360, yaxis: { grid: { color: 'rgba(23, 37, 31, 0.08)' }, tickfont: { color: COLOR_MUTED, size: 11 }, scale: 0.9 } }),
        xaxis: { grid: { color: 'rgba(23, 37, 31, 0.08)' }, tickfont: { color: COLOR_MUTED, size: 11 } },
      },
      { responsive: true }
    );
  }

  async function cargar() {
    try {
      const [estadistica, datos] = await Promise.all([
        leerJSON('data/estadistica_descriptiva.json'),
        leerJSON('data/distribucion_pozos.json'),
      ]);

      if (!Array.isArray(datos) || !datos.length) {
        throw new Error('distribucion_pozos.json no contiene pozos consolidados.');
      }

      const valores = valoresPorPozo(datos);
      const distribucion = distribucionCuantitativa(valores);

      renderTablaEstado(datos);
      renderTablaOleo(distribucion);

      if (tdfNcualitativa) tdfNcualitativa.textContent = String(distribucion.n);
      if (tdfK) tdfK.textContent = String(distribucion.k);
      if (tdfAmplitud) tdfAmplitud.textContent = String(distribucion.amplitud);
      if (fuenteTdf) fuenteTdf.textContent = estadistica?.fuente || '2023_01_producao_Terra.csv';
      if (contenidoTdf) contenidoTdf.hidden = false;
      if (estadoTdf) estadoTdf.hidden = true;

      if (typeof Plotly === 'undefined') {
        mostrarError('estado-gdf', 'No se pudo cargar la librería de gráficas (Plotly).', new Error('Plotly no disponible'));
        return;
      }

      renderGraficaBarras(datos);
      renderGraficaHistograma(valores, distribucion);
      renderGraficaOjiva(distribucion);

      if (contenidoGdf) contenidoGdf.hidden = false;
      if (estadoGdf) estadoGdf.hidden = true;
      if (notaGdf) {
        notaGdf.textContent = `Frecuencias absolutas y acumuladas del óleo por pozo (bbl/día) sobre ${distribucion.k} clases de amplitud ${distribucion.amplitud}. Población analizada: ${distribucion.n} pozos. Fuente: ${estadistica?.fuente || '2023_01_producao_Terra.csv'}.`;
      }
    } catch (error) {
      mostrarError('estado-tdf', 'No se pudieron cargar las tablas de distribución de frecuencias.', error);
      console.error('No se pudieron renderizar las tablas de frecuencias:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => cargar(), { once: true });
  } else {
    cargar();
  }
})();
