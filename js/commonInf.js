async function leerJSON(ruta) {
  if (location.protocol === 'file:') {
    throw new Error('No abras index.html con doble clic. Ejecuta python -m http.server 8000 en la carpeta del proyecto y abre http://localhost:8000.');
  }
  let respuesta;
  try {
    respuesta = await fetch(ruta);
  } catch (error) {
    throw new Error(`No se pudo descargar ${ruta}. Comprueba la conexión y que el servidor esté activo.`);
  }
  if (!respuesta.ok) {
    const ayuda = ruta === 'map_data.json'
      ? ' Ejecuta python 1_preprocesamiento_mapa.py y publica el JSON generado junto a index.html.'
      : ' Coloca el archivo JSON en la carpeta data/ junto a estadisticaInferencial.html.';
    throw new Error(`${ruta}: HTTP ${respuesta.status}.${ayuda}`);
  }
  try {
    return await respuesta.json();
  } catch (error) {
    throw new Error(`${ruta} no contiene JSON válido. Comprueba que la URL no devuelva una página HTML.`);
  }
}

function mostrarError(id, mensaje, error) {
  const estado = document.getElementById(id);
  estado.hidden = false;
  estado.textContent = mensaje;
  estado.className = 'status status-error';
  estado.setAttribute('role', 'alert');
  console.error(error);
}
