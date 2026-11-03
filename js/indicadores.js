const formatosIndicadores = {
  decimal: new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }),
  cuatro: new Intl.NumberFormat('es-CO', { maximumSignificantDigits: 4 }),
  entero: new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }),
  porcentaje: new Intl.NumberFormat('es-CO', { style: 'percent', maximumFractionDigits: 1 })
};

// Valores pequeños (gas en Mm³/día) necesitan cifras significativas, no dos decimales.
function numeroIndicador(v) {
  if (v === null || v === undefined) return '—';
  return Math.abs(v) > 0 && Math.abs(v) < 1 ? formatosIndicadores.cuatro.format(v) : formatosIndicadores.decimal.format(v);
}

function claseModal(c) {
  if (!c) return '—';
  const intervalo = c.cero ? '{0}' : `[${numeroIndicador(c.li)}; ${numeroIndicador(c.ls)})`;
  return `${intervalo} · ${formatosIndicadores.entero.format(c.fi)} pozos`;
}

function atipicos(v) {
  return `${formatosIndicadores.entero.format(v.outliers)} (${formatosIndicadores.porcentaje.format(v.porcentaje_outliers)}) · ↓${v.outliers_bajo} ↑${v.outliers_alto}`;
}

const cv = v => (v.coeficiente_variacion === null ? 'No aplica (escala de intervalo)' : formatosIndicadores.porcentaje.format(v.coeficiente_variacion));

const DEFINICION_INDICADORES = [
  {
    titulo: 'Medidas de tendencia central',
    filas: [
      { etiqueta: 'Media aritmética', simbolo: 'x̄', formula: 'x̄ = (1/n) Σ xᵢ', valor: v => numeroIndicador(v.media) },
      { etiqueta: 'Mediana', simbolo: 'Me', formula: 'valor central de los datos ordenados', valor: v => numeroIndicador(v.mediana) },
      { etiqueta: 'Clase modal', simbolo: 'Mo', formula: 'clase de mayor fᵢ (clases de 4.1.4)', valor: v => claseModal(v.clase_modal) }
    ]
  },
  {
    titulo: 'Medidas de dispersión',
    filas: [
      { etiqueta: 'Mínimo', simbolo: 'mín', formula: 'menor valor observado', valor: v => numeroIndicador(v.minimo) },
      { etiqueta: 'Máximo', simbolo: 'máx', formula: 'mayor valor observado', valor: v => numeroIndicador(v.maximo) },
      { etiqueta: 'Rango', simbolo: 'R', formula: 'R = máx − mín', valor: v => numeroIndicador(v.rango) },
      { etiqueta: 'Primer cuartil', simbolo: 'Q₁', formula: 'percentil 25', valor: v => numeroIndicador(v.q1) },
      { etiqueta: 'Tercer cuartil', simbolo: 'Q₃', formula: 'percentil 75', valor: v => numeroIndicador(v.q3) },
      { etiqueta: 'Rango intercuartílico', simbolo: 'RIC', formula: 'RIC = Q₃ − Q₁', valor: v => numeroIndicador(v.ric) },
      { etiqueta: 'Límite superior de atípicos', simbolo: 'Lₛ', formula: 'Lₛ = Q₃ + 1,5·RIC', valor: v => numeroIndicador(v.lim_sup) },
      { etiqueta: 'Valores atípicos', simbolo: '#', formula: 'xᵢ < Q₁ − 1,5·RIC o xᵢ > Lₛ', valor: atipicos },
      { etiqueta: 'Varianza muestral', simbolo: 's²', formula: 's² = Σ(xᵢ − x̄)² / (n − 1)', valor: v => numeroIndicador(v.varianza) },
      { etiqueta: 'Desviación estándar', simbolo: 's', formula: 's = √s²', valor: v => numeroIndicador(v.desviacion_estandar) },
      { etiqueta: 'Coeficiente de variación', simbolo: 'CV', formula: 'CV = s / x̄ (solo escala de razón)', valor: cv }
    ]
  },
  {
    titulo: 'Medidas de forma',
    filas: [
      { etiqueta: 'Asimetría', simbolo: 'G₁', formula: 'G₁ = √(n(n−1)) / (n−2) · g₁, con g₁ = m₃ / m₂^(3/2)', valor: v => numeroIndicador(v.asimetria) },
      { etiqueta: 'Curtosis en exceso', simbolo: 'G₂', formula: 'G₂ = ((n+1)g₂ + 6)(n−1) / ((n−2)(n−3)), con g₂ = m₄ / m₂² − 3', valor: v => numeroIndicador(v.curtosis) },
      { etiqueta: 'Pozos con valor cero', simbolo: 'c₀', formula: 'conteo de pozos con xᵢ = 0', valor: v => `${formatosIndicadores.entero.format(v.ceros)} (${formatosIndicadores.porcentaje.format(v.ceros / v.n)})` }
    ]
  }
];

