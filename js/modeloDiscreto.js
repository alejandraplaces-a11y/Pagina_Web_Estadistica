// Secciones 4.2.3 (modelo de probabilidad discreto) y 4.2.4 (test de ajuste).
(function () {
  const fmt = {
    entero: new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }),
    dos: new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    cuatro: new Intl.NumberFormat('es-CO', { minimumFractionDigits: 4, maximumFractionDigits: 4 }),
    porcentaje: new Intl.NumberFormat('es-CO', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 })
  };

  function probabilidad(valor) {
    if (valor === 0) return '0';
    if (valor < 0.0001) return valor.toExponential(2).replace('.', ',');
    return fmt.cuatro.format(valor);
  }

  function pValor(valor) {
    return valor < 0.001 ? '< 0,001' : fmt.cuatro.format(valor);
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

  function renderModelo(modelo) {
    const b = modelo.binomial;
    const bb = modelo.betabinomial;
    texto('md-p', fmt.cuatro.format(b.p));
    texto('md-p-formula', fmt.cuatro.format(b.p));
    texto('md-media-obs', fmt.dos.format(modelo.media_observada));
    texto('md-var-obs', fmt.dos.format(modelo.varianza_observada));
    texto('md-var-binom', fmt.dos.format(b.varianza));
    texto('md-alfa', fmt.cuatro.format(bb.alfa));
    texto('md-beta', fmt.cuatro.format(bb.beta));
    texto('md-var-bb', fmt.dos.format(bb.varianza));
    texto('md-razon', fmt.dos.format(modelo.varianza_observada / b.varianza));

    const cuerpo = document.getElementById('cuerpo-modelo-discreto');
    modelo.tabla.forEach(fila => {
      const tr = document.createElement('tr');
      tr.append(
        celda(String(fila.x), true),
        celda(fmt.entero.format(fila.observada), true),
        celda(probabilidad(fila.p_observada), true),
        celda(probabilidad(fila.p_binomial), true),
        celda(fmt.dos.format(fila.esperada_binomial), true),
        celda(probabilidad(fila.p_betabinomial), true),
        celda(fmt.dos.format(fila.esperada_betabinomial), true)
      );
      cuerpo.appendChild(tr);
    });
  }

  function graficarModelo(modelo) {
    const x = modelo.tabla.map(f => f.x);
    return Plotly.newPlot('grafica-modelo-discreto', [
      {
        type: 'bar',
        name: 'Observada (hᵢ)',
        x,
        y: modelo.tabla.map(f => f.p_observada),
        marker: { color: 'rgba(15, 118, 110, 0.35)', line: { color: '#0f766e', width: 1 } },
        hovertemplate: 'x = %{x}<br>Observada: %{y:.4f}<extra></extra>'
      },
      {
        type: 'scatter',
        mode: 'lines+markers',
        name: `Binomial B(31; ${fmt.cuatro.format(modelo.binomial.p)})`,
        x,
        y: modelo.tabla.map(f => f.p_binomial),
        line: { color: '#b45309', width: 2 },
        marker: { size: 5 },
        hovertemplate: 'x = %{x}<br>Binomial: %{y:.4f}<extra></extra>'
      },
      {
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Beta-binomial',
        x,
        y: modelo.tabla.map(f => f.p_betabinomial),
        line: { color: '#1d4f91', width: 2, dash: 'dot' },
        marker: { size: 5 },
        hovertemplate: 'x = %{x}<br>Beta-binomial: %{y:.4f}<extra></extra>'
      }
    ], {
      font: { family: 'system-ui, sans-serif', color: '#334155' },
      paper_bgcolor: '#ffffff',
      plot_bgcolor: '#f8fafc',
      margin: { t: 30, r: 20, b: 90, l: 70 },
      xaxis: { title: { text: 'Días completos de producción (x)' }, dtick: 1, range: [-0.6, 31.6], automargin: true },
      yaxis: { title: { text: 'P(X = x)' }, rangemode: 'tozero', automargin: true },
      legend: { orientation: 'h', y: -0.3 },
      bargap: 0.25
    }, { responsive: true, displaylogo: false });
  }

  function renderPrueba(prueba, prefijo) {
    const cuerpo = document.getElementById(`cuerpo-${prefijo}`);
    prueba.grupos.forEach(g => {
      const tr = document.createElement('tr');
      const rango = g.desde === g.hasta ? `${g.desde}` : `${g.desde} – ${g.hasta}`;
      tr.append(
        celda(rango, true),
        celda(fmt.entero.format(g.observada), true),
        celda(fmt.dos.format(g.esperada), true),
        celda(fmt.dos.format(g.aporte), true)
      );
      cuerpo.appendChild(tr);
    });
    const pie = document.getElementById(`pie-${prefijo}`);
    const tr = document.createElement('tr');
    tr.append(
      celda('Total', true),
      celda(fmt.entero.format(prueba.grupos.reduce((s, g) => s + g.observada, 0)), true),
      celda(fmt.dos.format(prueba.grupos.reduce((s, g) => s + g.esperada, 0)), true),
      celda(`χ² = ${fmt.dos.format(prueba.estadistico)}`, true)
    );
    pie.appendChild(tr);

    texto(`${prefijo}-chi`, fmt.dos.format(prueba.estadistico));
    texto(`${prefijo}-gl`, String(prueba.grados_libertad));
    texto(`${prefijo}-critico`, fmt.dos.format(prueba.valor_critico));
    texto(`${prefijo}-p`, pValor(prueba.p_valor));
    texto(`${prefijo}-clases`, String(prueba.grupos.length));
    const decision = document.getElementById(`${prefijo}-decision`);
    decision.textContent = prueba.rechaza ? 'Se rechaza H₀' : 'No se rechaza H₀';
    decision.classList.add(prueba.rechaza ? 'is-reject' : 'is-accept');
  }

  async function cargar() {
    try {
      if (!window.Plotly || typeof window.Plotly.newPlot !== 'function') {
        throw new Error('No se descargó Plotly desde cdn.plot.ly. Comprueba la conexión a Internet.');
      }
      const modelo = await leerJSON('data/modelo_discreto.json');

      renderModelo(modelo);
      document.getElementById('contenido-modelo-discreto').hidden = false;
      document.getElementById('estado-modelo-discreto').hidden = true;

      renderPrueba(modelo.binomial.prueba, 'prueba-binomial');
      renderPrueba(modelo.betabinomial.prueba, 'prueba-betabinomial');
      document.getElementById('contenido-test-discreto').hidden = false;
      document.getElementById('estado-test-discreto').hidden = true;

      // Se dibuja con el contenedor visible para que Plotly mida su ancho real.
      await graficarModelo(modelo);
    } catch (error) {
      mostrarError('estado-modelo-discreto', `No se pudo cargar el modelo discreto. ${error.message} Coloca modelo_discreto.json dentro de la carpeta data/.`, error);
      mostrarError('estado-test-discreto', 'No se pudo calcular el test de ajuste.', error);
    }
  }

  cargar();
})();
