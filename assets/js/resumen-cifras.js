(() => {
  'use strict';

  const DURATION = 1600; // ms de la animación
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Formato español: 5308 -> "5.308", 11.95 -> "11,95", 0.801 -> "0,801"
  function formatNumber(value, decimals) {
    const fixed = value.toFixed(decimals);
    const [integer, fraction] = fixed.split('.');
    const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return fraction ? grouped + ',' + fraction : grouped;
  }

  // Inicializa hardware acceleration y tabular-nums en los contenedores de métricas
  function initMetricContainers() {
    const nodes = document.querySelectorAll('.stat-metrics .metric-value');
    nodes.forEach(node => {
      // Fonts tabular-nums para que los números tengan ancho fijo y no desplacen el layout
      node.style.fontVariantNumeric = 'tabular-nums';
      // Hardware acceleration via CSS transform
      node.style.willChange = 'transform, opacity';
      // Pequeña traslado Z para activar compositor GPU en el parent si es necesario
      node.style.transform = 'translateZ(0)';
    });
  }

  // Reinicia la animación con nuevos valores objetivo.
  // Llámala desde controladores de filtro cuando los datos actualicen.
  function restart() {
    // Reinicializar contenedores con tabular-nums y hardware acceleration
    initMetricContainers();

    // Reiniciar todos los valores a 0 y volver a animar
    metrics.forEach(m => {
      m.last = formatNumber(0, m.decimals);
      m.node.textContent = m.last;
    });

    let startTime = null;

    function step(timestamp) {
      if (startTime === null) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic

      for (let i = 0; i < metrics.length; i++) {
        const m = metrics[i];
        const value = m.target * eased;
        const text = formatNumber(value, m.decimals);
        if (text !== m.last) {
          m.last = text;
          m.node.textContent = text;
        }
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        for (let i = 0; i < metrics.length; i++) {
          const m = metrics[i];
          m.node.textContent = formatNumber(m.target, m.decimals);
          m.node.style.fontVariantNumeric = 'tabular-nums';
        }
      }
    }

    requestAnimationFrame(step);
  }

  function init() {
    const nodes = document.querySelectorAll('.stat-metrics .metric-value[data-target]');
    if (!nodes.length) return;

    const metrics = [];
    nodes.forEach(node => {
      const target = Number(node.dataset.target);
      const decimals = Number(node.dataset.decimals) || 0;
      if (!Number.isFinite(target)) return;
      metrics.push({ node, target, decimals, last: '' });
    });
    if (!metrics.length) return;

    // Hardware acceleration y tabular-nums en los contenedores
    initMetricContainers();

    // Sin animación si el usuario prefiere movimiento reducido
    if (reduceMotion.matches) {
      metrics.forEach(m => { m.node.textContent = formatNumber(m.target, m.decimals); });
      return;
    }

    // Empezar todos en 0
    metrics.forEach(m => {
      m.last = formatNumber(0, m.decimals);
      m.node.textContent = m.last;
    });

    let startTime = null;

    function step(timestamp) {
      if (startTime === null) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic

      // Un solo loop actualiza todos los contadores; solo escribe si el texto cambió
      // para evitar reflows/Repaints innecesarios
      for (let i = 0; i < metrics.length; i++) {
        const m = metrics[i];
        const value = m.target * eased;
        const text = formatNumber(value, m.decimals);
        if (text !== m.last) {
          m.last = text;
          m.node.textContent = text;
        }
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        // Valor final asegurado
        for (let i = 0; i < metrics.length; i++) {
          const m = metrics[i];
          m.node.textContent = formatNumber(m.target, m.decimals);
          // Asegurar tabular-nums en el valor final
          m.node.style.fontVariantNumeric = 'tabular-nums';
        }
      }
    }

    requestAnimationFrame(step);
  }

  // Exponer restart para que los controladores de filtro puedan reiniciar la animación
  window.reiniciarContadores = restart;

  if (document.readyState !== 'loading') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  }
})();
