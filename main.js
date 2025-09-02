/* ===== Chart.js plugins ===== */
if (window.ChartDataLabels) {
  Chart.register(ChartDataLabels);
}

/* --- Needle plugin: draws a radial bar across the ring + a center knob --- */
const gaugeNeedlePlugin = {
  id: 'gaugeNeedle',
  afterDatasetsDraw(chart, args, opts) {
    try {
      if (chart.config.type !== 'doughnut') return;

      const ds = chart.config.data?.datasets?.[0];
      const meta = chart.getDatasetMeta(0);
      const arc = meta?.data?.[0];
      if (!ds || !arc) return;

      const value = Number(ds.data?.[0]) || 0;

      // Rotation/circumference are in degrees; convert to radians
      const rotation = chart.options.rotation ?? -90;   // start at 12 o’clock
      const circumference = chart.options.circumference ?? 180;
      const angleRad = (rotation + (circumference * (value / 100))) * Math.PI / 180;

      const ctx = chart.ctx;
      const cx = arc.x;
      const cy = arc.y;
      const inner = arc.innerRadius;
      const outer = arc.outerRadius;
      const thickness = Math.max(2, outer - inner);

      // Line width sized to ring thickness so it’s clearly visible across the arc
      const lineWidth = Math.max(3, thickness * (opts?.widthRatio ?? 0.6));
      const color = perfColorHex(perfColorName(value));

      // Compute radial endpoints from inner to outer radius
      const x1 = cx + inner * Math.cos(angleRad);
      const y1 = cy + inner * Math.sin(angleRad);
      const x2 = cx + outer * Math.cos(angleRad);
      const y2 = cy + outer * Math.sin(angleRad);

      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;

      // Radial bar (needle) across the ring
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Center knob
      const knobR = Math.max(2, (opts?.knobRadiusRatio ?? 0.15) * thickness);
      ctx.beginPath();
      ctx.arc(cx, cy, knobR, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      ctx.restore();
    } catch (_) { /* keep chart from breaking on any error */ }
  }
};
Chart.register(gaugeNeedlePlugin);

/* ===== Config (GitHub Pages JSON) ===== */
const API_URL = 'data/dashboard.json';
const REFRESH_MS = 0;

/* ===== State ===== */
let dashboardData = {};
const charts = {}; // canvasId -> Chart instance

/* ===== Helpers ===== */
const setTextByDataId = (id, v) => { const el = document.querySelector(`[data-id="${id}"]`); if (el) el.textContent = v; };
const setBarWidthByDataId = (id, v) => { const el = document.querySelector(`[data-id="${id}"]`); if (el) el.style.width = `${v}%`; };
const setTextById = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
const setBarWidthById = (id, v) => { const el = document.getElementById(id); if (el) el.style.width = `${v}%`; };

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
function statusFromTwo(a, b) {
  const ca = perfColorName(a), cb = perfColorName(b);
  if (ca === 'red' || cb === 'red') return 'red';
  if (ca === 'yellow' || cb === 'yellow') return 'yellow';
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

  // Fix canvas size (prevents browser/layout differences)
  const w = parseInt(canvas.getAttribute('width') || '160', 10);
  const h = parseInt(canvas.getAttribute('height') || '80', 10);
  canvas.width = w; canvas.height = h;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (charts[canvasId]) { charts[canvasId].destroy(); charts[canvasId] = null; }

  const val = Number(value) || 0;
  const color = perfColorHex(perfColorName(val));

  charts[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [val, Math.max(0, 100 - val)],
        backgroundColor: [color, '#e0e0e0'],
        borderWidth: 0
      }]
    },
    options: {
      rotation: -90,          // start at 12 o’clock
      circumference: 180,     // half circle
      cutout: '70%',
      responsive: false,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
        datalabels: { display: false },
        // per-chart options for our needle plugin
        gaugeNeedle: {
          widthRatio: 0.6,        // how thick the radial bar is (fraction of ring thickness)
          knobRadiusRatio: 0.15   // center knob size (fraction of ring thickness)
        }
      }
    }
  });
}

