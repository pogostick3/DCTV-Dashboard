// Register Chart.js plugin if available
if (window.ChartDataLabels) {
  Chart.register(ChartDataLabels);
}

/* --------------------------------------------------------------------------------
   DATA
-------------------------------------------------------------------------------- */
const dashboardData = {
  mz: {
    levels: {
      1: {
        picking: { perf: 80, wave: 1, progress: 75 },
        stocking: { perf: 89, expected: 800, stocked: 700, remaining: 100 },
        zones: {
          10: { picking: { perf: 83, wave: 1, progress: 72 }, stocking: { perf: 88, expected: 1200, stocked: 1056, remaining: 144 } },
          11: { picking: { perf: 67, wave: 2, progress: 60 }, stocking: { perf: 75, expected: 950, stocked: 713, remaining: 237 } },
        },
      },
      2: {
        picking: { perf: 85, wave: 2, progress: 40 },
        stocking: { perf: 93, expected: 750, stocked: 697, remaining: 53 },
        zones: {
          20: { picking: { perf: 81, wave: 3, progress: 66 }, stocking: { perf: 86, expected: 990, stocked: 851, remaining: 139 } },
          21: { picking: { perf: 58, wave: 4, progress: 45 }, stocking: { perf: 63, expected: 880, stocked: 554, remaining: 326 } },
        },
      },
      3: {
        picking: { perf: 70, wave: 3, progress: 22 },
        stocking: { perf: 80, expected: 670, stocked: 536, remaining: 134 },
        zones: {
          30: { picking: { perf: 77, wave: 5, progress: 70 }, stocking: { perf: 81, expected: 1060, stocked: 859, remaining: 201 } },
          31: { picking: { perf: 92, wave: 6, progress: 88 }, stocking: { perf: 95, expected: 1190, stocked: 1130, remaining: 60 } },
        },
      },
    },
  },
  cf: {
    levels: {
      1: { picking: { perf: 76, wave: 1, progress: 65 }, stocking: { perf: 84, expected: 780, stocked: 690, remaining: 90 } },
      2: { picking: { perf: 82, wave: 2, progress: 55 }, stocking: { perf: 87, expected: 730, stocked: 650, remaining: 80 } },
      3: { picking: { perf: 79, wave: 3, progress: 49 }, stocking: { perf: 90, expected: 860, stocked: 800, remaining: 60 } },
    },
  },
  hb: {
    levels: {
      1: { picking: { perf: 65, wave: 3, progress: 35 }, stocking: { perf: 79, expected: 890, stocked: 705, remaining: 185 } },
      2: { picking: { perf: 72, wave: 4, progress: 42 }, stocking: { perf: 81, expected: 910, stocked: 740, remaining: 170 } },
      3: { picking: { perf: 77, wave: 5, progress: 56 }, stocking: { perf: 83, expected: 940, stocked: 780, remaining: 160 } },
    },
  },
  rr: {
    levels: {
      1: { picking: { perf: 72, wave: 5, progress: 60 }, stocking: { perf: 85, expected: 970, stocked: 820, remaining: 150 } },
      2: { picking: { perf: 78, wave: 6, progress: 70 }, stocking: { perf: 88, expected: 990, stocked: 850, remaining: 140 } },
    },
  },
  nc: {
    levels: {
      oil: { picking: { perf: 88, wave: 2, progress: 68 }, stocking: { perf: 90, expected: 1100, stocked: 980, remaining: 120 } },
      pbs: { picking: { perf: 85, wave: 3, progress: 62 }, stocking: { perf: 87, expected: 1000, stocked: 890, remaining: 110 } },
      highPick: { picking: { perf: 91, wave: 4, progress: 76 }, stocking: { perf: 93, expected: 1080, stocked: 960, remaining: 120 } },
      ncrr: { picking: { perf: 86, wave: 5, progress: 74 }, stocking: { perf: 89, expected: 1020, stocked: 920, remaining: 100 } },
    },
  },
  ship: {
    levels: {
      1: { picking: { perf: 73, wave: 2, progress: 52 }, stocking: { perf: 78, expected: 640, stocked: 420, remaining: 220 } },
    },
  },
};

/* --------------------------------------------------------------------------------
   HELPERS
-------------------------------------------------------------------------------- */
const charts = {}; // id -> Chart instance

function setTextByDataId(dataId, value) {
  const el = document.querySelector(`[data-id="${dataId}"]`);
  if (el != null) el.textContent = value;
}

function setTextById(id, value) {
  const el = document.getElementById(id);
  if (el != null) el.textContent = value;
}

function setBarWidthByDataId(dataId, pct) {
  const el = document.querySelector(`[data-id="${dataId}"]`);
  if (el != null) el.style.width = `${pct}%`;
}

