// main.js - Updated for full global variable usage and dynamic rendering

// Global Data Object
const dashboardData = {
  mz: {
    levels: {
      1: {
        picking: {
          perf: 80,
          wave: 1,
          progress: 75,
        },
        stocking: {
          perf: 89,
          expected: 800,
          stocked: 700,
          remaining: 100,
        },
        zones: {
          10: {
            picking: { perf: 83, wave: 1, progress: 72 },
            stocking: { perf: 88, expected: 1200, stocked: 1056, remaining: 144 },
          },
          11: {
            picking: { perf: 67, wave: 2, progress: 60 },
            stocking: { perf: 75, expected: 950, stocked: 713, remaining: 237 },
          },
        },
      },
      2: {
        picking: { perf: 85, wave: 2, progress: 40 },
        stocking: { perf: 93, expected: 750, stocked: 697, remaining: 53 },
        zones: {
          20: {
            picking: { perf: 81, wave: 3, progress: 66 },
            stocking: { perf: 86, expected: 990, stocked: 851, remaining: 139 },
          },
          21: {
            picking: { perf: 58, wave: 4, progress: 45 },
            stocking: { perf: 63, expected: 880, stocked: 554, remaining: 326 },
          },
        },
      },
      3: {
        picking: { perf: 70, wave: 3, progress: 22 },
        stocking: { perf: 80, expected: 670, stocked: 536, remaining: 134 },
        zones: {
          30: {
            picking: { perf: 77, wave: 5, progress: 70 },
            stocking: { perf: 81, expected: 1060, stocked: 859, remaining: 201 },
          },
          31: {
            picking: { perf: 92, wave: 6, progress: 88 },
            stocking: { perf: 95, expected: 1190, stocked: 1130, remaining: 60 },
          },
        },
      },
    },
  },
};

// Utility Function to Populate Text and Gauge
function updateGaugeAndText(idPrefix, data) {
  if (data.perf !== undefined) {
    const gaugeEl = document.getElementById(`${idPrefix}-gauge`);
    const textEl = document.getElementById(`${idPrefix}-text`);
    if (gaugeEl) renderGauge(gaugeEl, data.perf);
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
  const levels = dashboardData.mz.levels;
  for (let lvl in levels) {
    const level = levels[lvl];
    updateGaugeAndText(`mz${lvl}-picking`, level.picking);
    updateGaugeAndText(`mz${lvl}-stocking`, level.stocking);

    const zones = level.zones;
    for (let z in zones) {
      updateGaugeAndText(`z${z}-pick`, zones[z].picking);
      updateGaugeAndText(`z${z}-stock`, zones[z].stocking);
    }
  }
}

// Render Gauge Function
function renderGauge(canvas, value) {
  new Chart(canvas, {
    type: 'doughnut',
    data: {
      datasets: [
        {
          data: [value, 100 - value],
          backgroundColor: ['#4caf50', '#e0e0e0'],
          borderWidth: 0,
        },
      ],
    },
    options: {
      rotation: -90,
      circumference: 180,
      cutout: '70%',
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
        datalabels: {
          display: false,
        },
      },
    },
  });
}

// Navigation between pages
function navigate(pageId) {
  document.querySelectorAll('.page').forEach((page) => page.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
}

// On DOM Load
window.addEventListener('DOMContentLoaded', populateDashboard);
