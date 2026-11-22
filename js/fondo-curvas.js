/* Fondo fijo de curvas de nivel topográficas y marcadores de pozos.
 * No modifica ningún componente de contenido; sólo inyecta un <canvas>
 * detrás de la página y hace transparentes los contenedores generales.
 * Las isolíneas y los pozos fluyen con una animación continua y suave.
 */
(() => {
  'use strict';

  const CANVAS_ID = 'bg-curvas-pozos';
  const STYLE_ID = 'fondo-curvas-estilos';

  const PAPER = '#F5F0E6';
  const OIL_GREEN = '#0d2b24';
  const GOLD = '#C9930A';
  const LIGHT_GOLD = '#F2C14E';

  const LEVEL_MINOR = 'rgba(201, 147, 10, 0.30)';
  const LEVEL_MASTER = 'rgba(140, 109, 70, 0.42)';
  const RIDGE_HALO = 'rgba(251, 239, 200, 0.30)';

  const STEP = 16;          // paso de rejilla: más celda = menos CPU por fotograma
  const LEVEL_COUNT = 14;   // número de isolíneas
  const MASTER_EVERY = 4;   // curva maestra cada 4 niveles
  const DEBOUNCE_MS = 160;
  const FRAME_MS = 1000 / 30; // ~30 FPS: fluidez sin saturar la CPU
  const TIME_SCALE = 0.9;   // velocidad orgánica, perceptible y relajada
  // Desplazamiento global del mapa: mueve también las crestas (no sólo las
  // ondas), que son las que dominan la silueta de las isolíneas.
  const DRIFT_X = 0.06;
  const DRIFT_Y = 0.04;
  const DRIFT_SPEED_X = 0.25;
  const DRIFT_SPEED_Y = 0.2;

  // PRNG determinista: el mismo dibujo en todas las cargas y tamaños.
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Parámetros del campo escalar (gaussianas + ondas suaves). Se generan una
   * sola vez por tamaño; en cada fotograma sólo se re-muestrea con la fase t:
   * los centros derivan, las crestas respiran y las ondas avanzan. */
  function createModel(width, height) {
    const rand = mulberry32(0x5EED1234);
    const hills = [];
    for (let i = 0; i < 11; i++) {
      const margin = i % 3 === 0; // algunas crestas hacia los márgenes
      const nx = margin
        ? (rand() < 0.5 ? 0.05 + rand() * 0.13 : 0.82 + rand() * 0.13)
        : 0.18 + rand() * 0.64;
      hills.push({
        nx: nx,
        ny: 0.08 + rand() * 0.84,
        sx: 0.09 + rand() * 0.11,
        sy: 0.10 + rand() * 0.14,
        amp: 0.55 + rand() * 0.65
      });
    }
    const waves = [
      { kx: 2.1 + rand(), ky: 1.3 + rand(), ph: rand() * Math.PI * 2, amp: 0.16, speed: 0.13 },
      { kx: 3.7 + rand(), ky: 2.6 + rand(), ph: rand() * Math.PI * 2, amp: 0.08, speed: 0.09 }
    ];

    const cols = Math.ceil(width / STEP) + 1;
    const rows = Math.ceil(height / STEP) + 1;
    const xs = new Float32Array(cols);
    const ys = new Float32Array(rows);
    for (let c = 0; c < cols; c++) xs[c] = c / (cols - 1 || 1);
    for (let r = 0; r < rows; r++) ys[r] = r / (rows - 1 || 1);

    const waveCache = waves.map(function (w) {
      const sinAx = new Float32Array(cols);
      const cosAx = new Float32Array(cols);
      for (let c = 0; c < cols; c++) {
        const a = w.kx * xs[c];
        sinAx[c] = Math.sin(a);
        cosAx[c] = Math.cos(a);
      }
      return { sinAx: sinAx, cosAx: cosAx, sinBy: new Float32Array(rows), cosBy: new Float32Array(rows) };
    });

    const field = {
      values: new Float32Array(cols * rows),
      cols: cols,
      rows: rows,
      xs: xs,
      ys: ys,
      hills: hills,
      waves: waves,
      waveCache: waveCache,
      colFactor: new Float32Array(cols * hills.length),
      rowFactor: new Float32Array(rows * hills.length),
      w: width,
      h: height,
      min: 0,
      max: 1
    };

    sampleField(field, 0);
    field.baseMin = field.min;
    field.baseMax = field.max;
    return field;
  }

  /* Gaussianas separables (exp(x)·exp(y)) y ondas mediante identidades
   * trigonométricas: el coste por fotograma es lineal en filas+columnas. */
  function sampleField(field, t) {
    const cols = field.cols;
    const rows = field.rows;
    const xs = field.xs;
    const ys = field.ys;
    const hills = field.hills;
    const waves = field.waves;
    const values = field.values;
    const colFactor = field.colFactor;
    const rowFactor = field.rowFactor;

    const driftX = DRIFT_X * Math.sin(t * DRIFT_SPEED_X);
    const driftY = DRIFT_Y * Math.sin(t * DRIFT_SPEED_Y);

    for (let i = 0; i < hills.length; i++) {
      const h = hills[i];
      const cx = h.nx + driftX + Math.sin(t * 0.18 + i * 1.7) * 0.05;
      const cy = h.ny + driftY + Math.cos(t * 0.14 + i * 2.3) * 0.045;
      const sx = h.sx * (1 + 0.12 * Math.sin(t * 0.15 + i * 0.8));
      const sy = h.sy * (1 + 0.12 * Math.cos(t * 0.11 + i * 1.4));
      const amp = h.amp * (1 + 0.09 * Math.sin(t * 0.18 + i * 0.9));
      for (let c = 0; c < cols; c++) {
        const d = (xs[c] - cx) / sx;
        colFactor[i * cols + c] = Math.exp(-0.5 * d * d) * amp;
      }
      for (let r = 0; r < rows; r++) {
        const d = (ys[r] - cy) / sy;
        rowFactor[i * rows + r] = Math.exp(-0.5 * d * d);
      }
    }

    for (let i = 0; i < waves.length; i++) {
      const w = waves[i];
      const cache = field.waveCache[i];
      for (let r = 0; r < rows; r++) {
        const b = w.ky * ys[r] + w.ph + w.kx * driftX + w.ky * driftY + t * w.speed;
        cache.sinBy[r] = Math.sin(b);
        cache.cosBy[r] = Math.cos(b);
      }
    }

    let min = Infinity;
    let max = -Infinity;
    for (let r = 0; r < rows; r++) {
      const rowOffset = r * cols;
      for (let c = 0; c < cols; c++) {
        let v = 0;
        for (let i = 0; i < hills.length; i++) {
          v += colFactor[i * cols + c] * rowFactor[i * rows + r];
        }
        for (let i = 0; i < waves.length; i++) {
          const w = waves[i];
          const cache = field.waveCache[i];
          v += w.amp * (cache.sinAx[c] * cache.cosBy[r] + cache.cosAx[c] * cache.sinBy[r]);
        }
        values[rowOffset + c] = v;
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
    field.min = min;
    field.max = max;
  }

  /* Marching Squares. Bits: 1=TL, 2=TR, 4=BR, 8=BL. Cada entrada son
   * pares de aristas (T=arriba, R=derecha, B=abajo, L=izquierda). */
  const PAIRS = [
    [],                    // 0
    ['L', 'T'],            // 1
    ['T', 'R'],            // 2
    ['L', 'R'],            // 3
    ['R', 'B'],            // 4
    ['L', 'T', 'R', 'B'],  // 5 (ambiguo)
    ['T', 'B'],            // 6
    ['L', 'B'],            // 7
    ['B', 'L'],            // 8
    ['T', 'B'],            // 9
    ['T', 'R', 'B', 'L'],  // 10 (ambiguo)
    ['R', 'B'],            // 11
    ['L', 'R'],            // 12
    ['T', 'R'],            // 13
    ['L', 'T'],            // 14
    []                     // 15
  ];

  function ratio(a, b, level) {
    const d = b - a;
    if (Math.abs(d) < 1e-9) return 0.5;
    const t = (level - a) / d;
    return t < 0 ? 0 : t > 1 ? 1 : t;
  }

  function edgeKey(edge, r, c) {
    if (edge === 'T') return 'h' + r + '_' + c;
    if (edge === 'B') return 'h' + (r + 1) + '_' + c;
    if (edge === 'L') return 'v' + r + '_' + c;
    return 'v' + r + '_' + (c + 1);
  }

  function edgePoint(edge, r, c, tl, tr, br, bl, level) {
    if (edge === 'T') return { x: (c + ratio(tl, tr, level)) * STEP, y: r * STEP };
    if (edge === 'B') return { x: (c + ratio(bl, br, level)) * STEP, y: (r + 1) * STEP };
    if (edge === 'L') return { x: c * STEP, y: (r + ratio(tl, bl, level)) * STEP };
    return { x: (c + 1) * STEP, y: (r + ratio(tr, br, level)) * STEP };
  }

  // Devuelve polilíneas (abiertas o cerradas) para un nivel dado.
  function traceLevel(field, level) {
    const values = field.values;
    const cols = field.cols;
    const rows = field.rows;
    const adjacency = new Map();

    function link(ka, pa, kb, pb) {
      if (!adjacency.has(ka)) adjacency.set(ka, { point: pa, links: [] });
      if (!adjacency.has(kb)) adjacency.set(kb, { point: pb, links: [] });
      adjacency.get(ka).links.push(kb);
      adjacency.get(kb).links.push(ka);
    }

    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const tl = values[r * cols + c];
        const tr = values[r * cols + c + 1];
        const br = values[(r + 1) * cols + c + 1];
        const bl = values[(r + 1) * cols + c];
        let code = 0;
        if (tl > level) code |= 1;
        if (tr > level) code |= 2;
        if (br > level) code |= 4;
        if (bl > level) code |= 8;
        const pairs = PAIRS[code];
        for (let i = 0; i < pairs.length; i += 2) {
          const e1 = pairs[i];
          const e2 = pairs[i + 1];
          link(
            edgeKey(e1, r, c), edgePoint(e1, r, c, tl, tr, br, bl, level),
            edgeKey(e2, r, c), edgePoint(e2, r, c, tl, tr, br, bl, level)
          );
        }
      }
    }

    const visited = new Set();
    const paths = [];
    const starts = [];
    // Primero los extremos (grado 1) para no perder contornos abiertos.
    adjacency.forEach((node, key) => { if (node.links.length === 1) starts.push(key); });
    adjacency.forEach((_node, key) => starts.push(key));

    for (let s = 0; s < starts.length; s++) {
      const start = starts[s];
      if (visited.has(start) || !adjacency.has(start)) continue;
      const points = [adjacency.get(start).point];
      visited.add(start);
      let current = start;
      let previous = null;
      let closed = false;
      for (;;) {
        const options = adjacency.get(current).links.filter(function (k) {
          return k !== previous && !visited.has(k);
        });
        if (!options.length) {
          closed = current !== start && adjacency.get(current).links.indexOf(start) !== -1;
          break;
        }
        const next = options[0];
        points.push(adjacency.get(next).point);
        visited.add(next);
        previous = current;
        current = next;
      }
      if (points.length > 1) paths.push({ points: points, closed: closed });
    }
    return paths;
  }

  function strokePath(ctx, points, closed) {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    if (points.length === 2) {
      ctx.lineTo(points[1].x, points[1].y);
    } else {
      for (let i = 1; i < points.length - 1; i++) {
        const mx = (points[i].x + points[i + 1].x) / 2;
        const my = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, mx, my);
      }
      const last = points[points.length - 1];
      ctx.lineTo(last.x, last.y);
    }
    if (closed) ctx.closePath();
    ctx.stroke();
  }

  // Máximos locales ponderados hacia crestas y márgenes, evitando el centro.
  function findWells(field, width, height) {
    const values = field.values;
    const cols = field.cols;
    const rows = field.rows;
    const min = field.baseMin !== undefined ? field.baseMin : field.min;
    const max = field.baseMax !== undefined ? field.baseMax : field.max;
    const span = max - min || 1;
    const candidates = [];
    for (let r = 2; r < rows - 2; r++) {
      for (let c = 2; c < cols - 2; c++) {
        const v = values[r * cols + c];
        if (v < min + span * 0.42) continue;
        let isMax = true;
        for (let dr = -1; dr <= 1 && isMax; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            if (values[(r + dr) * cols + c + dc] >= v) { isMax = false; break; }
          }
        }
        if (!isMax) continue;
        const x = c * STEP;
        const y = r * STEP;
        const margin = Math.abs(x / width - 0.5) * 1.2;
        const center = (x > width * 0.32 && x < width * 0.68 && y > height * 0.25 && y < height * 0.75) ? 0.3 : 0;
        candidates.push({ x: x, y: y, score: (v - min) / span + margin - center });
      }
    }
    // Los centros de las gaussianas son crestas por construcción: se añaden
    // como candidatos para que siempre haya varios pozos bien distribuidos.
    for (let i = 0; i < field.hills.length; i++) {
      const h = field.hills[i];
      const x = h.nx * width;
      const y = h.ny * height;
      const c = Math.min(cols - 1, Math.max(0, Math.round(x / STEP)));
      const r = Math.min(rows - 1, Math.max(0, Math.round(y / STEP)));
      const v = values[r * cols + c];
      const margin = Math.abs(x / width - 0.5) * 1.2;
      const center = (x > width * 0.32 && x < width * 0.68 && y > height * 0.25 && y < height * 0.75) ? 0.3 : 0;
      candidates.push({ x: x, y: y, score: (v - min) / span + margin - center });
    }
    // Anclas en los márgenes laterales para no saturar el centro.
    const anchors = [[0.09, 0.24], [0.09, 0.72], [0.91, 0.32], [0.91, 0.78]];
    for (let i = 0; i < anchors.length; i++) {
      const x = anchors[i][0] * width;
      const y = anchors[i][1] * height;
      const c = Math.min(cols - 1, Math.round(x / STEP));
      const r = Math.min(rows - 1, Math.round(y / STEP));
      candidates.push({ x: x, y: y, score: (values[r * cols + c] - min) / span + 0.55 });
    }

    candidates.sort(function (a, b) { return b.score - a.score; });

    const chosen = [];
    const minDist = Math.min(width, height) * 0.15;
    for (let i = 0; i < candidates.length && chosen.length < 12; i++) {
      const cand = candidates[i];
      let tooClose = false;
      for (let j = 0; j < chosen.length; j++) {
        if (Math.hypot(chosen[j].x - cand.x, chosen[j].y - cand.y) < minDist) { tooClose = true; break; }
      }
      if (!tooClose) chosen.push(cand);
    }
    if (!chosen.length) {
      chosen.push({ x: width * 0.12, y: height * 0.28 });
      chosen.push({ x: width * 0.86, y: height * 0.62 });
    }
    return chosen;
  }

  function drawDerrick(ctx, s, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 0.9;
    ctx.lineCap = 'round';
    const topY = -s * 0.55;
    const botY = s * 0.5;
    const half = s * 0.26;
    ctx.beginPath();
    ctx.moveTo(0, topY); ctx.lineTo(-half, botY);
    ctx.moveTo(0, topY); ctx.lineTo(half, botY);
    const fractions = [0.28, 0.5, 0.72, 0.9];
    for (let i = 0; i < fractions.length; i++) {
      const y = topY + (botY - topY) * fractions[i];
      const hw = half * fractions[i];
      ctx.moveTo(-hw, y); ctx.lineTo(hw, y);
    }
    for (let i = 0; i < fractions.length - 1; i++) {
      const y1 = topY + (botY - topY) * fractions[i];
      const y2 = topY + (botY - topY) * fractions[i + 1];
      const w1 = half * fractions[i];
      const w2 = half * fractions[i + 1];
      ctx.moveTo(-w1, y1); ctx.lineTo(w2, y2);
      ctx.moveTo(w1, y1); ctx.lineTo(-w2, y2);
    }
    ctx.moveTo(-s * 0.07, topY); ctx.lineTo(s * 0.07, topY);
    ctx.moveTo(-half * 1.3, botY); ctx.lineTo(half * 1.3, botY);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, topY, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // `pump` ∈ [-1, 1]: oscilación suave del cabezal y del contrapeso.
  function drawPumpjack(ctx, s, color, alpha, pump) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const baseY = s * 0.42;
    const nod = pump * s * 0.07;
    const headX = -s * 0.25;
    const headY = -s * 0.34 + nod;
    const tailX = s * 0.24;
    const tailY = s * 0.02 - nod * 0.6;
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, baseY); ctx.lineTo(s * 0.5, baseY);
    ctx.moveTo(-s * 0.12, baseY); ctx.lineTo(-s * 0.03, -s * 0.16); ctx.lineTo(s * 0.12, baseY);
    ctx.moveTo(headX, headY); ctx.lineTo(tailX, tailY);
    ctx.moveTo(-s * 0.29, -s * 0.26 + nod); ctx.lineTo(-s * 0.29, baseY);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-s * 0.27, -s * 0.28 + nod, s * 0.09, Math.PI * 0.55, Math.PI * 1.55);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(tailX, tailY, s * 0.075, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // `pulse` ∈ [0, 1]: brillo interior y anillo dorado del pozo.
  function drawDrop(ctx, s, color, glow, alpha, pulse) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.34);
    ctx.bezierCurveTo(s * 0.02, -s * 0.16, s * 0.26, -s * 0.02, s * 0.26, s * 0.12);
    ctx.bezierCurveTo(s * 0.26, s * 0.34, s * 0.12, s * 0.44, 0, s * 0.44);
    ctx.bezierCurveTo(-s * 0.12, s * 0.44, -s * 0.26, s * 0.34, -s * 0.26, s * 0.12);
    ctx.bezierCurveTo(-s * 0.26, -s * 0.02, -s * 0.02, -s * 0.16, 0, -s * 0.34);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = alpha * (0.75 + 0.25 * pulse);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(-s * 0.06, s * 0.1, s * 0.075 * (1 + 0.18 * pulse), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(s * 0.44, s * 0.34, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = glow;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(s * 0.44, s * 0.34, 3.2 + 0.9 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const WELL_KINDS = [
    'derrick-green', 'drop', 'pumpjack', 'derrick-gold',
    'drop', 'derrick-green', 'pumpjack', 'derrick-gold'
  ];

  function drawWells(ctx, wells, t, width, height) {
    for (let i = 0; i < wells.length; i++) {
      const kind = WELL_KINDS[i % WELL_KINDS.length];
      const size = 22 + (i % 3) * 4;
      // Deriva sincronizada con el desplazamiento global del campo.
      const gx = DRIFT_X * Math.sin(t * DRIFT_SPEED_X);
      const gy = DRIFT_Y * Math.sin(t * DRIFT_SPEED_Y);
      const dx = gx * width * 0.4 + Math.sin(t * 0.22 + i * 1.6) * 6;
      const dy = gy * height * 0.4 + Math.cos(t * 0.18 + i * 2.1) * 5;
      ctx.save();
      ctx.translate(wells[i].x + dx, wells[i].y + dy);
      if (kind === 'derrick-green') drawDerrick(ctx, size, OIL_GREEN, 0.55);
      else if (kind === 'derrick-gold') drawDerrick(ctx, size, GOLD, 0.45);
      else if (kind === 'pumpjack') drawPumpjack(ctx, size, OIL_GREEN, 0.55, Math.sin(t * 1.4 + i * 1.3));
      else drawDrop(ctx, size, OIL_GREEN, LIGHT_GOLD, 0.6, 0.5 + 0.5 * Math.sin(t * 1.5 + i));
      ctx.restore();
    }
  }

  /* Devuelve el motor de la animación — el mismo que corre tras todas las
   * páginas — sobre cualquier <canvas>; se reutiliza en otros archivos. */
  function createEngine(canvas) {
    function draw(t) {
      if (!canvas.isConnected) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = canvas.clientWidth || window.innerWidth;
      const cssH = canvas.clientHeight || window.innerHeight;
      const pixelW = Math.round(cssW * dpr);
      const pixelH = Math.round(cssH * dpr);
      if (canvas.width !== pixelW || canvas.height !== pixelH) {
        canvas.width = pixelW;
        canvas.height = pixelH;
      }
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, cssW, cssH);

      let field = canvas.__fondoField;
      if (!field || field.w !== cssW || field.h !== cssH) {
        field = createModel(cssW, cssH);
        canvas.__fondoField = field;
        canvas.__fondoWells = null;
      }
      sampleField(field, t);

      let wells = canvas.__fondoWells;
      if (!wells) {
        wells = findWells(field, cssW, cssH);
        canvas.__fondoWells = wells;
      }

      // Niveles fijos sobre el rango inicial: el campo respira y las curvas
      // se expanden/contraen en lugar de renormalizarse en cada fotograma.
      const span = (field.baseMax - field.baseMin) || 1;
      const levels = [];
      for (let i = 0; i < LEVEL_COUNT; i++) {
        levels.push(field.baseMin + span * (0.1 + (i / (LEVEL_COUNT - 1)) * 0.83));
      }
      const contours = [];
      for (let i = 0; i < levels.length; i++) contours.push(traceLevel(field, levels[i]));

      // Halos muy tenues en los niveles más altos (crestas).
      ctx.fillStyle = RIDGE_HALO;
      for (let i = LEVEL_COUNT - 2; i < LEVEL_COUNT; i++) {
        const paths = contours[i];
        for (let j = 0; j < paths.length; j++) {
          const pts = paths[j].points;
          if (!paths[j].closed || pts.length < 3) continue;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
          ctx.closePath();
          ctx.fill();
        }
      }

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 0; i < contours.length; i++) {
        const master = i % MASTER_EVERY === MASTER_EVERY - 1;
        ctx.strokeStyle = master ? LEVEL_MASTER : LEVEL_MINOR;
        ctx.lineWidth = master ? 1.8 : 1.2;
        const paths = contours[i];
        for (let j = 0; j < paths.length; j++) strokePath(ctx, paths[j].points, paths[j].closed);
      }

      drawWells(ctx, wells, t, cssW, cssH);
    }
    return { draw: draw };
  }

  /* Estilos mínicos: también cubren las subpáginas de análisis, que no cargan
   * css/styles.css. Las tarjetas, tablas y gráficas conservan su fondo propio. */
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '#' + CANVAS_ID + '{position:fixed;inset:0;width:100vw;height:100vh;z-index:0;pointer-events:none;}',
      'html.fondo-curvas{background-color:' + PAPER + ';}',
      'html.fondo-curvas body{background:transparent;}',
      'html.fondo-curvas main,html.fondo-curvas .app-main,html.fondo-curvas .wrap{background:transparent;position:relative;z-index:1;}',
      'html.fondo-curvas .section:not(.page-hero):not(.hero):not(.video-hero),',
      'html.fondo-curvas .data-section,html.fondo-curvas .mission-section,html.fondo-curvas .motivation-section{background:transparent;}',
      'html.fondo-curvas .hero,html.fondo-curvas .video-hero,html.fondo-curvas .page-hero{position:relative;z-index:2;}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function init() {
    if (!document.body || !document.head) return;
    injectStyles();

    const previous = document.getElementById(CANVAS_ID);
    if (previous) previous.remove();
    const canvas = document.createElement('canvas');
    canvas.id = CANVAS_ID;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.background = PAPER;
    document.documentElement.classList.add('fondo-curvas');
    document.body.insertBefore(canvas, document.body.firstChild);
    const engine = createEngine(canvas);

    const motion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const reduced = function () { return !!(motion && motion.matches); };

    let t = 0;             // fase en segundos "orgánicos"
    let rafId = null;
    let lastTick = 0;
    let lastDraw = 0;
    let accumulated = 0;

    function frame(now) {
      rafId = requestAnimationFrame(frame);
      if (!lastTick) lastTick = now;
      accumulated += Math.min(now - lastTick, 100);
      lastTick = now;
      if (now - lastDraw < FRAME_MS) return;
      lastDraw = now;
      t += (accumulated / 1000) * TIME_SCALE;
      accumulated = 0;
      engine.draw(t);
    }

    function startAnimation() {
      if (rafId !== null || document.hidden || reduced()) return;
      lastTick = 0;
      lastDraw = 0;
      accumulated = 0;
      rafId = requestAnimationFrame(frame);
    }

    function stopAnimation() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    function syncMotion() {
      if (reduced()) {
        stopAnimation();
        engine.draw(0);
      } else {
        startAnimation();
      }
    }

    engine.draw(0);
    syncMotion();

    if (motion) {
      if (motion.addEventListener) motion.addEventListener('change', syncMotion);
      else if (motion.addListener) motion.addListener(syncMotion);
    }

    // Pausar al ocultar la pestaña y reanudar al volver, sin saltos de fase.
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopAnimation();
      else syncMotion();
    });

    let resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { draw(t); }, DEBOUNCE_MS);
    }, { passive: true });
  }

  window.FondoCurvas = { createEngine: createEngine };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
