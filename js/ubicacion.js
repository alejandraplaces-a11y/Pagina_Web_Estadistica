const COLOR_MIN = [213, 235, 226];
const COLOR_MAX = [11, 91, 79];
const COLOR_SIN_DATOS = '#e6e9e7';
const NS = 'http://www.w3.org/2000/svg';
const LADO = { ancho: 1000, alto: 720 };
const MAPA = { izq: 50, der: 700, arriba: 36, abajo: 690 };
const FACTOR_LON = Math.cos(-15 * Math.PI / 180);
const KM_POR_GRADO = 111.2;
const RADIO = { min: 4, max: 21 };

const formatoEntero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
const formatoDecimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });

function crear(etiqueta, atributos = {}, texto) {
  const elemento = document.createElementNS(NS, etiqueta);
  Object.entries(atributos).forEach(([clave, valor]) => elemento.setAttribute(clave, valor));
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

const colorDe = t => `rgb(${COLOR_MIN.map((inicio, i) => Math.round(inicio + (COLOR_MAX[i] - inicio) * t)).join(',')})`;
const radioDe = (valor, maximo) => RADIO.min + (RADIO.max - RADIO.min) * Math.sqrt(valor / maximo);
const poligonosDe = geometria => (geometria.type === 'Polygon' ? [geometria.coordinates] : geometria.coordinates);

function proyeccionDe(geojson) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  geojson.features.forEach(f => poligonosDe(f.geometry).forEach(poligono => poligono.forEach(anillo => anillo.forEach(([lon, lat]) => {
    minX = Math.min(minX, lon); maxX = Math.max(maxX, lon);
    minY = Math.min(minY, lat); maxY = Math.max(maxY, lat);
  }))));

  const escala = Math.min(
    (MAPA.der - MAPA.izq) / ((maxX - minX) * FACTOR_LON),
    (MAPA.abajo - MAPA.arriba) / (maxY - minY)
  );
  return {
    escala, minX, maxX, minY, maxY,
    x: lon => MAPA.izq + (lon - minX) * FACTOR_LON * escala,
    y: lat => MAPA.arriba + (maxY - lat) * escala
  };
}

function trazado(poligonos, p) {
  return poligonos.map(anillos => anillos.map(anillo =>
    'M' + anillo.map(([lon, lat]) => `${p.x(lon).toFixed(1)} ${p.y(lat).toFixed(1)}`).join('L') + 'Z'
  ).join('')).join('');
}

function centroideDelMayor(poligonos) {
  let mejor = null;
  poligonos.forEach(anillos => {
    const anillo = anillos[0];
    let area = 0, cx = 0, cy = 0;
    for (let i = 0; i < anillo.length - 1; i++) {
      const [x0, y0] = anillo[i], [x1, y1] = anillo[i + 1];
      const c = x0 * y1 - x1 * y0;
      area += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c;
    }
    area /= 2;
    if (!mejor || Math.abs(area) > Math.abs(mejor.area)) {
      mejor = { area, lon: cx / (6 * area), lat: cy / (6 * area) };
    }
  });
  return mejor;
}

function rejilla(p) {
  const lineas = crear('g', { fill: 'none', stroke: '#b9c4bf', 'stroke-width': 0.8, 'stroke-dasharray': '3 4' });
  const etiquetas = crear('g', { 'font-size': 10, fill: '#5f6b66', 'font-family': 'system-ui, sans-serif' });

  for (let lon = Math.ceil(p.minX / 5) * 5; lon <= p.maxX; lon += 5) {
    const x = p.x(lon);
    lineas.appendChild(crear('line', { x1: x, x2: x, y1: MAPA.arriba, y2: MAPA.abajo }));
    etiquetas.appendChild(crear('text', { x, y: MAPA.arriba - 10, 'text-anchor': 'middle' }, `${Math.abs(lon)}°${lon < 0 ? 'O' : 'E'}`));
  }
  for (let lat = Math.ceil(p.minY / 5) * 5; lat <= p.maxY; lat += 5) {
    const y = p.y(lat);
    lineas.appendChild(crear('line', { x1: MAPA.izq, x2: MAPA.der, y1: y, y2: y }));
    etiquetas.appendChild(crear('text', { x: MAPA.izq - 8, y: y + 3, 'text-anchor': 'end' }, `${Math.abs(lat)}°${lat < 0 ? 'S' : 'N'}`));
  }
  return [lineas, etiquetas];
}

