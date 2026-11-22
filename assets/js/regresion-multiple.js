// Regresión múltiple (regresion-multiple.html): y = f(x₁, x₂) en escala lineal y logarítmica.
(function () {
  const R = window.Regresion;
  const { fmt, num, cuatro, pValor } = R;

  function renderTripletas(d) {
    const top = document.getElementById('cuerpo-tripletas-top');
    d.pares.slice(0, 10).forEach(p => R.filaTabla(top, [
      [p.campo, false, true], [fmt.entero.format(p.x), true], [num(p.x2), true], [fmt.dos.format(p.y), true],
      [fmt.dos.format(p.y_multiple_log), true], [fmt.dos.format(p.y_multiple), true]
    ]));
    const todo = document.getElementById('cuerpo-tripletas');
    d.pares.forEach((p, i) => R.filaTabla(todo, [
      [String(i + 1), true], [p.campo, false, true], [fmt.entero.format(p.x), true], [num(p.x2), true],
      [num(Math.log(p.x)), true], [num(Math.log(p.x2)), true], [fmt.dos.format(p.y), true], [num(Math.log(p.y)), true]
    ]));
  }

  // Sumatorias de las ecuaciones normales para y = b₀ + b₁·u + b₂·v.
  function renderSumas(d, id, u, v, w) {
    const P = d.pares;
    const S = f => P.reduce((s, p) => s + f(p), 0);
    const tbody = document.getElementById(id);
    [['n', fmt.entero.format(P.length)], ['Σx₁', S(u)], ['Σx₂', S(v)], ['Σy', S(w)], ['Σx₁²', S(p => u(p) ** 2)],
      ['Σx₂²', S(p => v(p) ** 2)], ['Σx₁x₂', S(p => u(p) * v(p))], ['Σx₁y', S(p => u(p) * w(p))], ['Σx₂y', S(p => v(p) * w(p))]]
      .forEach(([e, valor]) => R.filaTabla(tbody, [[e, false, true], [typeof valor === 'string' ? valor : num(valor), true]]));
  }

  function renderModelo(prefijo, mm, interpretaciones, n) {
    R.texto(`${prefijo}-R`, cuatro(mm.R));
    R.texto(`${prefijo}-r2`, cuatro(mm.r2));
    R.texto(`${prefijo}-k2`, cuatro(mm.no_determinacion));
    R.texto(`${prefijo}-r2a`, cuatro(mm.r2_ajustado));
    R.texto(`${prefijo}-F`, `F = ${fmt.dos.format(mm.F)} (gl ${mm.gl[0]} y ${mm.gl[1]}), p ${pValor(mm.p_valor_F)}`);
    const cuerpo = document.getElementById(`cuerpo-${prefijo}`);
    mm.coeficientes.forEach((c, i) => R.filaTabla(cuerpo, [
      [c.simbolo, false, true], [c.termino, false], [num(c.valor), true], [num(c.error_estandar), true],
      [fmt.dos.format(c.t), true], [pValor(c.p_valor), true], [interpretaciones[i], false]
    ]));
    const infl = document.getElementById(`influyentes-${prefijo}`);
    mm.influyentes.slice(0, 4).forEach(i => R.filaTabla(infl, [
      [i.campo, false, true], [fmt.entero.format(i.x), true], [num(i.x2), true], [fmt.dos.format(i.y), true],
      [fmt.tres.format(i.cook), true],
      [i.cook > 1 ? 'Muy influyente (D > 1)' : i.cook > 4 / n ? 'Influyente (D > 4/n)' : 'Normal', false]
    ]));
  }

  function render3D(d) {
    const lin = d.multiple.lineal.coeficientes.map(c => c.valor);
    const lg = d.multiple.logaritmica.coeficientes.map(c => c.valor);
    const P = d.pares;
    const rango = (min, max, n) => Array.from({ length: n }, (_, i) => min * (max / min) ** (i / (n - 1)));
    const m1 = rango(d.resumen.x.min, d.resumen.x.max, 20);
    const m2 = rango(d.resumen.x2.min, d.resumen.x2.max, 20);
    const dibujar = escala => {
      const log = escala === 'log';
      // El plano lineal se evalúa en valores originales; en ejes log se ve curvo, por eso cada modelo
      // se muestra en la escala en que es un plano.
      const z = log
        ? m2.map(g => m1.map(p => lg[0] + lg[1] * Math.log(p) + lg[2] * Math.log(g)))
        : m2.map(g => m1.map(p => lin[0] + lin[1] * p + lin[2] * g));
      const ejes = log
        ? { x: m1.map(Math.log), y: m2.map(Math.log), px: P.map(p => Math.log(p.x)), py: P.map(p => Math.log(p.x2)), pz: P.map(p => Math.log(p.y)) }
        : { x: m1, y: m2, px: P.map(p => p.x), py: P.map(p => p.x2), pz: P.map(p => p.y) };
      const ajustado = log ? P.map(p => p.y_multiple_log) : P.map(p => p.y_multiple);
      Plotly.react('grafica-3d', [
        { type: 'surface', x: ejes.x, y: ejes.y, z, opacity: 0.55, showscale: false,
          colorscale: [[0, '#E8DCC8'], [1, '#8C6D46']], hoverinfo: 'skip' },
        { type: 'scatter3d', mode: 'markers', x: ejes.px, y: ejes.py, z: ejes.pz, text: P.map(p => p.campo),
          marker: { size: 3.5, color: P.map((p, i) => (p.y >= ajustado[i] ? '#1F5C52' : '#B5523B')) },
          customdata: P.map(p => [p.x, p.x2, p.y]),
          hovertemplate: '%{text}<br>x₁ = %{customdata[0]} pozos<br>x₂ = %{customdata[1]:.3f} Mm³/día<br>y = %{customdata[2]:,.1f} bbl/día<extra></extra>' }
      ], R.layout({
        margin: { t: 10, r: 0, b: 0, l: 0 }, showlegend: false,
        scene: {
          xaxis: { title: { text: log ? 'ln x₁ (pozos)' : 'x₁ pozos' } },
          yaxis: { title: { text: log ? 'ln x₂ (gas)' : 'x₂ gas (Mm³/día)' } },
          zaxis: { title: { text: log ? 'ln y (óleo)' : 'y óleo (bbl/día)' } },
          camera: { eye: { x: 1.6, y: -1.6, z: 0.9 } }
        }
      }), R.config);
    };
    R.segmentado('#vista-3d .segmento', v => dibujar(v));
    return () => dibujar('log');
  }

  function renderCalculadora(d) {
    const lin = d.multiple.lineal.coeficientes.map(c => c.valor);
    const lg = d.multiple.logaritmica.coeficientes.map(c => c.valor);
    const x1 = document.getElementById('calc-x1');
    const x2 = document.getElementById('calc-x2');
    const salida = document.getElementById('calc-resultado');
    const calcular = () => {
      const v1 = Number(x1.value), v2 = Number(x2.value);
      if (!(v1 >= 1) || !(v2 > 0)) { salida.textContent = 'Introduce x₁ ≥ 1 y x₂ > 0.'; return; }
      const yLog = Math.exp(lg[0] + lg[1] * Math.log(v1) + lg[2] * Math.log(v2));
      const yLin = lin[0] + lin[1] * v1 + lin[2] * v2;
      const fuera = v1 > d.resumen.x.max || v2 > d.resumen.x2.max || v2 < d.resumen.x2.min ? ' · fuera del rango observado' : '';
      salida.textContent = `Log (recomendado): ŷ = ${fmt.dos.format(yLog)} bbl/día · Lineal: ŷ = ${fmt.dos.format(yLin)} bbl/día${fuera}`;
    };
    x1.addEventListener('input', calcular);
    x2.addEventListener('input', calcular);
    calcular();
  }

  R.cargar(['tripletas', 'parametros-mult', 'comparacion-mult', 'vista-3d'], d => {
    renderTripletas(d);
    renderSumas(d, 'sumas-lineal', p => p.x, p => p.x2, p => p.y);
    renderSumas(d, 'sumas-log', p => Math.log(p.x), p => Math.log(p.x2), p => Math.log(p.y));
    renderModelo('lin', d.multiple.lineal, [
      'Óleo de un campo sin pozos ni gas: solo ancla el plano',
      'bbl/día extra por cada pozo, con el gas constante',
      'bbl/día extra por cada Mm³/día de gas, con los pozos constantes'
    ], d.n);
    renderModelo('log', d.multiple.logaritmica, [
      `e^b₀ = ${num(Math.exp(d.multiple.logaritmica.coeficientes[0].valor))}: óleo de un campo con 1 pozo y 1 Mm³/día de gas`,
      'Elasticidad: +1 % de pozos → +b₁ % de óleo, con el gas constante',
      'Elasticidad: +1 % de gas → +b₂ % de óleo, con los pozos constantes'
    ], d.n);
    renderCalculadora(d);
    return [render3D(d)];
  });
})();