const FILAS_OTRAS = [
  { etiqueta: 'n (válidos)', dias: v => formatosIndicadores.entero.format(v.n), api: v => `${formatosIndicadores.entero.format(v.n)} (${formatosIndicadores.entero.format(v.nulos)} nulos)`, ordinal: o => `${formatosIndicadores.entero.format(o.n)} (${formatosIndicadores.entero.format(o.nulos)} nulos)` },
  { etiqueta: 'Media', dias: v => numeroIndicador(v.media), api: v => numeroIndicador(v.media), ordinal: () => 'No aplica' },
  { etiqueta: 'Mediana', dias: v => numeroIndicador(v.mediana), api: v => numeroIndicador(v.mediana), ordinal: o => o.mediana },
  { etiqueta: 'Moda / clase modal', dias: v => `${formatosIndicadores.entero.format(v.moda.valor)} días · ${formatosIndicadores.entero.format(v.moda.fi)} pozos`, api: v => claseModal(v.clase_modal), ordinal: o => `${o.moda} · ${formatosIndicadores.entero.format(o.fi_moda)} pozos` },
  { etiqueta: 'Q₁ – Q₃', dias: v => `${numeroIndicador(v.q1)} – ${numeroIndicador(v.q3)}`, api: v => `${numeroIndicador(v.q1)} – ${numeroIndicador(v.q3)}`, ordinal: () => '—' },
  { etiqueta: 'Desviación estándar', dias: v => numeroIndicador(v.desviacion_estandar), api: v => numeroIndicador(v.desviacion_estandar), ordinal: () => 'No aplica' },
  { etiqueta: 'Coeficiente de variación', dias: cv, api: cv, ordinal: () => 'No aplica' },
  { etiqueta: 'Valores atípicos (1,5·RIC)', dias: atipicos, api: atipicos, ordinal: () => '—' },
  { etiqueta: 'Asimetría G₁', dias: v => numeroIndicador(v.asimetria), api: v => numeroIndicador(v.asimetria), ordinal: () => '—' }
];

const COLUMNAS_RESUMEN = [
  { etiqueta: 'Estado', texto: f => f.estado },
  { etiqueta: 'n', numero: true, texto: f => formatosIndicadores.entero.format(f.n) },
  { etiqueta: 'Media', numero: true, texto: f => formatosIndicadores.decimal.format(f.media) },
  { etiqueta: 'Mediana', numero: true, texto: f => formatosIndicadores.decimal.format(f.mediana) },
  { etiqueta: 'Desv. estándar', numero: true, texto: f => formatosIndicadores.decimal.format(f.desviacion_estandar) },
  { etiqueta: 'CV', numero: true, texto: f => f.coeficiente_variacion === null
    ? '—' : formatosIndicadores.porcentaje.format(f.coeficiente_variacion) },
  { etiqueta: 'Mínimo', numero: true, texto: f => formatosIndicadores.decimal.format(f.minimo) },
  { etiqueta: 'Máximo', numero: true, texto: f => formatosIndicadores.decimal.format(f.maximo) },
  { etiqueta: 'Total (bbl/día)', numero: true, texto: f => formatosIndicadores.decimal.format(f.total) },
  { etiqueta: 'Participación', numero: true, texto: f => formatosIndicadores.porcentaje.format(f.participacion) }
];

