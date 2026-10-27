(() => {
  'use strict';

  const $ = (selector, root = document) => (root || document).querySelector(selector);

  const COLORES_ESTADOS = {
    Acre: '#2e7d5b',
    Alagoas: '#3f8f74',
    Amazonas: '#1c5c41',
    Bahia: '#7fb99a',
    Ceará: '#4a8f73',
    'Espírito Santo': '#2f6b52',
    Maranhão: '#3a6b54',
    Paraná: '#5c8f7a',
    'Rio Grande do Norte': '#2e7d5b',
    Sergipe: '#4a7d63',
    'Rio de Janeiro': '#6b9a7d',
    'Rio Grande do Sul': '#3f8f74',
  };

  function formatear(valor, decimales = 2) {
    const numero = Number(valor) || 0;
    const formato =
      decimales > 0
        ? new Intl.NumberFormat('es-CO', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
        : new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
    return formato.format(numero);
  }

  function promedio(lista) {
    const valores = lista.filter((v) => Number.isFinite(v) && v > 0);
    if (!valores.length) return 0;
    return valores.reduce((s, v) => s + v, 0) / valores.length;
  }

  function mediana(lista) {
    const valores = [...lista].filter((v) => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
    if (!valores.length) return 0;
    const mitad = Math.floor(valores.length / 2);
    if (valores.length % 2) return valores[mitad];
    return (valores[mitad - 1] + valores[mitad]) / 2;
  }

  async function cargarDatos() {
    const [mapa, bacias, campos, distribucion] = await Promise.all([
      fetch('map_data.json', { cache: 'no-store' }).then((r) => r.json()),
      fetch('bacias_data.json', { cache: 'no-store' }).then((r) => r.json()),
      fetch('campos_data.json', { cache: 'no-store' }).then((r) => r.json()),
      fetch('distribucion_pozos.json', { cache: 'no-store' }).then((r) => r.json()),
    ]);
    return { mapa, bacias, campos, distribucion };
  }

  function graficoBarrasCampos(datos) {
    const top = (datos.campos || []).slice(0, 10);
    const nombres = top.map((c) => c.Campo);
    const oleos = top.map((c) => Number(c['Óleo (bbl/dia)']) || 0);
    const cuencas = top.map((c) => c.Bacia || '—');
    const operadores = top.map((c) => c.Operador || '—');

    return {
      data: [
        {
          type: 'bar',
          orientation: 'h',
          x: oleos,
          y: nombres,
          customdata: cuencas.map((cuenca, i) => [cuenca, operadores[i], oleos[i]]),
          hovertemplate: '<b>%{y}</b><br>Cuenca: %{customdata[0]}<br>Operador: %{customdata[2]}<br>Óleo: %{x:,.2f} bbl/día<extra></extra>',
          marker: { color: '#2e7d5b' },
        },
      ],
      layout: {
        height: 420,
        margin: { t: 10, r: 30, b: 60, l: 10 },
        bargap: 0.2,
        yaxis: { autorange: 'reversed', title: { text: 'Campo' } },
        xaxis: { title: { text: 'Óleo (bbl/día)' } },
        title: { text: 'Top 10 campos por producción de óleo' },
      },
    };
  }

  function graficoBarrasBacias(datos) {
    const top = (datos.bacias || []).slice(0, 12);
    const nombres = top.map((b) => b.Bacia);
    const oleos = top.map((b) => Number(b['Óleo (bbl/dia)']) || 0);

    return {
      data: [
        {
          type: 'bar',
          orientation: 'h',
          x: oleos,
          y: nombres,
          marker: { color: '#2e7d5b' },
          hovertemplate: '<b>%{y}</b><br>Óleo: %{x:,.2f} bbl/día<extra></extra>',
        },
      ],
      layout: {
        height: 460,
        margin: { t: 10, r: 30, b: 60, l: 10 },
        bargap: 0.2,
        yaxis: { autorange: 'reversed', title: { text: 'Cuenca' } },
        xaxis: { title: { text: 'Óleo (bbl/día)' } },
        title: { text: 'Top 12 cuencas por producción de óleo' },
      },
    };
  }

  function graficoHistograma(datos) {
    const valores = (datos.distribucion || [])
      .map((r) => Number(r['Óleo (bbl/dia)']) || 0)
      .filter((v) => v > 0);
    const media = promedio(valores);
    const medianaValor = mediana(valores);
    const usarLog = media > medianaValor * 3;

    const histograma = {
      type: 'histogram',
      x: valores,
      nbinsx: 30,
      marker: { color: '#2e7d5b' },
    };

    const layout = {
      height: 420,
      margin: { t: 60, r: 30, b: 60, l: 60 },
      xaxis: {
        type: usarLog ? 'log' : 'linear',
        title: { text: 'Óleo (bbl/día)' },
      },
      yaxis: { title: { text: 'Número de pozos' } },
      shapes: [
        {
          type: 'line',
          x0: usarLog ? Math.log10(media) : media,
          x1: usarLog ? Math.log10(media) : media,
          y0: 0,
          y1: 12,
          xref: 'x',
          yref: 'y',
          line: { color: '#b6652f', width: 2 },
        },
        {
          type: 'line',
          x0: usarLog ? Math.log10(medianaValor) : medianaValor,
          x1: usarLog ? Math.log10(medianaValor) : medianaValor,
          y0: 0,
          y1: 12,
          xref: 'x',
          yref: 'y',
          line: { color: '#4a7d63', width: 2, dash: [6, 4] },
        },
      ],
      annotations: [
        { x: media, y: 0, xref: 'x', yref: 'paper', xanchor: 'center', text: `Media: ${fmt(media)}`, showarrow: false, font: { size: 11, color: '#8f4a20' } },
        { x: medianaValor, y: 0, xref: 'x', yref: 'paper', xanchor: 'center', text: `Mediana: ${fmt(medianaValor)}`, showarrow: false, font: { size: 11, color: '#33543f' } },
      ],
    };

    return { data: [histograma], layout };
  }

  function graficoDispercion(datos) {
    const pares = (datos.distribucion || []).filter((r) => {
      const o = Number(r['Óleo (bbl/dia)']) || 0;
      const a = Number(r['Água (bbl/dia)']) || 0;
      return o > 0 && a > 0;
    });
    const estados = [...new Set(pares.map((p) => p.Estado).filter(Boolean))];
    const colores = estados.map((e) => COLORES_ESTADOS[e] || '#7fa98f');

    return {
      data: [
        {
          type: 'scatter',
          mode: 'markers',
          x: pares.map((p) => Number(p['Óleo (bbl/dia)']) || 0),
          y: pares.map((p) => Number(p['Água (bbl/dia)']) || 0),
          marker: { color: colores, size: 5, opacity: 0.75 },
          customdata: pares.map((p) => [p.Estado, Number(p['Óleo (bbl/dia)']) || 0, Number(p['Água (bbl/dia)']) || 0]),
          hovertemplate: '<b>%{customdata[0]}</b><br>Óleo: %{x:,.2f} bbl/día<br>Água: %{y:,.2f} bbl/día<extra></extra>',
        },
      ],
      layout: {
        height: 460,
        margin: { t: 50, r: 30, b: 60, l: 70 },
        xaxis: { type: 'log', title: { text: 'Óleo (bbl/día)' } },
        yaxis: { type: 'log', title: { text: 'Agua (bbl/día)' } },
        title: { text: 'Dispersión de óleo frente a agua por pozo' },
      },
    };
  }

  async function iniciarExploracion() {
    const contenedorCampos = $('#grafico-campos');
    const contenedorBacias = $('#grafico-bacias');
    const contenedorPozos = $('#grafico-pozos');
    const contenedorDisper = $('#grafico-dispersion');
    const contenedorError = $('#grafico-error');

    try {
      const datos = await cargarDatos();

      const camposChart = graficoBarrasCampos(datos);
      if (contenedorCampos) Plotly.newPlot(contenedorCampos, camposChart.data, camposChart.layout);

      const baciasChart = graficoBarrasBacias(datos);
      if (contenedorBacias) Plotly.newPlot(contenedorBacias, baciasChart.data, baciasChart.layout);

      const histogramaChart = graficoHistograma(datos);
      if (contenedorPozos) Plotly.newPlot(contenedorPozos, histogramaChart.data, histogramaChart.layout);

      const dispercionChart = graficoDispercion(datos);
      if (contenedorDisper) Plotly.newPlot(contenedorDisper, dispercionChart.data, dispercionChart.layout);
    } catch (error) {
      if (contenedorError) {
        contenedorError.hidden = false;
        contenedorError.textContent = `No se pudieron cargar los gráficos de exploración. ${error.message}`;
      }
      console.error('Error en la exploración de datos:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarExploracion, { once: true });
  } else {
    iniciarExploracion();
  }
})();
