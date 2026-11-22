(() => {
  'use strict';

  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sidebar-toggle');
  const menuToggle = document.getElementById('menu-toggle');
  const backdrop = document.getElementById('sidebar-backdrop');

  if (!sidebar) return;

  const isMobile = () => window.matchMedia('(max-width: 760px)').matches;

  // Estado inicial: el HTML restaura la clase antes de pintar, así que el
  // botón debe reflejar ese estado desde el primer render.
  if (toggle) {
    toggle.setAttribute(
      'aria-expanded',
      String(document.documentElement.classList.contains('sidebar-expanded'))
    );
  }

  function setExpanded(expanded) {
    document.documentElement.classList.toggle('sidebar-expanded', expanded);
    if (toggle) {
      toggle.setAttribute('aria-expanded', String(expanded));
    }
    if (menuToggle) {
      menuToggle.setAttribute('aria-expanded', String(expanded));
    }
    try { localStorage.setItem('sidebar-expanded', expanded ? '1' : '0'); } catch (e) {}
  }

  function openDrawer() {
    sidebar.classList.add('is-open');
    if (backdrop) backdrop.hidden = false;
    if (menuToggle) menuToggle.setAttribute('aria-expanded', 'true');
  }

  function closeDrawer() {
    sidebar.classList.remove('is-open');
    if (backdrop) backdrop.hidden = true;
    if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
  }

  // Desktop toggle (inside sidebar)
  if (toggle) {
    toggle.addEventListener('click', () => {
      if (isMobile()) {
        sidebar.classList.contains('is-open') ? closeDrawer() : openDrawer();
      } else {
        const expanded = !document.documentElement.classList.contains('sidebar-expanded');
        setExpanded(expanded);
      }
    });
  }

  // Mobile hamburger (in header)
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      if (sidebar.classList.contains('is-open')) closeDrawer(); else openDrawer();
    });
  }

  if (backdrop) {
    backdrop.addEventListener('click', closeDrawer);
  }

  // Close drawer on link click (mobile)
  sidebar.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      if (isMobile()) closeDrawer();
    });
  });

  // Close drawer on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('is-open')) closeDrawer();
  });

  // Reset drawer state when crossing breakpoint
  window.addEventListener('resize', () => {
    if (!isMobile()) {
      closeDrawer();
    }
  });
})();
