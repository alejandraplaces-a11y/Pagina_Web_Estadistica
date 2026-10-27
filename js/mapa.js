(() => {
  'use strict';

  const $ = (selector, root = document) => (root || document).querySelector(selector);
  const $$ = (selector, root = document) => Array.from((root || document).querySelectorAll(selector));

  const fmt = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtInt = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
  const fmtPct = new Intl.NumberFormat('es-CO', { style: 'percent', maximumFractionDigits: 1 });
  const fmtCompacto = new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 });

  const COLOR_MIN = '#e6f0e9';
  const COLOR_VACIO = '#e3e8e5';

  const CONFIG = {
    tiles: {
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>',
    },
    radioMin: 5,
    radioMax: 26,
    metricas: {
      oleo: {
        campo: 'Óleo (bbl/dia)',
        etiqueta: 'Óleo',
        titulo: 'Óleo (bbl/día)',
        unidad: 'bbl/día',
        color: '#2e7d5b',
        escala: [
          [0, '#e6f0e9'],
          [1, '#1c5c41'],
        ],
        decimales: 2,
      },
      gas: {
        campo: 'Gás Natural (Mm³/dia)',
        etiqueta: 'Gas natural',
        titulo: 'Gás natural (Mm³/día)',
        unidad: 'Mm³/día',
        color: '#3f8f74',
        escala: [
          [0, '#e6f0e9'],
          [1, '#2e6f5a'],
        ],
        decimales: 2,
      },
      agua: {
        campo: 'Água (bbl/dia)',
        etiqueta: 'Agua',
        titulo: 'Agua (bbl/día)',
        unidad: 'bbl/día',
        color: '#7fb99a',
        escala: [
          [0, '#e6f0e9'],
          [1, '#4a8f73'],
        ],
        decimales: 2,
      },
      pozos: {
        campo: 'Pozos',
        etiqueta: 'Pozos únicos',
        titulo: 'Pozos únicos',
        unidad: '',
        color: '#2f6b52',
        escala: [
          [0, '#e6f0e9'],
          [1, '#1c5c41'],
        ],
        decimales: 0,
      },
      campos: {
        campo: 'Campos',
        etiqueta: 'Campos únicos',
        titulo: 'Campos únicos',
        unidad: '',
        color: '#4a7d63',
        escala: [
          [0, '#e6f0e9'],
          [1, '#33543f'],
        ],
        decimales: 0,
      },
    },
  };

  const mapa = {
    contenedor: document.getElementById('mapa'),
    estado: document.getElementById('estado-diagrama'),
    mapa: null,
    capaEstados: null,
    capaBurbujas: null,
    seleccion: null,
    metrica: 'oleo',
    umbral: 0,
    circulos: new Map(),
    mapaPorNombre: new Map(),
    geojson: null,
    datos: [],
    bacias: [],
    campos: [],
    distribucion: [],
    estadistica: null,
    estiloOriginal: new Map(),
  };

  let recorridoTimer = null;
  let recorridoActivo = false;

  function colorMetrica(metrica, valor, maximo) {
    const escala = metrica.escala;
    const t = maximo > 0 ? Math.min(valor / maximo, 1) : 0;
    const [t0, c0] = escala[0];
    const [t1, c1] = escala[escala.length - 1];
    const f = t1 > t0 ? Math.min((t - t0) / (t1 - t0), 1) : 0;
    const r = Math.round(parseInt(c0.slice(1, 3), 16) + (parseInt(c1.slice(1, 3), 16) - parseInt(c0.slice(1, 3), 16)) * f);
    const g = Math.round(parseInt(c0.slice(3, 5), 16) + (parseInt(c1.slice(3, 5), 16) - parseInt(c0.slice(3, 5), 16)) * f);
    const b = Math.round(parseInt(c0.slice(5, 7), 16) + (parseInt(c1.slice(5, 7), 16) - parseInt(c0.slice(5, 7), 16)) * f);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function valorMetrica(fila, metrica) {
    const cfg = CONFIG.metricas[metrica];
    const crudo = fila ? fila[cfg.campo] : 0;
    const valor = Number(Array.isArray(crudo) ? crudo.length : crudo) || 0;
    return valor;
  }

  function formatear(valor, decimales = 2) {
    const numero = Number(valor) || 0;
    const formato =
      decimales > 0
        ? new Intl.NumberFormat('es-CO', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
        : new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
    return formato.format(numero);
  }

  function formatearCompacto(valor) {
    return fmtCompacto.format(Number(valor) || 0);
  }

  async function cargarDatos() {
    const [mapaData, bacias, campos, estadistica, distribucion] = await Promise.all([
      leerJSON('map_data.json'),
      leerJSON('bacias_data.json'),
      leerJSON('campos_data.json'),
      leerJSON('estadistica_descriptiva.json'),
      leerJSON('distribucion_pozos.json'),
    ]);
    mapa.datos = Array.isArray(mapaData) ? mapaData : [];
    mapa.bacias = Array.isArray(bacias) ? bacias : [];
    mapa.campos = Array.isArray(campos) ? campos : [];
    mapa.distribucion = Array.isArray(distribucion) ? distribucion : [];
    mapa.estadistica = estadistica || null;
    if (!mapa.datos.length) throw new Error('map_data.json no contiene datos por Estado.');
  }

  function crearMapa() {
    if (typeof L === 'undefined') throw new Error('Leaflet no se descargó (unpkg leaflet@1.9.4).');
    const m = L.map(mapa.contenedor, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
      zoomSnap: 0.5,
    }).setView([-10, -55], 4);
    L.tileLayer(CONFIG.tiles.url, {
      attribution: CONFIG.tiles.attribution,
      maxZoom: 18,
      subdomains: 'abcd',
    }).addTo(m);
    mapa.mapa = m;
    return m;
  }

  function featurePorNombre(nombre) {
    return mapa.geojson.features.find((f) => f.properties.name === nombre) || null;
  }  function actualizarCapa(metrica) {
    const m = mapa.mapa;
    if (!m) return { maximo: 0 };
    if (mapa.capaEstados) m.removeLayer(mapa.capaEstados);
    const cfg = CONFIG.metricas[metrica];
    let maximo = 0;
    mapa.datos.forEach((fila) => {
      maximo = Math.max(maximo, valorMetrica(fila, metrica));
    });
    const grupo = L.layerGroup();
    mapa.geojson.features.forEach((feature) => {
      const nombre = feature.properties.name;
      const fila = mapa.datos.find((d) => d.Estado === nombre) || null;
      const valor = fila ? valorMetrica(fila, metrica) : 0;
      const tiene = fila !== null && valor > 0;
      const estilo = tiene
        ? { color: '#0d241d', weight: 1, fillColor: colorMetrica(cfg, valor, maximo), fillOpacity: 0.8 }
        : { color: '#b8c4ba', weight: 0.6, fillColor: COLOR_VACIO, fillOpacity: 0.55 };
      if (fila !== null) mapa.estiloOriginal.set(nombre, estilo);
      const layer = L.geoJSON(feature, {
        style: estilo,
        onEachFeature: (f, lyr) => {
          if (fila === null) return;
          const contenido = `<b>${fila.Estado}</b><br>${cfg.etiqueta}: ${formatear(valor, cfg.decimales)}${cfg.unidad ? ' ' + cfg.unidad : ''}<br>Pozos únicos: ${fmtInt.format(Number(fila.Pozos) || 0)}`;
          lyr.bindPopup(contenido);
          lyr.on('click', () => {
            detenerRecorrido();
            seleccionarPorNombre(fila.Estado);
            lyr.openPopup();
          });
        },
      }).addTo(grupo);
      mapa.mapaPorNombre.set(nombre, layer);
    });
    mapa.capaEstados = grupo;
    m.addLayer(grupo);
    return { grupo, maximo };
  }

  function actualizarBurbujas(metrica, umbral) {
    const m = mapa.mapa;
    if (!m) return;
    if (mapa.capaBurbujas) m.removeLayer(mapa.capaBurbujas);
    const cfg = CONFIG.metricas[metrica];
    const grupo = L.layerGroup();
    const limite = Number(umbral) || 0;
    let maxValor = 0;
    mapa.datos.forEach((fila) => {
      maxValor = Math.max(maxValor, valorMetrica(fila, metrica));
    });
    mapa.datos.forEach((fila) => {
      const valor = valorMetrica(fila, metrica);
      if (valor < limite) return;
      const feature = featurePorNombre(fila.Estado);
      if (!feature) return;
      const centro = L.geoJSON(feature).getBounds().getCenter();
      const radio = Math.max(mapa.radioMin, Math.sqrt(Math.max(valor, 0)) * ((mapa.radioMax - mapa.radioMin) / Math.sqrt(Math.max(maxValor, 1e-9))));
      const circulo = L.circleMarker(centro, {
        radius: radio,
        color: cfg.color,
        weight: 2,
        fillColor: cfg.color,
        fillOpacity: 0.28,
      })
        .bindTooltip(`<b>${fila.Estado}</b><br>${cfg.etiqueta}: ${formatearCompacto(valor)}${cfg.unidad ? ' ' + cfg.unidad : ''}`, {
          direction: 'top',
          offset: [0, -8],
        })
        .addTo(grupo);
      circulo.on('click', () => {
        detenerRecorrido();
        seleccionarPorNombre(fila.Estado);
      });
      mapa.circulos.set(fila.Estado, circulo);
    });
    mapa.capaBurbujas = grupo;
    m.addLayer(grupo);
  }

  function aplicarEstiloSeleccion(nombre) {
    const layer = mapa.mapaPorNombre.get(nombre);
    const estilo = mapa.estiloOriginal.get(nombre);
    if (!layer || !estilo) return;
    layer.setStyle({ ...estilo, fillOpacity: 0.95, weight: 2 });
    if (mapa.mapa) mapa.mapa.flyTo(layer.getBounds().getCenter(), 7, { duration: 0.8 });
  }

  function restablecerEstilo() {
    mapa.datos.forEach((fila) => {
      const layer = mapa.mapaPorNombre.get(fila.Estado);
      const estilo = mapa.estiloOriginal.get(fila.Estado);
      if (layer && estilo) layer.setStyle(estilo);
    });
  }

  function seleccionarPorNombre(nombre) {
    if (mapa.seleccion === nombre) return;
    restablecerEstilo();
    const fila = mapa.datos.find((d) => d.Estado === nombre) || null;
    if (fila) {
      const layer = mapa.mapaPorNombre.get(nombre);
      const estilo = mapa.estiloOriginal.get(nombre);
      if (layer && estilo) layer.setStyle({ ...estilo, fillOpacity: 0.95, weight: 2 });
      if (layer && mapa.mapa) mapa.mapa.flyTo(layer.getBounds().getCenter(), 7, { duration: 0.8 });
    }
    mapa.seleccion = fila ? fila.Estado : null;
    renderPanel();
  }

  function ranking(metrica) {
    const metricaActual = metrica || mapa.metrica;
    const cfg = CONFIG.metricas[metricaActual];
    return [...mapa.datos].sort((a, b) => valorMetrica(b, metricaActual) - valorMetrica(a, metricaActual));
  }

  function renderPanel() {
    const contenedor = $('#panel-titulo');
    if (!contenedor) return;
    const fila = mapa.seleccion ? mapa.datos.find((d) => d.Estado === mapa.seleccion) : null;
    const cfg = CONFIG.metricas[mapa.metrica];

    if (!fila) {
      contenedor.textContent = 'Brasil · producción en tierra';
      const subtitulo = $('#panel-subtitulo');
      if (subtitulo) subtitulo.textContent = `${mapa.datos.length} estados con registros terrestres. Selecciona uno para ver su detalle.`;
      const total = mapa.datos.reduce((s, f) => s + valorMetrica(f, 'oleo'), 0);
      const panelOleo = $('#panel-oleo');
      panelOleo.textContent = '';
      panelOleo.appendChild(document.createTextNode(`${fmt.format(total)} bbl/día`));
      const unidad = panelOleo.querySelector('.metric-unit');
      if (unidad) unidad.textContent = 'bbl/día';
      $('#panel-pozos').textContent = fmtInt.format(mapa.datos.reduce((s, f) => s + (Number(f.Pozos) || 0), 0));
      $('#panel-participacion').textContent = fmtPct.format(1);
      $('#panel-ranking').textContent = '—';
      const metricaEtiqueta = $('#metric-etiqueta');
      if (metricaEtiqueta) metricaEtiqueta.textContent = cfg.etiqueta;
      const rankingProgreso = $('#ranking-progreso');
      if (rankingProgreso) rankingProgreso.style.width = '0%';
      return;
    }

    const total = mapa.datos.reduce((s, f) => s + valorMetrica(f, mapa.metrica), 0);
    const orden = ranking(mapa.metrica);
    const posicion = orden.findIndex((f) => f.Estado === fila.Estado) + 1;
    const participacion = total > 0 ? (valorMetrica(fila, mapa.metrica) / total) * 100 : 0;

    contenedor.textContent = fila.Estado;
    const subtitulo = $('#panel-subtitulo');
    if (subtitulo) subtitulo.textContent = `Producción terrestre registrada en enero de 2023.`;
    const metricaEtiqueta = $('#metric-etiqueta');
    if (metricaEtiqueta) metricaEtiqueta.textContent = cfg.etiqueta;
    const panelOleo = $('#panel-oleo');
    panelOleo.textContent = '';
    panelOleo.appendChild(document.createTextNode(`${formatear(valorMetrica(fila, mapa.metrica), cfg.decimales)}${cfg.unidad ? ' ' + cfg.unidad : ''}`));
    const unidad = panelOleo.querySelector('.metric-unit');
    if (unidad) unidad.textContent = cfg.unidad || 'bbl/día';
    $('#panel-pozos').textContent = fmtInt.format(Number(fila.Pozos) || 0);
    $('#panel-participacion').textContent = fmtPct.format(participacion / 100);
    $('#panel-ranking').textContent = `${posicion} de ${orden.length}`;
    const rankingProgreso = $('#ranking-progreso');
    if (rankingProgreso) rankingProgreso.style.width = `${(posicion / orden.length) * 100}%`;

    renderLista('#cuencas-lista', topCuencas(fila), 5, (item) => `${item.Bacia} · Estado principal: ${item['Estado principal']} · ${fmt.format(item['Óleo (bbl/dia)'], 2)} bbl/día`);
    renderLista('#campos-lista', topCampos(fila), 5, (item) => `${item.Campo} · ${item.Bacia} · ${item.Operador} · ${fmt.format(item['Óleo (bbl/dia)'], 2)} bbl/día`);
  }

  function topCuencas(fila) {
    const nombres = fila && Array.isArray(fila.Cuencas) ? fila.Cuencas : [];
    return (mapa.bacias || [])
      .filter((b) => nombres.includes(b.Bacia))
      .sort((a, b) => valorMetrica(b, 'oleo') - valorMetrica(a, 'oleo'))
      .slice(0, 5);
  }

  function topCampos(fila) {
    const nombres = fila && fila.Estado ? fila.Estado : '';
    return (mapa.campos || [])
      .filter((c) => c.Estado === nombres)
      .sort((a, b) => valorMetrica(b, 'oleo') - valorMetrica(a, 'oleo'))
      .slice(0, 5);
  }

  function renderLista(selector, items, limite, formatearItem) {
    const contenedor = $(selector);
    if (!contenedor) return;
    contenedor.replaceChildren();
    items.slice(0, limite).forEach((item) => {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.className = 'ranking-name';
      span.textContent = formatearItem ? formatearItem(item) : `${item.Bacia || item.Campo}`;
      li.appendChild(span);
      contenedor.appendChild(li);
    });
  }

  function construirRanking() {
    const contenedor = $('#ranking-lista');
    if (!contenedor) return;
    contenedor.replaceChildren();
    ranking(mapa.metrica).forEach((fila) => {
      const li = document.createElement('li');
      li.dataset.estado = fila.Estado;
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'ranking-item';
      const cfg = CONFIG.metricas[mapa.metrica];
      boton.innerHTML = `<span class="ranking-name">${fila.Estado}</span><span class="ranking-value">${fmt.format(valorMetrica(fila, mapa.metrica), cfg.decimales)}${cfg.unidad ? ' ' + cfg.unidad : ''}</span>`;
      boton.addEventListener('click', () => seleccionarPorNombre(fila.Estado));
      li.appendChild(boton);
      contenedor.appendChild(li);
    });
  }

  function renderLegend(metrica, maximo) {
    const contenedor = $('.diagram-legend');
    if (!contenedor) return;
    const cfg = CONFIG.metricas[metrica];
    contenedor.replaceChildren();
    const itemMax = document.createElement('li');
    const swatchMax = document.createElement('span');
    swatchMax.className = 'legend-swatch legend-swatch-data';
    swatchMax.style.background = colorMetrica(cfg, maximo, maximo);
    const textoMax = document.createElement('span');
    textoMax.textContent = `Máximo: ${fmt.format(maximo, cfg.decimales)}${cfg.unidad ? ' ' + cfg.unidad : ''}`;
    itemMax.append(swatchMax, textoMax);

    const itemMin = document.createElement('li');
    const swatchMin = document.createElement('span');
    swatchMin.className = 'legend-swatch legend-swatch-empty';
    swatchMin.style.background = COLOR_MIN;
    const textoMin = document.createElement('span');
    textoMin.textContent = `Mínimo: ${fmt.format(0, cfg.decimales)}${cfg.unidad ? ' ' + cfg.unidad : ''}`;
    itemMin.append(swatchMin, textoMin);

    const nota = document.createElement('li');
    nota.className = 'diagrama-legend-nota';
    nota.textContent = 'Límites estatales esquemáticos. Datos agregados por Estado, enero de 2023. Fuente: ANP, 2023_01_producao_Terra.csv';

    contenedor.append(itemMin, itemMax, nota);
  }

  function cambiarMetrica(metrica) {
    mapa.metrica = metrica;
    const select = $('#metrica-mapa');
    if (select) select.value = metrica;
    const capa = actualizarCapa(metrica);
    actualizarBurbujas(metrica, mapa.umbral);
    renderLegend(metrica, capa.maximo);
    construirRanking();
    renderPanel();
  }

  function reiniciar() {
    mapa.seleccion = null;
    restablecerEstilo();
    mapa.metrica = 'oleo';
    mapa.umbral = 0;
    const select = $('#metrica-mapa');
    if (select) select.value = 'oleo';
    const input = $('#umbral-mapa');
    if (input) input.value = '0';
    const salida = $('#umbral-salida');
    if (salida) salida.textContent = '0';
    const capa = actualizarCapa('oleo');
    actualizarBurbujas('oleo', 0);
    renderLegend('oleo', capa.maximo);
    construirRanking();
    renderPanel();
  }

  function iniciarRecorrido() {
    if (recorridoActivo) {
      detenerRecorrido();
      return;
    }
    detenerRecorrido();
    const orden = ranking(mapa.metrica);
    let indice = 0;
    recorridoActivo = true;
    const siguiente = () => {
      if (!recorridoActivo) return;
      if (indice >= orden.length) {
        detenerRecorrido();
        return;
      }
      const fila = orden[indice];
      indice += 1;
      seleccionarPorNombre(fila.Estado);
      recorridoTimer = setTimeout(siguiente, 1400);
    };
    siguiente();
  }

  function detenerRecorrido() {
    recorridoActivo = false;
    if (recorridoTimer) {
      clearTimeout(recorridoTimer);
      recorridoTimer = null;
    }
  }

  function renderCalidad() {
    const contenedor = $('#calidad-datos');
    if (!contenedor || !mapa.estadistica) return;
    const estadistica = mapa.estadistica;
    const estadosCero = Array.isArray(estadistica.estados_con_oilo_cero) ? estadistica.estados_con_oilo_cero : [];
    const texto = `Registros con Estado: ${estadistica.registros ?? '—'} · Pozos únicos: ${estadistica.pozos_unicos ?? '—'} · Pozos con varios registros: ${estadistica.pozos_con_varios_registros ?? '—'} · Estados con óleo = 0: ${estadosCero.length ? estadosCero.join(', ') : '—'}.`;
    contenedor.textContent = texto;
  }

  async function iniciarMapa() {
    try {
      await cargarDatos();
      mapa.mapa = crearMapa();
      const geojsonRespuesta = await leerJSON('data/brasil-estados.geojson');
      mapa.geojson = geojsonRespuesta;
      const capa = actualizarCapa(mapa.metrica);
      actualizarBurbujas(mapa.metrica, mapa.umbral);
      renderLegend(mapa.metrica, capa.maximo);
      construirRanking();
      renderPanel();
      renderCalidad();
      if (mapa.estado) mapa.estado.hidden = true;

      const botonVerTodo = $('#boton-reiniciar-mapa');
      if (botonVerTodo) botonVerTodo.addEventListener('click', reiniciar);

      const botonRecorrido = $('#boton-recorrido');
      if (botonRecorrido) botonRecorrido.addEventListener('click', iniciarRecorrido);

      const botonReiniciar = $('#boton-reiniciar');
      if (botonReiniciar) botonReiniciar.addEventListener('click', reiniciar);

      const inputUmbral = $('#umbral-mapa');
      if (inputUmbral) {
        inputUmbral.addEventListener('input', () => {
          mapa.umbral = Number(inputUmbral.value) || 0;
          const salida = $('#umbral-salida');
          if (salida) salida.textContent = inputUmbral.value;
          actualizarBurbujas(mapa.metrica, mapa.umbral);
        });
      }

      const selectMetrica = $('#metrica-mapa');
      if (selectMetrica) selectMetrica.addEventListener('change', (evento) => cambiarMetrica(evento.target.value));
    } catch (error) {
      mostrarError('estado-diagrama', `No se pudo cargar el mapa. ${error.message}`, error);
    }
  }

  iniciarMapa();
})();