function celdaIndicador(contenido, { numero = false, codigo = false, encabezado = false } = {}) {
  const td = document.createElement(encabezado ? 'th' : 'td');
  if (encabezado) td.scope = 'row';
  if (codigo) {
    const code = document.createElement('code');
    code.textContent = contenido;
    td.appendChild(code);
  } else {
    td.textContent = contenido;
  }
  if (numero) td.className = 'numero';
  return td;
}

function renderIndicadores(variables, claseApi) {
  const cuerpo = document.getElementById('cuerpo-indicadores');
  const columnas = [variables.oleo, variables.gas, variables.agua];
  DEFINICION_INDICADORES.forEach(grupo => {
    const encabezado = document.createElement('tr');
    const celdaGrupo = document.createElement('th');
    celdaGrupo.scope = 'colgroup';
    celdaGrupo.colSpan = 6;
    celdaGrupo.textContent = grupo.titulo;
    encabezado.appendChild(celdaGrupo);
    cuerpo.appendChild(encabezado);

    grupo.filas.forEach(def => {
      const fila = document.createElement('tr');
      fila.append(
        celdaIndicador(def.etiqueta, { encabezado: true }),
        celdaIndicador(def.simbolo),
        celdaIndicador(def.formula, { codigo: true }),
        ...columnas.map(v => celdaIndicador(def.valor(v), { numero: true }))
      );
      cuerpo.appendChild(fila);
    });
  });

  const otras = document.getElementById('cuerpo-indicadores-otras');
  FILAS_OTRAS.forEach(def => {
    const fila = document.createElement('tr');
    fila.append(
      celdaIndicador(def.etiqueta, { encabezado: true }),
      celdaIndicador(def.dias(variables.dias), { numero: true }),
      celdaIndicador(def.api(variables.api), { numero: true }),
      celdaIndicador(def.ordinal(claseApi), { numero: true })
    );
    otras.appendChild(fila);
  });

  const o = variables.oleo;
  document.getElementById('nota-indicadores').textContent =
    `En el óleo, ${formatosIndicadores.entero.format(o.outliers_alto)} pozos superan Lₛ = ${numeroIndicador(o.lim_sup)} bbl/día. ` +
    'El gas tiene la asimetría más fuerte: la mayoría de pozos produce muy poco gas y unos pocos pozos de gas concentran casi todo el volumen.';
}

function renderResumen(datos) {
  const cuerpo = document.getElementById('cuerpo-resumen');
  const filas = [
    ...datos.por_estado,
    { ...datos.total, estado: 'Total de la muestra', esTotal: true }
  ];

  filas.forEach(fila => {
    const tr = document.createElement('tr');
    COLUMNAS_RESUMEN.forEach((columna, i) => {
      const td = celdaIndicador(columna.texto(fila), { numero: columna.numero, encabezado: i === 0 });
      if (fila.esTotal) td.style.fontWeight = '650';
      tr.appendChild(td);
    });
    cuerpo.appendChild(tr);
  });

  const o = datos.variables.oleo;
  document.getElementById('nota-resumen').textContent =
    `Pozos con óleo igual a cero: ${formatosIndicadores.entero.format(o.ceros)} ` +
    `(${formatosIndicadores.porcentaje.format(o.ceros / o.n)}). ` +
    'Se incluyen en todos los cálculos. El CV expresa la desviación estándar como porcentaje de la media; Paraná no tiene CV porque su media es 0.';
}

async function cargarIndicadoresYResumen() {
  try {
    const datos = await leerJSON('data/indicadores_descriptivos.json');
    document.getElementById('indicadores-n').textContent = formatosIndicadores.entero.format(datos.n);
    document.getElementById('fuente-indicadores').textContent = datos.fuente;

    renderIndicadores(datos.variables, datos.clase_api);
    renderResumen(datos);

    document.getElementById('contenido-indicadores').hidden = false;
    document.getElementById('estado-indicadores').hidden = true;
    document.getElementById('contenido-resumen').hidden = false;
    document.getElementById('estado-resumen').hidden = true;
  } catch (error) {
    mostrarError('estado-indicadores', `No se pudieron calcular los indicadores. ${error.message} Genera data/indicadores_descriptivos.json con scripts/2_descriptiva_inferencial.py.`, error);
    mostrarError('estado-resumen', 'No se pudo cargar el resumen descriptivo.', error);
  }
}

cargarIndicadoresYResumen();
