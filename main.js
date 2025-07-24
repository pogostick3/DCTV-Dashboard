function navigate(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(pageId);
  if (page) {
    page.classList.add('active');
    loadGauges(); // make sure gauges re-render when a new page shows up
  }
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

