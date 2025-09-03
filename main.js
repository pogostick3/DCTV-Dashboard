/* ---------------------------------------------------------
   Warehouse Dashboard – single-file logic
   - Loads data/data.json (excel-to-json output)
   - Renders main tiles, levels, zones
   - Chart.js semicircle gauges + SVG needle overlay
   --------------------------------------------------------- */

const DATA_URL = 'data/dashboard.json';

// thresholds
const colorForPerf = (p) => (p < 75 ? '#e04444' : p < 90 ? '#f1b31c' : '#2ba84a');
const classForPerf = (p) => (p < 75 ? 'status-red' : p < 90 ? 'status-yellow' : 'status-green');

// pages
const pages = {
  main: document.getElementById('mainPage'),
  levels: document.getElementById('levelsPage'),
  zones: document.getElementById('zonesPage'),
};
const tilesGrid = document.getElementById('tilesGrid');
const levelsGrid = document.getElementById('levelsGrid');
const zonesGrid = document.getElementById('zonesGrid');
const levelsTitle = document.getElementById('levelsTitle');
const zonesTitle = document.getElementById('zonesTitle');

let RAW = null;
let lastDeptForZones = null;

// SPA navigation
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-nav]');
  if (!btn) return;
  const nav = btn.getAttribute('data-nav');
  if (nav === 'home') showPage('main');
  if (nav === 'back-levels') showPage('levels');
});

function showPage(which) {
  Object.values(pages).forEach(p => p.classList.remove('active'));
  pages[which].classList.add('active');
}

/* ---------- Gauge + Needle renderer ---------- */
function renderGauge(container, percent) {
  // wrapper
  const wrap = document.createElement('div');
  wrap.className = 'gauge-wrap';

  // canvas
  const canvas = document.createElement('canvas');
  canvas.className = 'gauge-canvas';
  wrap.appendChild(canvas);

  // overlay (needle)
  const overlay = document.createElement('div');
  overlay.className = 'needle';
  overlay.innerHTML = `
    <svg viewBox="0 0 220 120" preserveAspectRatio="xMidYMid meet">
      <!-- pivot -->
      <circle cx="110" cy="110" r="4" fill="#444"/>
      <!-- needle (base at 110,110, points outward) -->
      <path id="needlePath" d="M110 110 L114 96 L110 28 L106 96 Z" />
    </svg>`;
  wrap.appendChild(overlay);

  // chart
  const ctx = canvas.getContext('2d');
  const value = Math.max(0, Math.min(100, Number(percent) || 0));
  const fg = colorForPerf(value);

  // pad chart a bit to avoid clipping
  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [value, Math.max(0, 100 - value)],
        backgroundColor: [fg, '#e5e6ea'],
        borderWidth: 0,
        hoverOffset: 0
      }]
    },
    options: {
      responsive: false,
      animation: { duration: 0 },
      cutout: '70%',
      circumference: 180,
      rotation: -90,
      layout: { padding: 6 },
      plugins: { legend: { display: false }, tooltip: { enabled: false } }
    }
  });

  // set needle angle
  const ang = (-90 + (value / 100) * 180) * Math.PI / 180;
  // transform via CSS rotate around pivot 110,110
  const needle = overlay.querySelector('#needlePath');
  const cx = 110, cy = 110;
  const deg = -90 + (value / 100) * 180;
  needle.style.transformOrigin = `${cx}px ${cy}px`;
  needle.style.transform = `rotate(${deg}deg)`;
  needle.style.fill = '#444';
  needle.style.stroke = '#444';

  container.appendChild(wrap);
}

/* ---------- Cards / sections ---------- */

function metricRow(label, value) {
  const p = document.createElement('div');
  const l = document.createElement('span');
  l.className = 'label';
  l.textContent = `${label}: `;
  p.appendChild(l);
  p.appendChild(document.createTextNode(value ?? ''));
  return p;
}

function progressBar(percent) {
  const wrap = document.createElement('div');
  wrap.className = 'progress';
  const fill = document.createElement('span');
  fill.style.width = `${Math.max(0, Math.min(100, Number(percent) || 0))}%`;
  wrap.appendChild(fill);
  return wrap;
}