/* ===== HOME ===== */
function populateMain() {
  const depts = ['mz', 'cf', 'hb', 'nc', 'rr', 'ship'];
  depts.forEach((deptKey) => {
    const dept = dashboardData[deptKey];
    if (!dept) return;
    const firstLevelKey = Object.keys(dept.levels)[0];
    if (!firstLevelKey) return;

    const level = dept.levels[firstLevelKey];
    const pickPerf  = Number(level.picking?.perf ?? 0);
    const stockPerf = Number(level.stocking?.perf ?? 0);

    renderGaugeById(`${deptKey}Pick`, pickPerf);
    renderGaugeById(`${deptKey}Stock`, stockPerf);

    setTextByDataId(`${deptKey}PickPerf`, `${pickPerf}%`);
    setTextByDataId(`${deptKey}StockPerf`, `${stockPerf}%`);
    setTextByDataId(`${deptKey}Wave`, `${level.picking?.wave ?? ''}`);
    setBarWidthByDataId(`${deptKey}Progress`, level.picking?.progress ?? 0);
    setTextByDataId(`${deptKey}ProgressText`, `Progress: ${level.picking?.progress ?? 0}%`);
    setTextByDataId(`${deptKey}Expected`, `${level.stocking?.expected ?? ''}`);
    setTextByDataId(`${deptKey}Stocked`, `${level.stocking?.stocked ?? ''}`);
    setTextByDataId(`${deptKey}Left`, `${level.stocking?.remaining ?? ''}`);

    setStatusDotByDataId(`${deptKey}Status`, statusFromTwo(pickPerf, stockPerf));
  });
}

/* ===== LEVELS ===== */
function populateLevels_MZ() {
  [1,2,3].forEach((lvl) => {
    const level = dashboardData?.mz?.levels?.[lvl];
    if (!level) return;
    const pickPerf = Number(level.picking.perf);
    const stockPerf = Number(level.stocking.perf);

    renderGaugeById(`mz${lvl}-picking-gauge`, pickPerf);
    renderGaugeById(`mz${lvl}-stocking-gauge`, stockPerf);

    setTextByDataId(`mz${lvl}Pick`, `${pickPerf}%`);
    setTextByDataId(`mz${lvl}Wave`, `${level.picking.wave}`);
    setBarWidthByDataId(`mz${lvl}Progress`, level.picking.progress);
    setTextByDataId(`mz${lvl}ProgressText`, `${level.picking.progress}%`);

    setTextByDataId(`mz${lvl}Stock`, `${stockPerf}%`);
    setTextByDataId(`mz${lvl}Expected`, `${level.stocking.expected}`);
    setTextByDataId(`mz${lvl}Stocked`, `${level.stocking.stocked}`);
    setTextByDataId(`mz${lvl}Remaining`, `${level.stocking.remaining}`);

    setStatusDotByDataId(`mz${lvl}Status`, statusFromTwo(pickPerf, stockPerf));
  });
}
function populateLevels_CF() {
  [1,2,3].forEach((lvl) => {
    const level = dashboardData?.cf?.levels?.[lvl];
    if (!level) return;
    const pickPerf = Number(level.picking.perf);
    const stockPerf = Number(level.stocking.perf);

    renderGaugeById(`cf${lvl}-picking-gauge`, pickPerf);
    renderGaugeById(`cf${lvl}-stocking-gauge`, stockPerf);

    setTextByDataId(`cf${lvl}Pick`, `${pickPerf}%`);
    setTextByDataId(`cf${lvl}Wave`, `${level.picking.wave}`);
    setBarWidthByDataId(`cf${lvl}Progress`, level.picking.progress);
    setTextByDataId(`cf${lvl}ProgressText`, `${level.picking.progress}%`);

    setTextByDataId(`cf${lvl}Stock`, `${stockPerf}%`);
    setTextByDataId(`cf${lvl}Expected`, `${level.stocking.expected}`);
    setTextByDataId(`cf${lvl}Stocked`, `${level.stocking.stocked}`);
    setTextByDataId(`cf${lvl}Remaining`, `${level.stocking.remaining}`);

    setStatusDotByDataId(`cf${lvl}Status`, statusFromTwo(pickPerf, stockPerf));
  });
}
function populateLevels_HB() {
  [1,2,3].forEach((lvl) => {
    const level = dashboardData?.hb?.levels?.[lvl];
    if (!level) return;
    const pickPerf = Number(level.picking.perf);
    const stockPerf = Number(level.stocking.perf);

    renderGaugeById(`hb${lvl}-picking-gauge`, pickPerf);
    renderGaugeById(`hb${lvl}-stocking-gauge`, stockPerf);

    setTextByDataId(`hb${lvl}Pick`, `${pickPerf}%`);
    setTextByDataId(`hb${lvl}Wave`, `${level.picking.wave}`);
    setBarWidthByDataId(`hb${lvl}Progress`, level.picking.progress);
    setTextByDataId(`hb${lvl}ProgressText`, `${level.picking.progress}%`);

    setTextByDataId(`hb${lvl}Stock`, `${stockPerf}%`);
    setTextByDataId(`hb${lvl}Expected`, `${level.stocking.expected}`);
    setTextByDataId(`hb${lvl}Stocked`, `${level.stocking.stocked}`);
    setTextByDataId(`hb${lvl}Remaining`, `${level.stocking.remaining}`);

    setStatusDotByDataId(`hb${lvl}Status`, statusFromTwo(pickPerf, stockPerf));
  });
}
function populateLevels_RR() {
  [1,2].forEach((lvl) => {
    const level = dashboardData?.rr?.levels?.[lvl];
    if (!level) return;
    const pickPerf = Number(level.picking.perf);
    const stockPerf = Number(level.stocking.perf);

    renderGaugeById(`rr${lvl}-picking-gauge`, pickPerf);
    renderGaugeById(`rr${lvl}-stocking-gauge`, stockPerf);

    setTextByDataId(`rr${lvl}Pick`, `${pickPerf}%`);
    setTextByDataId(`rr${lvl}Wave`, `${level.picking.wave}`);
    setBarWidthByDataId(`rr${lvl}Progress`, level.picking.progress);
    setTextByDataId(`rr${lvl}ProgressText`, `${level.picking.progress}%`);

    setTextByDataId(`rr${lvl}Stock`, `${stockPerf}%`);
    setTextByDataId(`rr${lvl}Expected`, `${level.stocking.expected}`);
    setTextByDataId(`rr${lvl}Stocked`, `${level.stocking.stocked}`);
    setTextByDataId(`rr${lvl}Remaining`, `${level.stocking.remaining}`);

    setStatusDotByDataId(`rr${lvl}Status`, statusFromTwo(pickPerf, stockPerf));
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

    const pickPerf = Number(level.picking.perf);
    const stockPerf = Number(level.stocking.perf);

    renderGaugeById(`${prefix}-picking-gauge`, pickPerf);
    renderGaugeById(`${prefix}-stocking-gauge`, stockPerf);

    setTextByDataId(`${prefix}Pick`, `${pickPerf}%`);
    setTextByDataId(`${prefix}Wave`, `${level.picking.wave}`);
    setBarWidthByDataId(`${prefix}Progress`, level.picking.progress);
    setTextByDataId(`${prefix}ProgressText`, `${level.picking.progress}%`);

    setTextByDataId(`${prefix}Stock`, `${stockPerf}%`);
    setTextByDataId(`${prefix}Expected`, `${level.stocking.expected}`);
    setTextByDataId(`${prefix}Stocked`, `${level.stocking.stocked}`);
    setTextByDataId(`${prefix}Remaining`, `${level.stocking.remaining}`);

    setStatusDotByDataId(`${prefix}Status`, statusFromTwo(pickPerf, stockPerf));
  });
}

