(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function setText(selector, value) {
    const node = $(selector);
    if (node) node.textContent = value;
  }

  async function loadContext() {
    try {
      const response = await fetch('data/contexto.json', { cache: 'no-store' });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const contexto = await response.json();

      renderContext(contexto);
      initReveals();
    } catch (error) {
      showError();
      console.error('No se pudieron cargar los datos:', error);
    }
  }

  function showError() {
    const contenido = $('#planteamiento-contenido');
    const estado = $('#estado-planteamiento');

    if (contenido && $('#problema')?.children.length) {
      contenido.hidden = false;
      if (estado) estado.hidden = true;
      return;
    }

    const message = 'No se pudieron cargar los datos. Abre la página desde un servidor local (por ejemplo, python3 -m http.server) y vuelve a intentarlo.';

    ['#estado-planteamiento'].forEach((selector) => {
      const node = $(selector);
      if (!node) return;
      node.textContent = message;
      node.classList.add('status-error');
    });
  }

  function renderContext(data) {
    if (!data) throw new Error('El archivo de contexto está vacío.');

    const problem = $('#problema');
    if (problem && !problem.children.length) {
      String(data.problema || '')
        .split(/\n{2,}/)
        .forEach((paragraph) => {
          const trimmed = paragraph.trim();
          if (!trimmed) return;
          const p = document.createElement('p');
          p.textContent = trimmed;
          problem.append(p);
        });
    }

    const generalEl = $('#objetivo-general');
    const general = String(data.objetivos?.general || '');
    if (generalEl && !generalEl.textContent.trim()) {
      setText('#objetivo-general', general ? general.charAt(0).toLowerCase() + general.slice(1) : '');
    }

    const list = $('#objetivos-especificos');
    if (list && !list.children.length) {
      list.replaceChildren();
      (data.objetivos?.especificos || []).forEach((item) => {
        const li = document.createElement('li');
        li.textContent = String(item).replace(/^\s*\d+[.)]\s*/, '');
        list.append(li);
      });
    }

    const estado = $('#estado-planteamiento');
    if (estado) estado.hidden = true;
    const contenido = $('#planteamiento-contenido');
    if (contenido) contenido.hidden = false;
  }

  let revealObserver = null;

  function initReveals() {
    const items = $$('[data-reveal]:not(.will-reveal)');
    if (!items.length) return;

    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('will-reveal', 'is-visible'));
      return;
    }

    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    }

    items.forEach((item) => {
      item.classList.add('will-reveal');
      revealObserver.observe(item);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadContext, { once: true });
  } else {
    loadContext();
  }
})();
