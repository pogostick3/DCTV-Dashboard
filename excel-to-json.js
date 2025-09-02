// excel-to-json.js  — convert dashboard.xlsx -> data/dashboard.json

const XLSX = require('xlsx');
const fs = require('fs');

const FILE = './dashboard.xlsx';       // Excel in repo root
const OUT  = './data/dashboard.json';  // Output JSON

// helpers
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const key = s => String(s ?? '').trim();
function getVal(row, candidates) {
  // try exact keys, then normalized (lowercase, remove spaces/underscores)
  for (const k of candidates) if (row[k] !== undefined) return row[k];
  const norm = {};
  for (const k in row) norm[k.toLowerCase().replace(/[\s_]/g, '')] = row[k];
  for (const k of candidates) {
    const nk = k.toLowerCase().replace(/[\s_]/g, '');
    if (norm[nk] !== undefined) return norm[nk];
  }
  return undefined;
}

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
    const deptRaw = key(getVal(row, C.dept)).toLowerCase();
    const lvlRaw  = key(getVal(row, C.level));
    if (!deptRaw || !lvlRaw) continue;

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
    const deptRaw = key(getVal(row, C.dept)).toLowerCase();
    const lvlRaw  = key(getVal(row, C.level));
    const zoneNum = num(getVal(row, C.zone));
    if (!deptRaw || !lvlRaw || !Number.isFinite(zoneNum)) continue;

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

  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log('Wrote', OUT);
}

convert();
