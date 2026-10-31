const formatosVad = {
  entero: new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }),
  decimal: new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  porcentaje: new Intl.NumberFormat('es-CO', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 })
};

function textoEn(id, texto) {
  const elemento = document.getElementById(id);
  if (elemento) elemento.textContent = texto;
}

function celdaVad(texto, numerica = false) {
  const td = document.createElement('td');
  td.textContent = texto;
  if (numerica) td.className = 'numero';
  return td;
}

function renderIdentificacion(vad) {
  textoEn('vad-n', formatosVad.entero.format(vad.n));
  textoEn('vad-rango', `${vad.minimo} a ${vad.maximo}`);
  textoEn('vad-media', formatosVad.decimal.format(vad.media));
  textoEn('vad-varianza', formatosVad.decimal.format(vad.varianza));
  textoEn('vad-notacion-n', formatosVad.entero.format(vad.n));
  textoEn('vad-repetidos', formatosVad.entero.format(vad.pozos_varias_filas));
  textoEn('vad-fuente', vad.fuente);
}

function renderTdf(vad) {
  const cuerpo = document.getElementById('cuerpo-tdf-vad');
  vad.tdf.forEach(fila => {
    const tr = document.createElement('tr');
    tr.append(
      celdaVad(String(fila.x), true),
      celdaVad(formatosVad.entero.format(fila.fi), true),
      celdaVad(formatosVad.porcentaje.format(fila.hi), true),
      celdaVad(formatosVad.entero.format(fila.Fi), true),
      celdaVad(formatosVad.porcentaje.format(fila.Hi), true)
    );
    cuerpo.appendChild(tr);
  });

  const pie = document.getElementById('pie-tdf-vad');
  const total = document.createElement('tr');
  total.append(
    celdaVad('Total', true),
    celdaVad(formatosVad.entero.format(vad.n), true),
    celdaVad(formatosVad.porcentaje.format(1), true),
    celdaVad('—', true),
    celdaVad('—', true)
  );
  pie.appendChild(total);

  const proporcion = valor => formatosVad.porcentaje.format(valor / vad.n);
  textoEn('nota-tdf-vad',
    `La distribución es bimodal: ${formatosVad.entero.format(vad.ceros)} pozos (${proporcion(vad.ceros)}) no completaron ` +
    `ningún día de producción y ${formatosVad.entero.format(vad.mes_completo)} pozos (${proporcion(vad.mes_completo)}) ` +
    `produjeron los 31 días del mes. La moda es x = ${vad.moda} y la mediana es ${formatosVad.decimal.format(vad.mediana)} días.`);
}

function graficarBarrasVad(vad) {
  const x = vad.tdf.map(fila => fila.x);
  return Plotly.newPlot('grafica-vad', [{
    type: 'bar',
    x,
    y: vad.tdf.map(fila => fila.hi),
    customdata: vad.tdf.map(fila => fila.fi),
    marker: {
      color: x.map(valor => (valor === vad.moda ? '#0b5b4f' : '#0f766e')),
      line: { color: '#ffffff', width: 1 }
    },
    hovertemplate: 'x = %{x} días<br>fᵢ = %{customdata:,.0f} pozos<br>hᵢ = %{y:.2%}<extra></extra>'
  }], {
    title: { text: 'Distribución de frecuencias relativas de X', font: { size: 15 } },
    font: { family: 'system-ui, sans-serif', color: '#334155' },
    paper_bgcolor: '#ffffff',
    plot_bgcolor: '#f8fafc',
    bargap: 0.25,
    margin: { t: 50, r: 20, b: 60, l: 70 },
    xaxis: { title: { text: 'Días completos de producción (x)' }, dtick: 1, tickangle: 0, automargin: true },
    yaxis: { title: { text: 'Frecuencia relativa (hᵢ)' }, tickformat: '.0%', rangemode: 'tozero', automargin: true },
    showlegend: false
  }, { responsive: true, displaylogo: false });
}

async function cargarEstadisticaDiferencial() {
  try {
    if (!window.Plotly || typeof window.Plotly.newPlot !== 'function') {
      throw new Error('No se descargó Plotly desde cdn.plot.ly. Comprueba la conexión a Internet.');
    }
    const vad = await leerJSON('data/vad_dias_produccion.json');
    if (!Array.isArray(vad.tdf) || vad.tdf.length === 0) {
      throw new Error('vad_dias_produccion.json no contiene la tabla de frecuencias.');
    }

    renderIdentificacion(vad);
    document.getElementById('contenido-vad').hidden = false;
    document.getElementById('estado-vad').hidden = true;

    renderTdf(vad);
    document.getElementById('contenido-tdf-vad').hidden = false;
    document.getElementById('estado-tdf-vad').hidden = true;

    // Se dibuja con el contenedor visible para que Plotly mida su ancho real.
    await graficarBarrasVad(vad);
  } catch (error) {
    const mensaje = `No se pudo cargar la variable aleatoria discreta. ${error.message} Coloca vad_dias_produccion.json dentro de la carpeta data/.`;
    mostrarError('estado-vad', mensaje, error);
    mostrarError('estado-tdf-vad', 'No se pudo construir la TDF ni la gráfica de barras.', error);
  }
}

cargarEstadisticaDiferencial();