function navigate(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(pageId);
  if (page) {
    page.classList.add('active');
    setTimeout(() => {
      loadGauges(); // redraw all gauges

      if (pageId === 'mzLevels') {
        drawGauge('mz1-picking-gauge', 80, 'orange');
        drawGauge('mz1-stocking-gauge', 89, '#4caf50');
        drawGauge('mz2-picking-gauge', 85, 'orange');
        drawGauge('mz2-stocking-gauge', 93, '#4caf50');
        drawGauge('mz3-picking-gauge', 70, 'orange');
        drawGauge('mz3-stocking-gauge', 80, '#4caf50');
      }
    }, 100);
  }
}

function createGauge(id, value, color) {
  const canvas = document.getElementById(id);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  if (canvas.chartInstance) {
    canvas.chartInstance.destroy();
  }

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
  const gauges = [
    ['mzPick', 78], ['mzStock', 91],
    ['cfPick', 80], ['cfStock', 88],
    ['hbPick', 65], ['hbStock', 79],
    ['ncPick', 90], ['ncStock', 94],
    ['rrPick', 72], ['rrStock', 85],
    ['shipPick', 96], ['shipStock', 98],
    ['mz1-picking-gauge', 80], ['mz1-stocking-gauge', 89],
    ['mz2-picking-gauge', 85], ['mz2-stocking-gauge', 93],
    ['mz3-picking-gauge', 70], ['mz3-stocking-gauge', 80]
  ];

  gauges.forEach(([id, val]) => {
    createGauge(id, val, val > 85 ? '#4caf50' : 'orange');
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

  // Initialize MZ gauges if already on that page
  if (document.getElementById('mzLevels')?.classList.contains('active')) {
    drawGauge('mz1-picking-gauge', 80, 'orange');
    drawGauge('mz1-stocking-gauge', 89, '#4caf50');
    drawGauge('mz2-picking-gauge', 85, 'orange');
    drawGauge('mz2-stocking-gauge', 93, '#4caf50');
    drawGauge('mz3-picking-gauge', 70, 'orange');
    drawGauge('mz3-stocking-gauge', 80, '#4caf50');
  }
};
