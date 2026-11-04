// Índice de la regresión clásica (regresion.html): pares, dispersión, conjetura y comparación de modelos.
(function () {
  const R = window.Regresion;
  const { fmt, num, cuatro, pValor, COLORES } = R;

  function renderPares(d) {
    const top = document.getElementById('cuerpo-pares-top');
    d.pares.slice(0, 10).forEach((p, i) => R.filaTabla(top, [
      [String(i + 1), true], [p.campo, false, true], [p.estado, false],
      [fmt.entero.format(p.x), true], [fmt.dos.format(p.y), true], [fmt.dos.format(p.y / p.x), true]
    ]));

    const filas = d.pares.map((p, i) => ({ ...p, i: i + 1 }));
    const cuerpo = document.getElementById('cuerpo-pares');
    const pintar = lista => {
      cuerpo.replaceChildren();
      lista.forEach(p => R.filaTabla(cuerpo, [
        [String(p.i), true], [p.campo, false, true], [p.estado, false],
        [fmt.entero.format(p.x), true], [fmt.dos.format(p.y), true]
      ]));
    };
    pintar(filas);
    let ultima = null;
    document.querySelectorAll('#tabla-pares-completa th button').forEach(boton => {
      boton.addEventListener('click', () => {
        const clave = boton.dataset.orden;
        const asc = ultima !== clave;
        ultima = asc ? clave : null;
        pintar([...filas].sort((a, b) => {
          const r = typeof a[clave] === 'string' ? a[clave].localeCompare(b[clave], 'es') : a[clave] - b[clave];
          return asc ? r : -r;
        }));
      });
    });
    const sx = d.pares.reduce((s, p) => s + p.x, 0);
    const sy = d.pares.reduce((s, p) => s + p.y, 0);
    R.texto('preview-pares', `Σx = ${fmt.entero.format(sx)} pozos · Σy = ${fmt.dos.format(sy)} bbl/día`);
  }

  function renderDispersion(d) {
    const dibujar = tipo => Plotly.react('grafica-dispersion', [R.trazaPuntos(d)],
      R.layout({ xaxis: R.ejeX(tipo), yaxis: R.ejeY(tipo), showlegend: false }), R.config);
    R.segmentado('#dispersion .segmento', v => dibujar(v));
    return () => dibujar('linear');
  }

  function renderConjetura(d) {
    const visibles = new Set(Object.keys(COLORES));
    const curva = m => {
      const xs = [], ys = [];
      d.curvas.x.forEach((x, i) => {
        const y = d.curvas[m.clave][i];
        // En escala log solo se pueden mostrar valores positivos y acotados.
        if (y !== null && y > 0 && y < 1e5) { xs.push(x); ys.push(y); }
      });
      return {
        type: 'scatter', mode: 'lines', name: m.modelo, x: xs, y: ys, visible: visibles.has(m.clave),
        line: { color: COLORES[m.clave], width: m.clave === d.elegido ? 4 : 2, dash: m.clave === d.elegido ? 'solid' : 'dot' },
        hovertemplate: `${m.modelo}<br>x = %{x:.0f}<br>ŷ = %{y:,.1f}<extra></extra>`
      };
    };
    const dibujar = () => Plotly.react('grafica-modelos', [R.trazaPuntos(d), ...d.modelos.map(curva)],
      R.layout({ xaxis: R.ejeX('log'), yaxis: { ...R.ejeY('log'), range: [Math.log10(0.3), Math.log10(30000)] } }), R.config);
    const selector = document.getElementById('selector-modelos');
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

  function veredicto(m, d) {
    if (m.clave === d.elegido) return 'Elegido';
    if (!m.comparacion.predicciones_positivas) return 'Descartado: predice óleo negativo';
    if (m.n_cook_mayor_1 > 0) return `Descartado: depende de ${m.n_cook_mayor_1} campo${m.n_cook_mayor_1 > 1 ? 's' : ''}`;
    return 'Descartado: ajuste débil';
  }

  function renderComparacion(d) {
    const tbody = document.getElementById('cuerpo-comparacion');
    d.modelos.forEach(m => {
      const c = m.comparacion;
      const tr = R.filaTabla(tbody, [
        [m.modelo, false, true],
        [cuatro(m.r), true], [cuatro(m.r2), true], [cuatro(m.no_determinacion), true], [pValor(m.p_r), true],
        [c.r2_log === null ? 'No aplica (ŷ < 0)' : cuatro(c.r2_log), true],
        [fmt.pct.format(c.error_mediano_relativo), true],
        [String(m.n_cook_mayor_1), true],
        [veredicto(m, d), false]
      ]);
      if (m.clave === d.elegido) tr.classList.add('fila-total');
      const enlace = document.createElement('a');
      enlace.href = R.PAGINAS[m.clave];
      enlace.textContent = 'Ver';
      enlace.className = 'enlace-tabla';
      const td = document.createElement('td');
      td.appendChild(enlace);
      tr.appendChild(td);
    });

    const orden = [...d.modelos].sort((a, b) => a.r2 - b.r2);
    return () => Plotly.react('grafica-indicadores', [
      { type: 'bar', orientation: 'h', name: 'R² determinación', y: orden.map(m => m.modelo), x: orden.map(m => m.r2),
        marker: { color: orden.map(m => COLORES[m.clave]) }, text: orden.map(m => fmt.pct.format(m.r2)), textposition: 'inside',
        hovertemplate: '%{y}: R² = %{x:.4f}<extra></extra>' },
      { type: 'bar', orientation: 'h', name: '1 − R² no determinación', y: orden.map(m => m.modelo), x: orden.map(m => m.no_determinacion),
        marker: { color: 'rgba(216, 210, 197, 0.9)' }, hovertemplate: '%{y}: 1 − R² = %{x:.4f}<extra></extra>' }
    ], R.layout({ barmode: 'stack', height: 340, margin: { t: 10, r: 20, b: 60, l: 150 },
      xaxis: { range: [0, 1], tickformat: '.0%', gridcolor: 'rgba(11,34,30,0.08)' }, yaxis: { automargin: true } }), R.config);
  }

  R.cargar(['pares', 'dispersion', 'conjetura', 'comparacion'], d => {
    R.texto('campos-sin-oleo', fmt.entero.format(d.campos_sin_oleo));
    renderPares(d);
    return [renderDispersion(d), renderConjetura(d), renderComparacion(d)];
  });
})();