function setBarWidthById(id, pct) {
  const el = document.getElementById(id);
  if (el != null) el.style.width = `${pct}%`;
}

function renderGaugeById(canvasId, value) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Destroy previous instance if re-rendering
  if (charts[canvasId]) {
    charts[canvasId].destroy();
    charts[canvasId] = null;
  }

  charts[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [
        {
          data: [value, Math.max(0, 100 - value)],
          backgroundColor: ['#4caf50', '#e0e0e0'],
          borderWidth: 0,
        },
      ],
    },
    options: {
      rotation: -90,
      circumference: 180,
      cutout: '70%',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
        datalabels: { display: false },
      },
    },
  });
}

/* --------------------------------------------------------------------------------
   POPULATE FUNCTIONS (per page)
-------------------------------------------------------------------------------- */
function populateMain() {
  const depts = ['mz', 'cf', 'hb', 'nc', 'rr', 'ship'];
  depts.forEach((deptKey) => {
    const dept = dashboardData[deptKey];
    if (!dept) return;

    // Use the first level available for the dashboard summary
    const firstLevelKey = Object.keys(dept.levels)[0];
    const level = dept.levels[firstLevelKey];

    // Gauges
    renderGaugeById(`${deptKey}Pick`, level.picking.perf);
    renderGaugeById(`${deptKey}Stock`, level.stocking.perf);

    // Text metrics
    setTextByDataId(`${deptKey}PickPerf`, `${level.picking.perf}%`);
    setTextByDataId(`${deptKey}StockPerf`, `${level.stocking.perf}%`);

    setTextByDataId(`${deptKey}Wave`, `${level.picking.wave}`);
    setBarWidthByDataId(`${deptKey}Progress`, level.picking.progress);
    setTextByDataId(`${deptKey}ProgressText`, `Progress: ${level.picking.progress}%`);

    setTextByDataId(`${deptKey}Expected`, `${level.stocking.expected}`);
    setTextByDataId(`${deptKey}Stocked`, `${level.stocking.stocked}`);
    setTextByDataId(`${deptKey}Left`, `${level.stocking.remaining}`);
  });
}

function populateLevels_MZ() {
  [1, 2, 3].forEach((lvl) => {
    const level = dashboardData.mz.levels[lvl];
    if (!level) return;

    renderGaugeById(`mz${lvl}-picking-gauge`, level.picking.perf);
    setTextByDataId(`mz${lvl}Pick`, `${level.picking.perf}%`);
    setTextByDataId(`mz${lvl}Wave`, `${level.picking.wave}`);
    setBarWidthByDataId(`mz${lvl}Progress`, level.picking.progress);
    setTextByDataId(`mz${lvl}ProgressText`, `${level.picking.progress}%`);

    renderGaugeById(`mz${lvl}-stocking-gauge`, level.stocking.perf);
    setTextByDataId(`mz${lvl}Stock`, `${level.stocking.perf}%`);
    setTextByDataId(`mz${lvl}Expected`, `${level.stocking.expected}`);
    setTextByDataId(`mz${lvl}Stocked`, `${level.stocking.stocked}`);
    setTextByDataId(`mz${lvl}Remaining`, `${level.stocking.remaining}`);
  });
}

function populateLevels_CF() {
  [1, 2, 3].forEach((lvl) => {
    const level = dashboardData.cf.levels[lvl];
    if (!level) return;

    renderGaugeById(`cf${lvl}-picking-gauge`, level.picking.perf);
    setTextByDataId(`cf${lvl}Pick`, `${level.picking.perf}%`);
    setTextByDataId(`cf${lvl}Wave`, `${level.picking.wave}`);
    setBarWidthByDataId(`cf${lvl}Progress`, level.picking.progress);
    setTextByDataId(`cf${lvl}ProgressText`, `${level.picking.progress}%`);

    renderGaugeById(`cf${lvl}-stocking-gauge`, level.stocking.perf);
    setTextByDataId(`cf${lvl}Stock`, `${level.stocking.perf}%`);
    setTextByDataId(`cf${lvl}Expected`, `${level.stocking.expected}`);
    setTextByDataId(`cf${lvl}Stocked`, `${level.stocking.stocked}`);
    setTextByDataId(`cf${lvl}Remaining`, `${level.stocking.remaining}`);
  });
}

function populateLevels_HB() {
  [1, 2, 3].forEach((lvl) => {
    const level = dashboardData.hb.levels[lvl];
    if (!level) return;

    renderGaugeById(`hb${lvl}-picking-gauge`, level.picking.perf);
    setTextByDataId(`hb${lvl}Pick`, `${level.picking.perf}%`);
    setTextByDataId(`hb${lvl}Wave`, `${level.picking.wave}`);
    setBarWidthByDataId(`hb${lvl}Progress`, level.picking.progress);
    setTextByDataId(`hb${lvl}ProgressText`, `${level.picking.progress}%`);

    renderGaugeById(`hb${lvl}-stocking-gauge`, level.stocking.perf);
    setTextByDataId(`hb${lvl}Stock`, `${level.stocking.perf}%`);
    setTextByDataId(`hb${lvl}Expected`, `${level.stocking.expected}`);
    setTextByDataId(`hb${lvl}Stocked`, `${level.stocking.stocked}`);
    setTextByDataId(`hb${lvl}Remaining`, `${level.stocking.remaining}`);
  });
}

