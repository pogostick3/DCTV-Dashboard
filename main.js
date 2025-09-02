/* ===== Register Chart.js plugin if present ===== */
if (window.ChartDataLabels) {
  Chart.register(ChartDataLabels);
}

/* ===== Config (GitHub Pages JSON) ===== */
const API_URL = 'data/dashboard.json'; // served by GitHub Pages
const REFRESH_MS = 0; // no auto-refresh needed for static JSON

/* ===== State ===== */
let dashboardData = {};
const charts = {}; // canvasId -> Chart instance

/* ===== Helpers ===== */
const setTextByDataId = (id, v) => { const el = document.querySelector(`[data-id="${id}"]`); if (el) el.textContent = v; };
const setBarWidthByDataId = (id, v) => { const el = document.querySelector(`[data-id="${id}"]`); if (el) el.style.width = `${v}%`; };
const setTextById = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
const setBarWidthById = (id, v) => { const el = document.getElementById(id); if (el) el.style.width = `${v}%`; };

/* Color thresholds for gauges */
function perfColorName(value) {
  if (value < 75) return 'red';
  if (value <= 90) return 'yellow';
  return 'green';
}
function perfColorHex(name) {
  return name === 'red' ? '#e74c3c'
       : name === 'yellow' ? '#f1c40f'
       : '#2ecc71';
}
function statusFromTwo(perfA, perfB) {
  const a = perfColorName(perfA);
  const b = perfColorName(perfB);
  if (a === 'red' || b === 'red') return 'red';
  if (a === 'yellow' || b === 'yellow') return 'yellow';
  return 'green';
}
function setStatusDotByDataId(id, statusName) {
  const el = document.querySelector(`[data-id="${id}"]`);
  if (!el) return;
  el.classList.remove('status-red', 'status-yellow', 'status-green');
  el.classList.add(`status-${statusName}`);
}

/* ===== Gauges ===== */
function renderGaugeById(canvasId, value) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  // lock canvas size (avoid resize loops)
  const w = parseInt(canvas.getAttribute('width') || '160', 10);
  const h = parseInt(canvas.getAttribute('height') || '80', 10);
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (charts[canvasId]) {
    charts[canvasId].destroy();
    charts[canvasId] = null;
  }

  const color = perfColorHex(perfColorName(Number(value) || 0));

  charts[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [value, Math.max(0, 100 - value)],
        backgroundColor: [color, '#e0e0e0'],
        borderWidth: 0
      }]
    },
    options: {
      rotation: -90,
      circumference: 180,
      cutout: '70%',
      responsive: false,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false }, datalabels: { display: false } }
    }
  });
}

/* ===== Page renderers ===== */
function populateMain() {
  const depts = ['mz', 'cf', 'hb', 'nc', 'rr', 'ship'];

  depts.forEach((deptKey) => {
    const dept = dashboardData[deptKey];
    if (!dept) return;

    const firstLevelKey = Object.keys(dept.levels)[0];
    if (!firstLevelKey) return;

    const level = dept.levels[firstLevelKey];

    // Gauges colors + values
    const pickPerf = Number(level.picking?.perf ?? 0);
    const stockPerf = Number(level.stocking?.perf ?? 0);

    renderGaugeById(`${deptKey}Pick`, pickPerf);
    renderGaugeById(`${deptKey}Stock`, stockPerf);

    // Numbers under gauges
    setTextByDataId(`${deptKey}PickPerf`, `${pickPerf}%`);
    setTextByDataId(`${deptKey}StockPerf`, `${stockPerf}%`);
    setTextByDataId(`${deptKey}Wave`, `${level.picking?.wave ?? ''}`);
    setBarWidthByDataId(`${deptKey}Progress`, level.picking?.progress ?? 0);
    setTextByDataId(`${deptKey}ProgressText`, `Progress: ${level.picking?.progress ?? 0}%`);
    setTextByDataId(`${deptKey}Expected`, `${level.stocking?.expected ?? ''}`);
    setTextByDataId(`${deptKey}Stocked`, `${level.stocking?.stocked ?? ''}`);
    setTextByDataId(`${deptKey}Left`, `${level.stocking?.remaining ?? ''}`);

    // Status light for the tile
    const status = statusFromTwo(pickPerf, stockPerf); // red/yellow/green
    setStatusDotByDataId(`${deptKey}Status`, status);
  });
}

/* (Keep your existing per-level renderers if you use those pages) */
function populateLevels_MZ() { /* optional: add dynamic dots later */ }
function populateLevels_CF() { /* optional */ }
function populateLevels_HB() { /* optional */ }
function populateLevels_RR() { /* optional */ }
function populateLevels_NC() { /* optional */ }
function populateMZZones(levelNumber) { /* optional */ }

/* ===== Router ===== */
function populateForPage(pageId) {
  switch (pageId) {
    case 'mainPage':  return populateMain();
    case 'mzLevels':  return populateLevels_MZ();
    case 'cfLevels':  return populateLevels_CF();
    case 'hbLevels':  return populateLevels_HB();
    case 'rrLevels':  return populateLevels_RR();
    case 'ncLevels':  return populateLevels_NC();
    case 'mzLevel1':  return populateMZZones(1);
    case 'mzLevel2':  return populateMZZones(2);
    case 'mzLevel3':  return populateMZZones(3);
  }
}

/* ===== Navigation used by onclick in HTML ===== */
function navigate(pageId) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  const page = document.getElementById(pageId);
  if (page) {
    page.classList.add('active');
    populateForPage(pageId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
window.navigate = navigate;

/* ===== Fetch + boot ===== */
async function fetchAndRender(pageId = 'mainPage') {
  try {
    const res = await fetch(`${API_URL}?t=${Date.now()}`, { cache: 'no-store' });
    dashboardData = await res.json();
    populateForPage(pageId);
  } catch (err) {
    console.error('Failed to load data/dashboard.json:', err);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  fetchAndRender('mainPage');
  if (REFRESH_MS > 0) {
    setInterval(() => {
      const active = document.querySelector('.page.active')?.id || 'mainPage';
      fetchAndRender(active);
    }, REFRESH_MS);
  }
});
