// excel-to-json.js  — convert dashboard.xlsx -> data/dashboard.json
const XLSX = require('xlsx');
const fs = require('fs');

const FILE = './dashboard.xlsx';
const OUT  = './data/dashboard.json';

// ---------- helpers ----------
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const key = s => String(s ?? '').trim();

// pull a value from a row using multiple possible header names
function getVal(row, candidates) {
  for (const k of candidates) if (row[k] !== undefined) return row[k];
  const norm = {};
  for (const k in row) norm[k.toLowerCase().replace(/[\s_]/g, '')] = row[k];
  for (const k of candidates) {
    const nk = k.toLowerCase().replace(/[\s_]/g, '');
    if (norm[nk] !== undefined) return norm[nk];
  }
  return undefined;
}

function toPct(v) {
  if (v === '' || v === null || v === undefined) return 0;
  if (typeof v === 'number') return Math.round((v <= 1 ? v * 100 : v));
  const s = String(v).trim().replace('%', '');
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

// parse the ShippingWaves sheet (Wave | Progress)
function readShippingWaves(workbook) {
  const ws = workbook.Sheets['ShippingWaves'];
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  return rows
    .map(r => ({
      wave: Number(r.Wave),
      progress: toPct(r.Progress)
    }))
    .filter(r => Number.isFinite(r.wave) && Number.isFinite(r.progress));
}

// parse Orders sheet (Dept | Wave | Total | Completed) – optional, keep for backward compat
function readOrders(workbook) {
  const ws = workbook.Sheets['Orders'];
  if (!ws) return {};
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

  const byDept = {};
  for (const r of rows) {
    let dept = String(r.Dept ?? r.dept ?? '').trim().toLowerCase();
    if (!dept) continue;
    if (dept === 'shipping') dept = 'ship';

    const wave = Number(r.Wave ?? r.wave);
    const total = Number(r.Total ?? r.total);
    const completed = Number(r.Completed ?? r.completed);

    if (!Number.isFinite(wave)) continue;
    if (!byDept[dept]) byDept[dept] = {};
    byDept[dept][wave] = {
      wave,
      total: Number.isFinite(total) ? total : 0,
      completed: Number.isFinite(completed) ? completed : 0
    };
  }
  return byDept;
}

// NEW: parse dept sheet for home page data
function readDeptSummary(workbook) {
  const ws = workbook.Sheets['dept'];
  if (!ws) return {};
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

  const C = {
    dept: ['dept','department'],
    pick_perf: ['pick_perf','picking_perf','pickperf','pickingperf'],
    stock_perf: ['stock_perf','stocking_perf','stockperf','stockingperf'],
    wave: ['wave','current_wave','pick_wave'],
    progress: ['progress','pick_progress','picking_progress'],
    orders_completed: ['orders_completed','completed_orders','ordersdone'],
    orders_total: ['orders_total','total_orders','orderstotal'],
    expected: ['expected','stock_expected'],
    stocked: ['stocked','stock_stocked'],
    remaining: ['remaining','stock_remaining','left']
  };

  const out = {};
  for (const row of rows) {
    let dept = key(getVal(row, C.dept)).toLowerCase();
    if (!dept) continue;
    if (dept === 'shipping') dept = 'ship';

    out[dept] = {
      picking: {
        perf: toPct(getVal(row, C.pick_perf)),
        wave: num(getVal(row, C.wave)),
        progress: toPct(getVal(row, C.progress)),
        ordersCompleted: num(getVal(row, C.orders_completed)),
        ordersTotal: num(getVal(row, C.orders_total))
      },
      stocking: {
        perf: toPct(getVal(row, C.stock_perf)),
        expected: num(getVal(row, C.expected)),
        stocked: num(getVal(row, C.stocked)),
        remaining: num(getVal(row, C.remaining))
      }
    };
  }
  return out; // { mz:{picking:{...},stocking:{...}}, cf:{...}, ... }
}

// ---------- main conversion ----------
function convert() {
  const wb = XLSX.readFile(FILE);

  const levels = XLSX.utils.sheet_to_json(wb.Sheets['levels'] || {});
  const zones  = XLSX.utils.sheet_to_json(wb.Sheets['zones']  || {});
  const out = {};

  const C = {
    dept:            ['dept', 'department'],
    level:           ['level', 'lvl', 'area', 'section'],
    zone:            ['zone', 'zn'],
    pick_perf:       ['pick_perf', 'picking_perf', 'pickperf', 'pickingperf'],
    pick_wave:       ['pick_wave', 'picking_wave', 'pickwave', 'wave'],
    pick_progress:   ['pick_progress', 'picking_progress', 'pickprogress', 'progress'],
    stock_perf:      ['stock_perf', 'stocking_perf', 'stockperf', 'stockingperf'],
    stock_expected:  ['stock_expected', 'expected'],
    stock_stocked:   ['stock_stocked', 'stocked'],
    stock_remaining: ['stock_remaining', 'remaining', 'left']
  };

  // levels
  for (const row of levels) {
    let deptRaw = key(getVal(row, C.dept)).toLowerCase();
    const lvlRaw  = key(getVal(row, C.level));
    if (!deptRaw || !lvlRaw) continue;
    if (deptRaw === 'shipping') deptRaw = 'ship';
    const levelKey = !isNaN(Number(lvlRaw)) ? Number(lvlRaw) : lvlRaw;

    out[deptRaw] = out[deptRaw] || { levels: {} };
    out[deptRaw].levels[levelKey] = {
      picking: {
        perf:     num(getVal(row, C.pick_perf)),
        wave:     num(getVal(row, C.pick_wave)),
        progress: num(getVal(row, C.pick_progress))
      },
      stocking: {
        perf:      num(getVal(row, C.stock_perf)),
        expected:  num(getVal(row, C.stock_expected)),
        stocked:   num(getVal(row, C.stock_stocked)),
        remaining: num(getVal(row, C.stock_remaining))
      },
      zones: {}
    };
  }

  // zones (optional)
  for (const row of zones) {
    let deptRaw = key(getVal(row, C.dept)).toLowerCase();
    const lvlRaw  = key(getVal(row, C.level));
    const zoneNum = num(getVal(row, C.zone));
    if (!deptRaw || !lvlRaw || !Number.isFinite(zoneNum)) continue;

    if (deptRaw === 'shipping') deptRaw = 'ship';
    const levelKey = !isNaN(Number(lvlRaw)) ? Number(lvlRaw) : lvlRaw;

    out[deptRaw] = out[deptRaw] || { levels: {} };
    out[deptRaw].levels[levelKey] = out[deptRaw].levels[levelKey] || { picking:{}, stocking:{}, zones:{} };
    if (!out[deptRaw].levels[levelKey].zones) out[deptRaw].levels[levelKey].zones = {};

    out[deptRaw].levels[levelKey].zones[zoneNum] = {
      picking: {
        perf:     num(getVal(row, C.pick_perf)),
        wave:     num(getVal(row, C.pick_wave)),
        progress: num(getVal(row, C.pick_progress))
      },
      stocking: {
        perf:      num(getVal(row, C.stock_perf)),
        expected:  num(getVal(row, C.stock_expected)),
        stocked:   num(getVal(row, C.stock_stocked)),
        remaining: num(getVal(row, C.stock_remaining))
      }
    };
  }

  // shipping waves (optional)
  const waves = readShippingWaves(wb);
  if (waves.length) {
    out.ship = out.ship || { levels: {} };
    out.ship.waves = waves;
  }

  // orders sheet (optional)
  const ordersByDept = readOrders(wb);
  for (const dept of Object.keys(ordersByDept)) {
    out[dept] = out[dept] || { levels: {} };
    const wavesObj = ordersByDept[dept];
    const wavesArr = Object.keys(wavesObj).map(k => wavesObj[k]).sort((a,b) => a.wave - b.wave);
    out[dept].orders = wavesArr;
  }

  // NEW: dept sheet for home tiles
  const deptHome = readDeptSummary(wb); // { mz:{...}, cf:{...}, ... }
  for (const dept of Object.keys(deptHome)) {
    out[dept] = out[dept] || { levels: {} };
    out[dept].dept = deptHome[dept]; // picking/stocking for home page
  }

  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log('Wrote', OUT);
}

convert();
