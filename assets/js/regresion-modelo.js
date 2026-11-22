// Página de un modelo simple (regresion-<modelo>.html): el modelo sale de <body data-modelo="…">.
(function () {
  const R = window.Regresion;
  const { fmt, num, cuatro, pValor, COLORES } = R;
  const clave = document.body.dataset.modelo;
  const menosT = v => (v < 0 ? `−${fmt.dos.format(-v)}` : fmt.dos.format(v));

  // Forma linealizada: X = g(x), Y = h(y).
  const LINEALIZACION = {
    lineal: { X: x => x, Y: y => y, nX: 'x', nY: 'y', a: A => A, textoA: 'a = A' },
    potencial: { X: Math.log, Y: Math.log, nX: 'ln x', nY: 'ln y', a: A => Math.exp(A), textoA: 'a = e^A' },
    exponencial: { X: x => x, Y: Math.log, nX: 'x', nY: 'ln y', a: A => Math.exp(A), textoA: 'a = e^A' },
    logaritmico: { X: Math.log, Y: y => y, nX: 'ln x', nY: 'y', a: A => A, textoA: 'a = A' }
  };

  function lista(id, pasos, inicio = 1) {
    const ol = document.getElementById(id);
    ol.start = inicio;
    pasos.forEach(html => {
      const li = document.createElement('li');
      li.innerHTML = html;
      ol.appendChild(li);
    });
  }

  function sumas(filas) {
    const tbody = document.getElementById('cuerpo-sumas');
    filas.forEach(([e, v]) => R.filaTabla(tbody, [[e, false, true], [v, true]]));
  }

  // Sistema 3 × 3 por eliminación de Gauss con pivoteo parcial.
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

  function renderCalculo(d, m) {
    const n = d.pares.length;
    if (clave === 'polinomico') {
      const xs = d.pares.map(p => p.x), ys = d.pares.map(p => p.y);
      const S = k => xs.reduce((s, x) => s + x ** k, 0);
      const SY = k => xs.reduce((s, x, i) => s + x ** k * ys[i], 0);
      sumas([['n', String(n)], ['Σx', num(S(1))], ['Σx²', num(S(2))], ['Σx³', num(S(3))], ['Σx⁴', num(S(4))],
        ['Σy', num(SY(0))], ['Σxy', num(SY(1))], ['Σx²y', num(SY(2))]]);
      const [a, b, c] = resolver3([[n, S(1), S(2)], [S(1), S(2), S(3)], [S(2), S(3), S(4)]], [SY(0), SY(1), SY(2)]);
      lista('pasos-calculo', [
        'Se calculan las sumatorias de la tabla con los 165 pares (x, y).',
        `Se sustituyen en las ecuaciones normales:<br><code>${num(SY(0))} = ${n}a + ${num(S(1))}b + ${num(S(2))}c</code><br><code>${num(SY(1))} = ${num(S(1))}a + ${num(S(2))}b + ${num(S(3))}c</code><br><code>${num(SY(2))} = ${num(S(2))}a + ${num(S(3))}b + ${num(S(4))}c</code>`,
        `Se resuelve el sistema (eliminación de Gauss): <code>a = ${num(a)}</code>, <code>b = ${num(b)}</code>, <code>c = ${num(c)}</code>.`,
        `Ecuación ajustada: <code>${R.ecuacionAjustada(m)}</code>`
      ]);
      return;
    }
    const lin = LINEALIZACION[clave];
    const X = d.pares.map(p => lin.X(p.x));
    const Y = d.pares.map(p => lin.Y(p.y));
    const s = { sX: 0, sY: 0, sXY: 0, sX2: 0, sY2: 0 };
    X.forEach((x, i) => { s.sX += x; s.sY += Y[i]; s.sXY += x * Y[i]; s.sX2 += x * x; s.sY2 += Y[i] * Y[i]; });
    const b = (n * s.sXY - s.sX * s.sY) / (n * s.sX2 - s.sX ** 2);
    const A = s.sY / n - b * s.sX / n;
    sumas([['n', String(n)], [`ΣX = Σ${lin.nX}`, num(s.sX)], [`ΣY = Σ${lin.nY}`, num(s.sY)], ['ΣXY', num(s.sXY)],
      ['ΣX²', num(s.sX2)], ['ΣY²', num(s.sY2)]]);
    lista('pasos-calculo', [
      lin.nX === 'x' && lin.nY === 'y'
        ? 'No hace falta transformar: X = x, Y = y.'
        : `Se transforma cada par: <code>X = ${lin.nX}</code>, <code>Y = ${lin.nY}</code>.`,
      'Se calculan las sumatorias de la tabla.',
      `<code>b = (${n}·${num(s.sXY)} − ${num(s.sX)}·${num(s.sY)}) / (${n}·${num(s.sX2)} − ${num(s.sX)}²) = ${num(b)}</code>`,
      `<code>A = Ȳ − b·X̄ = ${num(s.sY / n)} − ${num(b)}·${num(s.sX / n)} = ${num(A)}</code>; <code>${lin.textoA} = ${num(lin.a(A))}</code>`,
      `Ecuación ajustada: <code>${R.ecuacionAjustada(m)}</code>`
    ]);
  }

  function renderAjuste(d, m) {
    const curva = () => {
      const xs = [], ys = [];
      d.curvas.x.forEach((x, i) => {
        const y = d.curvas[clave][i];
        if (y !== null && Math.abs(y) < 1e5) { xs.push(x); ys.push(y); }
      });
      return { xs, ys };
    };
    const { xs, ys } = curva();
    const dibujar = tipo => {
      // En escala log no se pueden dibujar valores ≤ 0 (logarítmico con x ≤ 2).
      const filtro = tipo === 'log' ? ys.map(v => v > 0) : ys.map(() => true);
      Plotly.react('grafica-ajuste', [
        R.trazaPuntos(d),
        { type: 'scatter', mode: 'lines', name: R.ecuacionAjustada(m), x: xs.filter((_, i) => filtro[i]), y: ys.filter((_, i) => filtro[i]),
          line: { color: COLORES[clave], width: 3 }, hovertemplate: 'x = %{x:.0f}<br>ŷ = %{y:,.1f}<extra></extra>' }
      ], R.layout({ xaxis: R.ejeX(tipo), yaxis: tipo === 'log' ? { ...R.ejeY('log'), range: [Math.log10(0.3), Math.log10(30000)] } : R.ejeY(tipo) }), R.config);
    };
    R.segmentado('#ajuste .segmento', v => dibujar(v));
    return () => dibujar(clave === 'lineal' || clave === 'polinomico' ? 'linear' : 'log');
  }

  function renderIndicadores(d, m) {
    R.texto('ind-r', cuatro(m.r));
    R.texto('ind-r2', cuatro(m.r2));
    R.texto('ind-k2', cuatro(m.no_determinacion));
    R.texto('ind-s', num(m.error_estandar_lineal));
    R.texto('ind-gl', String(m.gl));
    R.texto('ind-tc', fmt.cuatro.format(m.t_critico));
    const tbody = document.getElementById('cuerpo-coeficientes');
    const nombres = { A: m.escala_ajuste.Y === 'ln y' ? 'A = ln a (ordenada)' : 'a (ordenada)', b: 'b', c: 'c (término x²)' };
    m.coeficientes.forEach(c => {
      const ic = [c.valor - m.t_critico * c.error_estandar, c.valor + m.t_critico * c.error_estandar];
      R.filaTabla(tbody, [
        [nombres[c.simbolo], false, true], [num(c.valor), true], [num(c.error_estandar), true],
        [menosT(c.t), true], [pValor(c.p_valor), true], [`[${num(ic[0])}; ${num(ic[1])}]`, true],
        [c.p_valor < 0.05 ? 'Significativo' : 'No significativo', false]
      ]);
    });
    if (m.prueba_global) {
      R.texto('prueba-r', `Prueba F global (H₀: b = c = 0): F = ${fmt.dos.format(m.prueba_global.F)} con ${m.prueba_global.gl[0]} y ${m.prueba_global.gl[1]} gl; p ${pValor(m.p_r)}. `
        + 'El modelo en conjunto es significativo, pero el término c·x² por sí solo no lo es (ver la tabla).');
      return;
    }
    R.texto('prueba-r', `t = r·√(n − 2) / √(1 − r²) = ${fmt.dos.format(m.t_r)} con ${d.n - 2} gl; p ${pValor(m.p_r).startsWith('<') ? '' : '= '}${pValor(m.p_r)}. `
      + `Correlación ${R.lecturaR(m.r)}: ${m.p_r < 0.05 ? 'se rechaza H₀: ρ = 0, la relación es significativa.' : 'no se rechaza H₀: ρ = 0.'}`);
  }


  function renderDiagnostico(d, m) {
    const tbody = document.getElementById('cuerpo-influyentes');
    m.influyentes.forEach(i => R.filaTabla(tbody, [
      [i.campo, false, true], [fmt.entero.format(i.x), true], [fmt.dos.format(i.y), true],
      [fmt.tres.format(i.palanca), true], [fmt.tres.format(i.cook), true],
      [i.cook > 1 ? 'Muy influyente (D > 1)' : i.cook > 4 / d.n ? 'Influyente (D > 4/n)' : 'Normal', false]
    ]));
    const s = m.sensibilidad;
    R.texto('nota-sensibilidad', s.excluidos
      ? `Sin los ${s.excluidos} campo${s.excluidos > 1 ? 's' : ''} con D > 1, R² pasa de ${cuatro(m.r2)} a ${cuatro(s.r2)}: el ajuste depende de muy pocos puntos.`
      : `Ningún campo tiene D > 1: el ajuste no depende de unos pocos puntos. ${m.n_influyentes_4n} campos superan 4/n, un umbral solo de revisión.`);
    R.texto('nota-normalidad', `Prueba de Shapiro-Wilk sobre los residuos: p ${pValor(m.normalidad_residuos_p).startsWith('<') ? '' : '= '}${pValor(m.normalidad_residuos_p)}. `
      + (m.normalidad_residuos_p < 0.01 ? 'Los residuos están lejos de la normalidad, así que las pruebas t y los intervalos son poco fiables.'
        : 'Los residuos son aproximadamente normales; las pruebas t son razonables.'));

    const escalaY = m.escala_ajuste.Y;
    return () => Plotly.react('grafica-residuos', [
      { type: 'scatter', mode: 'markers', x: d.pares.map(p => p.x), y: d.pares.map(p => p.residuos[clave]),
        text: d.pares.map(p => p.campo), marker: { color: COLORES[clave], size: 7, opacity: 0.7 },
        hovertemplate: '%{text}<br>x = %{x}<br>e = %{y:,.3f}<extra></extra>' },
      { type: 'scatter', mode: 'lines', x: [d.resumen.x.min, d.resumen.x.max], y: [0, 0], line: { color: '#2C3531', dash: 'dash', width: 1 }, hoverinfo: 'skip' }
    ], R.layout({ showlegend: false, xaxis: R.ejeX('log'), yaxis: R.eje(`Residuo e = ${escalaY} − ŷ (${escalaY === 'ln y' ? 'escala ln' : 'bbl/día'})`) }), R.config);
  }

  function renderPrediccion(d, m) {
    const entrada = document.getElementById('calc-x');
    const salida = document.getElementById('calc-resultado');
    const calcular = () => {
      const x = Number(entrada.value);
      if (!(x >= 1)) { salida.textContent = 'Introduce x ≥ 1 pozo.'; return; }
      const y = R.predecir(m, x);
      const fuera = x > d.resumen.x.max ? ' · fuera del rango observado (extrapolación)' : '';
      const nota = y < 0 ? ' · valor imposible: el óleo no puede ser negativo' : '';
      const mediana = m.factor_smearing ? ` (mediana; media ≈ ${fmt.dos.format(y * m.factor_smearing)})` : '';
      salida.textContent = `ŷ = ${num(y)} bbl/día${mediana}${fuera}${nota}`;
    };
    entrada.addEventListener('input', calcular);
    calcular();
  }

  R.cargar(['calculo', 'ajuste', 'indicadores', 'diagnostico', 'prediccion'], d => {
    const m = d.modelos.find(x => x.clave === clave);
    renderCalculo(d, m);
    renderIndicadores(d, m);
    renderPrediccion(d, m);
    return [renderAjuste(d, m), renderDiagnostico(d, m)];
  });
})();
