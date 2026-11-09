(() => {
  'use strict';

  // Aviso que solo aparece en la primera visita al sitio.
  // Se guarda en localStorage para no volver a mostrarlo.
  const STORAGE_KEY = 'terra-aviso-visto';

  const CONTENIDO = {
    kicker: 'Aviso',
    titulo: 'Proyecto académico',
    mensaje:
      'Este sitio presenta un análisis estadístico de la producción terrestre de hidrocarburos en Brasil con datos abiertos de la ANP (enero de 2023). Su contenido es de carácter académico e informativo.',
    boton: 'Entendido'
  };

  function yaVisto() {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {
      // Si localStorage no está disponible, volvemos a mostrar siempre.
      return false;
    }
  }

  function marcarVisto() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch (e) {}
  }

  function crearAviso() {
    const overlay = document.createElement('div');
    overlay.className = 'aviso-overlay';
    overlay.id = 'aviso-overlay';

    const dialogo = document.createElement('div');
    dialogo.className = 'aviso-dialogo';
    dialogo.setAttribute('role', 'dialog');
    dialogo.setAttribute('aria-modal', 'true');
    dialogo.setAttribute('aria-labelledby', 'aviso-titulo');
    dialogo.setAttribute('aria-describedby', 'aviso-mensaje');
    dialogo.tabIndex = -1;

    dialogo.innerHTML =
      '<div class="aviso-contenido">' +
      '  <p class="aviso-kicker"></p>' +
      '  <h2 id="aviso-titulo" class="aviso-titulo"></h2>' +
      '  <p id="aviso-mensaje" class="aviso-mensaje"></p>' +
      '  <div class="aviso-acciones">' +
      '    <button type="button" class="aviso-boton" id="aviso-cerrar"></button>' +
      '  </div>' +
      '</div>';

    dialogo.querySelector('.aviso-kicker').textContent = CONTENIDO.kicker;
    dialogo.querySelector('.aviso-titulo').textContent = CONTENIDO.titulo;
    dialogo.querySelector('.aviso-mensaje').textContent = CONTENIDO.mensaje;
    dialogo.querySelector('.aviso-boton').textContent = CONTENIDO.boton;

    overlay.appendChild(dialogo);
    return overlay;
  }

  function mostrar() {
    const overlay = crearAviso();
    document.body.appendChild(overlay);
    document.body.classList.add('aviso-abierto');

    const dialogo = overlay.querySelector('.aviso-dialogo');
    const botonCerrar = overlay.querySelector('#aviso-cerrar');
    const focoPrevio = document.activeElement;

    function cerrar() {
      if (!overlay.isConnected) return;
      marcarVisto();
      document.body.classList.remove('aviso-abierto');
      overlay.remove();
      document.removeEventListener('keydown', alTeclar);
      if (focoPrevio && typeof focoPrevio.focus === 'function') {
        try { focoPrevio.focus(); } catch (e) {}
      }
    }

    function alTeclar(evento) {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        cerrar();
      }
    }

    botonCerrar.addEventListener('click', cerrar);
    overlay.addEventListener('click', (evento) => {
      if (evento.target === overlay) cerrar();
    });
    document.addEventListener('keydown', alTeclar);

    // Muestra el aviso tras el primer pintado para una aparición suave.
    requestAnimationFrame(() => {
      overlay.classList.add('is-visible');
      try { dialogo.focus({ preventScroll: true }); } catch (e) { dialogo.focus(); }
    });
  }

  function iniciar() {
    // Solo muestra el aviso si el usuario aún no lo había visto.
    if (!yaVisto()) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mostrar, { once: true });
      } else {
        mostrar();
      }
    }
    // Si ya lo vio, nada se hace; el aviso no aparece en ninguna carga.
  }

  iniciar();
})();