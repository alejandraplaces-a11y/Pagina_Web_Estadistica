// Machine Learning — machine-learning.html
// Controla la página índice de la sección 4.3.2.
// Usa leerJSON() y mostrarError() de js/common.js.

document.addEventListener('DOMContentLoaded', function () {
  const STATS = {
    '58.302': { selector: '58.302', label: 'pares pozo-mes' },
    'oct–dic 2023': { selector: 'oct–dic 2023', label: 'prueba' },
    '0,853': { selector: '0,853', label: 'R² en log (regresión)' },
    '0,827': { selector: '0,827', label: 'R² en log (base)' },
    '55 %': { selector: '55 %', label: 'pozos que dejan de producir (clasificación)' }
  };

  // Llenar bloque "En cifras" ya escrito en HTML — nada de JS necesario
  // Solo asegurarnos de que ningún "Cargando…" quede visible
  const loading = document.querySelectorAll('.status');
  loading.forEach(function (el) {
    el.style.display = 'none';
    el.setAttribute('aria-hidden', 'true');
  });

  // Inicializar reveals de IntersectionObserver si existen
  if (typeof initReveals !== 'undefined') {
    initReveals();
  }
});

// Asegurar que el enlace "Machine Learning" quede activo en esta página
document.querySelectorAll('.sidebar-link').forEach(function (link) {
  if (link.getAttribute('href') === 'machine-learning.html') {
    link.classList.add('is-active');
    link.setAttribute('aria-current', 'page');
  }
});