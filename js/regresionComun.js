// Utilidades compartidas por las páginas de regresión (índice, modelos simples y múltiple).
window.Regresion = (function () {
  const fmt = {
    entero: new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }),
    dos: new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    tres: new Intl.NumberFormat('es-CO', { minimumFractionDigits: 3, maximumFractionDigits: 3 }),
    cuatro: new Intl.NumberFormat('es-CO', { minimumFractionDigits: 4, maximumFractionDigits: 4 }),
    sig: new Intl.NumberFormat('es-CO', { maximumSignificantDigits: 5 }),
    pct: new Intl.NumberFormat('es-CO', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })
  };
  // Signo menos tipográfico en todos los números negativos.
  const menos = s => s.replace(/^-/, '−');
  const num = v => menos(Math.abs(v) >= 1000 ? fmt.dos.format(v) : fmt.sig.format(v));
  const cuatro = v => menos(fmt.cuatro.format(v));
  const pValor = v => (v < 0.0001 ? '< 0,0001' : fmt.cuatro.format(v));

  const COLORES = { lineal: '#1F5C52', potencial: '#8C6D46', exponencial: '#B5523B', logaritmico: '#5B6FA8', polinomico: '#7A8B3A' };
  const PAGINAS = {
    lineal: 'regresion-lineal.html', potencial: 'regresion-potencial.html', exponencial: 'regresion-exponencial.html',
    logaritmico: 'regresion-logaritmica.html', polinomico: 'regresion-polinomica.html'
  };
  const PUNTOS = 'rgba(44, 53, 49, 0.55)';
  const GRID = 'rgba(11,34,30,0.08)';

  function texto(id, contenido) {
    const el = document.getElementById(id);
    if (el) el.textContent = contenido;
  }

  function filaTabla(tbody, valores) {
    const tr = document.createElement('tr');
    valores.forEach(([valor, numerica, encabezado]) => {
      const td = document.createElement(encabezado ? 'th' : 'td');
      if (encabezado) td.scope = 'row';
      if (numerica) td.className = 'numero';
      td.textContent = valor;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
    return tr;
  }

  function mostrar(clave) {
    document.getElementById(`contenido-${clave}`).hidden = false;
    document.getElementById(`estado-${clave}`).hidden = true;
  }

  function layout(extra = {}) {
    return {
      font: { family: 'Archivo, sans-serif', color: '#2C3531', size: 12 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      margin: { t: 20, r: 20, b: 70, l: 80 },
      legend: { orientation: 'h', y: -0.22 },
      hovermode: 'closest',
      ...extra
    };
  }

  const eje = (titulo, tipo = 'linear') => ({ title: { text: titulo }, type: tipo, gridcolor: GRID, zeroline: false, automargin: true });
  const ejeX = tipo => eje('x: pozos del campo', tipo);
  const ejeY = tipo => eje('y: óleo del campo (bbl/día)', tipo);
  const config = { responsive: true, displaylogo: false };

  function trazaPuntos(d, extra = {}) {
    return {
      type: 'scatter', mode: 'markers', name: 'Campos',
      x: d.pares.map(p => p.x), y: d.pares.map(p => p.y),
      text: d.pares.map(p => `${p.campo} (${p.estado})`),
      marker: { color: PUNTOS, size: 7, line: { color: '#FFFFFF', width: 0.5 } },
      hovertemplate: '%{text}<br>x = %{x} pozos<br>y = %{y:,.2f} bbl/día<extra></extra>',
      ...extra
    };
  }

  function predecir(m, x) {
    const p = m.parametros;
    switch (m.clave) {
      case 'lineal': return p.a + p.b * x;
      case 'potencial': return p.a * x ** p.b;
      case 'exponencial': return p.a * Math.exp(p.b * x);
      case 'logaritmico': return p.a + p.b * Math.log(x);
      default: return p.a + p.b * x + p.c * x * x;
    }
  }

  function ecuacionAjustada(m) {
    const p = m.parametros;
    const signo = v => (v < 0 ? `− ${num(-v)}` : `+ ${num(v)}`);
    switch (m.clave) {
      case 'lineal': return `ŷ = ${num(p.a)} ${signo(p.b)}·x`;
      case 'potencial': return `ŷ = ${num(p.a)}·x^${num(p.b)}`;
      case 'exponencial': return `ŷ = ${num(p.a)}·e^(${num(p.b)}·x)`;
      case 'logaritmico': return `ŷ = ${num(p.a)} ${signo(p.b)}·ln x`;
      default: return `ŷ = ${num(p.a)} ${signo(p.b)}·x ${signo(p.c)}·x²`;
    }
  }

  function lecturaR(r) {
    const a = Math.abs(r);
    const fuerza = a >= 0.7 ? 'fuerte' : a >= 0.3 ? 'moderada' : 'débil';
    return `${fuerza} y ${r >= 0 ? 'positiva' : 'negativa'}`;
  }

  // Botones de un control segmentado con aria-pressed; devuelve la clave activa al callback.
  function segmentado(selector, alCambiar) {
    const botones = document.querySelectorAll(selector);
    botones.forEach(b => b.addEventListener('click', () => {
      botones.forEach(o => o.setAttribute('aria-pressed', String(o === b)));
      alCambiar(b.dataset.valor);
    }));
  }

  async function cargar(secciones, alCargar) {
    try {
      const d = await leerJSON('data/regresion.json');
      document.querySelectorAll('.reg-n').forEach(el => { el.textContent = fmt.entero.format(d.n); });
      const dibujos = alCargar(d) || [];
      secciones.forEach(mostrar);
      if (!window.Plotly || typeof window.Plotly.react !== 'function') {
        throw new Error('No se descargó Plotly desde cdn.plot.ly. Comprueba la conexión a Internet.');
      }
      // Se dibuja con los contenedores visibles para que Plotly mida su ancho real.
      await Promise.all(dibujos.map(f => f()));
    } catch (error) {
      secciones.forEach((id, i) => {
        mostrarError(`estado-${id}`, i === 0
          ? `No se pudo cargar la regresión. ${error.message} Genera data/regresion.json con scripts/3_regresion.py.`
          : 'No se pudo calcular esta sección.', error);
      });
    }
  }

  return {
    fmt, num, cuatro, pValor, COLORES, PAGINAS, texto, filaTabla, mostrar, layout, eje, ejeX, ejeY, config,
    trazaPuntos, predecir, ecuacionAjustada, lecturaR, segmentado, cargar
  };
})();
