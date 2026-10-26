(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const intFmt = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 0 });
  const oneFmt = new Intl.NumberFormat('es-EC', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const prodKey = 'Óleo (bbl/dia)';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function format(value, decimals = 0) {
    if (!Number.isFinite(value)) return '—';
    return decimals ? oneFmt.format(value) : intFmt.format(value);
  }

  function setText(selector, value) {
    const node = $(selector);
    if (node) node.textContent = value;
  }

  function animateNumber(node, target, decimals = 0) {
    if (!node) return;

    if (reduceMotion.matches) {
      node.textContent = format(target, decimals);
      return;
    }

    const start = performance.now();
    const duration = 900;

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = format(target * eased, decimals);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        node.textContent = format(target, decimals);
      }
    }

    requestAnimationFrame(tick);
  }

  async function loadData() {
    try {
      const responses = await Promise.all([
        fetch('data/contexto.json', { cache: 'no-store' }),
        fetch('data/map_data.json', { cache: 'no-store' })
      ]);

      if (responses.some((response) => !response.ok)) {
        throw new Error(`HTTP ${responses.map((response) => response.status).join(' / ')}`);
      }

      const [contexto, filas] = await Promise.all(responses.map((response) => response.json()));

      renderContext(contexto);
      renderData(filas);
      initReveals();
    } catch (error) {
      showError();
      console.error('No se pudieron cargar los datos:', error);
    }
  }

  function showError() {
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
    problem.replaceChildren();

    String(data.problema || '')
      .split(/\n{2,}/)
      .forEach((paragraph) => {
        const trimmed = paragraph.trim();
        if (!trimmed) return;
        const p = document.createElement('p');
        p.textContent = trimmed;
        problem.append(p);
      });

    const general = String(data.objetivos?.general || '');
    setText('#objetivo-general', general ? general.charAt(0).toLowerCase() + general.slice(1) : '');

    const list = $('#objetivos-especificos');
    list.replaceChildren();

    (data.objetivos?.especificos || []).forEach((item) => {
      const li = document.createElement('li');
      li.textContent = String(item).replace(/^\s*\d+[.)]\s*/, '');
      list.append(li);
    });

    $('#estado-planteamiento').hidden = true;
    $('#planteamiento-contenido').hidden = false;
  }

  function renderData(rows) {
    // La sección de Ubicación Geográfica se deja vacía (solo cuadro para mapa),
    // por lo que no hay tabla ni gráfico de balance que renderizar. Se sale
    // temprano para evitar errores al buscar elementos que ya no existen.
    if (!$('#tabla-estados')) return;

    const data = rows
      .map((row) => ({
        estado: String(row.Estado ?? '').trim(),
        prod: Number(row[prodKey]) || 0,
        pozos: Number(row.Pozos) || 0
      }))
      .filter((row) => row.estado)
      .sort((a, b) => b.prod - a.prod);

    if (!data.length) throw new Error('No hay estados para mostrar.');

    const totalProd = data.reduce((sum, row) => sum + row.prod, 0);
    const totalPozos = data.reduce((sum, row) => sum + row.pozos, 0);
    const top3 = data.slice(0, 3).reduce((sum, row) => sum + row.prod, 0);
    const top3Share = totalProd ? (top3 / totalProd) * 100 : 0;

    renderBalance(data, totalProd, totalPozos);
    renderStats(data.length, totalProd, totalPozos, top3Share);
    renderTable(data);
    renderFindings(data, totalProd, totalPozos);
  }

  function renderBalance(data, totalProd, totalPozos) {
    const chart = $('#balance-chart');
    if (!chart) return;

    chart.replaceChildren();

    const maxShare = data.reduce((max, row) => {
      const prodShare = totalProd ? (row.prod / totalProd) * 100 : 0;
      const wellShare = totalPozos ? (row.pozos / totalPozos) * 100 : 0;
      return Math.max(max, prodShare, wellShare);
    }, 0);
    const scaleMax = Math.max(10, Math.ceil(maxShare / 5) * 5);

    data.forEach((row, index) => {
      const prodShare = totalProd ? (row.prod / totalProd) * 100 : 0;
      const wellShare = totalPozos ? (row.pozos / totalPozos) * 100 : 0;
      const prodPos = (prodShare / scaleMax) * 100;
      const wellPos = (wellShare / scaleMax) * 100;

      const item = document.createElement('div');
      item.className = 'balance-row';
      item.style.setProperty('--i', index);
      item.title = `${row.estado}: ${format(prodShare, 1)}% de la producción; ${format(wellShare, 1)}% de los pozos.`;

      const state = document.createElement('span');
      state.className = 'balance-state';
      state.textContent = row.estado;

      const track = document.createElement('span');
      track.className = 'balance-track';
      track.setAttribute('aria-hidden', 'true');

      const line = document.createElement('span');
      line.className = 'balance-line';
      line.style.left = `${Math.min(prodPos, wellPos)}%`;
      line.style.width = `${Math.abs(prodPos - wellPos)}%`;

      const prodDot = document.createElement('span');
      prodDot.className = 'balance-dot balance-dot-prod';
      prodDot.style.left = `${prodPos}%`;

      const wellDot = document.createElement('span');
      wellDot.className = 'balance-dot balance-dot-wells';
      wellDot.style.left = `${wellPos}%`;

      track.append(line, prodDot, wellDot);

      const value = document.createElement('span');
      value.className = 'balance-value';
      value.textContent = `${format(prodShare, 1)}%`;

      const accessible = document.createElement('span');
      accessible.className = 'sr-only';
      accessible.textContent = `Producción: ${format(prodShare, 1)} por ciento. Pozos: ${format(wellShare, 1)} por ciento.`;

      item.append(state, track, value, accessible);
      chart.append(item);
    });
  }

  function renderStats(states, totalProd, totalPozos, top3Share) {
    animateNumber($('[data-stat="produccion"]'), totalProd);
    animateNumber($('[data-stat="pozos"]'), totalPozos);
    animateNumber($('[data-stat="estados"]'), states);
    animateNumber($('[data-stat="concentracion"]'), top3Share, 1);
  }

  function renderTable(data) {
    const tbody = $('#tabla-estados');
    tbody.replaceChildren();

    const maxProd = Math.max(...data.map((row) => row.prod), 1);
    const maxPozos = Math.max(...data.map((row) => row.pozos), 1);

    data.forEach((row, index) => {
      const tr = document.createElement('tr');
      tr.style.setProperty('--i', index);

      const state = document.createElement('th');
      state.scope = 'row';
      state.className = 'state-cell';
      state.textContent = row.estado;

      const stateMeta = document.createElement('span');
      stateMeta.className = 'state-meta';
      stateMeta.textContent = row.pozos ? `${format(row.prod / row.pozos, 1)} bbl/d por pozo` : 'Sin producción';
      state.append(stateMeta);

      const prod = document.createElement('td');
      prod.className = 'num';
      prod.append(barCell(row.prod, maxProd, 'prod', format(row.prod)));

      const pozos = document.createElement('td');
      pozos.className = 'num';
      pozos.append(barCell(row.pozos, maxPozos, 'wells', format(row.pozos)));

      const perWell = document.createElement('td');
      perWell.className = 'num per-well';
      perWell.textContent = row.pozos ? format(row.prod / row.pozos, 1) : '—';

      tr.append(state, prod, pozos, perWell);
      tbody.append(tr);
    });
  }

  function barCell(value, max, kind, label) {
    const wrap = document.createElement('span');
    wrap.className = 'bar-cell';

    const track = document.createElement('span');
    track.className = 'bar-track';
    track.setAttribute('aria-hidden', 'true');

    const fill = document.createElement('span');
    fill.className = `bar-fill bar-${kind}`;
    fill.style.setProperty('--w', `${max ? Math.min((value / max) * 100, 100) : 0}%`);
    track.append(fill);

    const valueNode = document.createElement('span');
    valueNode.className = 'bar-value';
    valueNode.textContent = label;

    wrap.append(track, valueNode);
    return wrap;
  }

  function renderFindings(data, totalProd, totalPozos) {
    const amazonas = data.find((row) => row.estado === 'Amazonas');
    const rioGrande = data.find((row) => row.estado.toLowerCase().includes('rio grande'));
    const average = totalPozos ? totalProd / totalPozos : 0;

    if (amazonas && amazonas.pozos && totalProd && totalPozos) {
      const perWell = amazonas.prod / amazonas.pozos;
      setText('[data-finding="am-prod-per-well"]', format(perWell, 1));
      setText('[data-finding="am-prod-share"]', `${format((amazonas.prod / totalProd) * 100, 1)}%`);
      setText('[data-finding="am-wells-share"]', `${format((amazonas.pozos / totalPozos) * 100, 1)}%`);
      setText('[data-finding="am-vs-national"]', format(average ? perWell / average : 0, 1));
    }

    if (rioGrande && rioGrande.pozos && totalProd && totalPozos) {
      setText('[data-finding="rn-wells-share"]', `${format((rioGrande.pozos / totalPozos) * 100, 1)}%`);
      setText('[data-finding="rn-prod-share"]', `${format((rioGrande.prod / totalProd) * 100, 1)}%`);
      setText('[data-finding="rn-wells"]', format(rioGrande.pozos));
      setText('[data-finding="rn-prod-per-well"]', format(rioGrande.prod / rioGrande.pozos, 1));
    }
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

  function initBackgroundVideo() {
    const video = $('.video-hero .intro-video');
    if (!video) return;

    if (reduceMotion.matches) {
      video.autoplay = false;
      video.pause();
      return;
    }

    const tryPlay = () => {
      const promise = video.play();
      if (promise && typeof promise.catch === 'function') {
        promise.catch(() => {
          const resume = () => {
            video.play().catch(() => {});
          };
          ['click', 'touchstart', 'keydown', 'scroll'].forEach((event) => {
            document.addEventListener(event, resume, { once: true, passive: true });
          });
        });
      }
    };

    if (video.readyState >= 2) {
      tryPlay();
    } else {
      video.addEventListener('loadeddata', tryPlay, { once: true });
    }
  }

  initBackgroundVideo();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadData, { once: true });
  } else {
    loadData();
  }
})();
