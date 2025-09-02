// main.js — fixed gauges, shipping list, always-on status dots

if (window.ChartDataLabels) Chart.register(ChartDataLabels);

let DASH = null;
const CHARTS = new Map();

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const $ = (s) => document.querySelector(s);

function perfColor(p) { p = Number(p)||0; return p<75?'#e74c3c':(p<=90?'#f1c40f':'#2ecc71'); }
function statusFrom(a,b){ const A=perfColor(a),B=perfColor(b); if(A==='#e74c3c'||B==='#e74c3c')return'#e74c3c'; if(A==='#f1c40f'||B==='#f1c40f')return'#f1c40f'; return'#2ecc71'; }

// ---- gauge needle plugin ----
const needlePlugin = {
  id:'gaugeNeedle',
  afterDatasetsDraw(chart){
    const v=(chart.config.data||{})._needleValue||0;
    const angle=-Math.PI + (clamp(v,0,100)/100)*Math.PI;
    const a=chart.getDatasetMeta(0)?.data?.[0]; if(!a) return;
    const {x:cx,y:cy,innerRadius,outerRadius}=a;
    const r=(innerRadius+outerRadius)/2;
    const ctx=chart.ctx; ctx.save();

    ctx.beginPath(); ctx.lineWidth=2; ctx.strokeStyle='#555';
    ctx.moveTo(cx,cy); ctx.lineTo(cx+r*Math.cos(angle),cy+r*Math.sin(angle)); ctx.stroke();

    const tipX=cx+r*Math.cos(angle), tipY=cy+r*Math.sin(angle), ah=8, aw=6;
    const leftX  = tipX - ah*Math.cos(angle) + (aw/2)*Math.cos(angle-Math.PI/2);
    const leftY  = tipY - ah*Math.sin(angle) + (aw/2)*Math.sin(angle-Math.PI/2);
    const rightX = tipX - ah*Math.cos(angle) + (aw/2)*Math.cos(angle+Math.PI/2);
    const rightY = tipY - ah*Math.sin(angle) + (aw/2)*Math.sin(angle+Math.PI/2);
    ctx.beginPath(); ctx.fillStyle='#777';
    ctx.moveTo(tipX,tipY); ctx.lineTo(leftX,leftY); ctx.lineTo(rightX,rightY); ctx.closePath(); ctx.fill();

    ctx.beginPath(); ctx.fillStyle='#555'; ctx.arc(cx,cy,3,0,2*Math.PI); ctx.fill();
    ctx.restore();
  }
};

// ---- solid, non-responsive, half-doughnut gauge ----
function renderGauge(canvas, value){
  if(!canvas) return;

  // fix skinny-line bug: set real drawing size (attributes)
  const W = Number(canvas.dataset.w) || 160;
  const H = Number(canvas.dataset.h) || 100;
  if (canvas.width !== W)  canvas.width  = W;
  if (canvas.height !== H) canvas.height = H;

  const ctx = canvas.getContext('2d'); if(!ctx) return;

  if (CHARTS.has(canvas.id)) { CHARTS.get(canvas.id).destroy(); CHARTS.delete(canvas.id); }

  const v = clamp(Number(value)||0, 0, 100);
  const color = perfColor(v);

  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: { _needleValue: v, datasets: [{ data:[v,100-v], backgroundColor:[color,'#e0e0e0'], borderWidth:0 }] },
    options: {
      rotation: -Math.PI,
      circumference: Math.PI,
      cutout: '70%',
      responsive: false,               // IMPORTANT: use our canvas width/height
      maintainAspectRatio: false,
      animation: { duration: 250 },
      plugins: { legend:{display:false}, tooltip:{enabled:false}, datalabels:{display:false} }
    },
    plugins: [needlePlugin]
  });

  CHARTS.set(canvas.id, chart);
}

// ---- data helpers ----
function summaryFromDeptKey(deptKey){
  if(!DASH || !DASH[deptKey]) return null;

  if (DASH[deptKey].dept) return DASH[deptKey].dept; // prefer 'dept' sheet

  const levels = DASH[deptKey].levels || {};
  const keys = Object.keys(levels);
  if(!keys.length) return null;
  const firstKey = keys.map(k => (isFinite(k)?Number(k):k))
                       .sort((a,b)=> (typeof a==='number'&&typeof b==='number')?a-b:0)[0];
  const lvl = levels[firstKey];
  if(!lvl) return null;

  return {
    picking: {
      perf: lvl.picking?.perf ?? 0,
      wave: lvl.picking?.wave ?? 0,
      progress: lvl.picking?.progress ?? 0,
      ordersCompleted: 0,
      ordersTotal: 0
    },
    stocking: {
      perf: lvl.stocking?.perf ?? 0,
      expected: lvl.stocking?.expected ?? 0,
      stocked: lvl.stocking?.stocked ?? 0,
      remaining: lvl.stocking?.remaining ?? 0
    }
  };
}

function setData(did, val){ const el = document.querySelector(`[data-id='${did}']`); if(el) el.textContent = val; }
function setWidth(did, pct){ const el=document.querySelector(`[data-id='${did}']`); if(el) el.style.width = `${clamp(pct||0,0,100)}%`; }

