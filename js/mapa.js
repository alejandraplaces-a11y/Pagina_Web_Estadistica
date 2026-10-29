const METRICAS = {
  oleo: { campo: 'Óleo (bbl/dia)', etiqueta: 'Óleo (bbl/día)', unidad: 'bbl/día', colores: ['#e7f3ee', '#0b5b4f'] },
  pozos: { campo: 'Pozos', etiqueta: 'Pozos únicos', unidad: 'pozos', colores: ['#e8f0e4', '#2e7d5b'] }
};

const formatoNumero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });
const formatoEntero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
const formatoPorcentaje = new Intl.NumberFormat('es-CO', { style: 'percent', maximumFractionDigits: 1 });

const estado = {
  datos: [],
  orden: [],
  mapa: null,
  capaEstados: null,
  capaBurbujas: null,
  centros: {},
  limites: {},
  metrica: 'oleo',
  umbral: 0,
  seleccion: null
};

const valorDe = (fila, metrica) => fila[METRICAS[metrica].campo];
const filaDe = nombre => estado.datos.find(fila => fila.Estado === nombre);
const maximo = () => Math.max(...estado.datos.map(fila => valorDe(fila, estado.metrica)));
const totalMetrica = () => estado.datos.reduce((suma, fila) => suma + valorDe(fila, estado.metrica), 0);

function formatear(valor) {
  return (estado.metrica === 'pozos' ? formatoEntero : formatoNumero).format(valor);
}

function abreviar(valor) {
  if (estado.metrica === 'pozos' || valor < 1000) return formatoEntero.format(valor);
  // En mapas estrechos basta un decimal: menos texto dentro de la burbuja.
  const estrecho = estado.mapa && estado.mapa.getSize().x < 560;
  const miles = valor / 1000;
  const texto = estrecho
    ? new Intl.NumberFormat('es-EC', { maximumFractionDigits: 1 }).format(miles)
    : formatoNumero.format(miles);
  return `${texto} k`;
}

