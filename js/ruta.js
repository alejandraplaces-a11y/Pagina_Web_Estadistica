const GRUPOS = {
  todos: { titulo: 'Recorrido completo', estados: null },
  nordeste: {
    titulo: 'Recorrido del Nordeste',
    estados: ['Alagoas', 'Bahia', 'Ceará', 'Maranhão', 'Rio Grande do Norte', 'Sergipe']
  },
  otros: {
    titulo: 'Recorrido por Norte, Sudeste y Sur',
    estados: ['Amazonas', 'Espírito Santo', 'Paraná']
  }
};

const DURACION_MS = 16000;
const FACTOR_LON = Math.cos(-15 * Math.PI / 180);
const NS = 'http://www.w3.org/2000/svg';

const formatoDecimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });
const formatoEntero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
const formatoPorcentaje = new Intl.NumberFormat('es-CO', { style: 'percent', maximumFractionDigits: 1 });

const ruta = {
  datos: [],
  geojson: null,
  centros: {},
  activos: new Set(),
  mapa: null,
  capaEstados: null,
  capaTrazo: null,
  capaRecorrido: null,
  capaEstaciones: null,
  marcador: null,
  marcadoresEstacion: [],
  cursor: null,
  escala: null,
  grupo: 'todos',
  estaciones: [],
  puntos: [],
  perfil: [],
  longitud: 0,
  total: 0,
  indiceActivo: -1,
  zoomSeguimiento: 4,
  t: 0,
  tInicial: 0,
  reproduciendo: false,
  arrancado: false,
  sesion: 0,
  frame: null,
  inicioTs: null
};

function distancia(a, b) {
  return Math.hypot((b.lng - a.lng) * FACTOR_LON, b.lat - a.lat);
}

function estadosDelGrupo(grupo) {
  const nombres = GRUPOS[grupo].estados ?? ruta.datos.map(fila => fila.Estado);
  return nombres
    .map(nombre => ({ nombre, fila: ruta.datos.find(f => f.Estado === nombre), centro: ruta.centros[nombre] }))
    .filter(e => e.fila && e.centro)
    .sort((a, b) => a.centro.lng - b.centro.lng);
}

function prepararRuta() {
  const base = estadosDelGrupo(ruta.grupo);
  ruta.puntos = base.map(e => e.centro);
  ruta.longitud = 0;
  for (let i = 1; i < ruta.puntos.length; i++) {
    ruta.longitud += distancia(ruta.puntos[i - 1], ruta.puntos[i]);
  }

  ruta.total = base.reduce((suma, e) => suma + e.fila['Óleo (bbl/dia)'], 0);
  let recorrido = 0;
  let acumulado = 0;
  ruta.estaciones = base.map((e, i) => {
    if (i > 0) recorrido += distancia(ruta.puntos[i - 1], ruta.puntos[i]);
    acumulado += e.fila['Óleo (bbl/dia)'];
    return {
      ...e,
      fraccion: ruta.longitud ? recorrido / ruta.longitud : 0,
      acumulado: ruta.total ? acumulado / ruta.total : 0
    };
  });
  ruta.perfil = [[0, 0], ...ruta.estaciones.map(e => [e.fraccion, e.acumulado])];
  ruta.activos = new Set(ruta.estaciones.map(e => e.nombre));
}

function posicionEn(t) {
  const pts = ruta.puntos;
  const objetivo = Math.min(Math.max(t, 0), 1) * ruta.longitud;
  let recorrido = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = distancia(pts[i], pts[i + 1]);
    if (recorrido + d >= objetivo || i === pts.length - 2) {
      const f = d ? Math.min(Math.max((objetivo - recorrido) / d, 0), 1) : 0;
      return L.latLng(
        pts[i].lat + (pts[i + 1].lat - pts[i].lat) * f,
        pts[i].lng + (pts[i + 1].lng - pts[i].lng) * f
      );
    }
    recorrido += d;
  }
  return pts[pts.length - 1];
}

function trazoHasta(t, posicion) {
  const linea = [ruta.puntos[0]];
  ruta.estaciones.forEach((e, i) => {
    if (i > 0 && e.fraccion <= t) linea.push(ruta.puntos[i]);
  });
  linea.push(posicion);
  return linea;
}

