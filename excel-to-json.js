// excel-to-json.js
// Converts dashboard.xlsx -> data/dashboard.json
// Robust to small header differences (case, underscores, spaces)

const XLSX = require('xlsx');
const fs = require('fs');

const FILE = './dashboard.xlsx';      // Excel at repo root
const OUT  = './data/dashboard.json'; // Output JSON

// --- helpers ----------------------------------------------------
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Normalize header keys so we can be flexible with column names
function normalizeKey(k) {
  return String(k || '')
    .toLowerCase()
    .replace(/\s+/g, '')      // remove spaces
    .replace(/[^a-z0-9]/g, ''); // remove punctuation/underscores
}

// Build a normalized map for each row: { normKey: value }
function normalizeRow(row) {
  const out = {};
  for (const k of Object.keys(row)) {
    out[normalizeKey(k)] = row[k];
  }
  return out;
}

// Try a list of possible header names; return the first found
function pick(rowNorm, keys) {
  for (const k of keys) {
    const nk = normalizeKey(k);
    if (rowNorm[nk] !== undefined) return rowNorm[nk];
  }
  return undefined;
}

// --- main -------------------------------------------------------
function toJson() {
  const wb = XLSX.readFile(FILE);
  const levelsRows = XLSX.utils.sheet_to_json(wb.Sheets['levels'] || {});
  const zonesRows  = XLSX.utils.sheet_to_json(wb.Sheets['zones']  || {});

  const out = {};

  // Column name variants we accept
  const COLS = {
    dept:          ['dept', 'department'],
    level:         ['level', 'lvl', 'area', 'section'],
    zone:          ['zone', 'zn'],
    pick_perf:     ['pick_perf', 'picking_perf', 'pickperf', 'pickingperf'],
    pick_wave:     ['pick_wave', 'picking_wave', 'pickwave', 'wave'],
    pick_progress: ['pick_progress', 'picking_progress', 'pickprogress', 'progress'],
    stock_perf:    ['stock_perf', 'stocking_perf', 'stockperf', 'stockingperf'],
    stock_expected:['stock_expected', 'expected'],
    stock_stocked: ['stock_stocked', 'stocked'],
    stock_remaining:['stock_remaining', 'remaining', 'left'],
  };

  // ---- Levels sheet ----
  for (const row of levelsRows) {
    const r = normalizeRow(row);

    const dept = String(pick(r, COLS.dept) ?? '').trim().toLowerCase();
    const rawLevel = String(pick(r, COLS.level) ?? '').trim();

    if (!dept || rawLevel === '') continue;

    // level can be a number (1,2,3) or a string (oil, pbs, highPick...)
    const levelKey = rawLevel !== '' && !Number.isNaN(Number(rawLevel))
      ? Number(rawLevel)
      : rawLevel;

    out[dept] ??= { levels: {} };

    out[dept].levels[levelKey] = {
      picking: {
        perf:     toNum(pick(r, COLS.pick_perf)),
        wave:     toNum(pick(r, COLS.pick_wave)),
        progress: toNum(pick(r, COLS.pick_progress)),
      },
      stocking: {
        perf:      toNum(pick(r, COLS.stock_perf)),
        expected:  toNum(pick(r, COLS.stock_expected)),
        stocked:   toNum(pick(r, COLS.stock_stocked)),   // <-- no typo :)
        remaining: toNum(pick(r, COLS.stock_remaining)),
      },
      zones: {}, // ensure exists so adding zones is always safe
    };
  }

  // ---- Zones sheet (optional) ----
  for (const row of zonesRows) {
    const r = normalizeRow(row);

    const dept = String(pick(r, COLS.dept) ?? '').trim().toLowerCase();
    const rawLevel = String(pick(r, COLS.level) ?? '').trim();
    const zone = toNum(pick(r, COLS.zone));

    if (!dept || rawLevel === '' || !Number.isFinite(zone)) continue;

    const levelKey = rawLevel !== '' && !Number.isNaN(Number(rawLevel))
      ? Number(rawLevel)
      : rawLevel