function mezclar([inicio, fin], t) {
  const canales = color => [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
  const a = canales(inicio);
  const b = canales(fin);
  return '#' + a.map((x, i) => Math.round(x + (b[i] - x) * t).toString(16).padStart(2, '0')).join('');
}

function estiloEstado(feature) {
  const nombre = feature.properties.name;
  const fila = filaDe(nombre);
  const seleccionado = nombre === estado.seleccion;
  if (!fila) return { fillColor: '#e3e8e5', fillOpacity: 1, color: '#ffffff', weight: 0.8 };

  const valor = valorDe(fila, estado.metrica);
  const oculto = valor < (estado.umbral / 100) * maximo();
  return {
    fillColor: oculto ? '#eef2f0' : mezclar(METRICAS[estado.metrica].colores, Math.sqrt(valor / maximo())),
    fillOpacity: oculto ? 0.6 : 0.9,
    color: seleccionado ? '#0f172a' : '#ffffff',
    weight: seleccionado ? 2.5 : 0.8
  };
}

function dibujarBurbujas() {
  const max = maximo();
  const minimo = (estado.umbral / 100) * max;
  const unidad = METRICAS[estado.metrica].unidad;
  // En pantallas estrechas las burbujas se reducen para no taparse entre sí.
  const escala = Math.max(0.55, Math.min(1, estado.mapa.getSize().x / 900));
  estado.capaBurbujas.clearLayers();

  estado.datos.forEach(fila => {
    const valor = valorDe(fila, estado.metrica);
    if (valor <= 0 || valor < minimo) return;

    const diametro = (30 + 34 * Math.sqrt(valor / max)) * escala;
    const activa = fila.Estado === estado.seleccion;
    L.marker(estado.centros[fila.Estado], {
      icon: L.divIcon({
        className: activa ? 'burbuja is-active' : 'burbuja',
        html: `<span>${abreviar(valor)}</span>`,
        iconSize: [diametro, diametro],
        iconAnchor: [diametro / 2, diametro / 2]
      }),
      title: `${fila.Estado}: ${formatear(valor)} ${unidad}`,
      alt: `${fila.Estado}: ${formatear(valor)} ${unidad}`
    })
      .bindTooltip(`<strong>${fila.Estado}</strong><br>${formatear(valor)} ${unidad}`)
      .on('click', () => seleccionar(fila.Estado))
      .addTo(estado.capaBurbujas);
  });
}

function actualizarLeyenda() {
  const metrica = METRICAS[estado.metrica];
  document.querySelector('.legend-scale').style.background =
    `linear-gradient(90deg, ${metrica.colores[0]}, ${metrica.colores[1]})`;
  document.getElementById('escala-max').textContent = `${formatear(maximo())} ${metrica.unidad}`;
  document.getElementById('escala-etiqueta').textContent = metrica.etiqueta;
}

function actualizarPanel() {
  const titulo = document.getElementById('panel-titulo');
  const subtitulo = document.getElementById('panel-subtitulo');
  const total = totalMetrica();

  if (!estado.seleccion) {
    titulo.textContent = 'Brasil · producción en tierra';
    subtitulo.textContent = `${estado.datos.length} Estados con registros. Ordenados por ${METRICAS[estado.metrica].etiqueta.toLowerCase()}.`;
    document.getElementById('panel-oleo').textContent = formatoNumero.format(
      estado.datos.reduce((suma, fila) => suma + fila['Óleo (bbl/dia)'], 0)
    );
    document.getElementById('panel-pozos').textContent = formatoEntero.format(
      estado.datos.reduce((suma, fila) => suma + fila.Pozos, 0)
    );
    document.getElementById('panel-participacion').textContent = formatoPorcentaje.format(1);
    document.getElementById('panel-ranking').textContent = '—';
    return;
  }

  const fila = filaDe(estado.seleccion);
  titulo.textContent = fila.Estado;
  subtitulo.textContent = 'Producción terrestre registrada en enero de 2023.';
  document.getElementById('panel-oleo').textContent = formatoNumero.format(fila['Óleo (bbl/dia)']);
  document.getElementById('panel-pozos').textContent = formatoEntero.format(fila.Pozos);
  document.getElementById('panel-participacion').textContent = formatoPorcentaje.format(
    total ? valorDe(fila, estado.metrica) / total : 0
  );
  document.getElementById('panel-ranking').textContent =
    `${estado.orden.findIndex(f => f.Estado === fila.Estado) + 1} de ${estado.orden.length}`;
}

function marcarRanking() {
  document.querySelectorAll('#ranking-lista li').forEach(item => {
    item.classList.toggle('is-active', item.dataset.estado === estado.seleccion);
  });
}

function construirRanking() {
  const lista = document.getElementById('ranking-lista');
  estado.orden = [...estado.datos].sort((a, b) => valorDe(b, estado.metrica) - valorDe(a, estado.metrica));
  lista.innerHTML = '';

  estado.orden.forEach(fila => {
    const item = document.createElement('li');
    item.dataset.estado = fila.Estado;

    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'ranking-item';

    const nombre = document.createElement('span');
    nombre.textContent = fila.Estado;
    const valor = document.createElement('span');
    valor.textContent = `${formatear(valorDe(fila, estado.metrica))} ${METRICAS[estado.metrica].unidad}`;

    boton.append(nombre, valor);
    boton.addEventListener('click', () => seleccionar(fila.Estado));
    item.appendChild(boton);
    lista.appendChild(item);
  });
  marcarRanking();
}

function redibujar() {
  estado.capaEstados.setStyle(estiloEstado);
  dibujarBurbujas();
  actualizarLeyenda();
}

function seleccionar(nombre) {
  estado.seleccion = nombre;
  redibujar();
  actualizarPanel();
  marcarRanking();
  if (nombre && estado.limites[nombre]) {
    estado.mapa.flyToBounds(estado.limites[nombre], { maxZoom: 6, padding: [40, 40], duration: 0.8 });
  }
}

function reiniciar() {
  estado.umbral = 0;
  document.getElementById('umbral-mapa').value = 0;
  document.getElementById('umbral-salida').textContent = '0 %';
  document.getElementById('metrica-mapa').value = 'oleo';
  estado.metrica = 'oleo';
  construirRanking();
  estado.seleccion = null;
  redibujar();
  actualizarPanel();
  estado.mapa.flyToBounds(estado.capaEstados.getBounds(), { padding: [24, 24], duration: 0.8 });
}
function enlazarControles() {
  document.getElementById('metrica-mapa').addEventListener('change', evento => {
    estado.metrica = evento.target.value;
    construirRanking();
    redibujar();
    actualizarPanel();
  });

  const umbral = document.getElementById('umbral-mapa');
  umbral.addEventListener('input', () => {
    estado.umbral = Number(umbral.value);
    document.getElementById('umbral-salida').textContent = `${umbral.value} %`;
    redibujar();
  });

  document.getElementById('boton-reiniciar-mapa').addEventListener('click', reiniciar);
}

async function iniciar() {
  try {
    if (!window.L) throw new Error('No se cargó Leaflet desde unpkg.com. Comprueba la conexión a Internet.');

    const [datos, geojson] = await Promise.all([
      leerJSON('map_data.json'),
      leerJSON('data/brasil-estados.geojson')
    ]);
    if (!Array.isArray(datos) || datos.length === 0) {
      throw new Error('map_data.json no contiene datos por Estado.');
    }
    estado.datos = datos;

    estado.mapa = L.map('mapa', { scrollWheelZoom: false, minZoom: 3, maxZoom: 9 });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 9
    }).addTo(estado.mapa);

    estado.capaEstados = L.geoJSON(geojson, {
      onEachFeature: (feature, capa) => {
        const nombre = feature.properties.name;
        estado.limites[nombre] = capa.getBounds();
        estado.centros[nombre] = capa.getBounds().getCenter();
        capa.on('click', () => {
          if (filaDe(nombre)) seleccionar(nombre);
        });
      }
    }).addTo(estado.mapa);

    estado.capaBurbujas = L.layerGroup().addTo(estado.mapa);
    estado.mapa.fitBounds(estado.capaEstados.getBounds(), { padding: [24, 24] });
    estado.mapa.invalidateSize({ animate: false });
    let anchoPrevio = estado.mapa.getSize().x;
    new ResizeObserver(() => {
      estado.mapa.invalidateSize({ animate: false });
      if (!estado.seleccion) estado.mapa.fitBounds(estado.capaEstados.getBounds(), { padding: [24, 24], animate: false });
      const ancho = estado.mapa.getSize().x;
      if (Math.abs(ancho - anchoPrevio) > 40) {
        anchoPrevio = ancho;
        redibujar();
      }
    }).observe(document.getElementById('mapa'));

    construirRanking();
    redibujar();
    actualizarPanel();
    enlazarControles();
    document.getElementById('estado-mapa').hidden = true;
  } catch (error) {
    mostrarError('estado-mapa', `No se pudo cargar el mapa. ${error.message}`, error);
  }
}

iniciar();