function estacionActiva(t) {
  let indice = 0;
  ruta.estaciones.forEach((e, i) => {
    if (e.fraccion <= t + 1e-9) indice = i;
  });
  return indice;
}

function valorPerfil(t) {
  const p = ruta.perfil;
  for (let i = 1; i < p.length; i++) {
    if (t <= p[i][0] + 1e-9) {
      const [x0, y0] = p[i - 1];
      const [x1, y1] = p[i];
      const f = x1 > x0 ? Math.min(Math.max((t - x0) / (x1 - x0), 0), 1) : 1;
      return y0 + (y1 - y0) * f;
    }
  }
  return p[p.length - 1][1];
}

function elementoSvg(etiqueta, atributos, texto) {
  const elemento = document.createElementNS(NS, etiqueta);
  Object.entries(atributos).forEach(([clave, valor]) => elemento.setAttribute(clave, valor));
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

function dibujarPerfil() {
  const svg = document.getElementById('ruta-perfil');
  svg.replaceChildren();

  const W = 320;
  const H = 110;
  const m = { l: 14, r: 14, t: 16, b: 28 };
  const x = v => m.l + v * (W - m.l - m.r);
  const y = v => H - m.b - v * (H - m.t - m.b);
  ruta.escala = { x, y };

  const coordenadas = ruta.perfil.map(([fx, fy]) => `${x(fx).toFixed(1)},${y(fy).toFixed(1)}`);
  const primera = ruta.estaciones[0].nombre;
  const ultima = ruta.estaciones[ruta.estaciones.length - 1].nombre;

  svg.append(
    elementoSvg('line', { x1: x(0), x2: x(1), y1: y(0), y2: y(0), stroke: '#2c4a43', 'stroke-width': 1 }),
    elementoSvg('path', {
      d: `M${x(0)},${y(0)} L${coordenadas.join(' L')} L${x(1)},${y(0)} Z`,
      fill: '#6fd3b0',
      'fill-opacity': 0.14
    }),
    elementoSvg('polyline', {
      points: coordenadas.join(' '),
      fill: 'none',
      stroke: '#9fe3c8',
      'stroke-width': 2,
      'stroke-linejoin': 'round'
    }),
    elementoSvg('text', { x: x(0), y: H - 8, 'text-anchor': 'start' }, primera),
    elementoSvg('text', { x: x(1), y: H - 8, 'text-anchor': 'end' }, ultima)
  );

  ruta.cursor = {
    linea: elementoSvg('line', { y1: y(1), y2: y(0), stroke: '#c9f5de', 'stroke-width': 1, 'stroke-dasharray': '3 3' }),
    punto: elementoSvg('circle', { r: 4, fill: '#f4fff9', stroke: '#6fd3b0', 'stroke-width': 2 })
  };
  svg.append(ruta.cursor.linea, ruta.cursor.punto);
}

function estiloEstado(feature) {
  return ruta.activos.has(feature.properties.name)
    ? { fillColor: '#1d4a40', fillOpacity: 0.9, color: '#5fb59a', weight: 1.2 }
    : { fillColor: '#11241f', fillOpacity: 0.9, color: '#2c4a43', weight: 0.8 };
}

function resaltarEstacion(indice) {
  ruta.marcadoresEstacion.forEach((marcador, i) => {
    const visitada = i <= indice;
    marcador.setStyle({
      radius: i === indice ? 9 : 5,
      fillColor: visitada ? '#6fd3b0' : '#0b1a16',
      color: i === indice ? '#ffffff' : '#9fe3c8'
    });
  });
}

function actualizarIndicadores(indice, t) {
  const estacion = ruta.estaciones[indice];
  const oleo = estacion.fila['Óleo (bbl/dia)'];
  const participacion = ruta.total ? oleo / ruta.total : 0;

  document.getElementById('ruta-valor').textContent = formatoDecimal.format(oleo);
  document.getElementById('ruta-estacion').textContent =
    `${estacion.nombre} · ${indice + 1} de ${ruta.estaciones.length}`;
  document.getElementById('ruta-detalle').textContent =
    `${formatoEntero.format(estacion.fila.Pozos)} pozos · ${formatoPorcentaje.format(participacion)} del óleo del recorrido`;

  const cx = ruta.escala.x(t);
  const cy = ruta.escala.y(valorPerfil(t));
  ruta.cursor.linea.setAttribute('x1', cx.toFixed(1));
  ruta.cursor.linea.setAttribute('x2', cx.toFixed(1));
  ruta.cursor.punto.setAttribute('cx', cx.toFixed(1));
  ruta.cursor.punto.setAttribute('cy', cy.toFixed(1));
}

function etiquetaBoton() {
  const boton = document.getElementById('ruta-reproducir');
  if (ruta.reproduciendo) {
    boton.textContent = 'Pausar recorrido';
  } else {
    boton.textContent = ruta.t >= 1 ? 'Repetir recorrido' : 'Reproducir recorrido';
  }
  boton.setAttribute('aria-pressed', String(ruta.reproduciendo));
}

function actualizar(t) {
  ruta.t = Math.min(Math.max(t, 0), 1);
  const posicion = posicionEn(ruta.t);
  ruta.marcador.setLatLng(posicion);
  ruta.capaRecorrido.setLatLngs(trazoHasta(ruta.t, posicion));

  if (ruta.reproduciendo) {
    ruta.mapa.setView(posicion, ruta.zoomSeguimiento, { animate: false });
  }

  const indice = estacionActiva(ruta.t);
  if (indice !== ruta.indiceActivo) {
    ruta.indiceActivo = indice;
    resaltarEstacion(indice);
  }
  document.getElementById('ruta-deslizador').value = Math.round(ruta.t * 1000);
  actualizarIndicadores(indice, ruta.t);
}

function ajustarVista() {
  const tamano = ruta.mapa.getSize();
  if (!tamano.x || !tamano.y) return;
  ruta.mapa.fitBounds(L.latLngBounds(ruta.puntos), { padding: [70, 70], maxZoom: 6, animate: false });
  ruta.zoomSeguimiento = Math.min(ruta.mapa.getZoom() + 1, 6);
}

function pausar() {
  ruta.reproduciendo = false;
  cancelAnimationFrame(ruta.frame);
  ruta.mapa.stop();
  etiquetaBoton();
}

function facilitar(p) {
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
}

function paso(ts) {
  if (!ruta.reproduciendo) return;
  if (ruta.inicioTs === null) ruta.inicioTs = ts;

  const duracion = DURACION_MS * (1 - ruta.tInicial);
  const progreso = duracion > 0 ? Math.min((ts - ruta.inicioTs) / duracion, 1) : 1;
  const t = ruta.tInicial + (1 - ruta.tInicial) * facilitar(progreso);
  actualizar(t);

  if (t >= 1) {
    ruta.reproduciendo = false;
    etiquetaBoton();
    return;
  }
  ruta.frame = requestAnimationFrame(paso);
}

function reproducir() {
  if (ruta.reproduciendo) return pausar();

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    actualizar(ruta.t >= 1 ? 0 : 1);
    etiquetaBoton();
    return;
  }

  if (ruta.t >= 1) actualizar(0);
  ruta.reproduciendo = true;
  ruta.tInicial = ruta.t;
  ruta.inicioTs = null;
  ruta.arrancado = false;
  ruta.sesion += 1;
  etiquetaBoton();

  // El recorrido empieza cuando termina el vuelo inicial de cámara.
  const sesion = ruta.sesion;
  const arrancar = () => {
    if (sesion !== ruta.sesion || ruta.arrancado || !ruta.reproduciendo) return;
    ruta.arrancado = true;
    ruta.frame = requestAnimationFrame(paso);
  };
  ruta.mapa.flyTo(posicionEn(ruta.t), ruta.zoomSeguimiento, { duration: 1.2 });
  ruta.mapa.once('moveend', arrancar);
  setTimeout(arrancar, 1600);
}

