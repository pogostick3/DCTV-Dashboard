// main.js — drop-in
// ------------------------------------------------------------------
// Chart.js plugin (optional)
if (window.ChartDataLabels) {
  Chart.register(ChartDataLabels);
}

// ---------------------- Globals ----------------------
let DASH = null;           // loaded dashboard.json
const CHARTS = new Map();  // keep references to gauges so we can replace/cleanup

// ---------------------- Utils ------------------------
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const setText = (sel, val) => { const el = $(sel); if (el) el.textContent = val; };
const setDataText = (did, val) => {
  const el = document.querySelector(`[data-id='${did}']`);
  if (el) el.textContent = val;
};
const setWidthByDataId = (did, pct) => {
  const el = document.querySelector(`[data-id='${did}']`);
  if (el) el.style.width = `${clamp(pct || 0, 0, 100)}%`;
};

function perfColor(p) {
  const v = Number(p) || 0;
  if (v < 75) return '#e74c3c';     // red
  if (v <= 90) return '#f1c40f';    // yellow
  return '#2ecc71';                 // green
}

function statusFrom(perfA, perfB) {
  const cA = perfColor(perfA);
  const cB = perfColor(perfB);
  // red if any red, else yellow if any yellow, else green
  if (cA === '#e74c3c' || cB === '#e74c3c') return '#e74c3c';
  if (cA === '#f1c40f' || cB === '#f1c40f') return '#f1c40f';
  return '#2ecc71';
}

// ------------------ Gauge with needle -----------------
const needlePlugin = {
  id: 'gaugeNeedle',
  afterDatasetsDraw(chart, args, pluginOptions) {
    const val = (chart.config.data || {})._needleValue ?? 0;
    const angle = -Math.PI + (clamp(val, 0, 100) / 100) * Math.PI; // -π (left) → 0 (right)

    const meta = chart.getDatasetMeta(0);
    const arc = meta?.data?.[0];
    if (!arc) return;

    const { x: cx, y: cy, innerRadius, outerRadius } = arc;
    const r = (innerRadius + outerRadius) / 2;

    const ctx = chart.ctx;
    ctx.save();

    // needle line
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#555';
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
    ctx.stroke();

    // arrow head (small triangle)
    const ah = 8; // arrow length
    const aw = 6; // arrow width
    const tipX = cx + r * Math.cos(angle);
    const tipY = cy + r * Math.sin(angle);
    const leftX = tipX - ah * Math.cos(angle) + (aw / 2) * Math.cos(angle - Math.PI / 2);
    const leftY = tipY - ah * Math.sin(angle) + (aw / 2) * Math.sin(angle - Math.PI / 2);
    const rightX = tipX - ah * Math.cos(angle) + (aw / 2) * Math.cos(angle + Math.PI / 2);
    const rightY = tipY - ah * Math.sin(angle) + (aw / 2) * Math.sin(angle + Math.PI / 2);
    ctx.beginPath();
    ctx.fillStyle = '#777';
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(leftX, leftY);
    ctx.lineTo(rightX, rightY);
    ctx.closePath();
    ctx.fill();

    // center dot
    ctx.beginPath();
    ctx.fillStyle = '#555';
    ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
    ctx.fill();

    ctx.restore();
  }
};

function renderGauge(canvas, value) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // cleanup old chart on this canvas
  if (CHARTS.has(canvas.id)) {
    CHARTS.get(canvas.id).destroy();
    CHARTS.delete(canvas.id);
  }

  const v = clamp(Number(value) || 0, 0, 100);
  const color = perfColor(v);

  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      _needleValue: v,
      datasets: [{
        data: [v, 100 - v],
        backgroundColor: [color, '#e0e0e0'],
        borderWidth: 0
      }]
    },
    options: {
      rotation: -Math.PI,     // start at left
      circumference: Math.PI, // half-circle
      cutout: '70%',
      responsive: false,
      animation: { duration: 300 },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
        datalabels: { display: false }
      }
    },
    plugins: [needlePlugin]
  });

  CHARTS.set(canvas.id, chart);
}

// -------------------- Data helpers --------------------
function summaryFromDeptKey(deptKey) {
  if (!DASH || !DASH[deptKey]) return null;

  // Prefer explicit "dept" sheet data if present (demo mode)
  if (DASH[deptKey].dept) return DASH[deptKey].dept;

  // Fallback to the first/numeric-lowest level
  const levels = DASH[deptKey].levels || {};
  const keys = Object.keys(levels);
  if (!keys.length) return null;
  const firstKey = keys
    .map(k => (isFinite(k) ? Number(k) : k))
    .sort((a, b) => (typeof a === 'number' && typeof b === 'number') ? a - b : 0)[0];

  const lvl = levels[firstKey];
  if (!lvl) return null;

  return {
    picking: {
      perf: lvl.picking?.perf ?? 0,
      wave: lvl.picking?.wave ?? 0,
      progress: lvl.picking?.progress ?? 0,
      ordersCompleted: (DASH[deptKey].orders || []).find(o => o.wave === lvl.picking?.wave)?.completed ?? 0,
      ordersTotal: (DASH[deptKey].orders || []).find(o => o.wave === lvl.picking?.wave)?.total ?? 0
    },
    stocking: {
      perf: lvl.stocking?.perf ?? 0,
      expected: lvl.stocking?.expected ?? 0,
      stocked: lvl.stocking?.stocked ?? 0,
      remaining: lvl.stocking?.remaining ?? 0
    }
  };
}

