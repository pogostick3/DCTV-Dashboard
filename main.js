/* ====== tiny helpers ====== */
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const setText = (idOrData, v) => {
  const el = document.querySelector(`[data-id="${idOrData}"]`);
  if (el) el.textContent = v;
};
const setWidth = (idOrData, pct) => {
  const el = document.querySelector(`[data-id="${idOrData}"]`);
  if (el) el.style.width = `${Math.max(0, Math.min(100, pct))}%`;
};

function navigate(id) {
  $$('.page').forEach(p => p.classList.remove('active'));
  $(`#${id}`)?.classList.add('active');
  window.scrollTo(0,0);
}
window.navigate = navigate;

/* ====== Chart.js gauge factory (fixes sliver issue) ====== */
const GAUGE_W = 220, GAUGE_H = 120;
const colorFor = p => (p < 75 ? '#e74c3c' : p < 90 ? '#f1c40f' : '#2ecc71');

/* Draw a small triangle needle on top of the doughnut */
const needlePlugin = {
  id: 'needle',
  afterDraw(chart, _args, opts) {
    const v = Number(opts.value ?? 0);
    const color = opts.color || '#444';
    const {ctx, chartArea} = chart;
    const cx = chartArea.left + chartArea.width/2;
    const cy = chartArea.bottom;           // center sits on bottom for a semicircle
    const r  = Math.min(chartArea.width/2, GAUGE_H-8);

    const ang = (-90 + (v/100)*180) * Math.PI/180;
    const tipX = cx + r * Math.cos(ang);
    const tipY = cy + r * Math.sin(ang);

    ctx.save();
    ctx.fillStyle = color;
    // triangle needle
    const back = 16;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(cx + back*Math.cos(ang + Math.PI/2), cy + back*Math.sin(ang + Math.PI/2));
    ctx.lineTo(cx + back*Math.cos(ang - Math.PI/2), cy + back*Math.sin(ang - Math.PI/2));
    ctx.closePath();
    ctx.fill();
    // hub
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
};
Chart.register(needlePlugin);

function makeGauge(canvasId, pct) {
  const el = document.getElementById(canvasId);
  if (!el) return;
  // Hard size to avoid “sliver” responsiveness
  el.width = GAUGE_W;
  el.height = GAUGE_H;

  const val = Math.max(0, Math.min(100, Number(pct || 0)));
  return new Chart(el.getContext('2d'), {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [val, 100 - val, 6],                   // value, remainder, tiny end-cap
        backgroundColor: [colorFor(val), '#e5e7eb', '#d1d5db'],
        borderWidth: 0,
        circumference: 180,
        rotation: -90,
        cutout: '70%',
        hoverOffset: 0
      }]
    },
    options: {
      responsive: false,                 // <<< stops skinny charts
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
        needle: { value: val, color: '#555' }
      }
    }
  });
}

/* ====== status light logic ====== */
function setStatusDot(id, pickPerf, stockPerf) {
  const el = document.querySelector(`[data-id="${id}"]`);
  if (!el) return;
  let cls = 'status-green';
  if (pickPerf < 75 || stockPerf < 75) cls = 'status-red';
  else if (pickPerf < 90 || stockPerf < 90) cls = 'status-yellow';
  el.classList.remove('status-green','status-yellow','status-red');
  el.classList.add(cls);
}

/* ====== populate cards from JSON ====== */
function fillDeptCard(key, src) {
  if (!src) return;

  // numbers (fallback to 0)
  const pPerf  = Number(src.pick_perf ?? 0);
  const sPerf  = Number(src.stock_perf ?? 0);
  const wave   = src.wave ?? src.pick_wave ?? 0;
  const prog   = Number(src.progress ?? 0);
  const orders = `${src.orders_complete ?? 0}/${src.orders_total ?? 0}`;
  const exp    = Number(src.expected ?? 0);
  const stk    = Number(src.stocked ?? 0);
  const left   = Number(src.left ?? src.remaining ?? 0);

  // texts
  setText(`${key}PickPerf`, `${pPerf}%`);
  setText(`${key}StockPerf`, `${sPerf}%`);
  setText(`${key}Wave`, wave);
  setWidth(`${key}Progress`, prog);
  setText(`${key}ProgressText`, `Progress: ${prog}%`);
  setText(`${key}Orders`, orders);
  setText(`${key}Expected`, exp);
  setText(`${key}Stocked`, stk);
  setText(`${key}Left`, left);

  // status & gauges
  setStatusDot(`${key}Status`, pPerf, sPerf);
  makeGauge(`${key}Pick`, pPerf);
  makeGauge(`${key}Stock`, sPerf);
}

/* ====== Shipping list ====== */
function buildShipping(shipping) {
  const host = $('#shipWaveList');
  if (!host) return;
  host.innerHTML = '';
  const waves = shipping?.waves ?? [];
  waves.forEach(w => {
    const row = document.createElement('div');
    row.className = 'ship-row';
    row.innerHTML = `
      <div>Wave ${w.wave ?? ''}</div>
      <div class="ship-bar"><div class="ship-fill" style="width:${Math.max(0,Math.min(100,Number(w.progress||0)))}%"></div></div>
      <div>${Math.round(Number(w.progress||0))}%</div>
    `;
    host.appendChild(row);
  });
}

