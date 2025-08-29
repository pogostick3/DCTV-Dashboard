/* ===== Chart.js plugin (optional) ===== */
if (window.ChartDataLabels) {
  Chart.register(ChartDataLabels);
}

/* ===== Config ===== */
const API_URL = 'data/dashboard.json'; // GitHub Pages serves this file
const REFRESH_MS = 0; // JSON changes only when you push to GitHub, so no auto-refresh needed

/* ===== State ===== */
let dashboardData = {};
const charts = {}; // canvasId -> Chart instance

/* ===== DOM helpers ===== */
const setTextByDataId = (id, v) => { const el = document.querySelector(`[data-id="${id}"]`); if (el) el.textContent = v; };
const setBarWidthByDataId = (id, v) => { const el = document.querySelector(`[data-id="${id}"]`); if (el) el.style.width = `${v}%`; };
const setTextById = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
const setBarWidthById = (id, v) => { const el = document.getElementById(id); if (el) el.style.width = `${v}%`; };

/* ===== Gauges ===== */
function renderGaugeById(canvasId, value) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const w = parseInt(canvas.getAttribute('width') || '160', 10);
  const h = parseInt(canvas.getAttribute('height') || '80', 10);
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (charts[canvasId]) charts[canvasId].destroy();

  charts[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: { datasets: [{ data: [value, Math.max(0, 100 - value)], backgroundColor: ['#4caf50', '#e0e0e0'], borderWidth: 0 }] },
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

    renderGaugeById(`${deptKey}Pick`, level.picking?.perf ?? 0);
    renderGaugeById(`${deptKey}Stock`, level.stocking?.perf ?? 0);

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

/* Zones for MZ */
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

/* ===== Navigation (used by onclick in HTML) ===== */
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
    const res = await fetch(API_URL, { cache: 'no-store' });
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