// -------------------- Home tiles ----------------------
function updateHomeFromSummary(prefix, sum) {
  // Gauges
  renderGauge(document.getElementById(`${prefix}Pick`), sum.picking.perf);
  renderGauge(document.getElementById(`${prefix}Stock`), sum.stocking.perf);

  // Perf labels
  setDataText(`${prefix}PickPerf`, `${sum.picking.perf}%`);
  setDataText(`${prefix}StockPerf`, `${sum.stocking.perf}%`);

  // Picking column
  setDataText(`${prefix}Wave`, `${sum.picking.wave ?? ''}`);
  setWidthByDataId(`${prefix}Progress`, sum.picking.progress);
  setDataText(`${prefix}ProgressText`, `Progress: ${sum.picking.progress ?? 0}%`);
  setDataText(`${prefix}Orders`,
    `${sum.picking.ordersCompleted ?? 0}/${sum.picking.ordersTotal ?? 0}`);

  // Stocking column
  setDataText(`${prefix}Expected`, `${sum.stocking.expected ?? ''}`);
  setDataText(`${prefix}Stocked`, `${sum.stocking.stocked ?? ''}`);
  setDataText(`${prefix}Left`, `${sum.stocking.remaining ?? ''}`);

  // Status dot
  const dot = document.querySelector(`[data-id='${prefix}Status']`);
  if (dot) {
    dot.style.backgroundColor = statusFrom(sum.picking.perf, sum.stocking.perf);
  }
}

function populateHome() {
  const depts = ['mz', 'cf', 'hb', 'nc', 'rr'];
  depts.forEach((d) => {
    const summary = summaryFromDeptKey(d);
    if (summary) updateHomeFromSummary(d, summary);
  });

  // Shipping waves list (if you added the custom tile)
  const waves = DASH?.ship?.waves || [];
  const waveList = document.getElementById('shipWaveList') || document.querySelector('[data-id="shipWaveList"]');
  if (waveList) {
    waveList.innerHTML = '';
    waves
      .slice() // copy
      .sort((a, b) => a.wave - b.wave)
      .forEach(w => {
        const row = document.createElement('div');
        row.className = 'ship-wave-row';
        row.style.margin = '6px 0';

        const label = document.createElement('div');
        label.textContent = `Wave ${w.wave}: ${clamp(w.progress, 0, 100)}%`;
        label.style.fontSize = '0.95em';
        label.style.marginBottom = '4px';

        const bar = document.createElement('div');
        bar.className = 'progress-bar';
        const fill = document.createElement('div');
        fill.className = 'progress-fill';
        fill.style.width = `${clamp(w.progress, 0, 100)}%`;
        bar.appendChild(fill);

        row.appendChild(label);
        row.appendChild(bar);
        waveList.appendChild(row);
      });
  }
}

// ---------------- Levels & Zones (kept working) -------
function renderLevelGauge(canvasId, value, textDataId) {
  const c = document.getElementById(canvasId);
  if (c) renderGauge(c, value);
  if (textDataId) setDataText(textDataId, `${value}%`);
}

function populateLevelsPage(deptKey, mapping) {
  // mapping: array of { levelKey, prefix } where prefix matches your data-id/canvas prefixes
  const levels = DASH?.[deptKey]?.levels || {};
  mapping.forEach(({ levelKey, prefix }) => {
    const lvl = levels[levelKey];
    if (!lvl) return;

    // Gauges + center text
    renderLevelGauge(`${prefix}-picking-gauge`, lvl.picking?.perf ?? 0, `${prefix}Pick`);
    renderLevelGauge(`${prefix}-stocking-gauge`, lvl.stocking?.perf ?? 0, `${prefix}Stock`);

    // Picking side
    setDataText(`${prefix}Wave`, `${lvl.picking?.wave ?? ''}`);
    setDataText(`${prefix}ProgressText`, `Progress: ${lvl.picking?.progress ?? 0}%`);
    setWidthByDataId(`${prefix}Progress`, lvl.picking?.progress ?? 0);

    // Stocking side
    setDataText(`${prefix}Expected`, `${lvl.stocking?.expected ?? ''}`);
    setDataText(`${prefix}Stocked`, `${lvl.stocking?.stocked ?? ''}`);
    setDataText(`${prefix}Remaining`, `${lvl.stocking?.remaining ?? ''}`);
  });
}