function leyenda(p, oleoMaximo) {
  const grupo = crear('g', { 'font-family': 'system-ui, sans-serif', fill: '#1f2d2a' });
  const dibujarTexto = (atributos, texto) => grupo.appendChild(crear('text', atributos, texto));

  grupo.appendChild(crear('rect', { x: 740, y: 36, width: 240, height: 330, rx: 4, fill: '#ffffff', stroke: '#c9d3ce' }));
  dibujarTexto({ x: 756, y: 60, 'font-size': 12, 'font-weight': 700, 'letter-spacing': '0.08em' }, 'LEYENDA');

  const defs = crear('defs');
  const gradiente = crear('linearGradient', { id: 'gradiente-ubicacion' });
  gradiente.appendChild(crear('stop', { offset: '0%', 'stop-color': colorDe(0) }));
  gradiente.appendChild(crear('stop', { offset: '100%', 'stop-color': colorDe(1) }));
  defs.appendChild(gradiente);
  grupo.appendChild(defs);
  grupo.appendChild(crear('rect', { x: 756, y: 72, width: 208, height: 10, rx: 2, fill: 'url(#gradiente-ubicacion)' }));
  dibujarTexto({ x: 756, y: 96, 'font-size': 10, fill: '#5f6b66' }, '0 bbl/día');
  dibujarTexto({ x: 964, y: 96, 'font-size': 10, fill: '#5f6b66', 'text-anchor': 'end' }, `${formatoEntero.format(oleoMaximo)} bbl/día`);
  dibujarTexto({ x: 756, y: 114, 'font-size': 11 }, 'Estado con registros (óleo total)');

  grupo.appendChild(crear('rect', { x: 756, y: 124, width: 18, height: 12, fill: COLOR_SIN_DATOS, stroke: '#c9d3ce' }));
  dibujarTexto({ x: 782, y: 134, 'font-size': 11 }, 'Sin registros terrestres');

  dibujarTexto({ x: 756, y: 170, 'font-size': 12, 'font-weight': 700, 'letter-spacing': '0.08em' }, 'SIMBOLOGÍA');
  const muestras = [1000, 10000, 25000];
  const posiciones = [778, 836, 904];
  muestras.forEach((valor, i) => {
    const r = radioDe(valor, oleoMaximo);
    grupo.appendChild(crear('circle', { cx: posiciones[i], cy: 222 - r, r, fill: 'rgba(15,118,110,0.78)', stroke: '#ffffff', 'stroke-width': 1.5 }));
    dibujarTexto({ x: posiciones[i], y: 240, 'font-size': 10, 'text-anchor': 'middle', fill: '#5f6b66' }, formatoEntero.format(valor));
  });
  dibujarTexto({ x: 756, y: 262, 'font-size': 11 }, 'Tamaño: óleo total del estado (bbl/día)');

  dibujarTexto({ x: 756, y: 296, 'font-size': 12, 'font-weight': 700, 'letter-spacing': '0.08em' }, 'ESCALA');
  const pxPorKm = p.escala / KM_POR_GRADO;
  const barra = 500 * pxPorKm;
  grupo.appendChild(crear('rect', { x: 756, y: 308, width: barra / 2, height: 6, fill: '#1f2d2a' }));
  grupo.appendChild(crear('rect', { x: 756 + barra / 2, y: 308, width: barra / 2, height: 6, fill: '#ffffff', stroke: '#1f2d2a', 'stroke-width': 0.8 }));
  dibujarTexto({ x: 756, y: 328, 'font-size': 10, fill: '#5f6b66' }, '0');
  dibujarTexto({ x: 756 + barra / 2, y: 328, 'font-size': 10, fill: '#5f6b66', 'text-anchor': 'middle' }, '250');
  dibujarTexto({ x: 756 + barra + 6, y: 328, 'font-size': 10, fill: '#5f6b66' }, '500 km');

  grupo.appendChild(crear('path', { d: 'M950 350 L956 340 L962 350 L956 346 Z', fill: '#1f2d2a' }));
  dibujarTexto({ x: 956, y: 364, 'font-size': 10, 'text-anchor': 'middle', fill: '#5f6b66' }, 'N');
  return grupo;
}

