(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);

  const estado = $('#estado-estadistica');
  const contenido = $('#contenido-estadistica');

  function showError(message) {
    if (estado) {
      estado.textContent = message;
      estado.classList.add('status-error');
    }
  }

  async function load() {
    try {
      const response = await fetch('data/map_data.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rows = await response.json();

      if (!Array.isArray(rows) || !rows.length) {
        throw new Error('El archivo de producción no contiene filas.');
      }

      const estados = rows.length;
      const pozos = rows.reduce((sum, row) => sum + (Number(row.Pozos) || 0), 0);
      const registros = 5472; // filas del CSV (enero 2023), incluye cabeceras secundarias depuradas

      const intFmt = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 0 });

      const set = (id, value) => {
        const node = $(`#${id}`);
        if (node) node.textContent = value;
      };

      set('total-pozos', intFmt.format(pozos));
      set('total-registros', intFmt.format(registros));
      set('total-estados', intFmt.format(estados));
      set('periodo-estadistica', 'Enero 2023');
      set('poblacion-n', intFmt.format(pozos));
      set('nota-registros', `${intFmt.format(registros)} registros corresponden a ${intFmt.format(pozos)} pozos únicos; algunos pozos aparecen en más de un registro.`);
      set('fuente-estadistica', '2023_01_producao_Terra.csv');

      if (estado) estado.hidden = true;
      if (contenido) contenido.hidden = false;
    } catch (error) {
      showError('No se pudieron cargar los datos. Abre la página desde un servidor local (por ejemplo, python3 -m http.server) y vuelve a intentarlo.');
      console.error('No se pudieron cargar los datos de estadística:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load, { once: true });
  } else {
    load();
  }
})();