function cambiarGrupo(grupo) {
  pausar();
  ruta.grupo = grupo;
  prepararRuta();

  ruta.capaEstados.setStyle(estiloEstado);
  ruta.capaTrazo.setLatLngs(ruta.puntos);
  ruta.capaEstaciones.clearLayers();
  ruta.marcadoresEstacion = ruta.estaciones.map((e, i) => {
    const arriba = i % 2 === 0;
    return L.circleMarker(e.centro, {
      radius: 5,
      color: '#9fe3c8',
      weight: 1.5,
      fillColor: '#0b1a16',
      fillOpacity: 1
    })
      .bindTooltip(e.nombre, {
        permanent: true,
        direction: arriba ? 'top' : 'bottom',
        offset: [0, arriba ? -8 : 8],
        className: 'ruta-etiqueta'
      })
      .addTo(ruta.capaEstaciones);
  });
  ruta.indiceActivo = -1;

  document.querySelectorAll('.ruta-grupo').forEach(boton => {
    const activo = boton.dataset.grupo === grupo;
    boton.classList.toggle('is-active', activo);
    boton.setAttribute('aria-pressed', String(activo));
  });
  const primera = ruta.estaciones[0].nombre;
  const ultima = ruta.estaciones[ruta.estaciones.length - 1].nombre;
  document.getElementById('ruta-titulo').textContent = GRUPOS[grupo].titulo;
  document.getElementById('ruta-subtitulo').textContent =
    `${ruta.estaciones.length} Estados · de ${primera} a ${ultima}`;

  dibujarPerfil();
  ajustarVista();
  actualizar(0);
}

