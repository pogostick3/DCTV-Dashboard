/* ================== Chart.js plugin (optional) ================== */
if (window.ChartDataLabels) {
  Chart.register(ChartDataLabels);
}

/* ================== Config ================== */
// Use relative path if your API runs behind the same domain, otherwise specify full URL.
const API_URL = window.DASHBOARD_API_URL || '/api/dashboard';
// Auto-refresh interval (ms). Set to 0 to disable.
const REFRESH_MS = 30000;

/* ================== State ================== */
let dashboardData = {};
const charts = {}; // canvasId -> Chart instance

/* ================== Low-level DOM helpers ================== */
function setTextByDataId(dataId, value) {
  const el = document.querySelector(`[data-id="${dataId}"]`);
  if (el) el.textContent = value;
}
function setBarWidthByDataId(dataId, pct) {
  const el = document.querySelector(`[data-id="${dataId}"]`);
  if (el) el.style.width = `${pct}%`;
}
function setTextById(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
function setBarWidthById(id, pct) {
  const el = document.getElementById(id);
  if (el) el.style.width = `${pct}%`;
}

/* ================== Gauges ================== */
function renderGaugeById(canvasId, value) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  // FIXED canvas size to avoid resize feedback loops
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

  charts[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [value, Math.max(0, 100 - value)],
        backgroundColor: ['#4caf50', '#e0e0e0'],
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

/* ================== Page renderers ================== */
function populateMain() {
  // These depts map to your main tiles in index.html
  const depts = ['mz', 'cf', 'hb', 'nc', 'rr', 'ship'];

  depts.forEach((deptKey) => {
    const dept = dashboardData[deptKey];
    if (!dept) return;
    const firstLevelKey = Object.keys(dept.levels)[0];
    if (!firstLevelKey) return;
    const level = dept.levels[firstLevelKey];

    // Gauges
    renderGaugeById(`${deptKey}Pick`, level.picking?.perf ?? 0);
    renderGaugeById(`${deptKey}Stock`, level.stocking?.perf ?? 0);

    // Numbers
    setTextByDataId(`${deptKey}PickPerf`, `${level.picking?.perf ?? ''}%`);
    setTextByDataId(`${deptKey}StockPerf`, `${level.stocking?.perf ?? ''}%`);
    setTextByDataId(`${deptKey}Wave`, `${level.picking?.wave ?? ''}`);
    setBarWidthByDataId(`${deptKey}Progress`, level.picking?.progress ?? 0);
    setTextByDataId(`${deptKey}ProgressText`, `Progress: ${level.picking?.progress ?? 0}%`);
    setTextByDataId(`${deptKey}Expected`, `${level.stocking?.expected ?? ''}`);
    setTextByDataId(`${deptKey}Stocked`, `${level.stocking?.stocked ?? ''}`);
    setTextByDataId(`${deptKey}Left`, `${level.stocking?.remaining ?? ''}`);
  });
}

function populateLevels_MZ() {
  [1, 2, 3].forEach((lvl) => {
    const level = dashboardData?.mz?.levels?.[lvl];
    if (!level) return;

    renderGaugeById(`mz${lvl}-picking-gauge`, level.picking.perf);
    setTextByDataId(`mz${lvl}Pick`, `${level.picking.perf}%`);
    setTextByDataId(`mz${lvl}Wave`, `${level.picking.wave}`);
    setBarWidthByDataId(`mz${lvl}Progress`, level.picking.progress);
    setTextByDataId(`mz${lvl}ProgressText`, `${level.picking.progress}%`);

    renderGaugeById(`mz${lvl}-stocking-gauge`, level.stocking.perf);
    setTextByDataId(`mz${lvl}Stock`, `${level.stocking.perf}%`);
    setTextByDataId(`mz${lvl}Expected`, `${level.stocking.expected}`);
    setTextByDataId(`mz${lvl}Stocked`, `${level.stocking.stocked}`);
    setTextByDataId(`mz${lvl}Remaining`, `${level.stocking.remaining}`);
  });
}

function populateLevels_CF() {
  [1, 2, 3].forEach((lvl) => {
    const level = dashboardData?.cf?.levels?.[lvl];
    if (!level) return;

    renderGaugeById(`cf${lvl}-picking-gauge`, level.picking.perf);
    setTextByDataId(`cf${lvl}Pick`, `${level.picking.perf}%`);
    setTextByDataId(`cf${lvl}Wave`, `${level.picking.wave}`);
    setBarWidthByDataId(`cf${lvl}Progress`, level.picking.progress);
    setTextByDataId(`cf${lvl}ProgressText`, `${level.picking.progress}%`);

    renderGaugeById(`cf${lvl}-stocking-gauge`, level.stocking.perf);
    setTextByDataId(`cf${lvl}Stock`, `${level.stocking.perf}%`);
    setTextByDataId(`cf${lvl}Expected`, `${level.stocking.expected}`);
    setTextByDataId(`cf${lvl}Stocked`, `${level.stocking.stocked}`);
    setTextByDataId(`cf${lvl}Remaining`, `${level.stocking.remaining}`);
  });
}

function populateLevels_HB() {
  [1, 2, 3].forEach((lvl) => {
    const level = dashboardData?.hb?.levels?.[lvl];
    if (!level) return;

    renderGaugeById(`hb${lvl}-picking-gauge`, level.picking.perf);
    setTextByDataId(`hb${lvl}Pick`, `${level.picking.perf}%`);
    setTextByDataId(`hb${lvl}Wave`, `${level.picking.wave}`);
    setBarWidthByDataId(`hb${lvl}Progress`, level.picking.progress);
    setTextByDataId(`hb${lvl}ProgressText`, `${level.picking.progress}%`);

    renderGaugeById(`hb${lvl}-stocking-gauge`, level.stocking.perf);
    setTextByDataId(`hb${lvl}Stock`, `${level.stocking.perf}%`);
    setTextByDataId(`hb${lvl}Expected`, `${level.stocking.expected}`);
    setTextByDataId(`hb${lvl}Stocked`, `${level.stocking.stocked}`);
    setTextByDataId(`hb${lvl}Remaining`, `${level.stocking.remaining}`);
  });
}

function populateLevels_RR() {
  [1, 2].forEach((lvl) => {
    const level = dashboardData?.rr?.levels?.[lvl];
    if (!level) return;

    renderGaugeById(`rr${lvl}-picking-gauge`, level.picking.perf);
    setTextByDataId(`rr${lvl}Pick`, `${level.picking.perf}%`);
    setTextByDataId(`rr${lvl}Wave`, `${level.picking.wave}`);
    setBarWidthByDataId(`rr${lvl}Progress`, level.picking.progress);
    setTextByDataId(`rr${lvl}ProgressText`, `${level.picking.progress}%`);

    renderGaugeById(`rr${lvl}-stocking-gauge`, level.stocking.perf);
    setTextByDataId(`rr${lvl}Stock`, `${level.stocking.perf}%`);
    setTextByDataId(`rr${lvl}Expected`, `${level.stocking.expected}`);
    setTextByDataId(`rr${lvl}Stocked`, `${level.stocking.stocked}`);
    setTextByDataId(`rr${lvl}Remaining`, `${level.stocking.remaining}`);
  });
}

function populateLevels_NC() {
  const map = [
    ['ncoil', 'oil'],
    ['ncpbs', 'pbs'],
    ['nchighpick', 'highPick'],
    ['ncncrr', 'ncrr'],
  ];
  map.forEach(([prefix, key]) => {
    const level = dashboardData?.nc?.levels?.[key];
    if (!level) return;

    renderGaugeById(`${prefix}-picking-gauge`, level.picking.perf);
    setTextByDataId(`${prefix}Pick`, `${level.picking.perf}%`);
    setTextByDataId(`${prefix}Wave`, `${level.picking.wave}`);
    setBarWidthByDataId(`${prefix}Progress`, level.picking.progress);
    setTextByDataId(`${prefix}ProgressText`, `${level.picking.progress}%`);

    renderGaugeById(`${prefix}-stocking-gauge`, level.stocking.perf);
    setTextByDataId(`${prefix}Stock`, `${level.stocking.perf}%`);
    setTextByDataId(`${prefix}Expected`, `${level.stocking.expected}`);
    setTextByDataId(`${prefix}Stocked`, `${level.stocking.stocked}`);
    setTextByDataId(`${prefix}Remaining`, `${level.stocking.remaining}`);
  });
}

function populateMZZones(levelNumber) {
  const level = dashboardData?.mz?.levels?.[levelNumber];
  if (!level || !level.zones) return;

  Object.keys(level.zones).forEach((zKey) => {
    const z = level.zones[zKey];

    renderGaugeById(`z${zKey}-picking-gauge`, z.picking.perf);
    setTextById(`z${zKey}-pick-text`, `${z.picking.perf}%`);
    setTextById(`z${zKey}-pick-wave`, `Current Wave: ${z.picking.wave}`);
    setBarWidthById(`z${zKey}-pick-progress`, z.picking.progress);
    setTextById(`z${zKey}-pick-progress-text`, `Progress: ${z.picking.progress}%`);

    renderGaugeById(`z${zKey}-stocking-gauge`, z.stocking.perf);
    setTextById(`z${zKey}-stock-text`, `${z.stocking.perf}%`);
    setTextById(`z${zKey}-stock-expected`, `Expected: ${z.stocking.expected}`);
    setTextById(`z${zKey}-stock-stocked`, `Stocked: ${z.stocking.stocked}`);
    setTextById(`z${zKey}-stock-remaining`, `Remaining: ${z.stocking.remaining}`);
  });
}

/* ================== Router ================== */
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

/* ================== Navigation (used by onclick in HTML) ================== */
function navigate(pageId) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  const page = document.getElementById(pageId);
  if (page) {
    page.classList.add('active');
    populateForPage(pageId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
window.navigate = navigate; // make available to inline onclick

/* ================== Fetch + boot ================== */
async function fetchData() {
  const res = await fetch(API_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

async function fetchAndRender(pageId = 'mainPage') {
  try {
    dashboardData = await fetchData();
    populateForPage(pageId);
    const t = document.getElementById('lastUpdated');
    if (t) t.textContent = new Date().toLocaleString();
  } catch (err) {
    console.error('Failed to load dashboard data:', err);
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
