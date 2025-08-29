const express = require('express');
const cors = require('cors');
const XLSX = require('xlsx');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.static('public')); // 👈 this serves your index.html etc.

const FILE = './data/dashboard.xlsx';

function loadWorkbook() {
  const wb = XLSX.readFile(FILE);
  const levels = XLSX.utils.sheet_to_json(wb.Sheets['levels'] || {});
  const zones  = XLSX.utils.sheet_to_json(wb.Sheets['zones']  || {});
  const out = {};

  for (const r of levels) {
    const d = String(r.dept || '').toLowerCase();
    const l = isNaN(r.level) ? String(r.level) : Number(r.level);
    out[d] ??= { levels: {} };
    out[d].levels[l] = {
      picking: { perf:+r.pick_perf, wave:+r.pick_wave, progress:+r.pick_progress },
      stocking:{ perf:+r.stock_perf, expected:+r.stock_expected, stocked:+r.stock_stocked, remaining:+r.stock_remaining },
      zones: out[d].levels[l]?.zones || undefined
    };
  }

  for (const r of zones) {
    const d = String(r.dept || '').toLowerCase();
    const l = isNaN(r.level) ? String(r.level) : Number(r.level);
    const z = Number(r.zone);
    out[d] ??= { levels: {} };
    out[d].levels[l] ??= { picking:{}, stocking:{}, zones:{} };
    out[d].levels[l].zones[z] = {
      picking: { perf:+r.pick_perf, wave:+r.pick_wave, progress:+r.pick_progress },
      stocking:{ perf:+r.stock_perf, expected:+r.stock_expected, stocked:+r.stock_stocked, remaining:+r.stock_remaining }
    };
  }

  return out;
}

let cache = loadWorkbook();
app.get('/api/dashboard', (req, res) => res.json(cache));
fs.watchFile(FILE, { interval: 5000 }, () => {
  try { cache = loadWorkbook(); console.log('Excel reloaded'); } catch (e) { console.error(e); }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Open http://localhost:${PORT}`));
