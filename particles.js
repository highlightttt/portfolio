// ─── CONFIG ───
const CFG = {
  // Text
  text: "Jesse\nLai",
  fontFamily: "Noto Serif SC",
  fontSize: 180,
  fontWeight: "900",

  // Particles
  particleSize: 1.0,
  samplingGap: 5,          // wider gap = visible spacing between particles
  particleColor: [255, 255, 255],

  // Render mode: "dot" | "char"
  renderMode: "dot",
  charSet: "01",

  // Forces (matching reference)
  radial: 1.0,
  wind: 0.8,
  vortex: 1.0,
  turbulence: 0.3,

  // Physics (matching reference)
  spring: 0.030,
  damping: 0.73,
  breathing: 0.15,         // idle wandering amplitude

  // Mouse
  cursorRadius: 170,
  dotSizeBoost: 3.0,       // size multiplier near cursor

  // Depth
  depthRange: 0.6,         // how much size/opacity varies for fake depth
  
  // Background
  bgColor: "#0a0a0a",
};

// ─── CANVAS SETUP ───
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
const cursor = document.getElementById("cursor");
let W, H, dpr;

function resize() {
  dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resize();
window.addEventListener("resize", () => { resize(); initParticles(); });

// ─── MOUSE ───
let mouse = { x: -9999, y: -9999, vx: 0, vy: 0 };
let prevMouse = { x: -9999, y: -9999 };

canvas.addEventListener("mousemove", e => {
  mouse.vx = e.clientX - prevMouse.x;
  mouse.vy = e.clientY - prevMouse.y;
  prevMouse.x = mouse.x;
  prevMouse.y = mouse.y;
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  cursor.style.left = e.clientX + "px";
  cursor.style.top = e.clientY + "px";
});
canvas.addEventListener("mouseleave", () => { mouse.x = -9999; mouse.y = -9999; });

canvas.addEventListener("touchmove", e => {
  e.preventDefault();
  const t = e.touches[0];
  mouse.vx = t.clientX - mouse.x;
  mouse.vy = t.clientY - mouse.y;
  mouse.x = t.clientX;
  mouse.y = t.clientY;
}, { passive: false });
canvas.addEventListener("touchend", () => { mouse.x = -9999; mouse.y = -9999; });

// ─── SIMPLEX-LIKE NOISE (fast hash-based) ───
function noise2D(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
}
function smoothNoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = noise2D(ix, iy), b = noise2D(ix + 1, iy);
  const c = noise2D(ix, iy + 1), d = noise2D(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

// ─── PARTICLES ───
let particles = [];
let time = 0;

function sampleText() {
  const off = document.createElement("canvas");
  off.width = W * dpr;
  off.height = H * dpr;
  const octx = off.getContext("2d");
  octx.setTransform(dpr, 0, 0, dpr, 0, 0);

  octx.fillStyle = "#000";
  octx.fillRect(0, 0, W, H);

  octx.fillStyle = "#fff";
  octx.font = `${CFG.fontWeight} ${CFG.fontSize}px "${CFG.fontFamily}"`;
  octx.textAlign = "center";
  octx.textBaseline = "middle";

  const lines = CFG.text.split("\n");
  const lineHeight = CFG.fontSize * 1.15;
  const totalHeight = lines.length * lineHeight;
  const startY = H / 2 - totalHeight / 2 + lineHeight / 2;

  lines.forEach((line, i) => {
    octx.fillText(line, W / 2, startY + i * lineHeight);
  });

  const imageData = octx.getImageData(0, 0, W * dpr, H * dpr);
  const data = imageData.data;
  const points = [];
  const gap = CFG.samplingGap;

  for (let y = 0; y < H * dpr; y += gap) {
    for (let x = 0; x < W * dpr; x += gap) {
      const i = (y * W * dpr + x) * 4;
      if (data[i] > 128) {
        // Random offset from grid for organic placement
        const ox = (Math.random() - 0.5) * gap * 0.8;
        const oy = (Math.random() - 0.5) * gap * 0.8;
        const px = x / dpr + ox / dpr;
        const py = y / dpr + oy / dpr;
        // Fake depth layer (0 = far/small, 1 = near/big)
        const depth = Math.random();
        points.push({
          originX: px,
          originY: py,
          x: px,
          y: py,
          vx: 0,
          vy: 0,
          depth: depth,
          noiseOffsetX: Math.random() * 1000,
          noiseOffsetY: Math.random() * 1000,
          char: CFG.charSet[Math.floor(Math.random() * CFG.charSet.length)],
        });
      }
    }
  }
  return points;
}

function initParticles() {
  document.fonts.ready.then(() => {
    particles = sampleText();
  });
}
initParticles();

// ─── PHYSICS ───
function updateParticles(dt) {
  time += dt;
  const mx = mouse.x;
  const my = mouse.y;
  const mvx = mouse.vx;
  const mvy = mouse.vy;
  const cr = CFG.cursorRadius;
  const crSq = cr * cr;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];

    // Breathing: idle noise-based wandering
    const breathX = smoothNoise(p.noiseOffsetX + time * 0.3, p.noiseOffsetY) * CFG.breathing * 20;
    const breathY = smoothNoise(p.noiseOffsetX, p.noiseOffsetY + time * 0.3) * CFG.breathing * 20;
    const targetX = p.originX + breathX;
    const targetY = p.originY + breathY;

    // Mouse interaction
    const dx = p.x - mx;
    const dy = p.y - my;
    const distSq = dx * dx + dy * dy;

    if (distSq < crSq && distSq > 0.01) {
      const dist = Math.sqrt(distSq);
      const t = 1 - dist / cr; // 0 at edge, 1 at center
      const ndx = dx / dist;
      const ndy = dy / dist;

      // Radial push
      if (CFG.radial > 0) {
        const force = t * t * CFG.radial * 15;
        p.vx += ndx * force;
        p.vy += ndy * force;
      }

      // Wind (push in mouse velocity direction)
      if (CFG.wind > 0) {
        const force = t * CFG.wind * 0.8;
        p.vx += mvx * force;
        p.vy += mvy * force;
      }

      // Vortex (perpendicular to radial)
      if (CFG.vortex > 0) {
        const force = t * CFG.vortex * 5;
        p.vx += -ndy * force;
        p.vy += ndx * force;
      }

      // Turbulence (random jitter near cursor)
      if (CFG.turbulence > 0) {
        const force = t * CFG.turbulence * 8;
        p.vx += (Math.random() - 0.5) * force;
        p.vy += (Math.random() - 0.5) * force;
      }
    }

    // Spring toward breathing target
    p.vx += (targetX - p.x) * CFG.spring;
    p.vy += (targetY - p.y) * CFG.spring;

    // Damping
    p.vx *= CFG.damping;
    p.vy *= CFG.damping;

    p.x += p.vx;
    p.y += p.vy;
  }
}