function deriveHome(deptObj) {
  // Use Dept sheet if present; else fall back to first level
  if (deptObj.dept) return deptObj.dept;
  const first = Object.values(deptObj.levels || {})[0] || {};
  return {
    picking: {
      perf: first.picking?.perf ?? 0,
      wave: first.picking?.wave ?? 0,
      progress: first.picking?.progress ?? 0,
      orders_complete: first.picking?.orders_complete ?? 0,
      orders_total: first.picking?.orders_total ?? 0
    },
    stocking: {
      perf: first.stocking?.perf ?? 0,
      expected: first.stocking?.expected ?? 0,
      stocked: first.stocking?.stocked ?? 0,
      remaining: first.stocking?.remaining ?? 0
    }
  };
}

function tileCard(deptKey, deptObj) {
  const home = deriveHome(deptObj);

  const card = document.createElement('div');
  card.className = 'card clickable';
  card.addEventListener('click', () => openLevels(deptKey));
  const title = document.createElement('h3');
  title.textContent = deptKey.toUpperCase();
  card.appendChild(title);

  const dot = document.createElement('div');
  dot.className = `status-dot ${classForPerf(Math.min(home.picking.perf||0, home.stocking.perf||0))}`;
  card.appendChild(dot);

  const row = document.createElement('div');
  row.className = 'krow';
  card.appendChild(row);

  // Picking column
  const left = document.createElement('div');
  left.style.flex = '1';
  const lt = document.createElement('div');
  lt.className = 'metric-title';
  lt.textContent = `Picking Perf: ${home.picking.perf ?? 0}%`;
  left.appendChild(lt);
  renderGauge(left, home.picking.perf ?? 0);
  left.appendChild(metricRow('Current Wave', home.picking.wave ?? 0));
  left.appendChild(progressBar(home.picking.progress ?? 0));
  left.appendChild(metricRow('Progress', `${home.picking.progress ?? 0}%`));
  if (home.picking.orders_complete !== undefined && home.picking.orders_total !== undefined) {
    left.appendChild(metricRow('Orders', `${home.picking.orders_complete}/${home.picking.orders_total}`));
  }
  row.appendChild(left);

  // Stocking column
  const right = document.createElement('div');
  right.style.flex = '1';
  const rt = document.createElement('div');
  rt.className = 'metric-title';
  rt.textContent = `Stocking Perf: ${home.stocking.perf ?? 0}%`;
  right.appendChild(rt);
  renderGauge(right, home.stocking.perf ?? 0);
  right.appendChild(metricRow('Expected', home.stocking.expected ?? 0));
  right.appendChild(metricRow('Stocked', home.stocking.stocked ?? 0));
  right.appendChild(metricRow('Pieces Left', home.stocking.remaining ?? 0));
  row.appendChild(right);

  return card;
}

function shippingCard(shipObj) {
  const card = document.createElement('div');
  card.className = 'card';
  const dot = document.createElement('div');
  dot.className = 'status-dot status-green';
  card.appendChild(dot);

  const title = document.createElement('h3');
  title.textContent = 'Shipping';
  card.appendChild(title);

  const waves = (shipObj?.waves || shipObj?.Waves || []);
  const list = document.createElement('div');
  list.className = 'ship-list';
  const header = document.createElement('div');
  header.className = 'label';
  header.style.marginBottom = '2px';
  header.textContent = 'Wave Progress';
  card.appendChild(header);

  waves.forEach(w => {
    const row = document.createElement('div');
    row.className = 'ship-row';
    const label = document.createElement('div');
    label.textContent = `Wave ${w.wave}`;
    const bar = progressBar(w.progress);
    const pct = document.createElement('div');
    pct.textContent = `${Math.round(w.progress)}%`;
    row.appendChild(label); row.appendChild(bar); row.appendChild(pct);
    list.appendChild(row);
  });
  card.appendChild(list);
  return card;
}

/* ---------- Levels + Zones ---------- */