function iniciarMapa() {
  ruta.mapa = L.map('ruta-mapa', {
    attributionControl: false,
    scrollWheelZoom: false,
    minZoom: 3,
    maxZoom: 8
  }).setView([-14, -50], 4);

  ruta.capaEstados = L.geoJSON(ruta.geojson, {
    style: estiloEstado,
    onEachFeature: (feature, capa) => {
      ruta.centros[feature.properties.name] = capa.getBounds().getCenter();
    }
  }).addTo(ruta.mapa);

  ruta.capaTrazo = L.polyline([], {
    color: '#6fd3b0', weight: 2, opacity: 0.35, dashArray: '6 8', interactive: false
  }).addTo(ruta.mapa);
  ruta.capaRecorrido = L.polyline([], {
    color: '#c9f5de', weight: 3.5, opacity: 0.95, lineCap: 'round', interactive: false
  }).addTo(ruta.mapa);
  ruta.capaEstaciones = L.layerGroup().addTo(ruta.mapa);
  ruta.marcador = L.marker([0, 0], {
    icon: L.divIcon({
      className: 'ruta-crudo-wrap',
      html: '<span class="ruta-crudo"></span>',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    }),
    interactive: false,
    keyboard: false
  }).addTo(ruta.mapa);
}

async function iniciarRuta() {
  try {
    if (!window.L) throw new Error('No se cargó Leaflet desde unpkg.com. Comprueba la conexión a Internet.');

    const [datos, geojson] = await Promise.all([
      leerJSON('map_data.json'),
      leerJSON('data/brasil-estados.geojson')
    ]);
    if (!Array.isArray(datos) || datos.length === 0) {
      throw new Error('map_data.json no contiene datos por Estado.');
    }
    ruta.datos = datos;
    ruta.geojson = geojson;

    iniciarMapa();
    document.getElementById('estado-ruta').hidden = true;
    ruta.mapa.invalidateSize({ animate: false });
    cambiarGrupo('todos');

    document.querySelectorAll('.ruta-grupo').forEach(boton => {
      boton.addEventListener('click', () => cambiarGrupo(boton.dataset.grupo));
    });
    document.getElementById('ruta-reproducir').addEventListener('click', reproducir);
    document.getElementById('ruta-deslizador').addEventListener('input', evento => {
      pausar();
      const t = Number(evento.target.value) / 1000;
      actualizar(t);
      ruta.mapa.panTo(posicionEn(t), { animate: false });
    });

    new ResizeObserver(() => {
      ruta.mapa.invalidateSize({ animate: false });
      if (!ruta.reproduciendo && ruta.puntos.length > 1) ajustarVista();
    }).observe(document.getElementById('ruta-mapa'));
  } catch (error) {
    mostrarError('estado-ruta', `No se pudo cargar el recorrido. ${error.message}`, error);
  }
}

iniciarRuta();
