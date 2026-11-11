async function leerJSON(ruta) {
  if (location.protocol === 'file:') {
    throw new Error('No abras index.html con doble clic. Ejecuta python -m http.server 8000 en la carpeta del proyecto y abre http://localhost:8000.');
  }
  let respuesta;
  try {
    respuesta = await fetch(ruta);
  } catch (error) {
    throw new Error(`No se pudo descargar ${ruta}. Comprueba que el servidor esté activo.`);
  }
  if (!respuesta.ok) {
    if (respuesta.status === 404) {
      const ayuda = ruta === 'data/map_data.json'
        ? ' Ejecuta .venv/bin/python scripts/1_preprocesamiento_mapa.py data/2023_01_producao_Terra.csv y coloca el JSON generado en data/.'
        : '';
      throw new Error(`${ruta}: el archivo no existe en la carpeta data/.${ayuda}`);
    }
    throw new Error(`${ruta}: el servidor respondió HTTP ${respuesta.status} ${respuesta.statusText}.`.trim());
  }
  try {
    return await respuesta.json();
  } catch (error) {
    throw new Error(`${ruta} no contiene JSON válido. Comprueba que la URL no devuelva una página HTML.`);
  }
}

function mostrarError(id, mensaje, error) {
  const estado = document.getElementById(id);
  if (!estado) {
    console.error(mensaje, error);
    return;
  }
  estado.hidden = false;
  estado.textContent = mensaje;
  estado.className = 'status status-error';
  estado.setAttribute('role', 'alert');
  console.error(error);
}

function plotlyDisponible() {
  return Boolean(window.Plotly && typeof window.Plotly.newPlot === 'function');
}

// Las tablas y los resultados se llenan antes de llamar aquí. Si Plotly no carga,
// solo se avisa en las gráficas vacías; el resto de la sección sigue visible.
async function dibujarGraficas(dibujos = []) {
  if (!plotlyDisponible()) {
    console.error('Plotly no está disponible: las tablas y los resultados se muestran sin gráficas.');
    document.querySelectorAll('.chart-box').forEach(caja => {
      if (caja.childElementCount === 0 && !caja.textContent.trim()) {
        caja.textContent = 'La gráfica no está disponible porque la librería Plotly no cargó. Las tablas y los resultados de esta sección siguen visibles.';
        caja.style.display = 'flex';
        caja.style.alignItems = 'center';
        caja.style.justifyContent = 'center';
        caja.style.padding = '24px';
        caja.style.textAlign = 'center';
        caja.style.fontSize = '13px';
        caja.style.color = 'var(--ink-soft, #5c665f)';
      }
    });
    return false;
  }

  const resultados = await Promise.allSettled(dibujos.map(dibujo => Promise.resolve().then(dibujo)));
  resultados.forEach(resultado => {
    if (resultado.status === 'rejected') {
      console.error('No se pudo dibujar una gráfica con Plotly:', resultado.reason);
    }
  });
  return resultados.every(resultado => resultado.status === 'fulfilled');
}