function dibujarMapa(svg, geojson, datos) {
  const p = proyeccionDe(geojson);
  const oleoMaximo = Math.max(...datos.map(d => d['Óleo (bbl/dia)']));
  const porEstado = new Map(datos.map(d => [d.Estado, d]));

  const estados = crear('g', { stroke: '#ffffff', 'stroke-width': 0.9, 'stroke-linejoin': 'round' });
  const burbujas = crear('g');
  const etiquetas = crear('g', { 'font-family': 'system-ui, sans-serif', 'font-size': 11, 'font-weight': 600, fill: '#1f2d2a', stroke: '#ffffff', 'stroke-width': 3, 'paint-order': 'stroke' });

  const [lineasRejilla, etiquetasRejilla] = rejilla(p);
  svg.appendChild(lineasRejilla);
  svg.appendChild(etiquetasRejilla);

  geojson.features.forEach(f => {
    const nombre = f.properties.name;
    const d = porEstado.get(nombre);
    const poligonos = poligonosDe(f.geometry);
    const fondo = d ? colorDe(Math.sqrt(d['Óleo (bbl/dia)'] / oleoMaximo)) : COLOR_SIN_DATOS;
    const forma = crear('path', { d: trazado(poligonos, p), fill: fondo, 'fill-rule': 'evenodd' });
    forma.appendChild(crear('title', {}, d
      ? `${nombre}: ${formatoDecimal.format(d['Óleo (bbl/dia)'])} bbl/día · ${formatoEntero.format(d.Pozos)} pozos`
      : `${nombre}: sin registros terrestres en el archivo`));
    estados.appendChild(forma);

    if (!d) return;
    const c = centroideDelMayor(poligonos);
    const cx = p.x(c.lon), cy = p.y(c.lat);
    const conBurbuja = d['Óleo (bbl/dia)'] > 0;
    const r = conBurbuja ? radioDe(d['Óleo (bbl/dia)'], oleoMaximo) : 0;

    if (conBurbuja) {
      const burbuja = crear('circle', { cx, cy, r, fill: 'rgba(15,118,110,0.78)', stroke: '#ffffff', 'stroke-width': 1.5 });
      burbuja.appendChild(crear('title', {}, `${nombre}: ${formatoDecimal.format(d['Óleo (bbl/dia)'])} bbl/día`));
      burbujas.appendChild(burbuja);
    }
    etiquetas.appendChild(crear('text', { x: cx, y: cy + r + 13, 'text-anchor': 'middle' }, nombre));
  });

  svg.appendChild(estados);
  svg.appendChild(burbujas);
  svg.appendChild(etiquetas);
  svg.appendChild(leyenda(p, oleoMaximo));
}

async function iniciarUbicacion() {
  const contenedor = document.getElementById('mapa-ubicacion');
  try {
    if (!contenedor) return;
    const [datos, geojson] = await Promise.all([
      leerJSON('map_data.json'),
      leerJSON('data/brasil-estados.geojson')
    ]);
    if (!Array.isArray(datos) || datos.length === 0) {
      throw new Error('map_data.json no contiene datos por Estado.');
    }

    const svg = crear('svg', {
      viewBox: `0 0 ${LADO.ancho} ${LADO.alto}`,
      role: 'img',
      'aria-labelledby': 'ubicacion-titulo ubicacion-desc',
      class: 'mapa-svg',
      'font-family': 'system-ui, sans-serif'
    });
    svg.appendChild(crear('title', { id: 'ubicacion-titulo' }, 'Mapa de Brasil con la producción terrestre de petróleo por Estado'));
    svg.appendChild(crear('desc', { id: 'ubicacion-desc' }, 'Nueve estados con registros terrestres coloreados según su óleo total y con burbujas proporcionales; los demás estados aparecen en gris.'));

    dibujarMapa(svg, geojson, datos);
    contenedor.appendChild(svg);
    document.getElementById('estado-ubicacion').hidden = true;
  } catch (error) {
    mostrarError('estado-ubicacion', `No se pudo cargar el mapa. ${error.message}`, error);
  }
}

iniciarUbicacion();
