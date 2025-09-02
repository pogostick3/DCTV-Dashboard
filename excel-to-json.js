const XLSX = require('xlsx');
const fs = require('fs');

const FILE = './dashboard.xlsx';      // Excel in repo root
const OUT  = './data/dashboard.json'; // Output JSON

function toNum(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

function toJson() {
  const wb = XLSX.readFile(FILE);

  const levelsRows = XLSX.utils.sheet_to_json(wb.Sheets['levels'] || {});
  const zonesRows  = XLSX.utils.sheet_to_json(wb.Sheets['zones']  || {});

  const out = {};

  // ---- Levels sheet ----
  for (const r of levelsRows) {
    const dept = String(r.dept || '').trim().toLowerCase();
    // level can be number (1,2,3) or a string (oil, pbs, ...)
    const rawLevel = (r.level ?? '').toString().trim();
    const levelKey = rawLevel !== '' && !Number.isNaN(Number(rawLevel))
      ? Number(rawLevel)
      : rawLevel;

    if (!dept || rawLevel === '') continue; // skip empty rows

    out[dept] ??= { levels: {} };

    out[dept].levels[levelKey] = {
      picking: {
        perf:     toNum(r.pick_perf),
        wave:     toNum(r.pick_wave),
        progress: toNum(r.pick_progress),
      },
      stocking: {
        perf:      toNum(r.stock_perf),
        expected:  toNum(r.stock_expected),
        stocked:   toNum(r.stock_stocked),
        remaining: toNum(r.stock_remaining),
      },
      // IMPORTANT: start with an empty zones object so later writes are safe
      zones: {},
    };
  }

  // ---- Zones sheet (optional) ----
  for (const r of zonesRows) {
    const dept = String(r.dept || '').trim().toLowerCase();
    const rawLevel = (r.level ?? '').toString().trim();
    const levelKey = rawLevel !== '' && !Number.isNaN(Number(rawLevel))
      ? Number(rawLevel)
      : rawLevel;
    const zone = toNum(r.zone);

    if (!dept || rawLevel === '' || !Number.isFinite(zone)) continue;

    // Make sure containers exist even if a level row wasn't in "levels"
    out[dept] ??= { levels: {} };
    out[dept].levels[levelKey] ??= {
      picking:  {},
      stocking: {},
      zones:    {},
    };
    // Ensure zones object exists before writing into it
    out[dept].levels[levelKey].zones ??= {};

    out[dept].levels[levelKey].zones[zone] = {
      picking: {
        perf:     toNum(r.pick_perf),
        wave:     toNum(r.pick_wave),
        progress: toNum(r.pick_progress),
      },
      stocking: {
        perf:      toNum(r.stock_perf),
        expected:  toNum(r.stock_expected),
        stocked:   toNum(r.stock_stock_
