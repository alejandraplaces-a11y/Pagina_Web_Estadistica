// Índice lateral de estadisticaInferencial.html: siempre abierto en escritorio
// y con resaltado de la sección visible.
(function () {
  const indice = document.getElementById('indice-lateral');
  if (!indice) return;

  const desplegable = indice.querySelector('details');
  const escritorio = window.matchMedia('(min-width: 1200px)');
  const enlaces = [...indice.querySelectorAll('.indice-lista a')];

  function ajustarApertura() {
    if (escritorio.matches) desplegable.open = true;
  }
  ajustarApertura();
  escritorio.addEventListener('change', ajustarApertura);

  const secciones = enlaces
    .map(enlace => document.getElementById(enlace.hash.slice(1)))
    .filter(Boolean);
  if (!secciones.length || !('IntersectionObserver' in window)) return;

  function marcar(id) {
    enlaces.forEach(enlace => {
      const activo = enlace.hash === `#${id}`;
      enlace.classList.toggle('is-active', activo);
      if (activo) {
        enlace.setAttribute('aria-current', 'location');
      } else {
        enlace.removeAttribute('aria-current');
      }
    });
  }

  enlaces.forEach(enlace => {
    enlace.addEventListener('click', () => {
      marcar(enlace.hash.slice(1));
      // En móvil, el desplegable se cierra al elegir una sección.
      if (!escritorio.matches) desplegable.open = false;
    });
  });

  // Cuando dos secciones cortas entran a la vez en la franja, gana la más baja.
  const visibles = new Map();
  const observador = new IntersectionObserver(entradas => {
    entradas.forEach(entrada => visibles.set(entrada.target.id, entrada.isIntersecting));
    const actual = secciones.filter(seccion => visibles.get(seccion.id)).pop();
    if (actual) marcar(actual.id);
  }, { rootMargin: '-20% 0px -65% 0px' });

  secciones.forEach(seccion => observador.observe(seccion));
})();