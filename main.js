// Register Chart.js plugin if needed
if (window.ChartDataLabels) {
  Chart.register(ChartDataLabels);
}

// Global Data
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
};



// Utility Function to Populate Text and Gauges
function updateGaugeAndText(idPrefix, data) {
  const gaugeEl = document.getElementById(idPrefix);
  const textEl = document.getElementById(`${idPrefix}-text`);
  if (gaugeEl && data.perf !== undefined) {
    console.log(`Rendering gauge for ${idPrefix} (${data.perf}%)`);
    renderGauge(gaugeEl, data.perf);
    if (textEl) textEl.textContent = `${data.perf}%`;
  }

  if (data.wave !== undefined) {
    const waveEl = document.getElementById(`${idPrefix}-wave`);
    if (waveEl) waveEl.textContent = `Current Wave: ${data.wave}`;
  }
  if (data.progress !== undefined) {
    const barEl = document.getElementById(`${idPrefix}-progress`);
    const progText = document.getElementById(`${idPrefix}-progress-text`);
    if (barEl) barEl.style.width = `${data.progress}%`;
    if (progText) progText.textContent = `Progress: ${data.progress}%`;
  }
  if (data.expected !== undefined) {
    const expectedEl = document.getElementById(`${idPrefix}-expected`);
    if (expectedEl) expectedEl.textContent = `Expected: ${data.expected}`;
  }
  if (data.stocked !== undefined) {
    const stockedEl = document.getElementById(`${idPrefix}-stocked`);
    if (stockedEl) stockedEl.textContent = `Stocked: ${data.stocked}`;
  }
  if (data.remaining !== undefined) {
    const remainingEl = document.getElementById(`${idPrefix}-remaining`);
    if (remainingEl) remainingEl.textContent = `Remaining: ${data.remaining}`;
  }
}

// Render All Gauges and Text from Global Data
function populateDashboard() {
  for (const deptKey in dashboardData) {
    const dept = dashboardData[deptKey];
    const levels = dept.levels;

    let isFirstLevel = true;

    for (const lvlKey in levels) {
      const level = levels[lvlKey];

      // Render to main dashboard (first level only)
      if (isFirstLevel) {
        updateGaugeAndText(`${deptKey}Pick`, level.picking);
        updateGaugeAndText(`${deptKey}Stock`, level.stocking);
        updateTextOnly(`${deptKey}`, level);
        isFirstLevel = false;
      }

      // Level Pages
      const lvlPickCanvas = document.querySelector(`#${deptKey}${lvlKey}-picking`);
      const lvlStockCanvas = document.querySelector(`#${deptKey}${lvlKey}-stocking`);

      if (lvlPickCanvas) {
        updateGaugeAndText(`${deptKey}${lvlKey}-picking`, level.picking);
      }
      if (lvlStockCanvas) {
        updateGaugeAndText(`${deptKey}${lvlKey}-stocking`, level.stocking);
      }

      // Zones
      if (level.zones) {
        for (const zKey in level.zones) {
          const zone = level.zones[zKey];
          if (document.getElementById(`z${zKey}-pick`)) {
            updateGaugeAndText(`z${zKey}-pick`, zone.picking);
          }
          if (document.getElementById(`z${zKey}-stock`)) {
            updateGaugeAndText(`z${zKey}-stock`, zone.stocking);
          }
        }
      }
    }
  }
}

// Utility for adding non-gauge text on main dashboard
function updateTextOnly(prefix, level) {
  const wave = document.querySelector(`[data-id='${prefix}Wave']`);
  const progress = document.querySelector(`[data-id='${prefix}Progress']`);
  const progressText = document.querySelector(`[data-id='${prefix}ProgressText']`);
  const expected = document.querySelector(`[data-id='${prefix}Expected']`);
  const stocked = document.querySelector(`[data-id='${prefix}Stocked']`);
  const left = document.querySelector(`[data-id='${prefix}Left']`);

  if (wave) wave.textContent = `Current Wave: ${level.picking?.wave ?? ''}`;
  if (progress) progress.style.width = `${level.picking?.progress ?? 0}%`;
  if (progressText) progressText.textContent = `Progress: ${level.picking?.progress ?? 0}%`;
  if (expected) expected.textContent = `${level.stocking?.expected ?? ''}`;
  if (stocked) stocked.textContent = `${level.stocking?.stocked ?? ''}`;
  if (left) left.textContent = `${level.stocking?.remaining ?? ''}`;
}

// Render Gauge Function
function renderGauge(canvas, value) {
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.height = 80;
  canvas.width = 160;

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [value, 100 - value],
        backgroundColor: ['#4caf50', '#e0e0e0'],
        borderWidth: 0,
      }]
    },
    options: {
      rotation: -90,
      circumference: 180,
      cutout: '70%',
      responsive: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
        datalabels: { display: false },
      }
    }
  });
}

// Navigation between pages
function navigate(pageId) {
  document.querySelectorAll('.page').forEach((page) => page.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
}

// Initialize Dashboard on DOM Ready
window.addEventListener('DOMContentLoaded', populateDashboard);

