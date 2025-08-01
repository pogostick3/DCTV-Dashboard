// main.js

function navigate(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(pageId);
  if (page) {
    page.classList.add('active');
    setTimeout(() => {
      loadGauges();

      if (pageId === 'mzLevels') {
        drawGauge('mz1-picking-gauge', 80, 'orange');
        drawGauge('mz1-stocking-gauge', 89, '#4caf50');
        drawGauge('mz2-picking-gauge', 85, 'orange');
        drawGauge('mz2-stocking-gauge', 93, '#4caf50');
        drawGauge('mz3-picking-gauge', 70, 'orange');
        drawGauge('mz3-stocking-gauge', 80, '#4caf50');
      }

      if (pageId === 'mzLevel1') {
        drawGauge('z10-picking-gauge', 83, 'orange');
        drawGauge('z10-stocking-gauge', 88, '#4caf50');
        drawGauge('z11-picking-gauge', 67, 'orange');
        drawGauge('z11-stocking-gauge', 75, '#4caf50');
      }

      if (pageId === 'mzLevel2') {
        drawGauge('z20-picking-gauge', 81, 'orange');
        drawGauge('z20-stocking-gauge', 86, '#4caf50');
        drawGauge('z21-picking-gauge', 58, 'orange');
        drawGauge('z21-stocking-gauge', 63, '#4caf50');
      }

      if (pageId === 'mzLevel3') {
        drawGauge('z30-picking-gauge', 77, 'orange');
        drawGauge('z30-stocking-gauge', 81, '#4caf50');
        drawGauge('z31-picking-gauge', 92, '#4caf50');
        drawGauge('z31-stocking-gauge', 95, '#4caf50');
      }

    }, 100);
  }
}

function createGauge(id, value, color) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (canvas.chartInstance) canvas.chartInstance.destroy();
  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [value, 100 - value],
        backgroundColor: [color, '#e6e6e6'],
        borderWidth: 0
      }]
    },
    options: {
      rotation: -90,
      circumference: 180,
      cutout: '70%',
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      }
    }
  });
  canvas.chartInstance = chart;
}

function loadGauges() {
  const gaugeData = [
    // Main page
    ['mzPick', 78], ['mzStock', 91],
    ['cfPick', 80], ['cfStock', 88],
    ['hbPick', 65], ['hbStock', 79],
    ['ncPick', 90], ['ncStock', 94],
    ['rrPick', 72], ['rrStock', 85],
    ['shipPick', 96], ['shipStock', 98],

    // MZ Levels
    ['mz1-picking-gauge', 80], ['mz1-stocking-gauge', 89],
    ['mz2-picking-gauge', 85], ['mz2-stocking-gauge', 93],
    ['mz3-picking-gauge', 70], ['mz3-stocking-gauge', 80],

    // MZ Zones
    ['z10-picking-gauge', 83], ['z10-stocking-gauge', 88],
    ['z11-picking-gauge', 67], ['z11-stocking-gauge', 75],
    ['z20-picking-gauge', 81], ['z20-stocking-gauge', 86],
    ['z21-picking-gauge', 58], ['z21-stocking-gauge', 63],
    ['z30-picking-gauge', 77], ['z30-stocking-gauge', 81],
    ['z31-picking-gauge', 92], ['z31-stocking-gauge', 95]
  ];

  gaugeData.forEach(([id, value]) => {
    const color = value >= 85 ? '#5cb85c' : value >= 70 ? '#f39c12' : '#d9534f';
    createGauge(id, value, color);
  });
}

function drawGauge(canvasId, percentage, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const radius = canvas.width / 2;
  const startAngle = Math.PI;
  const endAngle = Math.PI + Math.PI * (percentage / 100);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background arc
  ctx.beginPath();
  ctx.arc(radius, radius, radius - 10, Math.PI, 2 * Math.PI);
  ctx.strokeStyle = "#e6e6e6";
  ctx.lineWidth = 15;
  ctx.stroke();

  // Foreground arc
  ctx.beginPath();
  ctx.arc(radius, radius, radius - 10, startAngle, endAngle);
  ctx.strokeStyle = color;
  ctx.lineWidth = 15;
  ctx.stroke();
}

window.onload = () => {
  loadGauges();
};
