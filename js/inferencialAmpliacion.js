// Secciones 4.2.15 a 4.2.18: agua por pozo, pozos por campo, submuestras y validación anual.
(function () {
  const fmt = {
    entero: new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }),
    uno: new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    dos: new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    tres: new Intl.NumberFormat('es-CO', { minimumFractionDigits: 3, maximumFractionDigits: 3 }),
    cuatro: new Intl.NumberFormat('es-CO', { minimumFractionDigits: 4, maximumFractionDigits: 4 }),
    porcentaje: new Intl.NumberFormat('es-CO', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    sig: new Intl.NumberFormat('es-CO', { maximumSignificantDigits: 3 })
  };
  const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const COLOR_OIL = '#8C6D46';
  const COLOR_DEEP = '#5E4529';
  const COLOR_BASIN = '#1F5C52';

  const volumen = v => (v < 100 ? fmt.sig.format(v) : fmt.dos.format(v));
  const pValor = v => (v < 0.001 ? '< 0,001' : fmt.cuatro.format(v));
  const decision = p => (p.rechaza ? 'Se rechaza H₀' : 'No se rechaza H₀');

  function texto(id, contenido) {
    const elemento = document.getElementById(id);
    if (elemento) elemento.textContent = contenido;
  }

  function fila(cuerpoId, valores) {
    const tr = document.createElement('tr');
    valores.forEach(([valor, numerica, encabezado]) => {
      const td = document.createElement(encabezado ? 'th' : 'td');
      if (encabezado) td.scope = 'row';
      if (numerica) td.className = 'numero';
      td.textContent = valor;
      tr.appendChild(td);
    });
    document.getElementById(cuerpoId).appendChild(tr);
  }

  function layout(ejeX, ejeY, extra = {}) {
    return {
      font: { family: 'Archivo, sans-serif', color: '#2C3531' },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      margin: { t: 30, r: 20, b: 80, l: 70 },
      xaxis: ejeX,
      yaxis: { title: { text: ejeY }, rangemode: 'tozero', automargin: true },
      legend: { orientation: 'h', y: -0.3 },
      ...extra
    };
  }

  function mostrar(id) {
    document.getElementById(`contenido-${id}`).hidden = false;
    document.getElementById(`estado-${id}`).hidden = true;
  }

  // 4.2.15
  function renderAgua(a) {
    texto('agua-n', fmt.entero.format(a.n));
    texto('agua-mediana', fmt.dos.format(a.mediana));
    texto('agua-media', fmt.dos.format(a.media));
    texto('agua-mejor', a.mejor);
    texto('agua-excluidos', fmt.entero.format(a.excluidos_cero));
    texto('agua-k', String(a.k));

    a.candidatos.forEach(c => {
      fila('cuerpo-agua-candidatos', [
        [c.modelo === a.mejor ? `${c.modelo} (mejor)` : c.modelo, false, true],
        [c.parametros.map(v => fmt.cuatro.format(v)).join(' ; '), true],
        [fmt.cuatro.format(c.pearson_r), true],
        [`${fmt.dos.format(c.chi_cuadrado)} · ${c.grados_libertad}`, true],
        [fmt.dos.format(c.valor_critico), true],
        [decision(c), false]
      ]);
    });
    a.intervalos.forEach(i => {
      fila('cuerpo-agua-intervalos', [
        [i.parametro, false, true],
        [i.metodo, false],
        [fmt.dos.format(i.estimacion), true],
        [`[${fmt.dos.format(i.inferior)}; ${fmt.dos.format(i.superior)}]`, true]
      ]);
    });

    const lognormal = a.candidatos.find(c => c.modelo === 'Lognormal');
    const mejor = a.candidatos.find(c => c.modelo === a.mejor);
    texto('nota-agua', `A diferencia del óleo, el agua no sigue bien una lognormal (χ² = ${fmt.dos.format(lognormal.chi_cuadrado)}): `
      + `en escala log₁₀ su asimetría es ${fmt.dos.format(a.asimetria_log10)}, con una cola izquierda larga de pozos con muy poca agua. `
      + `El mejor modelo es la ${a.mejor.toLowerCase()} (r = ${fmt.cuatro.format(mejor.pearson_r)}; χ² = ${fmt.dos.format(mejor.chi_cuadrado)}), que también se rechaza con n = ${fmt.entero.format(a.n)}. `
      + 'Por eso la mediana se estima con un intervalo que no supone ningún modelo (estadísticos de orden) y la media con t de Student.');

    const centros = a.clases.map(c => (c.t_li + c.t_ls) / 2);
    const ancho = a.amplitud_log10;
    const desde = Math.floor(a.clases[0].t_li);
    const hasta = Math.ceil(a.clases[a.clases.length - 1].t_ls);
    const tickvals = [];
    for (let t = desde; t <= hasta; t++) tickvals.push(t);
    return () => Plotly.newPlot('grafica-agua', [
      {
        type: 'bar', x: centros, y: a.clases.map(c => c.hi), width: ancho,
        name: 'Observada hᵢ', marker: { color: COLOR_OIL, opacity: 0.8, line: { color: '#FFFFFF', width: 1 } },
        customdata: a.clases.map(c => `[${volumen(c.li)}; ${volumen(c.ls)})`),
        hovertemplate: '%{customdata} bbl/día<br>hᵢ = %{y:.4f}<extra></extra>'
      },
      {
        type: 'scatter', mode: 'lines+markers', x: centros, y: a.clases.map(c => c.p_modelo),
        name: `Modelo ${a.mejor.toLowerCase()} pᵢ`, line: { color: COLOR_BASIN, width: 2 }, marker: { size: 6 },
        hovertemplate: 'pᵢ = %{y:.4f}<extra></extra>'
      }
    ], layout({
      title: { text: 'Agua por pozo (bbl/día, escala log)' },
      tickvals,
      ticktext: tickvals.map(t => (t < 0 ? fmt.sig.format(10 ** t) : fmt.entero.format(10 ** t))),
      automargin: true
    }, 'Frecuencia relativa', { bargap: 0 }),
    { responsive: true, displaylogo: false });
  }

  // 4.2.16
  function renderCampos(c) {
    texto('campos-n', fmt.entero.format(c.n));
    texto('campos-media', fmt.dos.format(c.media));
    texto('campos-mediana', fmt.entero.format(c.mediana));
    texto('campos-max', fmt.entero.format(c.maximo));
    c.tdf.forEach(f => {
      const etiqueta = f.desde === f.hasta ? String(f.desde) : f.hasta >= c.maximo ? `${f.desde} o más` : `${f.desde} a ${f.hasta}`;
      fila('cuerpo-campos', [
        [etiqueta, false, true],
        [fmt.entero.format(f.fi), true],
        [fmt.cuatro.format(f.hi), true],
        [fmt.cuatro.format(f.Hi), true],
        [fmt.cuatro.format(f.p_poisson), true],
        [fmt.cuatro.format(f.p_binomial_negativa), true]
      ]);
    });
    const modelos = [
      ['Poisson', `λ̂ = ${fmt.dos.format(c.poisson.lambda)}`, c.poisson.prueba],
      ['Binomial negativa', `r̂ = ${fmt.cuatro.format(c.binomial_negativa.r)} ; p̂ = ${fmt.cuatro.format(c.binomial_negativa.p)}`, c.binomial_negativa.prueba]
    ];
    modelos.forEach(([nombre, parametros, p]) => {
      fila('cuerpo-campos-prueba', [
        [nombre, false, true],
        [parametros, true],
        [fmt.dos.format(p.estadistico), true],
        [String(p.grados_libertad), true],
        [fmt.dos.format(p.valor_critico), true],
        [pValor(p.p_valor), true],
        [decision(p), false]
      ]);
    });
    const razon = c.varianza / (c.media - 1);
    texto('nota-campos', `La varianza de V − 1 (${fmt.dos.format(c.varianza)}) es unas ${fmt.entero.format(razon)} veces su media: hay muchos campos pequeños (la mediana es ${fmt.entero.format(c.mediana)} pozos) y unos pocos campos con cientos de pozos. `
      + `Poisson no puede reproducir esa sobredispersión (χ² = ${fmt.dos.format(c.poisson.prueba.estadistico)}). La binomial negativa reduce el χ² a ${fmt.dos.format(c.binomial_negativa.prueba.estadistico)}, pero aún se rechaza: la cola de campos muy grandes es más pesada que la del modelo.`);
  }

  // 4.2.17
  function renderSubmuestras(s) {
    texto('sub-tamano', fmt.entero.format(s.tamano));
    texto('sub-tamano-2', fmt.entero.format(s.tamano));
    texto('sub-semilla', String(s.semilla));
    texto('sub-replicas', fmt.entero.format(s.replicas));
    texto('sub-replicas-2', fmt.entero.format(s.replicas));
    s.filas.forEach(f => {
      fila('cuerpo-submuestras', [
        [f.modelo, false, true],
        [`${fmt.dos.format(f.completa.estadistico)} · ${f.completa.grados_libertad}`, true],
        [f.completa.rechaza ? 'Rechaza' : 'No rechaza', false],
        [`${fmt.dos.format(f.submuestra.estadistico)} · ${f.submuestra.grados_libertad}`, true],
        [pValor(f.submuestra.p_valor), true],
        [f.submuestra.rechaza ? 'Rechaza' : 'No rechaza', false],
        [fmt.porcentaje.format(f.porcentaje_rechazo), true]
      ]);
    });
    const logn = s.filas.find(f => f.modelo.startsWith('Lognormal'));
    texto('nota-submuestras', `Con n = ${fmt.entero.format(s.tamano)} la lognormal no se rechaza en la submuestra (p = ${pValor(logn.submuestra.p_valor)}) y solo el ${fmt.porcentaje.format(logn.porcentaje_rechazo)} de las ${fmt.entero.format(s.replicas)} submuestras la rechaza: `
      + 'su rechazo con la muestra completa se debe en buena parte a la sensibilidad del χ² a un n grande, y el modelo es una aproximación útil. '
      + 'La binomial y la beta-binomial se rechazan en el 100 % de las submuestras: la forma de dos picos de X no la reproduce ningún modelo simple, con cualquier tamaño de muestra.');
  }

  // 4.2.18
  function renderValidacion(v) {
    // Tres decimales: julio (13,935) queda fuera del IC por milésimas.
    const rango = ([a, b]) => `[${fmt.tres.format(a)}; ${fmt.tres.format(b)}]`;
    texto('val-obs', fmt.entero.format(v.anual.observaciones));
    texto('val-media', fmt.tres.format(v.anual.media));
    texto('val-ic-media', rango(v.ic_media));
    texto('val-meses', `${v.meses_media_en_ic} de 12`);
    texto('val-fuente', v.fuente);
    v.meses.forEach(m => {
      fila('cuerpo-validacion', [
        [MESES[Number(m.mes) - 1], false, true],
        [fmt.entero.format(m.pozos), true],
        [fmt.entero.format(m.productores), true],
        [fmt.tres.format(m.media), true],
        [m.media_en_ic ? 'Sí' : 'No', false],
        [fmt.tres.format(m.mediana), true],
        [m.mediana_en_ic ? 'Sí' : 'No', false]
      ]);
    });
    const fuera = v.meses.filter(m => !m.media_en_ic).map(m => MESES[Number(m.mes) - 1].toLowerCase());
    const medianas = v.meses.map(m => m.mediana);
    texto('nota-validacion', `La media anual de 2023 (${fmt.tres.format(v.anual.media)} bbl/día) ${v.anual.media_en_ic ? 'cae dentro' : 'queda fuera'} del IC de enero ${rango(v.ic_media)}, `
      + `y ${v.meses_media_en_ic} de las 12 medias mensuales también (${fuera.length ? `quedan fuera ${fuera.join(' y ')}` : 'ninguna queda fuera'}): el intervalo de la media de enero describe bien el año. `
      + `En cambio, ninguna mediana mensual (${fmt.dos.format(Math.min(...medianas))} a ${fmt.dos.format(Math.max(...medianas))} bbl/día) cae en el IC de la mediana lognormal ${rango(v.ic_mediana)}, igual que la mediana de enero: `
      + 'el modelo subestima la mediana por su desajuste en la cola izquierda. Además, el número de pozos crece de enero a diciembre, así que enero no es un mes idéntico al resto del año.');

    return () => Plotly.newPlot('grafica-validacion', [
      {
        type: 'scatter', mode: 'lines', x: [0.5, 12.5, 12.5, 0.5], y: [v.ic_media[0], v.ic_media[0], v.ic_media[1], v.ic_media[1]],
        fill: 'toself', fillcolor: 'rgba(140, 109, 70, 0.18)', line: { width: 0 }, name: 'IC 95 % de la media (enero)', hoverinfo: 'skip'
      },
      {
        type: 'scatter', mode: 'lines+markers', x: v.meses.map(m => Number(m.mes)), y: v.meses.map(m => m.media),
        name: 'Media mensual', line: { color: COLOR_DEEP, width: 2 }, marker: { size: 7 },
        hovertemplate: '%{y:.2f} bbl/día<extra>Media</extra>'
      },
      {
        type: 'scatter', mode: 'lines', x: [0.5, 12.5, 12.5, 0.5], y: [v.ic_mediana[0], v.ic_mediana[0], v.ic_mediana[1], v.ic_mediana[1]],
        fill: 'toself', fillcolor: 'rgba(31, 92, 82, 0.16)', line: { width: 0 }, name: 'IC 95 % de la mediana e^μ (enero)', hoverinfo: 'skip'
      },
      {
        type: 'scatter', mode: 'lines+markers', x: v.meses.map(m => Number(m.mes)), y: v.meses.map(m => m.mediana),
        name: 'Mediana mensual', line: { color: COLOR_BASIN, width: 2, dash: 'dot' }, marker: { size: 7 },
        hovertemplate: '%{y:.2f} bbl/día<extra>Mediana</extra>'
      }
    ], layout({
      title: { text: 'Mes de 2023' },
      tickvals: v.meses.map(m => Number(m.mes)),
      ticktext: MESES.map(m => m.slice(0, 3)),
      range: [0.5, 12.5]
    }, 'Óleo por pozo productor (bbl/día)'), { responsive: true, displaylogo: false });
  }

  const SECCIONES = ['agua', 'campos', 'submuestras', 'validacion'];

  async function cargar() {
    try {
      const [a, v] = await Promise.all([
        leerJSON('data/inferencial_ampliacion.json'),
        leerJSON('data/validacion_anual.json')
      ]);
      const dibujarAgua = renderAgua({ ...a.agua });
      renderCampos(a.pozos_por_campo);
      renderSubmuestras(a.submuestras);
      const dibujarValidacion = renderValidacion(v);
      SECCIONES.forEach(mostrar);

      if (!window.Plotly || typeof window.Plotly.newPlot !== 'function') {
        throw new Error('No se descargó Plotly desde cdn.plot.ly. Comprueba la conexión a Internet.');
      }
      await Promise.all([dibujarAgua(), dibujarValidacion()]);
    } catch (error) {
      SECCIONES.forEach((id, i) => {
        mostrarError(`estado-${id}`, i === 0
          ? `No se pudo cargar la ampliación inferencial. ${error.message}`
          : 'No se pudo calcular esta sección.', error);
      });
    }
  }

  cargar();
})();
