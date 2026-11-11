(() => {
  'use strict';

  const $ = (selector, root = document) => (root || document).querySelector(selector);
  const $$ = (selector, root = document) => Array.from((root || document).querySelectorAll(selector));

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const entero = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 0 });

  function set(id, value) {
    const node = typeof id === 'string' ? $(id) : id;
    if (node) node.textContent = value;
  }

  // Contadores animados con la misma curva easings del design system (.hero, .stat).
  function animarContador(id, objetivo, opciones = {}) {
    const node = typeof id === 'string' ? $(id) : id;
    if (!node) return;

    const pintar = (valor) => { node.textContent = Number.isFinite(valor) ? entero.format(valor) : '—'; };

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

  const COLUMNAS_VARIABLES = [
    { clave: 'columna', encabezado: true },
    { clave: 'traduccion' },
    { clave: 'descripcion' },
    { clave: 'tipo' },
    { clave: 'subtipo' },
    { clave: 'dominio' },
    { clave: 'rango' },
    { clave: 'escala' },
    { clave: 'instrumento' },
    { clave: 'unidad' },
    { clave: 'validos', numero: true },
    { clave: 'nulos', numero: true },
    { clave: 'ceros', numero: true },
  ];

  function renderVariables(datos) {
    const tbody = $('#tabla-variables');
    if (tbody) {
      tbody.replaceChildren();
      datos.variables.forEach((variable) => {
        const tr = document.createElement('tr');
        COLUMNAS_VARIABLES.forEach((columna) => {
          const celda = document.createElement(columna.encabezado ? 'th' : 'td');
          if (columna.encabezado) celda.scope = 'row';
          if (columna.numero) celda.className = 'numero';
          const valor = variable[columna.clave];
          celda.textContent = valor === null || valor === undefined
            ? '—'
            : columna.numero ? entero.format(valor) : String(valor);
          tr.appendChild(celda);
        });
        tbody.appendChild(tr);
      });
    }

    const lista = $('#excluidas-variables');
    if (lista) {
      lista.replaceChildren();
      datos.excluidas.forEach((excluida) => {
        const li = document.createElement('li');
        const distintos = excluida.valores_distintos
          ? ` (${entero.format(excluida.valores_distintos)} ${excluida.valores_distintos === 1 ? 'valor distinto' : 'valores distintos'})`
          : '';
        li.textContent = `${excluida.variable}: ${excluida.motivo}${distintos}.`;
        lista.appendChild(li);
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

      set('#muestra-n', entero.format(pozos));
      set('#muestra-notacion-n', entero.format(pozos));
      set('#nota-registros', `${entero.format(registros)} registros corresponden a ${entero.format(pozos)} pozos únicos; ${entero.format(varios)} pozos aparecen en más de un registro.`);
      set('#fuente-estadistica', estadistica.fuente || '2023_01_producao_Terra.csv');

      animarContador('#total-pozos', pozos);
      animarContador('#total-registros', registros);
      animarContador('#total-estados', estados);
    } catch (error) {
      // Las cifras de 4.1.1 y 4.1.2 ya están escritas en el HTML; solo se registra el error.
      console.error('No se pudieron cargar los datos de estadística:', error);
    }

    initReveals();

    try {
      renderVariables(await leerJSON('data/variables_estadistica.json'));
      $('#estado-variables').hidden = true;
      $('#contenido-variables').hidden = false;
    } catch (error) {
      mostrarError('estado-variables', `No se pudo cargar la tabla de variables. ${error.message}`, error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load, { once: true });
  } else {
    load();
  }
})();
