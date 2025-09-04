/* ===== Chart.js datalabels (if present) ===== */
if (window.ChartDataLabels) {
  Chart.register(ChartDataLabels);
}

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
  if (value < 90) return 'yellow';
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

/* ===== Gauge needle plugin (draws in same scaled ctx) ===== */
const needlePlugin = {
  id: 'needlePlugin',
  afterDatasetsDraw(chart) {
    const meta = chart.getDatasetMeta(0);
    const arc = meta?.data?.[0];
    if (!arc) return;

    const p = arc.getProps
      ? arc.getProps(['x','y','innerRadius','outerRadius','endAngle'], true)
      : { x: arc.x, y: arc.y, innerRadius: arc.innerRadius, outerRadius: arc.outerRadius, endAngle: arc.endAngle };

    const { x: cx, y: cy, innerRadius, outerRadius, endAngle } = p;

    const ds = chart.config.data.datasets[0];
    const gaugeColor = (Array.isArray(ds.backgroundColor) ? ds.backgroundColor[0] : ds.backgroundColor) || '#2ecc71';

    const ctx = chart.ctx;

    const tipOvershoot = 6;
    const headBaseInset = 6;
    const shaftInsetFromCenter = 2;
    const shaftEndInsetFromOuter = headBaseInset + 2;
    const headSpread = 9 * Math.PI / 180;
    const knobR = Math.max(2, (outerRadius - innerRadius) * 0.15);

    const shaftStartR = knobR + shaftInsetFromCenter;
    const shaftEndR   = Math.max(innerRadius, outerRadius - shaftEndInsetFromOuter);

    const sx1 = cx + shaftStartR * Math.cos(endAngle);
    const sy1 = cy + shaftStartR * Math.sin(endAngle);
    const sx2 = cx + shaftEndR   * Math.cos(endAngle);
    const sy2 = cy + shaftEndR   * Math.sin(endAngle);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(sx1, sy1);
    ctx.lineTo(sx2, sy2);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.strokeStyle = gaugeColor;
    ctx.beginPath();
    ctx.moveTo(sx1, sy1);
    ctx.lineTo(sx2, sy2);
    ctx.stroke();

    const headBaseR = outerRadius - headBaseInset;
    const tipR      = outerRadius + tipOvershoot;

    const tipX = cx + tipR * Math.cos(endAngle);
    const tipY = cy + tipR * Math.sin(endAngle);
    const hb1X = cx + headBaseR * Math.cos(endAngle - headSpread);
    const hb1Y = cy + headBaseR * Math.sin(endAngle - headSpread);
    const hb2X = cx + headBaseR * Math.cos(endAngle + headSpread);
    const hb2Y = cy + headBaseR * Math.sin(endAngle + headSpread);

    ctx.beginPath();
    ctx.moveTo(hb1X, hb1Y);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(hb2X, hb2Y);
    ctx.closePath();
    ctx.fillStyle = gaugeColor;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#333';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, knobR, 0, Math.PI * 2);
    ctx.fillStyle = gaugeColor;
    ctx.fill();
    ctx.restore();
  }
};

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
      rotation: -90,
      circumference: 180,
      cutout: '70%',
      responsive: false,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
        datalabels: { display: false }
      }
    },
    plugins: [needlePlugin]
  });
}

/* ===== Shipping waves renderer ===== */
function renderShippingTile() {
  const listEl = document.getElementById('shippingWaves');
  if (!listEl) return;

  // grab waves array if provided; fallback to single row from picking progress
  const ship = dashboardData?.ship;
  const firstLevelKey = ship?.levels ? Object.keys(ship.levels)[0] : null;
  const level = firstLevelKey ? ship.levels[firstLevelKey] : null;

  let waves = ship?.waves;
  if (!Array.isArray(waves) || waves.length === 0) {
    const single = Number(level?.picking?.progress ?? 0);
    waves = [{ wave: level?.picking?.wave ?? 1, progress: single }];
  }

  listEl.innerHTML = '';
  waves.forEach(w => {
    const pct = Math.max(0, Math.min(100, Number(w.progress) || 0));
    const color = perfColorHex(perfColorName(pct));

    const row = document.createElement('div');
    row.className = 'wave-row';
    row.innerHTML = `
      <div class="wave-label">${w.wave}</div>
      <div class="wave-bar"><div class="wave-fill" style="width:${pct}%; background:${color}"></div></div>
      <div class="wave-pct">${pct}%</div>
    `;
    listEl.appendChild(row);
  });
}

/* ===== HOME ===== */
function populateMain() {
  const depts = ['mz', 'cf', 'hb', 'nc', 'rr', 'ship'];
  depts.forEach((deptKey) => {
    const dept = dashboardData[deptKey];
    if (!dept) return;
    const firstLevelKey = Object.keys(dept.levels || {})[0];

    if (deptKey === 'ship') {
      // Render custom waves list
      renderShippingTile();

      // Status dot still based on perf numbers if present
      const lvl = firstLevelKey ? dept.levels[firstLevelKey] : null;
      const pickPerf  = Number(lvl?.picking?.perf ?? 0);
      const stockPerf = Number(lvl?.stocking?.perf ?? 0);
      setStatusDotByDataId(`shipStatus`, statusFromTwo(pickPerf, stockPerf));
      return;
    }

    const level = dept.levels[firstLevelKey];
    const pickPerf  = Number(level?.picking?.perf ?? 0);
    const stockPerf = Number(level?.stocking?.perf ?? 0);

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

    setStatusDotByDataId(`rr${lvl}Status`, `${statusFromTwo(pickPerf, stockPerf)}`);
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

/* ===== Zones (MZ) ===== */
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
