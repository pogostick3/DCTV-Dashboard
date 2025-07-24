function navigate(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(pageId);
  if (page) {
    page.classList.add('active');
    setTimeout(() => {
      loadGauges(); // draw after DOM updates
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
    ['shipPick', 96], ['shipStock', 98],
    ['mzL1Pick', 80], ['mzL1Stock', 89],
    ['mzL2Pick', 85], ['mzL2Stock', 93],
    ['mzL3Pick', 70], ['mzL3Stock', 80]
  ];

  gauges.forEach(([id, val]) =>
    createGauge(id, val, val > 85 ? '#5cb85c' : '#f39c12')
  );
}

window.onload = () => {
  loadGauges();
};