/* ===== ZONES (MZ) ===== */
function populateMZZones(levelNumber) {
  const level = dashboardData?.mz?.levels?.[levelNumber];
  if (!level || !level.zones) return;

  Object.keys(level.zones).forEach((zKey) => {
    const z = level.zones[zKey];
    const pickPerf = Number(z.picking.perf);
    const stockPerf = Number(z.stocking.perf);

    renderGaugeById(`z${zKey}-picking-gauge`, pickPerf);
    setTextById(`z${zKey}-pick-text`, `${pickPerf}%`);
    setTextById(`z${zKey}-pick-wave`, `Current Wave: ${z.picking.wave}`);
    setBarWidthById(`z${zKey}-pick-progress`, z.picking.progress);
    setTextById(`z${zKey}-pick-progress-text`, `Progress: ${z.picking.progress}%`);

    renderGaugeById(`z${zKey}-stocking-gauge`, stockPerf);
    setTextById(`z${zKey}-stock-text`, `${stockPerf}%`);
    setTextById(`z${zKey}-stock-expected`, `Expected: ${z.stocking.expected}`);
    setTextById(`z${zKey}-stock-stocked`, `Stocked: ${z.stocking.stocked}`);
    setTextById(`z${zKey}-stock-remaining`, `Remaining: ${z.stocking.remaining}`);

    setStatusDotByDataId(`z${zKey}Status`, statusFromTwo(pickPerf, stockPerf));
  });
}

/* ===== Router / Navigation ===== */
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