function openLevels(deptKey) {
  lastDeptForZones = deptKey;
  levelsGrid.innerHTML = '';
  levelsTitle.textContent = `${deptKey.toUpperCase()} Levels`;

  const levels = RAW[deptKey]?.levels || {};
  const keys = Object.keys(levels);
  if (!keys.length) {
    const empty = document.createElement('div');
    empty.className = 'card level-card';
    empty.textContent = 'No levels in data.';
    levelsGrid.appendChild(empty);
  } else {
    keys.forEach(k => {
      const L = levels[k];
      const card = document.createElement('div');
      card.className = 'card level-card clickable';
      card.addEventListener('click', () => openZones(deptKey, k));

      const h = document.createElement('h3');
      h.textContent = `Level ${k}`;
      card.appendChild(h);

      const row = document.createElement('div');
      row.className = 'level-row';
      card.appendChild(row);

      // left (picking)
      const left = document.createElement('div');
      left.className = 'side';
      const lt = document.createElement('div'); lt.className='metric-title';
      lt.textContent = 'Picking';
      left.appendChild(lt);
      renderGauge(left, L.picking?.perf ?? 0);
      const lm = document.createElement('div'); lm.className='metrics';
      lm.appendChild(metricRow('Wave', L.picking?.wave ?? ''));
      lm.appendChild(metricRow('Progress', `${L.picking?.progress ?? 0}%`));
      left.appendChild(lm);

      // vrule
      const vr = document.createElement('div'); vr.className='vrule';

      // right (stocking)
      const right = document.createElement('div');
      right.className = 'side';
      const rt = document.createElement('div'); rt.className='metric-title';
      rt.textContent = 'Stocking';
      right.appendChild(rt);
      renderGauge(right, L.stocking?.perf ?? 0);
      const rm = document.createElement('div'); rm.className='metrics';
      rm.appendChild(metricRow('Expected', L.stocking?.expected ?? ''));
      rm.appendChild(metricRow('Stocked', L.stocking?.stocked ?? ''));
      rm.appendChild(metricRow('Remaining', L.stocking?.remaining ?? ''));
      right.appendChild(rm);

      row.appendChild(left); row.appendChild(vr); row.appendChild(right);
      levelsGrid.appendChild(card);
    });
  }

  showPage('levels');
}

function openZones(deptKey, levelKey) {
  zonesGrid.innerHTML = '';
  zonesTitle.textContent = `${deptKey.toUpperCase()} Level ${levelKey} – Zones`;

  const Z = RAW[deptKey]?.levels?.[levelKey]?.zones || {};
  const keys = Object.keys(Z);
  if (!keys.length) {
    const empty = document.createElement('div');
    empty.className = 'card level-card';
    empty.textContent = 'No zones in data.';
    zonesGrid.appendChild(empty);
  } else {
    keys.forEach(k => {
      const z = Z[k];
      const card = document.createElement('div');
      card.className = 'card level-card';

      const h = document.createElement('h3');
      h.textContent = `Zone ${k}`;
      card.appendChild(h);

      const row = document.createElement('div'); row.className='level-row';
      const left = document.createElement('div'); left.className='side';
      const lt = document.createElement('div'); lt.className='metric-title'; lt.textContent='Picking';
      left.appendChild(lt);
      renderGauge(left, z.picking?.perf ?? 0);
      const lm = document.createElement('div'); lm.className='metrics';
      lm.appendChild(metricRow('Wave', z.picking?.wave ?? ''));
      lm.appendChild(metricRow('Progress', `${z.picking?.progress ?? 0}%`));
      left.appendChild(lm);

      const vr = document.createElement('div'); vr.className='vrule';

      const right = document.createElement('div'); right.className='side';
      const rt = document.createElement('div'); rt.className='metric-title'; rt.textContent='Stocking';
      right.appendChild(rt);
      renderGauge(right, z.stocking?.perf ?? 0);
      const rm = document.createElement('div'); rm.className='metrics';
      rm.appendChild(metricRow('Expected', z.stocking?.expected ?? ''));
      rm.appendChild(metricRow('Stocked', z.stocking?.stocked ?? ''));
      rm.appendChild(metricRow('Remaining', z.stocking?.remaining ?? ''));
      right.appendChild(rm);

      row.appendChild(left); row.appendChild(vr); row.appendChild(right);
      card.appendChild(row);
      zonesGrid.appendChild(card);
    });
  }

  showPage('zones');
}

/* ---------- Boot ---------- */
async function boot() {
  try {
    const res = await fetch(DATA_URL, { cache: 'no-store' });
    RAW = await res.json();
  } catch (e) {
    console.error('Failed to load data:', e);
    RAW = {};
  }

  tilesGrid.innerHTML = '';

  // department tiles
  const order = ['mz', 'cf', 'hb', 'nc', 'rr'];
  order.forEach(dep => {
    if (!RAW[dep]) return;
    tilesGrid.appendChild(tileCard(dep, RAW[dep]));
  });

  // shipping
  if (RAW.shipping || RAW.ship) {
    tilesGrid.appendChild(shippingCard(RAW.shipping || RAW.ship));
  }

  showPage('main');
}
document.addEventListener('DOMContentLoaded', boot);