/* ====== Levels & Zones population (only if those ids exist) ====== */
function fillLevel(prefix, obj) {
  if (!obj) return;
  setText(`${prefix}Pick`, `${obj.picking?.perf ?? 0}%`);
  setText(`${prefix}Wave`, obj.picking?.wave ?? 0);
  setText(`${prefix}ProgressText`, `${obj.picking?.progress ?? 0}%`);
  setWidth(`${prefix}Progress`, obj.picking?.progress ?? 0);
  makeGauge(`${prefix.replace(/(\d+)-.*$/,'$1')}-${prefix.includes('stock')?'':'picking-'}gauge`, obj.picking?.perf ?? 0);
  makeGauge(`${prefix.replace(/(\d+)-.*$/,'$1')}-stocking-gauge`, obj.stocking?.perf ?? 0);
  setText(`${prefix}Stock`, `${obj.stocking?.perf ?? 0}%`);
  setText(`${prefix}Expected`, obj.stocking?.expected ?? 0);
  setText(`${prefix}Stocked`, obj.stocking?.stocked ?? 0);
  setText(`${prefix}Remaining`, obj.stocking?.remaining ?? 0);
}

/* ====== init ====== */
async function init() {
  // basic navigation: clicking tile titles goes to their Levels page
  const navMap = { MZ:'mzLevels', CF:'cfLevels', HB:'hbLevels', NC:'ncLevels', RR:'rrLevels' };
  $$('.tile h3').forEach(h => {
    const key = h.textContent.trim();
    if (navMap[key]) h.addEventListener('click', () => navigate(navMap[key]));
  });

  navigate('mainPage');

  // load data
  let data = {};
  try { data = await (await fetch('data/dashboard.json', {cache:'no-store'})).json(); }
  catch { /* leave empty; tiles will show 0s */ }

  // HOME cards (uses "dept" section placed by your Excel->JSON script)
  const mz = data.mz?.dept ?? data.mz ?? {};
  const cf = data.cf?.dept ?? data.cf ?? {};
  const hb = data.hb?.dept ?? data.hb ?? {};
  const nc = data.nc?.dept ?? data.nc ?? {};
  const rr = data.rr?.dept ?? data.rr ?? {};

  fillDeptCard('mz', mz);
  fillDeptCard('cf', cf);
  fillDeptCard('hb', hb);
  fillDeptCard('nc', nc);
  fillDeptCard('rr', rr);

  // Shipping waves (if present)
  buildShipping(data.shipping);

  /* Levels (populate if those pages are visited later) */
  // Example for MZ1/2/3 and Zones 10/11/20/21/30/31 (if present in JSON)
  const mzLevels = data.mz?.levels || {};
  const cfLevels = data.cf?.levels || {};
  const hbLevels = data.hb?.levels || {};
  const rrLevels = data.rr?.levels || {};
  const ncLevels = data.nc?.levels || {};

  // MZ Level 1/2/3
  if (mzLevels[1]) fillLevel('mz1', mzLevels[1]);
  if (mzLevels[2]) fillLevel('mz2', mzLevels[2]);
  if (mzLevels[3]) fillLevel('mz3', mzLevels[3]);

  // CF Level 1/2/3
  if (cfLevels[1]) fillLevel('cf1', cfLevels[1]);
  if (cfLevels[2]) fillLevel('cf2', cfLevels[2]);
  if (cfLevels[3]) fillLevel('cf3', cfLevels[3]);

  // HB Level 1/2/3
  if (hbLevels[1]) fillLevel('hb1', hbLevels[1]);
  if (hbLevels[2]) fillLevel('hb2', hbLevels[2]);
  if (hbLevels[3]) fillLevel('hb3', hbLevels[3]);

  // RR Level 1/2
  if (rrLevels[1]) fillLevel('rr1', rrLevels[1]);
  if (rrLevels[2]) fillLevel('rr2', rrLevels[2]);

  // NC groups (oil/pbs/highpick/ncrr) if you mapped them to 1..4
  if (ncLevels.oil || ncLevels[1]) fillLevel('ncoil', ncLevels.oil || ncLevels[1]);
  if (ncLevels.pbs || ncLevels[2]) fillLevel('ncpbs', ncLevels.pbs || ncLevels[2]);
  if (ncLevels.highpick || ncLevels[3]) fillLevel('nchighpick', ncLevels.highpick || ncLevels[3]);
  if (ncLevels.ncrr || ncLevels[4]) fillLevel('ncncrr', ncLevels.ncrr || ncLevels[4]);

  // Zones examples (only fill if present)
  const z = (lvl, id) => lvl?.zones?.[id];
  if (mzLevels[1]) {
    if (z(mzLevels[1], 10)) fillLevel('z10', z(mzLevels[1],10));
    if (z(mzLevels[1], 11)) fillLevel('z11', z(mzLevels[1],11));
  }
  if (mzLevels[2]) {
    if (z(mzLevels[2], 20)) fillLevel('z20', z(mzLevels[2],20));
    if (z(mzLevels[2], 21)) fillLevel('z21', z(mzLevels[2],21));
  }
  if (mzLevels[3]) {
    if (z(mzLevels[3], 30)) fillLevel('z30', z(mzLevels[3],30));
    if (z(mzLevels[3], 31)) fillLevel('z31', z(mzLevels[3],31));
  }
}

document.addEventListener('DOMContentLoaded', init);