function populateLevels_RR() {
  [1, 2].forEach((lvl) => {
    const level = dashboardData.rr.levels[lvl];
    if (!level) return;

    renderGaugeById(`rr${lvl}-picking-gauge`, level.picking.perf);
    setTextByDataId(`rr${lvl}Pick`, `${level.picking.perf}%`);
    setTextByDataId(`rr${lvl}Wave`, `${level.picking.wave}`);
    setBarWidthByDataId(`rr${lvl}Progress`, level.picking.progress);
    setTextByDataId(`rr${lvl}ProgressText`, `${level.picking.progress}%`);

    renderGaugeById(`rr${lvl}-stocking-gauge`, level.stocking.perf);
    setTextByDataId(`rr${lvl}Stock`, `${level.stocking.perf}%`);
    setTextByDataId(`rr${lvl}Expected`, `${level.stocking.expected}`);
    setTextByDataId(`rr${lvl}Stocked`, `${level.stocking.stocked}`);
    setTextByDataId(`rr${lvl}Remaining`, `${level.stocking.remaining}`);
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
    const level = dashboardData.nc.levels[key];
    if (!level) return;

    renderGaugeById(`${prefix}-picking-gauge`, level.picking.perf);
    setTextByDataId(`${prefix.replace('-', '')}Pick`, `${level.picking.perf}%`);
    setTextByDataId(`${prefix.replace('-', '')}Wave`, `${level.picking.wave}`);
    setBarWidthByDataId(`${prefix.replace('-', '')}Progress`, level.picking.progress);
    setTextByDataId(`${prefix.replace('-', '')}ProgressText`, `${level.picking.progress}%`);

    renderGaugeById(`${prefix}-stocking-gauge`, level.stocking.perf);
    setTextByDataId(`${prefix.replace('-', '')}Stock`, `${level.stocking.perf}%`);
    setTextByDataId(`${prefix.replace('-', '')}Expected`, `${level.stocking.expected}`);
    setTextByDataId(`${prefix.replace('-', '')}Stocked`, `${level.stocking.stocked}`);
    setTextByDataId(`${prefix.replace('-', '')}Remaining`, `${level.stocking.remaining}`);
  });
}

function populateMZZones(levelNumber) {
  const level = dashboardData.mz.levels[levelNumber];
  if (!level || !level.zones) return;

  Object.keys(level.zones).forEach((zKey) => {
    const z = level.zones[zKey];

    renderGaugeById(`z${zKey}-picking-gauge`, z.picking.perf);
    setTextById(`z${zKey}-pick-text`, `${z.picking.perf}%`);
    setTextById(`z${zKey}-pick-wave`, `Current Wave: ${z.picking.wave}`);
    setBarWidthById(`z${zKey}-pick-progress`, z.picking.progress);
    setTextById(`z${zKey}-pick-progress-text`, `Progress: ${z.picking.progress}%`);

    renderGaugeById(`z${zKey}-stocking-gauge`, z.stocking.perf);
    setTextById(`z${zKey}-stock-text`, `${z.stocking.perf}%`);
    setTextById(`z${zKey}-stock-expected`, `Expected: ${z.stocking.expected}`);
    setTextById(`z${zKey}-stock-stocked`, `Stocked: ${z.stocking.stocked}`);
    setTextById(`z${zKey}-stock-remaining`, `Remaining: ${z.stocking.remaining}`);
  });
}

/* --------------------------------------------------------------------------------
   ROUTER
-------------------------------------------------------------------------------- */
function populateForPage(pageId) {
  switch (pageId) {
    case 'mainPage':
      populateMain();
      break;
    case 'mzLevels':
      populateLevels_MZ();
      break;
    case 'cfLevels':
      populateLevels_CF();
      break;
    case 'hbLevels':
      populateLevels_HB();
      break;
    case 'rrLevels':
      populateLevels_RR();
      break;
    case 'ncLevels':
      populateLevels_NC();
      break;
    case 'mzLevel1':
      populateMZZones(1);
      break;
    case 'mzLevel2':
      populateMZZones(2);
      break;
    case 'mzLevel3':
      populateMZZones(3);
      break;
    default:
      break;
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

// Initial render for main dashboard
window.addEventListener('DOMContentLoaded', () => {
  populateForPage('mainPage');
});
