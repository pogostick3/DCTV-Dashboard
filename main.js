const performanceData = {
  mzPick: 78,
  mzStock: 91,
  cfPick: 80,
  cfStock: 88,
  hbPick: 65,
  hbStock: 79,
  ncPick: 90,
  ncStock: 94,
  rrPick: 72,
  rrStock: 85,
  shipPick: 96,
  shipStock: 98,

  mz1Pick: 80,
  mz1Stock: 89,
  mz2Pick: 85,
  mz2Stock: 93,
  mz3Pick: 70,
  mz3Stock: 80,

  z10Pick: 83,
  z10Stock: 88,
  z11Pick: 67,
  z11Stock: 75,
  z20Pick: 81,
  z20Stock: 86,
  z21Pick: 58,
  z21Stock: 63,
  z30Pick: 77,
  z30Stock: 81,
  z31Pick: 92,
  z31Stock: 95
};

function navigate(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(pageId);
  if (page) {
    page.classList.add('active');
    setTimeout(() => {
      loadGauges();
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
        tooltip: { enabled: false },
        datalabels: {
          display: true,
          formatter: () => `${value}%`,
          color: '#000',
          font: {
            weight: 'bold',
            size: 16
          },
          anchor: 'center',
          align: 'center'
        }
      }
    },
    plugins: [ChartDataLabels]
  });

  canvas.chartInstance = chart;
}

function loadGauges() {
  Object.entries(performanceData).forEach(([key, value]) => {
    const gaugeId = `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}-gauge`;
    const color = value >= 85 ? '#5cb85c' : value >= 70 ? '#f39c12' : '#d9534f';
    createGauge(gaugeId, value, color);

    const textElement = document.querySelector(`.metric-${key}`);
    if (textElement) {
      textElement.textContent = `${value}%`;
    }
  });
}

window.onload = () => {
  loadGauges();
};
