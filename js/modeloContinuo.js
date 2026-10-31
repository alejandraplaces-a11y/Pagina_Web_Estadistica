// Secciones 4.2.8 a 4.2.14: modelo lognormal para el óleo por pozo productor.
(function () {
  const fmt = {
    entero: new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }),
    dos: new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    cuatro: new Intl.NumberFormat('es-CO', { minimumFractionDigits: 4, maximumFractionDigits: 4 }),
    porcentaje: new Intl.NumberFormat('es-CO', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    significativo: new Intl.NumberFormat('es-CO', { maximumSignificantDigits: 3 })
  };
  const Z_CONFIANZA = { '0.90': 1.6449, '0.95': 1.96, '0.99': 2.5758 };

  const volumen = v => (v < 100 ? fmt.significativo.format(v) : fmt.dos.format(v));
  const pValor = v => (v < 0.001 ? '< 0,001' : fmt.cuatro.format(v));

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

  function fila(cuerpoId, valores) {
    const tr = document.createElement('tr');
    valores.forEach(([valor, numerica]) => tr.appendChild(celda(valor, numerica)));
    document.getElementById(cuerpoId).appendChild(tr);
    return tr;
  }

  // Abramowitz y Stegun 7.1.26 (error < 1,5·10⁻⁷).
  function normalCdf(z) {
    const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
    const polinomio = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
    const erf = 1 - polinomio * Math.exp(-(z * z) / 2);
    return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
  }

  function lognormalCdf(y, m) {
    return y <= 0 ? 0 : normalCdf((Math.log(y) - m.mu) / m.sigma);
  }

  function ejeLog(m) {
    const desde = Math.floor(m.clases[0].t_li);
    const hasta = Math.ceil(m.clases[m.clases.length - 1].t_ls);
    const tickvals = [];
    for (let t = desde; t <= hasta; t++) tickvals.push(t);
    return {
      title: { text: 'Óleo por pozo (bbl/día, escala log)' },
      tickvals,
      ticktext: tickvals.map(t => (t < 0 ? fmt.significativo.format(10 ** t) : fmt.entero.format(10 ** t))),
      automargin: true
    };
  }

  function layout(ejeX, ejeY, extra = {}) {
    return {
      font: { family: 'system-ui, sans-serif', color: '#334155' },
      paper_bgcolor: '#ffffff',
      plot_bgcolor: '#f8fafc',
      margin: { t: 30, r: 20, b: 80, l: 70 },
      xaxis: ejeX,
      yaxis: { title: { text: ejeY }, rangemode: 'tozero', automargin: true },
      legend: { orientation: 'h', y: -0.3 },
      ...extra
    };
  }

  // 4.2.8
  function renderConjetura(m) {
    texto('mc-mediana-obs', fmt.dos.format(m.mediana_observada));
    texto('mc-media-obs', fmt.dos.format(m.media_observada));
    m.candidatos.forEach((c, i) => {
      const tr = fila('cuerpo-candidatos', [
        [c.modelo, false],
        [c.parametros.map(v => fmt.cuatro.format(v)).join(' ; '), true],
        [fmt.cuatro.format(c.pearson_r), true],
        [fmt.dos.format(c.chi_cuadrado), true]
      ]);
      if (i === 0) tr.classList.add('is-best');
    });
  }

  // 4.2.9
  function renderParametros(m) {
    texto('mc-mu', fmt.cuatro.format(m.mu));
    texto('mc-sigma', fmt.cuatro.format(m.sigma));
    texto('mc-mediana-teo', fmt.dos.format(m.mediana_teorica));
    texto('mc-media-teo', fmt.dos.format(m.media_teorica));
    texto('mc-mu-2', fmt.cuatro.format(m.mu));
    texto('mc-sigma-2', fmt.cuatro.format(m.sigma));
  }

  function graficarAjuste(m) {
    const ln10 = Math.LN10;
    const mu10 = m.mu / ln10;
    const sigma10 = m.sigma / ln10;
    const desde = m.clases[0].t_li;
    const hasta = m.clases[m.clases.length - 1].t_ls;
    const xs = [];
    for (let i = 0; i <= 200; i++) xs.push(desde + (hasta - desde) * i / 200);
    const curva = xs.map(t => Math.exp(-0.5 * ((t - mu10) / sigma10) ** 2) / (sigma10 * Math.sqrt(2 * Math.PI)));

    return Plotly.newPlot('grafica-ajuste-continuo', [
      {
        type: 'bar',
        name: 'Densidad empírica',
        x: m.clases.map(c => (c.t_li + c.t_ls) / 2),
        y: m.clases.map(c => c.densidad_t),
        width: m.clases.map(c => c.t_ls - c.t_li),
        customdata: m.clases.map(c => [volumen(c.li), volumen(c.ls)]),
        marker: { color: 'rgba(15, 118, 110, 0.35)', line: { color: '#0f766e', width: 1 } },
        hovertemplate: '[%{customdata[0]}; %{customdata[1]}) bbl/día<br>Densidad: %{y:.4f}<extra></extra>'
      },
      {
        type: 'scatter',
        mode: 'lines',
        name: 'Lognormal ajustada',
        x: xs,
        y: curva,
        line: { color: '#b45309', width: 2.5 },
        hoverinfo: 'skip'
      }
    ], layout(ejeLog(m), 'Densidad de log₁₀(y)', { bargap: 0 }), { responsive: true, displaylogo: false });
  }

  // 4.2.10
  function renderPrueba(m) {
    const pr = m.prueba;
    pr.grupos.forEach(g => {
      const desde = m.clases[g.desde];
      const hasta = m.clases[g.hasta];
      fila('cuerpo-prueba-continua', [
        [`[${volumen(desde.li)}; ${volumen(hasta.ls)})`, false],
        [fmt.entero.format(g.observada), true],
        [fmt.dos.format(g.esperada), true],
        [fmt.dos.format(g.aporte), true]
      ]);
    });
    const pie = document.getElementById('pie-prueba-continua');
    const tr = document.createElement('tr');
    [['Total', false], [fmt.entero.format(m.n), true], [fmt.dos.format(m.n), true],
      [`χ² = ${fmt.dos.format(pr.estadistico)}`, true]].forEach(([v, n]) => tr.appendChild(celda(v, n)));
    pie.appendChild(tr);

    texto('prueba-continua-clases', String(pr.grupos.length));
    texto('prueba-continua-chi', fmt.dos.format(pr.estadistico));
    texto('prueba-continua-gl', String(pr.grados_libertad));
    texto('prueba-continua-critico', fmt.dos.format(pr.valor_critico));
    texto('prueba-continua-p', pValor(pr.p_valor));
    const decision = document.getElementById('prueba-continua-decision');
    decision.textContent = pr.rechaza ? 'Chi-cuadrado: se rechaza H₀' : 'Chi-cuadrado: no se rechaza H₀';
    decision.classList.add(pr.rechaza ? 'is-reject' : 'is-accept');

    texto('pearson-r', fmt.cuatro.format(m.pearson_r));
    texto('pearson-r2', fmt.porcentaje.format(m.pearson_r2));
    const pearson = document.getElementById('pearson-decision');
    const fuerte = m.pearson_r >= 0.9;
    pearson.textContent = fuerte ? 'Pearson: correlación muy alta' : 'Pearson: correlación insuficiente';
    pearson.classList.add(fuerte ? 'is-accept' : 'is-reject');
  }

  // 4.2.11
  function renderRestricciones(m) {
    texto('rs-chi', fmt.dos.format(m.prueba.estadistico));
    texto('rs-critico', fmt.dos.format(m.prueba.valor_critico));
    texto('rs-n', fmt.entero.format(m.n));
  }

  function graficarPearson(m) {
    const obs = m.clases.map(c => c.hi);
    const esp = m.clases.map(c => c.p_modelo);
    const maximo = Math.max(...obs, ...esp) * 1.08;
    return Plotly.newPlot('grafica-pearson', [
      {
        type: 'scatter',
        mode: 'lines',
        name: 'Ajuste perfecto (y = x)',
        x: [0, maximo],
        y: [0, maximo],
        line: { color: '#94a3b8', dash: 'dash', width: 1.5 },
        hoverinfo: 'skip'
      },
      {
        type: 'scatter',
        mode: 'markers',
        name: 'Clases',
        x: esp,
        y: obs,
        customdata: m.clases.map(c => [c.clase, volumen(c.li), volumen(c.ls)]),
        marker: { color: '#0f766e', size: 9, line: { color: '#ffffff', width: 1 } },
        hovertemplate: 'Clase %{customdata[0]}: [%{customdata[1]}; %{customdata[2]})<br>Esperada: %{x:.4f}<br>Observada: %{y:.4f}<extra></extra>'
      }
    ], layout(
      { title: { text: 'Probabilidad esperada (lognormal)' }, tickformat: '.0%', range: [0, maximo], automargin: true },
      'Frecuencia relativa observada',
      { yaxis: { title: { text: 'Frecuencia relativa observada' }, tickformat: '.0%', range: [0, maximo], automargin: true } }
    ), { responsive: true, displaylogo: false });
  }

  // 4.2.12
  function renderProbabilidades(m) {
    m.probabilidades.forEach(e => {
      fila('cuerpo-probabilidades', [
        [e.evento, false],
        [fmt.porcentaje.format(e.modelo), true],
        [fmt.porcentaje.format(e.empirica), true],
        [`${e.modelo >= e.empirica ? '+' : '−'}${fmt.dos.format(Math.abs(e.modelo - e.empirica) * 100)} pp`, true]
      ]);
    });
    texto('prob-media', fmt.dos.format(m.media_observada));

    const entradaA = document.getElementById('calc-prob-a');
    const entradaB = document.getElementById('calc-prob-b');
    const calcular = () => {
      const a = Number(entradaA.value);
      const b = Number(entradaB.value);
      const salida = document.getElementById('calc-prob-resultado');
      if (!(a >= 0) || !(b > 0) || b <= a) {
        salida.textContent = 'Introduce valores con 0 ≤ a < b.';
        return;
      }
      const p = lognormalCdf(b, m) - lognormalCdf(a, m);
      salida.textContent = `P(${volumen(a)} ≤ Y < ${volumen(b)}) = ${fmt.porcentaje.format(p)} ≈ ${fmt.entero.format(p * m.n)} pozos`;
    };
    entradaA.addEventListener('input', calcular);
    entradaB.addEventListener('input', calcular);
    calcular();
  }

  // 4.2.13
  function renderIntervalos(m) {
    texto('ic-confianza', fmt.porcentaje.format(m.confianza).replace(',00', ''));
    texto('ic-t', fmt.cuatro.format(m.t));
    texto('ic-z', fmt.cuatro.format(m.z));
    const porSimbolo = Object.fromEntries(m.intervalos.map(i => [i.simbolo, i]));
    const rango = i => `${fmt.dos.format(i.inferior)} y ${fmt.dos.format(i.superior)}`;
    texto('ic-mediana-rango', rango(porSimbolo['e^μ']));
    texto('ic-media-rango', rango(porSimbolo['E[Y]']));
    m.intervalos.forEach(i => {
      const esProporcion = i.simbolo === 'p';
      const f = esProporcion ? fmt.porcentaje.format : fmt.cuatro.format;
      fila('cuerpo-intervalos', [
        [i.parametro, false],
        [i.metodo, false],
        [f(i.estimacion), true],
        [`[${f(i.inferior)}; ${f(i.superior)}]`, true]
      ]);
    });
  }

  // 4.2.14
  function renderTamanos(m) {
    texto('tm-poblacion', fmt.entero.format(m.poblacion));
    texto('tm-s', fmt.dos.format(m.desviacion_observada));
    m.tamanos.forEach(t => {
      const esMedia = t.unidad === 'bbl/día';
      fila('cuerpo-tamanos', [
        [t.objetivo, false],
        [esMedia ? `± ${fmt.dos.format(t.error)} bbl/día` : `± ${fmt.porcentaje.format(t.error)}`, true],
        [fmt.entero.format(Math.ceil(t.n0)), true],
        [fmt.entero.format(t.n), true]
      ]);
    });

    const error = document.getElementById('calc-tm-error');
    const nivel = document.getElementById('calc-tm-confianza');
    const calcular = () => {
      const e = Number(error.value);
      const salida = document.getElementById('calc-tm-resultado');
      if (!(e > 0)) {
        salida.textContent = 'Introduce un error mayor que 0.';
        return;
      }
      const z = Z_CONFIANZA[nivel.value];
      const n0 = (z * m.desviacion_observada / e) ** 2;
      const n = Math.ceil(n0 / (1 + (n0 - 1) / m.poblacion));
      salida.textContent = `n₀ = ${fmt.entero.format(Math.ceil(n0))} → n = ${fmt.entero.format(n)} pozos (${fmt.porcentaje.format(n / m.poblacion)} de la población)`;
    };
    error.addEventListener('input', calcular);
    nivel.addEventListener('change', calcular);
    calcular();
  }

  const SECCIONES = ['conjetura', 'parametros', 'test-continuo', 'restricciones', 'probabilidades', 'estimacion', 'tamano'];

  async function cargar() {
    try {
      if (!window.Plotly || typeof window.Plotly.newPlot !== 'function') {
        throw new Error('No se descargó Plotly desde cdn.plot.ly. Comprueba la conexión a Internet.');
      }
      const m = await leerJSON('data/modelo_continuo.json');

      renderConjetura(m);
      renderParametros(m);
      renderPrueba(m);
      renderRestricciones(m);
      renderProbabilidades(m);
      renderIntervalos(m);
      renderTamanos(m);
      SECCIONES.forEach(id => {
        document.getElementById(`contenido-mc-${id}`).hidden = false;
        document.getElementById(`estado-mc-${id}`).hidden = true;
      });

      // Se dibuja con los contenedores visibles para que Plotly mida su ancho real.
      await Promise.all([graficarAjuste(m), graficarPearson(m)]);
    } catch (error) {
      SECCIONES.forEach((id, i) => {
        mostrarError(`estado-mc-${id}`, i === 0
          ? `No se pudo cargar el modelo continuo. ${error.message} Coloca modelo_continuo.json dentro de la carpeta data/.`
          : 'No se pudo calcular esta sección.', error);
      });
    }
  }

  cargar();
})();