// ─── RENDER ───
function render() {
  ctx.fillStyle = CFG.bgColor;
  ctx.fillRect(0, 0, W, H);

  const [r, g, b] = CFG.particleColor;
  const mx = mouse.x;
  const my = mouse.y;
  const cr = CFG.cursorRadius;
  const crSq = cr * cr;

  if (CFG.renderMode === "dot") {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Size based on depth
      const depthScale = (1 - CFG.depthRange) + p.depth * CFG.depthRange;
      let size = CFG.particleSize * depthScale;

      // Opacity based on depth
      const alpha = 0.3 + p.depth * 0.7;

      // Dot size boost near cursor
      const cdx = p.x - mx;
      const cdy = p.y - my;
      const cdSq = cdx * cdx + cdy * cdy;
      if (cdSq < crSq) {
        const t = 1 - Math.sqrt(cdSq) / cr;
        size *= 1 + t * (CFG.dotSizeBoost - 1);
      }

      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (CFG.renderMode === "char") {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const depthScale = (1 - CFG.depthRange) + p.depth * CFG.depthRange;
      const alpha = 0.3 + p.depth * 0.7;
      const fontSize = CFG.particleSize * 5 * depthScale;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.font = `${fontSize}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.char, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }
}

// ─── LOOP ───
let lastTime = performance.now();
function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  updateParticles(dt);
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ─── MODE SWITCH (press M) ───
document.addEventListener("keydown", e => {
  if (e.key === "m" || e.key === "M") {
    CFG.renderMode = CFG.renderMode === "dot" ? "char" : "dot";
  }
});
