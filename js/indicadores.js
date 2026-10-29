const formatosIndicadores = {
  decimal: new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }),
  entero: new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }),
  porcentaje: new Intl.NumberFormat('es-CO', { style: 'percent', maximumFractionDigits: 1 })
};

const DEFINICION_INDICADORES = [
  {
    titulo: 'Medidas de tendencia central',
    filas: [
      { etiqueta: 'Media aritmética', simbolo: 'x̄', formula: 'x̄ = (1/n) Σ xᵢ', formato: 'decimal',
        valor: i => i.centrales.media,
        lectura: (v, i) => v > i.centrales.mediana
          ? 'Mayor que la mediana: los pozos de producción alta elevan el promedio'
          : 'Igual o menor que la mediana' },
      { etiqueta: 'Mediana', simbolo: 'Me', formula: 'valor central de los datos ordenados', formato: 'decimal',
        valor: i => i.centrales.mediana,
        lectura: () => 'La mitad de los pozos produce menos que este valor' },
      { etiqueta: 'Moda', simbolo: 'Mo', formula: 'valor de mayor frecuencia absoluta', formato: 'decimal',
        valor: i => i.centrales.moda,
        lectura: (v, i) => `Valor más repetido: ${formatosIndicadores.entero.format(i.centrales.frecuencia_moda)} pozos` }
    ]
  },
  {
    titulo: 'Medidas de dispersión',
    filas: [
      { etiqueta: 'Mínimo', simbolo: 'mín', formula: 'menor valor observado', formato: 'decimal',
        valor: i => i.dispersion.minimo },
      { etiqueta: 'Máximo', simbolo: 'máx', formula: 'mayor valor observado', formato: 'decimal',
        valor: i => i.dispersion.maximo },
      { etiqueta: 'Rango', simbolo: 'R', formula: 'R = máx − mín', formato: 'decimal',
        valor: i => i.dispersion.rango },
      { etiqueta: 'Primer cuartil', simbolo: 'Q₁', formula: 'percentil 25', formato: 'decimal',
        valor: i => i.dispersion.q1 },
      { etiqueta: 'Tercer cuartil', simbolo: 'Q₃', formula: 'percentil 75', formato: 'decimal',
        valor: i => i.dispersion.q3 },
      { etiqueta: 'Rango intercuartílico', simbolo: 'RIC', formula: 'RIC = Q₃ − Q₁', formato: 'decimal',
        valor: i => i.dispersion.rango_intercuartilico,
        lectura: () => 'Amplitud del 50 % central de los pozos' },
      { etiqueta: 'Varianza muestral', simbolo: 's²', formula: 's² = Σ(xᵢ − x̄)² / (n − 1)', formato: 'decimal',
        valor: i => i.dispersion.varianza },
      { etiqueta: 'Desviación estándar', simbolo: 's', formula: 's = √s²', formato: 'decimal',
        valor: i => i.dispersion.desviacion_estandar,
        lectura: () => 'Distancia típica de los pozos respecto de la media' },
      { etiqueta: 'Coeficiente de variación', simbolo: 'CV', formula: 'CV = s / x̄', formato: 'porcentaje',
        valor: i => i.dispersion.coeficiente_variacion,
        lectura: v => v > 1
          ? 'Dispersión muy alta: la desviación supera a la media'
          : v > 0.5 ? 'Dispersión alta' : 'Dispersión moderada' }
    ]
  },
  {
    titulo: 'Medidas de forma',
    filas: [
      { etiqueta: 'Asimetría', simbolo: 'G₁', formula: 'G₁ = √(n(n−1)) / (n−2) · g₁, con g₁ = m₃ / m₂^(3/2)', formato: 'decimal',
        valor: i => i.forma.asimetria,
        lectura: v => v > 1
          ? 'Positiva fuerte: cola hacia valores altos'
          : v > 0 ? 'Positiva leve' : v < 0 ? 'Negativa' : 'Simétrica' },
      { etiqueta: 'Curtosis en exceso', simbolo: 'G₂', formula: 'G₂ = ((n+1)g₂ + 6)(n−1) / ((n−2)(n−3)), con g₂ = m₄ / m₂² − 3', formato: 'decimal',
        valor: i => i.forma.curtosis,
        lectura: v => v > 0
          ? 'Leptocúrtica: concentración alrededor de la media con colas pesadas'
          : 'Platicúrtica o mesocúrtica' },
      { etiqueta: 'Pozos con óleo igual a cero', simbolo: 'c₀', formula: 'conteo de pozos con xᵢ = 0', formato: 'entero',
        valor: i => i.forma.ceros,
        lectura: (v, i) => `${formatosIndicadores.porcentaje.format(i.forma.porcentaje_ceros)} del total` }
    ]
  }
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

function celdaIndicador(contenido, { numero = false, codigo = false } = {}) {
  const td = document.createElement('td');
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

function renderIndicadores(indicadores) {
  const cuerpo = document.getElementById('cuerpo-indicadores');
  DEFINICION_INDICADORES.forEach(grupo => {
    const encabezado = document.createElement('tr');
    const celdaGrupo = document.createElement('th');
    celdaGrupo.scope = 'colgroup';
    celdaGrupo.colSpan = 5;
    celdaGrupo.textContent = grupo.titulo;
    encabezado.appendChild(celdaGrupo);
    cuerpo.appendChild(encabezado);

    grupo.filas.forEach(def => {
      const valor = def.valor(indicadores);
      const fila = document.createElement('tr');
      fila.append(
        celdaIndicador(def.etiqueta),
        celdaIndicador(def.simbolo),
        celdaIndicador(def.formula, { codigo: true }),
        celdaIndicador(formatosIndicadores[def.formato].format(valor), { numero: true }),
        celdaIndicador(def.lectura ? def.lectura(valor, indicadores) : '—')
      );
      cuerpo.appendChild(fila);
    });
  });
}

function renderResumen(datos) {
  const cuerpo = document.getElementById('cuerpo-resumen');
  const filas = [
    ...datos.por_estado,
    { ...datos.total, estado: 'Total del archivo', esTotal: true }
  ];

  filas.forEach(fila => {
    const tr = document.createElement('tr');
    COLUMNAS_RESUMEN.forEach(columna => {
      const td = celdaIndicador(columna.texto(fila), { numero: columna.numero });
      if (fila.esTotal) td.style.fontWeight = '650';
      tr.appendChild(td);
    });
    cuerpo.appendChild(tr);
  });

  const ceros = datos.indicadores.forma.ceros;
  document.getElementById('nota-resumen').textContent =
    `Pozos con óleo igual a cero: ${formatosIndicadores.entero.format(ceros)} ` +
    `(${formatosIndicadores.porcentaje.format(datos.indicadores.forma.porcentaje_ceros)}). ` +
    'Se incluyen en todos los cálculos. El CV expresa la desviación estándar como porcentaje de la media.';
}

async function cargarIndicadoresYResumen() {
  try {
    const datos = await leerJSON('indicadores_descriptivos.json');
    document.getElementById('indicadores-n').textContent = formatosIndicadores.entero.format(datos.n);
    document.getElementById('indicadores-variable').textContent = datos.variable;
    document.getElementById('fuente-indicadores').textContent = datos.fuente;

    renderIndicadores(datos.indicadores);
    renderResumen(datos);

    document.getElementById('contenido-indicadores').hidden = false;
    document.getElementById('estado-indicadores').hidden = true;
    document.getElementById('contenido-resumen').hidden = false;
    document.getElementById('estado-resumen').hidden = true;
  } catch (error) {
    mostrarError('estado-indicadores', `No se pudieron calcular los indicadores. ${error.message} Genera indicadores_descriptivos.json con 1_preprocesamiento_mapa.py.`, error);
    mostrarError('estado-resumen', 'No se pudo cargar el resumen descriptivo.', error);
  }
}

cargarIndicadoresYResumen();
