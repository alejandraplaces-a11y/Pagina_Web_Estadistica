(() => {
  'use strict';

  const $ = (selector, root = document) => (root || document).querySelector(selector);
  const $$ = (selector, root = document) => Array.from((root || document).querySelectorAll(selector));

  const estado = $('#estado-estadistica');
  const contenido = $('#contenido-estadistica');
  const estadoVariables = $('#estado-variables');
  const contenidoVariables = $('#contenido-variables');
  const tablaVariables = $('#tabla-variables');
  const excluidasVariables = $('#excluidas-variables');

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function mostrarError(message) {
    if (estado) {
      estado.textContent = message;
      estado.classList.add('status-error');
    }
  }

  function set(id, value) {
    const node = typeof id === 'string' ? $(id) : id;
    if (node) node.textContent = value;
  }

  // Contadores animados con la misma curva easings del design system (.hero, .stat).
  function animarContador(id, objetivo, opciones = {}) {
    const node = typeof id === 'string' ? $(id) : id;
    if (!node) return;

    const formatear = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 0 });
    const pintar = (valor) => { node.textContent = Number.isFinite(valor) ? formatear.format(valor) : '—'; };

    if (REDUCED || !('requestAnimationFrame' in window)) {
      pintar(objetivo);
      return;
    }

    const inicio = performance.now();
    const duracion = opciones.duracion || 900;
    const tick = (ahora) => {
      const progreso = Math.min((ahora - inicio) / duracion, 1);
      const eased = 1 - Math.pow(1 - progreso, 3);
      pintar(objetivo * eased);
      if (progreso < 1) {
        requestAnimationFrame(tick);
      } else {
        pintar(objetivo);
      }
    };
    requestAnimationFrame(tick);
  }

  // Revelado progresivo con IntersectionObserver (.will-reveal / .is-visible).
  function initReveals() {
    const nodos = $$('[data-reveal]');
    if (!nodos.length) return;

    const revelar = (lista) => lista.forEach((n) => n.classList.add('will-reveal', 'is-visible'));

    if (REDUCED || !('IntersectionObserver' in window)) {
      revelar(nodos);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    nodos.forEach((n) => {
      n.classList.add('will-reveal');
      observer.observe(n);
    });
  }

  // Variables de producción consolidadas por pozo (Óleo, Gas Natural y Agua).
  function renderVariables(datos) {
    const validos = Array.isArray(datos) ? datos.length : 0;

    if (tablaVariables) {
      tablaVariables.replaceChildren();

      const variables = [
        { variable: 'Óleo (bbl/día)', naturaleza: 'Cuantitativa', escala: 'Continua', unidad: 'bbl/día', fija: 'Consolidado por pozo (sumatoria de registros repetidos).' },
        { variable: 'Gás Natural (Mm³/día)', naturaleza: 'Cuantitativa', escala: 'Continua', unidad: 'Mm³/día', fija: 'Consolidado por pozo (sumatoria de registros repetidos).' },
        { variable: 'Água (bbl/día)', naturaleza: 'Cuantitativa', escala: 'Continua', unidad: 'bbl/día', fija: 'Consolidado por pozo (sumatoria de registros repetidos).' },
      ];

      variables.forEach((fila) => {
        const tr = document.createElement('tr');
        const celdas = [
          { tipo: 'texto', texto: fila.variable },
          { tipo: 'texto', texto: fila.naturaleza },
          { tipo: 'texto', texto: fila.escala },
          { tipo: 'texto', texto: fila.unidad },
          { tipo: 'numero', texto: String(validos) },
          { tipo: 'numero', texto: '0' },
          { tipo: 'texto', texto: fila.fija },
        ].map((celda, index) => {
          const esNumero = celda.tipo === 'numero';
          const td = document.createElement(esNumero ? 'td' : 'th');
          if (esNumero) td.className = 'numero';
          if (index === 0) td.scope = 'row';
          td.textContent = celda.texto;
          return td;
        });

        tr.append(...celdas);
        tablaVariables.appendChild(tr);
      });
    }

    if (excluidasVariables) {
      excluidasVariables.replaceChildren();
      ['Nome Poço', 'Estado', 'Bacia', 'Campo', 'Operador'].forEach((identificador) => {
        const li = document.createElement('li');
        li.textContent = `${identificador}: identificador u contexto, no responde al objetivo del análisis.`;
        excluidasVariables.appendChild(li);
      });
    }
  }

  async function load() {
    try {
      const estadistica = await leerJSON('data/estadistica_descriptiva.json');
      const registros = Number(estadistica.registros) || 0;
      const pozos = Number(estadistica.pozos_unicos) || 0;
      const estados = Number(estadistica.estados) || 0;
      const varios = Number(estadistica.pozos_con_varios_registros) || 0;

      const intFmt = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 0 });

      set('#total-pozos', intFmt.format(pozos));
      set('#total-registros', intFmt.format(registros));
      set('#total-estados', intFmt.format(estados));
      set('#periodo-estadistica', 'Enero 2023');
      set('#poblacion-n', intFmt.format(pozos));
      set('#nota-registros', `${intFmt.format(registros)} registros corresponden a ${intFmt.format(pozos)} pozos únicos; ${intFmt.format(varios)} pozos aparecen en más de un registro.`);
      set('#fuente-estadistica', '2023_01_producao_Terra.csv');

      if (estado) estado.hidden = true;
      if (contenido) contenido.hidden = false;

      animarContador('#total-pozos', pozos);
      animarContador('#total-registros', registros);
      animarContador('#total-estados', estados);

      initReveals();

      // Variables del conjunto analizado (producción consolidada por pozo).
      try {
        const datos = await leerJSON('data/distribucion_pozos.json');
        renderVariables(datos);
        if (estadoVariables) estadoVariables.hidden = true;
        if (contenidoVariables) contenidoVariables.hidden = false;
      } catch (error) {
        console.error('No se pudieron cargar las variables del conjunto:', error);
      }
    } catch (error) {
      mostrarError('No se pudieron cargar los datos. Abre la página desde un servidor local (por ejemplo, python3 -m http.server) y vuelve a intentarlo.');
      console.error('No se pudieron cargar los datos de estadística:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load, { once: true });
  } else {
    load();
  }
})();
