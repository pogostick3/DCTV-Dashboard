// excel-to-json.js — convert dashboard.xlsx → data/dashboard.json
const XLSX = require('xlsx');
const fs = require('fs');

const FILE = './dashboard.xlsx';
const OUT  = './data/dashboard.json';

// ---- helpers -------------------------------------------------
const num  = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const key  = s => String(s ?? '').trim();

function toPct(v) {
  if (v === '' || v === null || v === undefined) return 0;
  if (typeof v === 'number') return Math.round(v <= 1 ? v * 100 : v);
  const n = Number(String(v).replace('%','').trim());
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function getVal(row, candidates) {
  // try exact keys first
  for (const k of candidates) if (row[k] !== undefined) return row[k];
  // tolerant: lowercase + remove spaces/underscores
  const norm = {};
  for (const k in row) norm[k.toLowerCase().replace(/[\s_]/g,'')] = row[k];
  for (const k of candidates) {
    const nk = k.toLowerCase().replace(/[\s_]/g,'');
    if (norm[nk] !== undefined) return norm[nk];
  }
  return undefined;
}

// common header aliases
const C = {
  dept:            ['dept','department'],
  level:           ['level','lvl','area','section'],
  zone:            ['zone','zn'],

  pick_perf:       ['pick_perf','picking_perf','pickperf','pickingperf'],
  pick_wave:       ['pick_wave','picking_wave','pickwave','wave'],
  pick_progress:   ['pick_progress','picking_progress','pickprogress','progress'],

  stock_perf:      ['stock_perf','stocking_perf','stockperf','stockingperf'],
  stock_expected:  ['stock_expected','expected','expected_qty'],
  stock_stocked:   ['stock_stocked','stocked','received','stocked_qty','received_qty'],
  stock_remaining: ['stock_remaining','remaining','left'],

  // Dept sheet extras
  orders_complete: ['orders_complete','ordersdone','completed_orders','orders_completed'],
  orders_total:    ['orders_total','ordertotal','total_orders']
};

// ---- optional readers ----------------------------------------
function readShippingWaves(wb) {
  const ws = wb.Sheets['ShippingWaves'];
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  return rows
    .map(r => ({ wave: num(r.Wave ?? r.wave), progress: toPct(r.Progress ?? r.progress) }))
    .filter(r => Number.isFinite(r.wave));
}

function readDeptRows(wb) {
  const ws = wb.Sheets['Dept'];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

// ---- main convert --------------------------------------------
function convert() {
  const wb = XLSX.readFile(FILE);
  const levels = XLSX.utils.sheet_to_json(wb.Sheets['levels'] || {}, { defval: '' });
  const zones  = XLSX.utils.sheet_to_json(wb.Sheets['zones']  || {}, { defval: '' });

  const out = {};

  // levels → per-department base structure
  for (const row of levels) {
    const deptRaw = key(getVal(row, C.dept)).toLowerCase();
    const lvlRaw  = key(getVal(row, C.level));
    if (!deptRaw || !lvlRaw) continue;

    const levelKey = !isNaN(Number(lvlRaw)) ? Number(lvlRaw) : lvlRaw;
    out[deptRaw] = out[deptRaw] || { levels: {} };

    out[deptRaw].levels[levelKey] = {
      picking: {
        perf:     toPct(getVal(row, C.pick_perf)),
        wave:     num(getVal(row, C.pick_wave)),
        progress: toPct(getVal(row, C.pick_progress))
      },
      stocking: {
        perf:      toPct(getVal(row, C.stock_perf)),
        expected:  num(getVal(row, C.stock_expected)),
        stocked:   num(getVal(row, C.stock_stocked)),
        remaining: num(getVal(row, C.stock_remaining))
      },
      zones: {}
    };
  }

  // zones (optional)
  for (const row of zones) {
    const deptRaw = key(getVal(row, C.dept)).toLowerCase();
    const lvlRaw  = key(getVal(row, C.level));
    const zoneNum = num(getVal(row, C.zone));
    if (!deptRaw || !lvlRaw || !Number.isFinite(zoneNum)) continue;

    const levelKey = !isNaN(Number(lvlRaw)) ? Number(lvlRaw) : lvlRaw;

    out[deptRaw] = out[deptRaw] || { levels: {} };
    out[deptRaw].levels[levelKey] = out[deptRaw].levels[levelKey] || { picking:{}, stocking:{}, zones:{} };

    out[deptRaw].levels[levelKey].zones[zoneNum] = {
      picking: {
        perf:     toPct(getVal(row, C.pick_perf)),
        wave:     num(getVal(row, C.pick_wave)),
        progress: toPct(getVal(row, C.pick_progress))
      },
      stocking: {
        perf:      toPct(getVal(row, C.stock_perf)),
        expected:  num(getVal(row, C.stock_expected)),
        stocked:   num(getVal(row, C.stock_stocked)),
        remaining: num(getVal(row, C.stock_remaining))
      }
    };
  }

  // Dept sheet (optional) → drives home tiles & Orders
  const deptRows = readDeptRows(wb);
  for (const r of deptRows) {
    const deptRaw = key(getVal(r, C.dept)).toLowerCase();
    if (!deptRaw) continue;

    out[deptRaw] = out[deptRaw] || { levels: {} };
    out[deptRaw].dept = {
      pick_perf:       toPct(getVal(r, C.pick_perf)),
      stock_perf:      toPct(getVal(r, C.stock_perf)),
      wave:            num(getVal(r, C.pick_wave)),
      progress:        toPct(getVal(r, C.pick_progress)),
      orders_complete: num(getVal(r, C.orders_complete)),
      orders_total:    num(getVal(r, C.orders_total)),
      expected:        num(getVal(r, C.stock_expected)),
      stocked:         num(getVal(r, C.stock_stocked)),
      remaining:       num(getVal(r, C.stock_remaining))
    };
  }

  // Shipping waves (optional)
  const waves = readShippingWaves(wb);
  if (waves.length) out.shipping = { waves };

  // write
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log('Wrote', OUT);
}

convert();
