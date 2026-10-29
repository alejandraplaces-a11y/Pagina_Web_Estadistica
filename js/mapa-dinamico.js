const INTERVALO_MS = 4200;

const formatoNumero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });
const formatoEntero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

const dinamico = {
  datos: [],
  orden: [],
  mapa: null,
  capaEstados: null,
  capaBurbujas: null,
  centros: {},
  limites: {},
  activo: null,
  paso: -1,
  pausado: false,
  temporizador: null
};

const maximoOleo = () => Math.max(...dinamico.datos.map(fila => fila['Óleo (bbl/dia)']));

function colorEscala(t) {
  const inicio = [0xe7, 0xf3, 0xee];
  const fin = [0x0b, 0x5b, 0x4f];
  return '#' + inicio.map((x, i) => Math.round(x + (fin[i] - x) * t).toString(16).padStart(2, '0')).join('');
}

function abreviar(oleo) {
  if (oleo < 1000) return formatoEntero.format(oleo);
  // En mapas estrechos basta un decimal: menos texto dentro de la burbuja.
  const estrecho = dinamico.mapa && dinamico.mapa.getSize().x < 560;
  const miles = oleo / 1000;
  const texto = estrecho
    ? new Intl.NumberFormat('es-EC', { maximumFractionDigits: 1 }).format(miles)
    : formatoNumero.format(miles);
  return `${texto} k`;
}

function estiloEstado(feature) {
  const nombre = feature.properties.name;
  const fila = dinamico.datos.find(f => f.Estado === nombre);
  if (!fila) return { fillColor: '#e3e8e5', fillOpacity: 1, color: '#ffffff', weight: 0.8 };

  const activo = nombre === dinamico.activo;
  return {
    fillColor: colorEscala(Math.sqrt(fila['Óleo (bbl/dia)'] / maximoOleo())),
    fillOpacity: 0.9,
    color: activo ? '#0f172a' : '#ffffff',
    weight: activo ? 2.5 : 0.8
  };
}

function dibujar() {
  const max = maximoOleo();
  // En pantallas estrechas las burbujas se reducen para no taparse entre sí.
  const escala = dinamico.mapa ? Math.max(0.55, Math.min(1, dinamico.mapa.getSize().x / 900)) : 1;
  dinamico.capaEstados.setStyle(estiloEstado);
  dinamico.capaBurbujas.clearLayers();

  dinamico.datos.forEach(fila => {
    const oleo = fila['Óleo (bbl/dia)'];
    if (oleo <= 0) return;

    const diametro = (28 + 30 * Math.sqrt(oleo / max)) * escala;
    L.marker(dinamico.centros[fila.Estado], {
      icon: L.divIcon({
        className: fila.Estado === dinamico.activo ? 'burbuja is-active' : 'burbuja',
        html: `<span>${abreviar(oleo)}</span>`,
        iconSize: [diametro, diametro],
        iconAnchor: [diametro / 2, diametro / 2]
      }),
      interactive: false,
      keyboard: false
    }).addTo(dinamico.capaBurbujas);
  });
}

function mostrarVista(fila) {
  dinamico.activo = fila ? fila.Estado : null;
  const texto = document.getElementById('estado-dinamico');

  if (fila) {
    dinamico.mapa.flyToBounds(dinamico.limites[fila.Estado], { maxZoom: 6, padding: [60, 60], duration: 1.2 });
    texto.textContent = `${fila.Estado} · ${formatoNumero.format(fila['Óleo (bbl/dia)'])} bbl/día · ` +
      `${formatoEntero.format(fila.Pozos)} pozos · ${dinamico.paso + 1} de ${dinamico.orden.length}`;
  } else {
    dinamico.mapa.flyToBounds(dinamico.capaEstados.getBounds(), { padding: [24, 24], duration: 1.2 });
    texto.textContent = `Brasil · ${dinamico.datos.length} Estados con registros terrestres · enero de 2023`;
  }
  dibujar();
}

function siguientePaso() {
  dinamico.paso = (dinamico.paso + 1) % (dinamico.orden.length + 1);
  mostrarVista(dinamico.paso < dinamico.orden.length ? dinamico.orden[dinamico.paso] : null);
}

function programar() {
  clearTimeout(dinamico.temporizador);
  if (dinamico.pausado) return;
  dinamico.temporizador = setTimeout(() => {
    siguientePaso();
    programar();
  }, INTERVALO_MS);
}

function alternarPausa() {
  dinamico.pausado = !dinamico.pausado;
  const boton = document.getElementById('boton-pausa');
  boton.textContent = dinamico.pausado ? 'Reanudar recorrido' : 'Pausar recorrido';
  boton.setAttribute('aria-pressed', String(dinamico.pausado));

  if (dinamico.pausado) {
    clearTimeout(dinamico.temporizador);
  } else {
    siguientePaso();
    programar();
  }
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
    dinamico.datos = datos;
    dinamico.orden = [...datos].sort((a, b) => b['Óleo (bbl/dia)'] - a['Óleo (bbl/dia)']);

    dinamico.mapa = L.map('mapa-dinamico', {
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 9
    }).addTo(dinamico.mapa);

    dinamico.capaEstados = L.geoJSON(geojson, {
      onEachFeature: (feature, capa) => {
        const nombre = feature.properties.name;
        dinamico.limites[nombre] = capa.getBounds();
        dinamico.centros[nombre] = capa.getBounds().getCenter();
      }
    }).addTo(dinamico.mapa);
    dinamico.capaBurbujas = L.layerGroup().addTo(dinamico.mapa);
    dinamico.mapa.fitBounds(dinamico.capaEstados.getBounds(), { padding: [24, 24], animate: false });
    dinamico.mapa.invalidateSize({ animate: false });
    document.getElementById('estado-dinamico').hidden = true;
    let anchoPrevio = dinamico.mapa.getSize().x;
    new ResizeObserver(() => {
      dinamico.mapa.invalidateSize({ animate: false });
      if (dinamico.activo) {
        dinamico.mapa.fitBounds(dinamico.limites[dinamico.activo], { maxZoom: 6, padding: [60, 60], animate: false });
      } else {
        dinamico.mapa.fitBounds(dinamico.capaEstados.getBounds(), { padding: [24, 24], animate: false });
      }
      const ancho = dinamico.mapa.getSize().x;
      if (Math.abs(ancho - anchoPrevio) > 40) {
        anchoPrevio = ancho;
        dibujar();
      }
    }).observe(document.getElementById('mapa-dinamico'));

    document.getElementById('boton-pausa').addEventListener('click', alternarPausa);

    const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducirMovimiento) {
      dinamico.pausado = true;
      const boton = document.getElementById('boton-pausa');
      boton.textContent = 'Reproducir recorrido';
      boton.setAttribute('aria-pressed', 'true');
      mostrarVista(null);
    } else {
      siguientePaso();
      programar();
    }
  } catch (error) {
    mostrarError('estado-dinamico', `No se pudo cargar el mapa. ${error.message}`, error);
  }
}

iniciar();