function updateHomeTile(prefix, sum){
  // gauges
  renderGauge(document.getElementById(`${prefix}Pick`),  sum.picking.perf);
  renderGauge(document.getElementById(`${prefix}Stock`), sum.stocking.perf);

  // labels
  setData(`${prefix}PickPerf`,  `${sum.picking.perf}%`);
  setData(`${prefix}StockPerf`, `${sum.stocking.perf}%`);

  // picking column
  setData(`${prefix}Wave`, `${sum.picking.wave ?? ''}`);
  setWidth(`${prefix}Progress`, sum.picking.progress);
  setData(`${prefix}ProgressText`, `Progress: ${sum.picking.progress ?? 0}%`);
  if (document.querySelector(`[data-id='${prefix}Orders']`)) {
    setData(`${prefix}Orders`, `${sum.picking.ordersCompleted ?? 0}/${sum.picking.ordersTotal ?? 0}`);
  }

  // stocking column
  setData(`${prefix}Expected`, `${sum.stocking.expected ?? ''}`);
  setData(`${prefix}Stocked`, `${sum.stocking.stocked ?? ''}`);
  setData(`${prefix}Left`,     `${sum.stocking.remaining ?? ''}`);

  // status dot
  const dot = document.querySelector(`[data-id='${prefix}Status']`);
  if (dot) { dot.style.backgroundColor = statusFrom(sum.picking.perf, sum.stocking.perf); dot.style.opacity = '1'; }
}

function populateHome(){
  ['mz','cf','hb','nc','rr'].forEach(k => {
    const s = summaryFromDeptKey(k);
    if (s) updateHomeTile(k, s);
  });

  // shipping waves
  const host = document.getElementById('shipWaveList') || document.querySelector('[data-id="shipWaveList"]');
  if (!host) return;
  host.innerHTML = '';

  const waves = (DASH && DASH.ship && Array.isArray(DASH.ship.waves)) ? DASH.ship.waves.slice().sort((a,b)=>a.wave-b.wave) : [];
  if (!waves.length) {
    const p = document.createElement('div');
    p.style.color = '#666';
    p.style.marginTop = '6px';
    p.textContent = 'No waves yet';
    host.appendChild(p);
    return;
  }

  waves.forEach(w => {
    const row = document.createElement('div');
    row.className = 'ship-wave-row';

    const label = document.createElement('div');
    label.textContent = `Wave ${w.wave}: ${clamp(w.progress,0,100)}%`;
    label.style.marginBottom = '4px';

    const bar = document.createElement('div'); bar.className='progress-bar';
    const fill = document.createElement('div'); fill.className='progress-fill';
    fill.style.width = `${clamp(w.progress,0,100)}%`;
    bar.appendChild(fill);

    row.appendChild(label); row.appendChild(bar);
    host.appendChild(row);
  });
}

// ---- levels/zones (unchanged behavior) ----
function setLevel(prefix, lvl){
  if (!lvl) return;
  renderGauge(document.getElementById(`${prefix}-picking-gauge`), lvl.picking?.perf ?? 0);
  renderGauge(document.getElementById(`${prefix}-stocking-gauge`), lvl.stocking?.perf ?? 0);
  setData(`${prefix}Pick`, `${lvl.picking?.perf ?? 0}%`);
  setData(`${prefix}Stock`, `${lvl.stocking?.perf ?? 0}%`);
  setData(`${prefix}Wave`, `${lvl.picking?.wave ?? ''}`);
  setData(`${prefix}ProgressText`, `Progress: ${lvl.picking?.progress ?? 0}%`);
  const p = document.querySelector(`[data-id='${prefix}Progress']`);
  if (p) p.style.width = `${clamp(lvl.picking?.progress ?? 0, 0, 100)}%`;
  setData(`${prefix}Expected`, `${lvl.stocking?.expected ?? ''}`);
  setData(`${prefix}Stocked`, `${lvl.stocking?.stocked ?? ''}`);
  setData(`${prefix}Remaining`, `${lvl.stocking?.remaining ?? ''}`);
}

function populateCurrentPage(){
  const active = document.querySelector('.page.active')?.id;
  if (!active || !DASH) return;

  if (active === 'mainPage') { populateHome(); return; }

  if (active === 'mzLevels') {
    const lv = DASH?.mz?.levels || {};
    setLevel('mz1', lv[1]); setLevel('mz2', lv[2]); setLevel('mz3', lv[3]); return;
  }
  if (active === 'cfLevels') {
    const lv = DASH?.cf?.levels || {};
    setLevel('cf1', lv[1]); setLevel('cf2', lv[2]); setLevel('cf3', lv[3]); return;
  }
  if (active === 'hbLevels') {
    const lv = DASH?.hb?.levels || {};
    setLevel('hb1', lv[1]); setLevel('hb2', lv[2]); setLevel('hb3', lv[3]); return;
  }
  if (active === 'rrLevels') {
    const lv = DASH?.rr?.levels || {};
    setLevel('rr1', lv[1]); setLevel('rr2', lv[2]); return;
  }
  if (active === 'ncLevels') {
    const lv = DASH?.nc?.levels || {};
    setLevel('ncoil', lv.oil);
    setLevel('ncpbs', lv.pbs);
    setLevel('nchighpick', lv.highPick);
    setLevel('ncncrr', lv.ncrr);
    return;
  }
}

function navigate(pageId){
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(pageId); if (el) el.classList.add('active');
  setTimeout(populateCurrentPage, 0);
}
window.navigate = navigate;

window.addEventListener('DOMContentLoaded', async ()=>{
  try{
    const res = await fetch('data/dashboard.json', { cache:'no-store' });
    DASH = await res.json();
  }catch(e){ console.error('Failed to load data/dashboard.json', e); }
  populateCurrentPage();
});
