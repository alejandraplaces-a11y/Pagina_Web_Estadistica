(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);

  const COLOR_INK = '#2C3531';
  const COLOR_OIL = '#8C6D46';
  const COLOR_OIL_DEEP = '#5E4529';
  const GRID = 'rgba(11, 34, 30, 0.08)';

  const fmt = {
    entero: new Intl.NumberFormat('es-EC', { maximumFractionDigits: 0 }),
    cuatro: new Intl.NumberFormat('es-EC', { minimumFractionDigits: 4, maximumFractionDigits: 4 }),
    pct: new Intl.NumberFormat('es-EC', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    sig: new Intl.NumberFormat('es-EC', { maximumSignificantDigits: 3 }),
    dos: new Intl.NumberFormat('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  };
  const volumen = (v) => (v < 100 ? fmt.sig.format(v) : fmt.dos.format(v));

  const CRITERIO_API = {
    Pesado: 'API < 22,3°',
    Mediano: '22,3° ≤ API ≤ 31,1°',
    Ligero: 'API > 31,1°',
  };

  function celdas(tr, valores) {
    valores.forEach(([texto, numero, encabezado]) => {
      const td = document.createElement(encabezado ? 'th' : 'td');
      if (encabezado) td.scope = 'row';
      if (numero) td.className = 'numero';
      td.textContent = texto;
      tr.appendChild(td);
    });
  }

  function frecuencias(fila) {
    return [
      [fmt.entero.format(fila.fi), true],
      [fmt.cuatro.format(fila.hi), true],
      [fmt.entero.format(fila.Fi), true],
      [fmt.cuatro.format(fila.Hi), true],
    ];
  }

  function renderTabla(id, filas, columnasIniciales) {
    const tbody = document.getElementById(id);
    tbody.replaceChildren();
    filas.forEach((fila) => {
      const tr = document.createElement('tr');
      celdas(tr, [...columnasIniciales(fila), ...frecuencias(fila)]);
      tbody.appendChild(tr);
    });
    const total = filas.reduce((suma, fila) => suma + fila.fi, 0);
    const pie = document.createElement('tr');
    pie.className = 'fila-total';
    const vacias = columnasIniciales(filas[0]).length - 1;
    celdas(pie, [['Total', false, true], ...Array(vacias).fill(['', false]),
      [fmt.entero.format(total), true], [fmt.cuatro.format(filas.reduce((s, f) => s + f.hi, 0)), true], ['', true], ['', true]]);
    tbody.appendChild(pie);
  }

  function intervalo(fila) {
    return fila.cero ? '{0} · sin producción' : `[${volumen(fila.li)}; ${volumen(fila.ls)})`;
  }

  function renderTablas(d) {
    renderTabla('tabla-estado', d.estado.filas, (f) => [[f.categoria, false, true]]);
    renderTabla('tabla-api', d.clase_api.filas, (f) => [[f.categoria, false, true], [CRITERIO_API[f.categoria], false]]);
    renderTabla('tabla-dias', d.dias.filas, (f) => [[f.categoria, true, true]]);
    renderTabla('tabla-oleo', d.oleo.filas, (f) => [
      [String(f.clase), true],
      [intervalo(f), false],
      [f.cero ? '0' : volumen(f.marca), true],
    ]);

    $('#tdf-n-cualitativa').textContent = fmt.entero.format(d.estado.n);
    $('#tdf-n-api').textContent = fmt.entero.format(d.clase_api.n);
    $('#tdf-n-dias').textContent = fmt.entero.format(d.dias.n);
    $('#tdf-k').textContent = String(d.oleo.k);
    $('#tdf-amplitud').textContent = `${fmt.cuatro.format(d.oleo.amplitud_log10)} en log₁₀`;
    $('#fuente-tdf').textContent = d.fuente;
    $('#nota-api').textContent = `${fmt.entero.format(d.clase_api.nulos)} pozos sin grado API no se clasifican; hᵢ se calcula sobre los ${fmt.entero.format(d.clase_api.n)} pozos con dato.`;

    const estado = d.estado.filas[0];
    const api = d.clase_api.filas.reduce((a, b) => (b.fi > a.fi ? b : a));
    const dias = d.dias.filas;
    const oleo = d.oleo;
    const modal = oleo.filas.find((f) => f.clase === oleo.clase_modal);
    $('#preview-estado').textContent = `${d.estado.filas.length} estados · moda: ${estado.categoria} (${fmt.pct.format(estado.hi)})`;
    $('#preview-api').textContent = `moda y mediana: ${api.categoria} (${fmt.pct.format(api.hi)}) · ${fmt.entero.format(d.clase_api.nulos)} sin dato`;
    $('#preview-dias').textContent = `0 días: ${fmt.entero.format(dias[0].fi)} pozos · 31 días: ${fmt.entero.format(dias[31].fi)} pozos`;
    $('#preview-oleo').textContent = `${oleo.k + 1} clases · clase modal ${intervalo(modal)} bbl/día (${fmt.pct.format(modal.hi)})`;

    const primera = oleo.filas[1];
    $('#nota-tdf').textContent = `La clase 0 reúne los ${fmt.entero.format(oleo.ceros)} pozos sin óleo (${fmt.pct.format(oleo.filas[0].hi)}); no tienen logaritmo, por eso van aparte. `
      + `Los ${fmt.entero.format(oleo.positivos)} pozos productores se reparten en ${oleo.k} clases de igual ancho en log₁₀, desde ${volumen(primera.li)} hasta ${volumen(oleo.filas[oleo.filas.length - 1].ls)} bbl/día. `
      + 'Con clases de igual ancho en bbl/día (Sturges lineal, A = 79) el 98 % de los pozos caía en la primera clase y 7 clases quedaban vacías; la escala log₁₀ reparte los pozos y muestra la forma de la distribución.';
  }

  function layoutPlotly(extra = {}) {
    return {
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: { family: 'Archivo, sans-serif', color: COLOR_INK, size: 11 },
      margin: { t: 12, r: 16, b: 56, l: 56 },
      showlegend: false,
      ...extra,
    };
  }

  function ejeLog(oleo, titulo) {
    const desde = Math.floor(oleo.filas[1].t_li);
    const hasta = Math.ceil(oleo.filas[oleo.filas.length - 1].t_ls);
    const tickvals = [];
    for (let t = desde; t <= hasta; t += 1) tickvals.push(t);
    return {
      title: { text: titulo },
      tickvals,
      ticktext: tickvals.map((t) => (t < 0 ? fmt.sig.format(10 ** t) : fmt.entero.format(10 ** t))),
      gridcolor: GRID,
      zeroline: false,
      automargin: true,
    };
  }

  function barras(id, x, y, opciones = {}) {
    const horizontal = opciones.orientation === 'h';
    Plotly.newPlot(id, [{
      type: 'bar',
      orientation: opciones.orientation || 'v',
      x: horizontal ? y : x,
      y: horizontal ? x : y,
      marker: { color: opciones.colores || COLOR_OIL },
      text: y.map((v) => fmt.entero.format(v)),
      textposition: 'outside',
      cliponaxis: false,
      hovertemplate: opciones.hover || '%{x}: %{y} pozos<extra></extra>',
      width: opciones.width,
    }], layoutPlotly({
      height: opciones.height || 360,
      xaxis: { gridcolor: GRID, automargin: true, title: { text: opciones.tituloX || '' }, ...(opciones.xaxis || {}) },
      yaxis: { gridcolor: GRID, automargin: true, title: { text: opciones.tituloY || '' }, ...(opciones.yaxis || {}) },
    }), { responsive: true, displaylogo: false });
  }

  function renderGraficas(d) {
    const estados = [...d.estado.filas].reverse();
    barras('gdf-estado', estados.map((f) => f.categoria), estados.map((f) => f.fi), {
      orientation: 'h', tituloY: '', tituloX: 'Pozos (fᵢ)', hover: '%{y}: %{x} pozos<extra></extra>', height: 380,
    });

    barras('gdf-api', d.clase_api.filas.map((f) => f.categoria), d.clase_api.filas.map((f) => f.fi), {
      tituloX: 'Clase de crudo (orden pesado → ligero)', tituloY: 'Pozos (fᵢ)',
      xaxis: { categoryorder: 'array', categoryarray: ['Pesado', 'Mediano', 'Ligero'] },
    });

    const dias = d.dias.filas;
    const maximo = Math.max(...dias.map((f) => f.fi));
    Plotly.newPlot('gdf-dias', [{
      type: 'bar',
      x: dias.map((f) => Number(f.categoria)),
      y: dias.map((f) => f.fi),
      width: 0.35,
      marker: { color: dias.map((f) => (f.fi === maximo ? COLOR_OIL_DEEP : COLOR_OIL)) },
      hovertemplate: 'x = %{x} días: %{y} pozos<extra></extra>',
    }], layoutPlotly({
      height: 360,
      xaxis: { title: { text: 'Días completos de producción (x)' }, dtick: 5, gridcolor: GRID },
      yaxis: { title: { text: 'Pozos (fᵢ)' }, gridcolor: GRID, automargin: true },
    }), { responsive: true, displaylogo: false });

    const oleo = d.oleo;
    const clases = oleo.filas.filter((f) => !f.cero);
    const A = oleo.amplitud_log10;
    const centros = clases.map((f) => (f.t_li + f.t_ls) / 2);
    const etiqueta = (f) => `[${volumen(f.li)}; ${volumen(f.ls)}) bbl/día`;
    Plotly.newPlot('gdf-histograma', [
      {
        type: 'bar',
        x: centros,
        y: clases.map((f) => f.fi),
        width: clases.map((f) => f.t_ls - f.t_li),
        marker: { color: COLOR_OIL, opacity: 0.85, line: { color: '#FFFFFF', width: 1 } },
        customdata: clases.map(etiqueta),
        hovertemplate: '%{customdata}<br>fᵢ = %{y}<extra></extra>',
        name: 'Histograma',
      },
      {
        type: 'scatter',
        mode: 'lines+markers',
        // El polígono se cierra en cero media clase antes de la primera y después de la última.
        x: [centros[0] - A, ...centros, centros[centros.length - 1] + A],
        y: [0, ...clases.map((f) => f.fi), 0],
        line: { color: COLOR_OIL_DEEP, width: 2 },
        marker: { size: 5, color: COLOR_OIL_DEEP },
        hoverinfo: 'skip',
        name: 'Polígono de frecuencias',
      },
    ], layoutPlotly({
      height: 380,
      showlegend: true,
      legend: { orientation: 'h', y: -0.28 },
      margin: { t: 12, r: 16, b: 80, l: 56 },
      bargap: 0,
      xaxis: ejeLog(oleo, 'Óleo por pozo (bbl/día, escala log₁₀)'),
      yaxis: { title: { text: 'Pozos (fᵢ)' }, gridcolor: GRID, automargin: true, rangemode: 'tozero' },
    }), { responsive: true, displaylogo: false });

    // Ojiva: Hᵢ sobre el límite superior de cada clase. Arranca en H₀ (pozos con óleo = 0),
    // que quedan por debajo del límite inferior de la primera clase positiva.
    const cero = oleo.filas[0];
    Plotly.newPlot('gdf-ojiva', [{
      type: 'scatter',
      mode: 'lines+markers',
      x: [clases[0].t_li, ...clases.map((f) => f.t_ls)],
      y: [cero.Hi, ...clases.map((f) => f.Hi)],
      customdata: [`Lᵢ = ${volumen(clases[0].li)}`, ...clases.map((f) => `Lᵢ₊₁ = ${volumen(f.ls)}`)],
      line: { color: COLOR_OIL, width: 2 },
      marker: { color: COLOR_OIL, size: 6 },
      hovertemplate: '%{customdata} bbl/día<br>Hᵢ = %{y:.4f}<extra></extra>',
    }], layoutPlotly({
      height: 360,
      xaxis: ejeLog(oleo, 'Límite superior de clase (bbl/día, escala log₁₀)'),
      yaxis: { title: { text: 'Hᵢ' }, range: [0, 1.05], gridcolor: GRID, tickformat: '.0%' },
    }), { responsive: true, displaylogo: false });

    $('#nota-gdf').textContent = `GDF 4 y 5 usan las clases log₁₀ de 4.1.4. Los ${fmt.entero.format(oleo.ceros)} pozos con óleo = 0 no tienen posición en escala logarítmica: no aparecen en el histograma y la ojiva parte de H₀ = ${fmt.cuatro.format(cero.Hi)}. La ojiva se grafica sobre los límites superiores de clase. Muestra: ${fmt.entero.format(d.n)} pozos. Fuente: ${d.fuente}.`;
  }

  async function cargar() {
    let datos;
    try {
      datos = await leerJSON('data/distribucion_frecuencias.json');
      renderTablas(datos);
      $('#contenido-tdf').hidden = false;
      $('#estado-tdf').hidden = true;
    } catch (error) {
      mostrarError('estado-tdf', `No se pudieron cargar las tablas de distribución de frecuencias. ${error.message}`, error);
      mostrarError('estado-gdf', 'No se pudieron cargar las gráficas.', error);
      return;
    }

    if (typeof Plotly === 'undefined') {
      mostrarError('estado-gdf', 'No se pudo cargar la librería de gráficas (Plotly). Comprueba la conexión a Internet.', new Error('Plotly no disponible'));
      return;
    }
    // Se muestra antes de dibujar para que Plotly mida el ancho real de los contenedores.
    $('#contenido-gdf').hidden = false;
    $('#estado-gdf').hidden = true;
    renderGraficas(datos);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cargar, { once: true });
  } else {
    cargar();
  }
})();
