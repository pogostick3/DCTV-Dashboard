function navigate(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(pageId);
  if (page) {
    page.classList.add('active');
    setTimeout(() => {
      loadGauges(); // Main dashboard gauges
      if (pageId === 'mzLevels') {
        drawGauge('mz1-picking-gauge', 80, 'orange');
        drawGauge('mz1-stocking-gauge', 89, '#4caf50');
      }
    }, 100);
  }
}

function createGauge(id, value, color) {
  const canvas = document.getElementById(id);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  // Clear any previous chart
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
    ['shipPick', 96], ['shipStock', 98]
  ];

  gauges.forEach(([id, val]) =>
    createGauge(id, val, val > 85 ? '#5cb85c' : '#f39c12')
  );
}

function drawGauge(canvasId, percentage, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const startAngle = Math.PI;
  const endAngle = Math.PI * (1 + percentage / 100);
  const radius = canvas.width / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.beginPath();
  ctx.arc(radius, radius, radius - 10, Math.PI, 2 * Math.PI);
  ctx.strokeStyle = "#e6e6e6";
  ctx.lineWidth = 15;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(radius, radius, radius - 10, startAngle, endAngle);
  ctx.strokeStyle = color;
  ctx.lineWidth = 15;
  ctx.stroke();
}

window.onload = () => {
  loadGauges();
};
