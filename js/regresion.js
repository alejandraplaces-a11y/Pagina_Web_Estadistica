// 4.3.1 Regresión clásica: pares, dispersión, modelos simples, indicadores y regresión múltiple.
(function () {
  const fmt = {
    entero: new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }),
    dos: new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    cuatro: new Intl.NumberFormat('es-CO', { minimumFractionDigits: 4, maximumFractionDigits: 4 }),
    sig: new Intl.NumberFormat('es-CO', { maximumSignificantDigits: 5 }),
    pct: new Intl.NumberFormat('es-CO', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })
  };
  const num = v => (Math.abs(v) >= 1000 ? fmt.dos.format(v) : fmt.sig.format(v));
  const pValor = v => (v < 0.0001 ? '< 0,0001' : fmt.cuatro.format(v));

  const COLORES = { lineal: '#1F5C52', potencial: '#8C6D46', exponencial: '#B5523B', logaritmico: '#5B6FA8', polinomico: '#7A8B3A' };
  const PUNTOS = 'rgba(44, 53, 49, 0.55)';

  // Forma linealizada de cada modelo: X = g(x), Y = h(y).
  const LINEALIZACION = {
    lineal: { X: x => x, Y: y => y, nX: 'x', nY: 'y', a: A => A, textoA: 'a = A' },
    potencial: { X: Math.log, Y: Math.log, nX: 'ln x', nY: 'ln y', a: A => Math.exp(A), textoA: 'a = e^A' },
    exponencial: { X: x => x, Y: Math.log, nX: 'x', nY: 'ln y', a: A => Math.exp(A), textoA: 'a = e^A' },
    logaritmico: { X: Math.log, Y: y => y, nX: 'ln x', nY: 'y', a: A => A, textoA: 'a = A' }
  };

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

  const ejeX = tipo => ({ title: { text: 'x: pozos del campo' }, type: tipo, gridcolor: 'rgba(11,34,30,0.08)', zeroline: false, automargin: true });
  const ejeY = tipo => ({ title: { text: 'y: óleo del campo (bbl/día)' }, type: tipo, gridcolor: 'rgba(11,34,30,0.08)', zeroline: false, automargin: true });

  function trazaPuntos(d) {
    return {
      type: 'scatter', mode: 'markers', name: 'Campos',
      x: d.pares.map(p => p.x), y: d.pares.map(p => p.y),
      text: d.pares.map(p => `${p.campo} (${p.estado})`),
      marker: { color: PUNTOS, size: 7, line: { color: '#FFFFFF', width: 0.5 } },
      hovertemplate: '%{text}<br>x = %{x} pozos<br>y = %{y:,.2f} bbl/día<extra></extra>'
    };
  }

  // b) Tabla de pares
  function renderPares(d) {
    const top = document.getElementById('cuerpo-pares-top');
    d.pares.slice(0, 10).forEach((p, i) => filaTabla(top, [
      [String(i + 1), true], [p.campo, false, true], [p.estado, false],
      [fmt.entero.format(p.x), true], [fmt.dos.format(p.y), true], [fmt.dos.format(p.y / p.x), true]
    ]));

    const filas = d.pares.map((p, i) => ({ ...p, i: i + 1 }));
    const cuerpo = document.getElementById('cuerpo-pares');
    const pintar = lista => {
      cuerpo.replaceChildren();
      lista.forEach(p => filaTabla(cuerpo, [
        [String(p.i), true], [p.campo, false, true], [p.estado, false],
        [fmt.entero.format(p.x), true], [fmt.dos.format(p.y), true]
      ]));
    };
    pintar(filas);
    let ultima = null;
    document.querySelectorAll('#tabla-pares-completa th button').forEach(boton => {
      boton.addEventListener('click', () => {
        const clave = boton.dataset.orden;
        const asc = ultima === clave ? false : true;
        ultima = asc ? clave : null;
        const orden = [...filas].sort((a, b) => {
          const r = typeof a[clave] === 'string' ? a[clave].localeCompare(b[clave], 'es') : a[clave] - b[clave];
          return asc ? r : -r;
        });
        pintar(orden);
      });
    });
    const sx = d.pares.reduce((s, p) => s + p.x, 0);
    const sy = d.pares.reduce((s, p) => s + p.y, 0);
    texto('preview-pares', `Σx = ${fmt.entero.format(sx)} pozos · Σy = ${fmt.dos.format(sy)} bbl/día`);
  }

  // c) Dispersión con escala conmutable
  function renderDispersion(d) {
    const dibujar = tipo => Plotly.react('grafica-dispersion', [trazaPuntos(d)],
      layout({ xaxis: ejeX(tipo), yaxis: ejeY(tipo), showlegend: false }), { responsive: true, displaylogo: false });
    const botones = document.querySelectorAll('#dispersion [data-escala]');
    botones.forEach(b => b.addEventListener('click', () => {
      botones.forEach(o => o.setAttribute('aria-pressed', String(o === b)));
      dibujar(b.dataset.escala === 'log' ? 'log' : 'linear');
    }));
    return () => dibujar('linear');
  }

  // d) Curvas de los cinco modelos
  function renderConjetura(d) {
    const visibles = new Set(['lineal', 'potencial', 'exponencial', 'logaritmico', 'polinomico']);
    const selector = document.getElementById('selector-modelos');
    const curva = m => {
      const xs = [], ys = [];
      d.curvas.x.forEach((x, i) => {
        const y = d.curvas[m.clave][i];
        // En escala log solo se pueden mostrar valores positivos y acotados.
        if (y > 0 && y < 1e5) { xs.push(x); ys.push(y); }
      });
      return {
        type: 'scatter', mode: 'lines', name: m.modelo, x: xs, y: ys, visible: visibles.has(m.clave),
        line: { color: COLORES[m.clave], width: m.clave === d.elegido ? 4 : 2, dash: m.clave === d.elegido ? 'solid' : 'dot' },
        hovertemplate: `${m.modelo}<br>x = %{x:.0f}<br>ŷ = %{y:,.1f}<extra></extra>`
      };
    };
    const dibujar = () => Plotly.react('grafica-modelos', [trazaPuntos(d), ...d.modelos.map(curva)],
      layout({ xaxis: ejeX('log'), yaxis: { ...ejeY('log'), range: [Math.log10(0.3), Math.log10(30000)] } }),
      { responsive: true, displaylogo: false });
    d.modelos.forEach(m => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'segmento';
      b.textContent = m.modelo.replace(' (grado 2)', '');
      // Cada botón activo toma el color de su curva.
      const pintar = () => {
        const activo = visibles.has(m.clave);
        b.setAttribute('aria-pressed', String(activo));
        b.style.background = activo ? COLORES[m.clave] : '';
        b.style.borderColor = activo ? COLORES[m.clave] : '';
      };
      pintar();
      b.addEventListener('click', () => {
        if (visibles.has(m.clave)) visibles.delete(m.clave); else visibles.add(m.clave);
        pintar();
        dibujar();
      });
      selector.appendChild(b);
    });
    return dibujar;
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

  function sumasLineales(d, lin) {
    const X = d.pares.map(p => lin.X(p.x));
    const Y = d.pares.map(p => lin.Y(p.y));
    const n = X.length;
    const s = { n, sX: 0, sY: 0, sXY: 0, sX2: 0, sY2: 0 };
    X.forEach((x, i) => { s.sX += x; s.sY += Y[i]; s.sXY += x * Y[i]; s.sX2 += x * x; s.sY2 += Y[i] * Y[i]; });
    s.b = (n * s.sXY - s.sX * s.sY) / (n * s.sX2 - s.sX ** 2);
    s.A = s.sY / n - s.b * s.sX / n;
    s.r = (n * s.sXY - s.sX * s.sY) / Math.sqrt((n * s.sX2 - s.sX ** 2) * (n * s.sY2 - s.sY ** 2));
    return s;
  }

  // Resuelve un sistema 3 × 3 por eliminación de Gauss.
  function resolver3(M, v) {
    const A = M.map((fila, i) => [...fila, v[i]]);
    for (let c = 0; c < 3; c++) {
      let piv = c;
      for (let f = c + 1; f < 3; f++) if (Math.abs(A[f][c]) > Math.abs(A[piv][c])) piv = f;
      [A[c], A[piv]] = [A[piv], A[c]];
      for (let f = c + 1; f < 3; f++) {
        const k = A[f][c] / A[c][c];
        for (let j = c; j < 4; j++) A[f][j] -= k * A[c][j];
      }
    }
    const x = [0, 0, 0];
    for (let f = 2; f >= 0; f--) {
      let suma = A[f][3];
      for (let j = f + 1; j < 3; j++) suma -= A[f][j] * x[j];
      x[f] = suma / A[f][f];
    }
    return x;
  }

  function tablaSumas(filas) {
    const cont = document.createElement('div');
    cont.className = 'table-scroll';
    const t = document.createElement('table');
    t.className = 'data-table tabla-mini';
    const tb = document.createElement('tbody');
    filas.forEach(([etiqueta, valor]) => filaTabla(tb, [[etiqueta, false, true], [valor, true]]));
    t.appendChild(tb);
    cont.appendChild(t);
    return cont;
  }

  function panelModelo(d, m) {
    const panel = document.getElementById('panel-parametros');
    panel.replaceChildren();
    const h = document.createElement('h3');
    h.textContent = `${m.modelo}: ${m.ecuacion}`;
    const lista = document.createElement('ol');
    lista.className = 'pasos';
    const paso = html => { const li = document.createElement('li'); li.innerHTML = html; lista.appendChild(li); };

    if (m.clave === 'polinomico') {
      const xs = d.pares.map(p => p.x), ys = d.pares.map(p => p.y);
      const S = k => xs.reduce((s, x) => s + x ** k, 0);
      const SY = k => xs.reduce((s, x, i) => s + x ** k * ys[i], 0);
      const n = xs.length;
      const [a, b, c] = resolver3([[n, S(1), S(2)], [S(1), S(2), S(3)], [S(2), S(3), S(4)]], [SY(0), SY(1), SY(2)]);
      paso(`Sumatorias con n = ${n}:`);
      panel.append(h, lista, tablaSumas([
        ['Σx', num(S(1))], ['Σx²', num(S(2))], ['Σx³', num(S(3))], ['Σx⁴', num(S(4))],
        ['Σy', num(SY(0))], ['Σxy', num(SY(1))], ['Σx²y', num(SY(2))]
      ]));
      const lista2 = document.createElement('ol');
      lista2.className = 'pasos';
      lista2.start = 2;
      [`Se plantean las tres ecuaciones normales con esas sumatorias y se resuelven (eliminación de Gauss).`,
        `<code>a = ${num(a)}</code>, <code>b = ${num(b)}</code>, <code>c = ${num(c)}</code>`,
        `Ecuación: <code>${ecuacionAjustada(m)}</code>. Como c &lt; 0, la curva se aplana en los campos grandes.`]
        .forEach(t => { const li = document.createElement('li'); li.innerHTML = t; lista2.appendChild(li); });
      panel.appendChild(lista2);
      return;
    }

    const lin = LINEALIZACION[m.clave];
    const s = sumasLineales(d, lin);
    paso(`Se transforma cada par: X = <code>${lin.nX}</code>, Y = <code>${lin.nY}</code>.`);
    paso(`Sumatorias con n = ${s.n}:`);
    panel.append(h, lista, tablaSumas([
      ['ΣX', num(s.sX)], ['ΣY', num(s.sY)], ['ΣXY', num(s.sXY)], ['ΣX²', num(s.sX2)], ['ΣY²', num(s.sY2)]
    ]));
    const lista2 = document.createElement('ol');
    lista2.className = 'pasos';
    lista2.start = 3;
    [`<code>b = (${s.n}·${num(s.sXY)} − ${num(s.sX)}·${num(s.sY)}) / (${s.n}·${num(s.sX2)} − ${num(s.sX)}²) = ${num(s.b)}</code>`,
      `<code>A = ${num(s.sY / s.n)} − ${num(s.b)}·${num(s.sX / s.n)} = ${num(s.A)}</code>; <code>${lin.textoA} = ${num(lin.a(s.A))}</code>`,
      `Ecuación: <code>${ecuacionAjustada(m)}</code>`]
      .forEach(t => { const li = document.createElement('li'); li.innerHTML = t; lista2.appendChild(li); });
    panel.appendChild(lista2);
  }

  // e) Parámetros
  function renderParametros(d) {
    const tbody = document.getElementById('cuerpo-parametros');
    d.modelos.forEach(m => filaTabla(tbody, [
      [m.clave === d.elegido ? `${m.modelo} (elegido)` : m.modelo, false, true],
      [ecuacionAjustada(m), false],
      [num(m.parametros.a), true], [num(m.parametros.b), true],
      [m.parametros.c === undefined ? '—' : num(m.parametros.c), true],
      [m.formula_parametros, false]
    ]));

    const pestanas = document.getElementById('pestanas-parametros');
    const botones = d.modelos.map(m => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'segmento';
      b.setAttribute('role', 'tab');
      b.dataset.modelo = m.clave;
      b.textContent = m.modelo.replace(' (grado 2)', '');
      b.addEventListener('click', () => seleccionar(m.clave));
      pestanas.appendChild(b);
      return b;
    });
    function seleccionar(clave) {
      botones.forEach(b => b.setAttribute('aria-selected', String(b.dataset.modelo === clave)));
      panelModelo(d, d.modelos.find(m => m.clave === clave));
    }
    seleccionar(d.elegido);
    // Las tarjetas de la galería abren el cálculo del modelo correspondiente.
    document.querySelectorAll('.modelo-enlace[data-ver]').forEach(a => a.addEventListener('click', () => seleccionar(a.dataset.ver)));
  }

  function lecturaR(r) {
    const a = Math.abs(r);
    const fuerza = a >= 0.7 ? 'fuerte' : a >= 0.3 ? 'moderada' : 'débil';
    return `${fuerza} y ${r >= 0 ? 'positiva' : 'negativa'}`;
  }

  // f) Indicadores
  function renderIndicadores(d) {
    const tbody = document.getElementById('cuerpo-indicadores-reg');
    d.modelos.forEach(m => {
      const tr = filaTabla(tbody, [
        [m.modelo, false, true], [fmt.cuatro.format(m.r), true], [fmt.cuatro.format(m.r2), true],
        [fmt.cuatro.format(m.no_determinacion), true], [lecturaR(m.r), false],
        [m.r2_original < 0 ? '< 0' : fmt.cuatro.format(m.r2_original), true]
      ]);
      if (m.clave === d.elegido) tr.classList.add('fila-total');
    });
    const elegido = d.modelos.find(m => m.clave === d.elegido);
    const lineal = d.modelos.find(m => m.clave === 'lineal');
    texto('nota-indicadores-reg', `El modelo potencial tiene el mayor r (${fmt.cuatro.format(elegido.r)}): el número de pozos explica el ${fmt.pct.format(elegido.r2)} de la variación del ln del óleo y el ${fmt.pct.format(elegido.no_determinacion)} restante depende de otros factores (yacimiento, madurez, operador). `
      + `Con b = ${num(elegido.parametros.b)} ≈ 1, el óleo crece casi en proporción a los pozos: unos ${num(elegido.parametros.a)} bbl/día por pozo. `
      + `En escala original, el lineal (R² = ${fmt.cuatro.format(lineal.r2_original)}) y el polinómico ajustan mejor los volúmenes de los campos más grandes, mientras que el potencial los sobreestima (ver Restricciones).`);
    const orden = [...d.modelos].sort((a, b) => a.r2 - b.r2);
    return () => Plotly.react('grafica-indicadores', [
      { type: 'bar', orientation: 'h', name: 'R² determinación', y: orden.map(m => m.modelo), x: orden.map(m => m.r2),
        marker: { color: orden.map(m => COLORES[m.clave]) }, text: orden.map(m => fmt.pct.format(m.r2)), textposition: 'inside',
        hovertemplate: '%{y}: R² = %{x:.4f}<extra></extra>' },
      { type: 'bar', orientation: 'h', name: '1 − R² no determinación', y: orden.map(m => m.modelo), x: orden.map(m => m.no_determinacion),
        marker: { color: 'rgba(216, 210, 197, 0.9)' }, hovertemplate: '%{y}: 1 − R² = %{x:.4f}<extra></extra>' }
    ], layout({ barmode: 'stack', height: 340, margin: { t: 10, r: 20, b: 60, l: 150 },
      xaxis: { range: [0, 1], tickformat: '.0%', gridcolor: 'rgba(11,34,30,0.08)' }, yaxis: { automargin: true } }),
    { responsive: true, displaylogo: false });
  }

  // h) Plano 3D
  function renderTresD(d) {
    const mm = d.multiple;
    const [b0, b1, b2] = mm.coeficientes.map(c => c.valor);
    const visibles = d.pares.filter(p => p.x <= 300 && p.x2 <= 600);
    const malla1 = Array.from({ length: 16 }, (_, i) => (i * 300) / 15);
    const malla2 = Array.from({ length: 16 }, (_, i) => (i * 600) / 15);
    const z = malla2.map(g => malla1.map(p => b0 + b1 * p + b2 * g));
    return () => Plotly.react('grafica-3d', [
      { type: 'surface', x: malla1, y: malla2, z, opacity: 0.55, showscale: false, name: 'Plano ajustado',
        colorscale: [[0, '#E8DCC8'], [1, '#8C6D46']], hovertemplate: 'x₁ = %{x:.0f}<br>x₂ = %{y:.1f}<br>ŷ = %{z:,.0f}<extra>Plano</extra>' },
      { type: 'scatter3d', mode: 'markers', name: 'Campos', x: visibles.map(p => p.x), y: visibles.map(p => p.x2), z: visibles.map(p => p.y),
        text: visibles.map(p => p.campo), marker: { size: 3.5, color: visibles.map(p => (p.y >= p.y_multiple ? '#1F5C52' : '#B5523B')) },
        hovertemplate: '%{text}<br>x₁ = %{x} pozos<br>x₂ = %{y:.2f} Mm³/día<br>y = %{z:,.1f} bbl/día<extra></extra>' }
    ], layout({
      margin: { t: 10, r: 0, b: 0, l: 0 },
      showlegend: false,
      scene: {
        xaxis: { title: { text: 'x₁ pozos' } }, yaxis: { title: { text: 'x₂ gas (Mm³/día)' } }, zaxis: { title: { text: 'y óleo (bbl/día)' } },
        camera: { eye: { x: 1.6, y: -1.6, z: 0.9 } }
      }
    }), { responsive: true, displaylogo: false });
  }

  // i) Tripletas
  function renderTripletas(d) {
    const top = document.getElementById('cuerpo-tripletas-top');
    d.pares.slice(0, 10).forEach(p => filaTabla(top, [
      [p.campo, false, true], [fmt.entero.format(p.x), true], [num(p.x2), true],
      [fmt.dos.format(p.y), true], [fmt.dos.format(p.y_multiple), true], [fmt.dos.format(p.y - p.y_multiple), true]
    ]));
    const todo = document.getElementById('cuerpo-tripletas');
    d.pares.forEach((p, i) => filaTabla(todo, [
      [String(i + 1), true], [p.campo, false, true], [fmt.entero.format(p.x), true], [num(p.x2), true],
      [fmt.dos.format(p.y), true], [fmt.dos.format(p.y_multiple), true]
    ]));
    const sx2 = d.pares.reduce((s, p) => s + p.x2, 0);
    texto('preview-tripletas', `Σx₂ = ${fmt.dos.format(sx2)} Mm³/día · ŷ: valor del plano ajustado`);
  }

  // j) Regresión múltiple
  function renderMultiple(d) {
    const mm = d.multiple;
    const [b0, b1, b2] = mm.coeficientes.map(c => c.valor);
    const P = d.pares;
    const S = f => P.reduce((s, p) => s + f(p), 0);
    const sumas = document.getElementById('cuerpo-sumas-multiple');
    [['n', fmt.entero.format(P.length)], ['Σx₁', num(S(p => p.x))], ['Σx₂', num(S(p => p.x2))], ['Σy', num(S(p => p.y))],
      ['Σx₁²', num(S(p => p.x ** 2))], ['Σx₂²', num(S(p => p.x2 ** 2))], ['Σx₁x₂', num(S(p => p.x * p.x2))],
      ['Σx₁y', num(S(p => p.x * p.y))], ['Σx₂y', num(S(p => p.x2 * p.y))]]
      .forEach(([e, v]) => filaTabla(sumas, [[e, false, true], [v, true]]));

    texto('mm-R', fmt.cuatro.format(mm.R));
    texto('mm-r2', fmt.cuatro.format(mm.r2));
    texto('mm-k2', fmt.cuatro.format(mm.no_determinacion));
    texto('mm-r2a', fmt.cuatro.format(mm.r2_ajustado));
    texto('mm-gl', String(mm.gl[1]));
    texto('mm-ecuacion', `ŷ = ${num(b0)} + ${num(b1)}·x₁ + ${num(b2)}·x₂`);
    texto('mm-F', fmt.dos.format(mm.F));
    texto('mm-pF', pValor(mm.p_valor_F));
    texto('mm-se', fmt.dos.format(mm.error_estandar));
    texto('mm-lectura', `Con el gas fijo, cada pozo adicional se asocia con ${num(b1)} bbl/día más de óleo; con los pozos fijos, cada Mm³/día de gas se asocia con ${num(b2)} bbl/día más.`);

    const interpretaciones = [
      'Óleo estimado de un campo sin pozos ni gas (solo ancla el plano)',
      'Óleo extra por cada pozo, con el gas constante',
      'Óleo extra por cada Mm³/día de gas, con los pozos constantes'
    ];
    const cuerpo = document.getElementById('cuerpo-coeficientes');
    mm.coeficientes.forEach((c, i) => filaTabla(cuerpo, [
      [c.simbolo, false, true], [c.termino, false], [num(c.valor), true], [num(c.error_estandar), true],
      [fmt.dos.format(c.t), true], [pValor(c.p_valor), true], [interpretaciones[i], false]
    ]));

    const extremo = mm.residuos_extremos[0];
    texto('nota-multiple', `Al añadir x₂ la determinación sube de ${fmt.pct.format(mm.r2_solo_x1)} (solo pozos, lineal) a ${fmt.pct.format(mm.r2)}; el R² ajustado (${fmt.pct.format(mm.r2_ajustado)}) confirma que la mejora no se debe a sumar una variable más. `
      + `Los dos coeficientes son significativos (p < 0,0001) y x₁ y x₂ no están correlacionadas (r = ${fmt.cuatro.format(mm.r_x1_x2)}; VIF = ${fmt.dos.format(mm.vif)}), así que no hay multicolinealidad. `
      + `Restricciones: el plano admite valores solo dentro de los rangos observados (1–950 pozos; 0–6.131 Mm³/día) y subestima campos como ${extremo.campo} (y = ${fmt.dos.format(extremo.y)} frente a ŷ = ${fmt.dos.format(extremo.y_estimado)}), con mucho óleo y poco gas.`);

    const x1 = document.getElementById('calc-x1');
    const x2 = document.getElementById('calc-x2');
    const salida = document.getElementById('calc-resultado');
    const calcular = () => {
      const v1 = Number(x1.value), v2 = Number(x2.value);
      if (!(v1 >= 1) || !(v2 >= 0)) { salida.textContent = 'Introduce x₁ ≥ 1 y x₂ ≥ 0.'; return; }
      const fuera = v1 > d.resumen.x.max || v2 > d.resumen.x2.max ? ' · fuera del rango observado (extrapolación)' : '';
      salida.textContent = `ŷ = ${fmt.dos.format(b0 + b1 * v1 + b2 * v2)} bbl/día${fuera}`;
    };
    x1.addEventListener('input', calcular);
    x2.addEventListener('input', calcular);
    calcular();
  }

  const SECCIONES = ['pares', 'dispersion', 'conjetura', 'parametros', 'indicadores-reg', 'multiple-3d', 'tripletas', 'multiple'];

  async function cargar() {
    try {
      const d = await leerJSON('data/regresion.json');
      document.querySelectorAll('.reg-n').forEach(el => { el.textContent = fmt.entero.format(d.n); });
      texto('reg-n', fmt.entero.format(d.n));
      texto('campos-sin-oleo', fmt.entero.format(d.campos_sin_oleo));
      renderPares(d);
      renderParametros(d);
      renderTripletas(d);
      renderMultiple(d);
      const dibujos = [renderDispersion(d), renderConjetura(d), renderIndicadores(d), renderTresD(d)];
      SECCIONES.forEach(mostrar);
      if (!window.Plotly || typeof window.Plotly.react !== 'function') {
        throw new Error('No se descargó Plotly desde cdn.plot.ly. Comprueba la conexión a Internet.');
      }
      // Se dibuja con los contenedores visibles para que Plotly mida su ancho real.
      await Promise.all(dibujos.map(f => f()));
    } catch (error) {
      SECCIONES.forEach((id, i) => {
        mostrarError(`estado-${id}`, i === 0
          ? `No se pudo cargar la regresión. ${error.message} Genera data/regresion.json con scripts/3_regresion.py.`
          : 'No se pudo calcular esta sección.', error);
      });
    }
  }

  cargar();
})();
