
function navigate(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(pageId);
  if (page) page.classList.add('active');
}

window.onload = () => {
  const gauges = [
    ['mzPick', 78], ['mzStock', 91],
    ['cfPick', 80], ['cfStock', 88],
    ['hbPick', 65], ['hbStock', 79],
    ['ncPick', 90], ['ncStock', 94],
    ['rrPick', 72], ['rrStock', 85],
    ['shipPick', 96], ['shipStock', 98],
    ['mzL1Pick', 70], ['mzL1Stock', 85],
    ['mzL2Pick', 82], ['mzL2Stock', 88],
    ['mzL3Pick', 76], ['mzL3Stock', 90]
  ];
  gauges.forEach(([id, val]) =>
    createGauge(id, val, val > 85 ? '#5cb85c' : '#f39c12')
  );
};
function createGauge(id, value, color) {
  const ctx = document.getElementById(id).getContext('2d');
  new Chart(ctx, {
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
}