function populateZonesFromLevel(levelObj, zonesMap) {
  if (!levelObj?.zones) return;
  Object.entries(levelObj.zones).forEach(([z, zdata]) => {
    // canvases
    renderGauge(document.getElementById(`z${z}-picking-gauge`), zdata.picking?.perf ?? 0);
    renderGauge(document.getElementById(`z${z}-stocking-gauge`), zdata.stocking?.perf ?? 0);
    // center texts
    setText(`#z${z}-pick-text`, `${zdata.picking?.perf ?? 0}%`);
    setText(`#z${z}-stock-text`, `${zdata.stocking?.perf ?? 0}%`);
    // picking details
    setText(`#z${z}-pick-wave`, `Current Wave: ${zdata.picking?.wave ?? ''}`);
    setText(`#z${z}-pick-progress-text`, `Progress: ${zdata.picking?.progress ?? 0}%`);
    const p = document.getElementById(`z${z}-pick-progress`);
    if (p) p.style.width = `${clamp(zdata.picking?.progress ?? 0, 0, 100)}%`;
    // stocking details
    setText(`#z${z}-stock-expected`, `Expected: ${zdata.stocking?.expected ?? ''}`);
    setText(`#z${z}-stock-stocked`, `Stocked: ${zdata.stocking?.stocked ?? ''}`);
    setText(`#z${z}-stock-remaining`, `Remaining: ${zdata.stocking?.remaining ?? ''}`);
  });
}

// ---------------- Page routing ------------------------
function activePageId() {
  const p = document.querySelector('.page.active');
  return p ? p.id : '';
}

function populateCurrentPage() {
  const id = activePageId();
  if (!id || !DASH) return;

  if (id === 'mainPage') {
    populateHome();
    return;
  }

  // MZ Levels & Zones
  if (id === 'mzLevels') {
    populateLevelsPage('mz', [
      { levelKey: 1, prefix: 'mz1' },
      { levelKey: 2, prefix: 'mz2' },
      { levelKey: 3, prefix: 'mz3' }
    ]);
    return;
  }
  if (id === 'mzLevel1') populateZonesFromLevel(DASH?.mz?.levels?.[1]);
  if (id === 'mzLevel2') populateZonesFromLevel(DASH?.mz?.levels?.[2]);
  if (id === 'mzLevel3') populateZonesFromLevel(DASH?.mz?.levels?.[3]);

  // CF Levels
  if (id === 'cfLevels') {
    populateLevelsPage('cf', [
      { levelKey: 1, prefix: 'cf1' },
      { levelKey: 2, prefix: 'cf2' },
      { levelKey: 3, prefix: 'cf3' }
    ]);
    return;
  }

  // HB Levels
  if (id === 'hbLevels') {
    populateLevelsPage('hb', [
      { levelKey: 1, prefix: 'hb1' },
      { levelKey: 2, prefix: 'hb2' },
      { levelKey: 3, prefix: 'hb3' }
    ]);
    return;
  }

  // RR Levels
  if (id === 'rrLevels') {
    populateLevelsPage('rr', [
      { levelKey: 1, prefix: 'rr1' },
      { levelKey: 2, prefix: 'rr2' }
    ]);
    return;
  }

  // NC has named levels
  if (id === 'ncLevels') {
    const lv = DASH?.nc?.levels || {};
    const map = [
      { key: 'oil',      prefix: 'ncoil' },
      { key: 'pbs',      prefix: 'ncpbs' },
      { key: 'highPick', prefix: 'nchighpick' },
      { key: 'ncrr',     prefix: 'ncncrr' }
    ];
    map.forEach(({ key, prefix }) => {
      const lvl = lv[key];
      if (!lvl) return;
      renderLevelGauge(`${prefix}-picking-gauge`, lvl.picking?.perf ?? 0, `${prefix}Pick`);
      renderLevelGauge(`${prefix}-stocking-gauge`, lvl.stocking?.perf ?? 0, `${prefix}Stock`);
      setDataText(`${prefix}Wave`, `${lvl.picking?.wave ?? ''}`);
      setDataText(`${prefix}ProgressText`, `Progress: ${lvl.picking?.progress ?? 0}%`);
      setWidthByDataId(`${prefix}Progress`, lvl.picking?.progress ?? 0);
      setDataText(`${prefix}Expected`, `${lvl.stocking?.expected ?? ''}`);
      setDataText(`${prefix}Stocked`, `${lvl.stocking?.stocked ?? ''}`);
      setDataText(`${prefix}Remaining`, `${lvl.stocking?.remaining ?? ''}`);
    });
    return;
  }
}

function navigate(pageId) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  const el = document.getElementById(pageId);
  if (el) el.classList.add('active');
  // re-render charts/content for the newly visible page
  setTimeout(populateCurrentPage, 0);
}

// --------------- Boot ------------------
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('data/dashboard.json', { cache: 'no-store' });
    DASH = await res.json();
  } catch (e) {
    console.error('Failed to load dashboard.json', e);
    DASH = null;
  }
  populateCurrentPage(); // draw what's visible
});

// expose navigate globally for onclick handlers in HTML
window.navigate = navigate;
