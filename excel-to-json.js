// excel-to-json.js  — convert dashboard.xlsx -> data/dashboard.json
const XLSX = require('xlsx');
const fs = require('fs');

const FILE = './dashboard.xlsx';       // Excel in repo root
const OUT  = './data/dashboard.json';  // Output JSON

// ---------- helpers ----------
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const key = s => String(s ?? '').trim();

// pull a value from a row using multiple possible header names
function getVal(row, candidates) {
  // try exact keys first
  for (const k of candidates) if (row[k] !== undefined) return row[k];
  // then try normalized keys: lowercase + remove spaces/underscores
  const norm = {};
  for (const k in row) norm[k.toLowerCase().replace(/[\s_]/g, '')] = row[k];
  for (const k of candidates) {
    const nk = k.toLowerCase().replace(/[\s_]/g, '');
    if (norm[nk] !== undefined) return norm[nk];
  }
  return undefined;
}

// parse the ShippingWaves sheet (Wave | Progress)
function readShippingWaves(workbook) {
  const ws = workbook.Sheets['ShippingWaves'];
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

  const toPct = (v) => {
    if (v === '' || v === null || v === undefined) return null;
    if (typeof v === 'number') {
      // If Excel cell is a percent (0.75), convert to 75
      return Math.round((v <= 1 ? v * 100 : v));
    }
    // Accept "75%" or "75"
    const s = String(v).trim().replace('%', '');
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    return Math.round(n);
  };

  return rows
    .map(r => ({
      wave: Number(r.Wave),
      progress: toPct(r.Progress)
    }))
    .filter(r => Number.isFinite(r.wave) && Number.isFinite(r.progress));
}

// ---------- main conversion ----------
function convert() {
  const wb = XLSX.readFile(FILE);

  const levels = XLSX.utils.sheet_to_json(wb.Sheets['levels'] || {});
  const zones  = XLSX.utils.sheet_to_json(wb.Sheets['zones']  || {});

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

  const out = {};

  // ----- levels -----
  for (const row of levels) {
    let deptRaw = key(getVal(row, C.dept)).toLowerCase();
    const lvlRaw  = key(getVal(row, C.level));
    if (!deptRaw || !lvlRaw) continue;

    // normalize "shipping" to "ship" to match the site keys
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

  // ----- zones (optional) -----
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

  // ----- shipping waves (new) -----
  const waves = readShippingWaves(wb);      // pulls from the ShippingWaves sheet
  if (waves.length) {
    out.ship = out.ship || { levels: {} };  // ensure 'ship' exists
    out.ship.waves = waves;                 // attach waves array
  }

  // write JSON
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log('Wrote', OUT);
}

convert();
