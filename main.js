/* main.js — vanilla-canvas gauges w/ needles + data from data/dashboard.json */

// thresholds
const COLORS = {
  green: "#22c55e",
  yellow: "#fbbf24",
  red: "#ef4444",
  grey: "#e5e7eb",
  arc: "#e5e7eb"
};

const clamp = (n,min=0,max=100)=>Math.max(min,Math.min(max,Number(n)||0));
const colorFor = v => v < 75 ? COLORS.red : (v <= 90 ? COLORS.yellow : COLORS.green);

// basic page nav API (works for all pages that exist)
window.navigate = function(pageId){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  const el = document.getElementById(pageId);
  if(el) el.classList.add("active");
};

// retina-safe canvas sizing
function fitCanvas(canvas){
  const ratio = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  const cssW = canvas.getAttribute("width");
  const cssH = canvas.getAttribute("height");
  canvas.style.width = cssW + "px";
  canvas.style.height = cssH + "px";
  canvas.width = cssW * ratio;
  canvas.height = cssH * ratio;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return ctx;
}

/** Draw a semicircle gauge with a triangular needle pointing at the end of the colored arc. */
function drawGauge(canvas, value){
  if(!canvas) return;
  const v = clamp(value);
  const ctx = fitCanvas(canvas);

  const w = parseInt(canvas.style.width);
  const h = parseInt(canvas.style.height);
  const cx = w/2;
  const cy = h-6;           // center at bottom with small margin
  const radius = Math.min(w/2-6, h-8);
  const lw = 26;            // thickness
  ctx.clearRect(0,0,w,h);

  // background arc (full)
  ctx.beginPath();
  ctx.strokeStyle = COLORS.arc;
  ctx.lineWidth = lw;
  ctx.lineCap = "butt";
  ctx.arc(cx, cy, radius, Math.PI, 0, false);
  ctx.stroke();

  // colored arc
  const endAngle = Math.PI - (v/100)*Math.PI;  // from left (π) towards right (0)
  ctx.beginPath();
  ctx.strokeStyle = colorFor(v);
  ctx.lineWidth = lw;
  ctx.arc(cx, cy, radius, Math.PI, endAngle, false);
  ctx.stroke();

  // triangle needle pointing at arc end
  const angle = endAngle;
  const tip = { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  const innerR = radius - lw + 4; // a bit inside
  const baseCenter = { x: cx + innerR * Math.cos(angle), y: cy + innerR * Math.sin(angle) };

  // tangent vector for width
  const tx = -Math.sin(angle);
  const ty =  Math.cos(angle);
  const half = 8;

  const p1 = { x: baseCenter.x + tx*half, y: baseCenter.y + ty*half };
  const p2 = { x: baseCenter.x - tx*half, y: baseCenter.y - ty*half };

  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.closePath();
  ctx.fillStyle = colorFor(v);
  ctx.fill();
}

/* ------- Data plumbing ------- */
async function loadData(){
  const res = await fetch("data/dashboard.json", {cache:"no-store"});
  return await res.json();
}

// prefer Dept sheet if present, else fallback to Level 1 data
function getDeptState(data, dept){
  const d = data[dept] || {};
  // Dept sheet override
  if(d.dept){
    const s = d.dept;
    return {
      pickPerf: clamp(s.pick_perf),
      stockPerf: clamp(s.stock_perf),
      wave: Number(s.wave)||0,
      progress: clamp(s.progress),
      orders: {
        done: Number(s.orders_complete)||0,
        total: Number(s.orders_total)||0
      },
      expected: Number(s.expected)||0,
      stocked: Number(s.stocked)||0,
      remaining: Number(s.remaining)||0
    };
  }
  // fallback: level 1 if available
  const lvl = d.levels ? (d.levels[1] || d.levels["1"]) : null;
  if(lvl){
    return {
      pickPerf: clamp(lvl.picking?.perf),
      stockPerf: clamp(lvl.stocking?.perf),
      wave: Number(lvl.picking?.wave)||0,
      progress: clamp(lvl.picking?.progress),
      orders: { done: 0, total: 0 }, // not available on levels
      expected: Number(lvl.stocking?.expected)||0,
      stocked: Number(lvl.stocking?.stocked)||0,
      remaining: Number(lvl.stocking?.remaining)||0
    };
  }
  return {
    pickPerf:0, stockPerf:0, wave:0, progress:0,
    orders:{done:0,total:0}, expected:0, stocked:0, remaining:0
  };
}

function setStatusDot(el, pickPerf, stockPerf){
  if(!el) return;
  const pickC = colorFor(pickPerf);
  const stockC = colorFor(stockPerf);
  let cls = "status-green";
  if (pickC===COLORS.red || stockC===COLORS.red) cls = "status-red";
  else if (pickC===COLORS.yellow || stockC===COLORS.yellow) cls = "status-yellow";
  el.classList.remove("status-green","status-yellow","status-red");
  el.classList.add(cls);
}

function fillTile(prefix, state){
  // numbers
  document.getElementById(`${prefix}PickPerf`).textContent = `${state.pickPerf}%`;
  document.getElementById(`${prefix}StockPerf`).textContent = `${state.stockPerf}%`;
  document.getElementById(`${prefix}Wave`).textContent = state.wave;
  document.getElementById(`${prefix}ProgressText`).textContent = `${state.progress}%`;
  document.getElementById(`${prefix}Progress`).style.width = `${state.progress}%`;
  document.getElementById(`${prefix}Expected`).textContent = state.expected.toLocaleString();
  document.getElementById(`${prefix}Stocked`).textContent = state.stocked.toLocaleString();
  document.getElementById(`${prefix}Left`).textContent = state.remaining.toLocaleString();
  const ordersEl = document.getElementById(`${prefix}Orders`);
  if(ordersEl) ordersEl.textContent = `${state.orders.done}/${state.orders.total}`;

  // gauges
  drawGauge(document.getElementById(`${prefix}PickGauge`), state.pickPerf);
  drawGauge(document.getElementById(`${prefix}StockGauge`), state.stockPerf);

  setStatusDot(document.getElementById(`${prefix}Status`), state.pickPerf, state.stockPerf);
}

function fillShipping(shipping){
  const list = document.getElementById("shippingList");
  list.innerHTML = "";
  if(!shipping || !shipping.waves || !shipping.waves.length){
    const p = document.createElement("p");
    p.className = "note";
    p.textContent = "No shipping data.";
    list.appendChild(p);
    return;
  }
  shipping.waves.forEach(w=>{
    const row = document.createElement("div");
    row.className = "wave-row";
    row.innerHTML = `
      <div class="label">Wave ${w.wave}</div>
      <div class="bar"><div class="fill" style="width:${clamp(w.progress)}%"></div></div>
      <div class="pct">${clamp(w.progress)}%</div>
    `;
    list.appendChild(row);
  });
}

/* ------- Boot ------- */
window.addEventListener("DOMContentLoaded", async () => {
  try{
    const data = await loadData();

    // Home tiles
    ["mz","cf","hb","nc","rr"].forEach(dept=>{
      const s = getDeptState(data, dept);
      fillTile(dept.toUpperCase(), s); // IDs use uppercase prefixes
    });

    if(data.shipping) fillShipping(data.shipping);

    // Clicking a dept tile navigates if a page exists
    document.querySelectorAll('.tile[data-dept]').forEach(t=>{
      t.addEventListener('click', e=>{
        const dept = t.getAttribute('data-dept');
        // e.g., "mz" -> "mzLevels" page
        const targetId = `${dept}Levels`;
        if(document.getElementById(targetId)) navigate(targetId);
      }, {capture:false});
    });
  }catch(err){
    console.error("Failed to initialize:", err);
  }
});
