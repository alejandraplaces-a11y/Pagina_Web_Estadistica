// Secciones 4.2.5 (VAC), 4.2.6 (frecuencia relativa) y 4.2.7 (densidad de probabilidad).
(function () {
  const fmt = {
    entero: new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }),
    dos: new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    cuatro: new Intl.NumberFormat('es-CO', { minimumFractionDigits: 4, maximumFractionDigits: 4 }),
    significativo: new Intl.NumberFormat('es-CO', { maximumSignificantDigits: 3 }),
    porcentaje: new Intl.NumberFormat('es-CO', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 })
  };

  // Valores que van de 0,0002 a 1.102 bbl/día: se usan cifras significativas.
  function volumen(valor) {
    return valor < 100 ? fmt.significativo.format(valor) : fmt.dos.format(valor);
  }

  function cientifico(valor) {
    if (valor === 0) return '0';
    if (valor >= 0.01) return fmt.cuatro.format(valor);
    return valor.toExponential(2).replace('.', ',');
  }

  function texto(id, contenido) {
    const elemento = document.getElementById(id);
    if (elemento) elemento.textContent = contenido;
  }

  function celda(contenido, numerica = false) {
    const td = document.createElement('td');
    td.textContent = contenido;
    if (numerica) td.className = 'numero';
    return td;
  }

  function filaTotal(cuerpoId, valores) {
    const tr = document.createElement('tr');
    valores.forEach(([valor, numerica]) => tr.appendChild(celda(valor, numerica)));
    document.getElementById(cuerpoId).appendChild(tr);
  }

  function ejeLogaritmico(vac) {
    const desde = Math.floor(vac.clases[0].t_li);
    const hasta = Math.ceil(vac.clases[vac.clases.length - 1].t_ls);
    const tickvals = [];
    for (let t = desde; t <= hasta; t++) tickvals.push(t);
    return {
      title: { text: 'Óleo por pozo (bbl/día, escala log)' },
      tickvals,
      ticktext: tickvals.map(t => (t < 0 ? fmt.significativo.format(10 ** t) : fmt.entero.format(10 ** t))),
      automargin: true
    };
  }

  function layoutBase(ejeY, vac) {
    return {
      font: { family: 'Archivo, sans-serif', color: '#17251f' },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      margin: { t: 30, r: 20, b: 70, l: 70 },
      xaxis: ejeLogaritmico(vac),
      yaxis: { title: { text: ejeY }, rangemode: 'tozero', automargin: true },
      showlegend: false,
      bargap: 0
    };
  }

  function renderVac(vac) {
    texto('vac-n', fmt.entero.format(vac.n));
    texto('vac-min', volumen(vac.minimo));
    texto('vac-max', fmt.dos.format(vac.maximo));
    texto('vac-max-2', fmt.dos.format(vac.maximo));
    texto('vac-mediana', fmt.dos.format(vac.mediana));
    texto('vac-media', fmt.dos.format(vac.media));
    texto('vac-excluidos', fmt.entero.format(vac.excluidos_cero));
    texto('vac-asimetria', fmt.dos.format(vac.asimetria));
    texto('vac-asimetria-log', fmt.dos.format(vac.asimetria_log10));
    texto('vac-fuente', vac.fuente);
  }

  function renderFrecuencias(vac) {
    texto('hr-k', String(vac.k));
    texto('hr-amplitud', fmt.cuatro.format(vac.amplitud_log10));
    const cuerpo = document.getElementById('cuerpo-histograma-relativo');
    vac.clases.forEach(c => {
      const tr = document.createElement('tr');
      tr.append(
        celda(String(c.clase), true),
        celda(`[${volumen(c.li)}; ${volumen(c.ls)})`),
        celda(`[${fmt.dos.format(c.t_li)}; ${fmt.dos.format(c.t_ls)})`),
        celda(volumen(c.marca), true),
        celda(fmt.entero.format(c.fi), true),
        celda(fmt.porcentaje.format(c.hi), true),
        celda(fmt.entero.format(c.Fi), true),
        celda(fmt.porcentaje.format(c.Hi), true)
      );
      cuerpo.appendChild(tr);
    });
    filaTotal('pie-histograma-relativo', [
      ['Total', true], ['', false], ['', false], ['', false],
      [fmt.entero.format(vac.n), true], [fmt.porcentaje.format(1), true], ['—', true], ['—', true]
    ]);

    const mayor = vac.clases.reduce((a, c) => (c.fi > a.fi ? c : a));
    texto('nota-histograma-relativo',
      `La clase modal es [${volumen(mayor.li)}; ${volumen(mayor.ls)}) bbl/día, con ${fmt.porcentaje.format(mayor.hi)} de los pozos. ` +
      `En escala logarítmica la distribución es casi simétrica (asimetría de log₁₀ y = ${fmt.dos.format(vac.asimetria_log10)}), ` +
      `aunque en la escala original la asimetría es ${fmt.dos.format(vac.asimetria)}.`);
  }

  function renderDensidad(vac) {
    const cuerpo = document.getElementById('cuerpo-histograma-densidad');
    let integral = 0;
    vac.clases.forEach(c => {
      const ancho = c.t_ls - c.t_li;
      integral += c.densidad_t * ancho;
      const tr = document.createElement('tr');
      tr.append(
        celda(String(c.clase), true),
        celda(`[${volumen(c.li)}; ${volumen(c.ls)})`),
        celda(fmt.porcentaje.format(c.hi), true),
        celda(fmt.cuatro.format(ancho), true),
        celda(fmt.cuatro.format(c.densidad_t), true),
        celda(volumen(c.ls - c.li), true),
        celda(cientifico(c.densidad_x), true)
      );
      cuerpo.appendChild(tr);
    });
    filaTotal('pie-histograma-densidad', [
      ['Σ', true], ['', false], [fmt.porcentaje.format(1), true], ['', false],
      [`Σ g·Δt = ${fmt.cuatro.format(integral)}`, true], ['', false], ['Σ f·Δy = 1,0000', true]
    ]);
  }

  function graficar(vac) {
    const marcas = vac.clases.map(c => (c.t_li + c.t_ls) / 2);
    const anchos = vac.clases.map(c => c.t_ls - c.t_li);
    const intervalos = vac.clases.map(c => [volumen(c.li), volumen(c.ls)]);

    const relativo = Plotly.newPlot('grafica-histograma-relativo', [{
      type: 'bar',
      x: marcas,
      y: vac.clases.map(c => c.hi),
      width: anchos,
      customdata: intervalos.map((iv, i) => [...iv, vac.clases[i].fi]),
      marker: { color: '#b6652f', line: { color: '#ffffff', width: 1 } },
      hovertemplate: '[%{customdata[0]}; %{customdata[1]}) bbl/día<br>fᵢ = %{customdata[2]:,.0f}<br>hᵢ = %{y:.2%}<extra></extra>'
    }], {
      ...layoutBase('Frecuencia relativa (hᵢ)', vac),
      yaxis: { title: { text: 'Frecuencia relativa (hᵢ)' }, tickformat: '.0%', rangemode: 'tozero', automargin: true }
    }, { responsive: true, displaylogo: false });

    const densidad = Plotly.newPlot('grafica-histograma-densidad', [{
      type: 'bar',
      x: marcas,
      y: vac.clases.map(c => c.densidad_t),
      width: anchos,
      customdata: intervalos,
      marker: { color: '#6f9a83', line: { color: '#ffffff', width: 1 } },
      hovertemplate: '[%{customdata[0]}; %{customdata[1]}) bbl/día<br>g = %{y:.4f}<extra></extra>'
    }], layoutBase('Densidad g(t) = hᵢ / Δt', vac),
    { responsive: true, displaylogo: false });

    return Promise.all([relativo, densidad]);
  }

  async function cargar() {
    try {
      if (!window.Plotly || typeof window.Plotly.newPlot !== 'function') {
        throw new Error('No se descargó Plotly desde cdn.plot.ly. Comprueba la conexión a Internet.');
      }
      const vac = await leerJSON('data/vac_oleo.json');

      renderVac(vac);
      renderFrecuencias(vac);
      renderDensidad(vac);
      ['vac', 'histograma-relativo', 'histograma-densidad'].forEach(id => {
        document.getElementById(`contenido-${id}`).hidden = false;
        document.getElementById(`estado-${id}`).hidden = true;
      });

      await graficar(vac);
    } catch (error) {
      const mensaje = `No se pudo cargar la variable continua. ${error.message} Coloca vac_oleo.json dentro de la carpeta data/.`;
      mostrarError('estado-vac', mensaje, error);
      mostrarError('estado-histograma-relativo', 'No se pudo construir la tabla de frecuencias relativas.', error);
      mostrarError('estado-histograma-densidad', 'No se pudo construir la tabla de densidad.', error);
    }
  }

  cargar();
})();