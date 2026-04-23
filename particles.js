// ─── CONFIG ───
const CFG = {
  // Text rotation
  texts: [
    "ʕ´• ᴥ•̥`ʔ",
    "(≧ω≦)",
    ",,Ծ‸Ծ,,",
  ],
  textInterval: 3000,
  fontFamily: "-apple-system, 'PingFang SC', 'Helvetica Neue', sans-serif",
  fontSize: 180,
  fontWeight: "700",

  // Text particles
  samplingGap: 2,          // CSS pixels between samples (consistent across DPR)
  particleSize: 1.0,
  particleColor: [255, 255, 255],
  renderMode: "dot",
  charSet: "01",

  // Forces
  radial: 1.0,
  wind: 0.8,
  vortex: 1.0,
  turbulence: 0.3,

  // Physics
  spring: 0.015,
  damping: 0.73,
  breathing: 0.15,

  // Mouse
  cursorRadius: 85,
  dotSizeBoost: 3.0,

  // Depth
  depthRange: 0.6,

  // ─── SKY ───
  skyTop: [30, 90, 200],
  skyBottom: [80, 160, 235],

  // ─── CLOUDS ───
  cloudCount: 50000,
  cloudMinSize: 0.5,
  cloudMaxSize: 3.0,
  cloudDepthRange: 0.6,
  cloudWindSpeed: 6,
  cloudBreathing: 0.25,
  cloudMouseRadius: 170,
  cloudMouseForce: 25,

  // Each cloud = array of overlapping "puffs" for organic shape
  // puff: {ox, oy} offset from cloud center (fraction of cloud radius)
  clouds: [
    // Large cumulus bottom-right
    { cx: 0.70, cy: 0.65, r: 0.13, count: 12000, puffs: [
      {ox: 0, oy: 0, r: 1.0}, {ox: -0.6, oy: 0.1, r: 0.7}, {ox: 0.5, oy: -0.1, r: 0.8},
      {ox: -0.3, oy: -0.3, r: 0.6}, {ox: 0.3, oy: -0.25, r: 0.65}, {ox: 0.7, oy: 0.2, r: 0.5},
      {ox: -0.8, oy: -0.1, r: 0.45}, {ox: 0.1, oy: 0.3, r: 0.55},
    ]},
    // Large cumulus bottom-left  
    { cx: 0.25, cy: 0.70, r: 0.11, count: 10000, puffs: [
      {ox: 0, oy: 0, r: 1.0}, {ox: -0.5, oy: -0.15, r: 0.7}, {ox: 0.6, oy: 0.05, r: 0.65},
      {ox: 0.2, oy: -0.3, r: 0.6}, {ox: -0.3, oy: 0.2, r: 0.5}, {ox: 0.5, oy: -0.2, r: 0.4},
    ]},
    // Medium cloud top-right
    { cx: 0.82, cy: 0.30, r: 0.08, count: 6000, puffs: [
      {ox: 0, oy: 0, r: 1.0}, {ox: -0.5, oy: 0.1, r: 0.6}, {ox: 0.4, oy: -0.1, r: 0.7},
      {ox: 0.6, oy: 0.15, r: 0.4},
    ]},
    // Small cloud top-left
    { cx: 0.15, cy: 0.25, r: 0.06, count: 4000, puffs: [
      {ox: 0, oy: 0, r: 1.0}, {ox: 0.5, oy: -0.1, r: 0.6}, {ox: -0.4, oy: 0.1, r: 0.5},
    ]},
    // Wispy middle cloud
    { cx: 0.48, cy: 0.50, r: 0.10, count: 7000, puffs: [
      {ox: -0.5, oy: 0, r: 0.6}, {ox: 0, oy: 0, r: 0.7}, {ox: 0.5, oy: 0, r: 0.6},
      {ox: -0.9, oy: 0.05, r: 0.35}, {ox: 0.9, oy: -0.05, r: 0.35},
    ]},
    // Bottom horizon haze
    { cx: 0.50, cy: 0.92, r: 0.08, count: 11000, puffs: [
      {ox: -1.5, oy: 0, r: 0.7}, {ox: -0.7, oy: 0, r: 0.8}, {ox: 0, oy: 0, r: 0.9},
      {ox: 0.7, oy: 0, r: 0.8}, {ox: 1.5, oy: 0, r: 0.7},
      {ox: -1.1, oy: 0.1, r: 0.5}, {ox: 1.1, oy: -0.1, r: 0.5},
    ]},
  ],
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
window.addEventListener("resize", () => { resize(); initAll(); });

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

// ─── NOISE ───
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
function fbm(x, y, octaves) {
  let value = 0, amp = 1, freq = 1, total = 0;
  for (let i = 0; i < octaves; i++) {
    value += amp * smoothNoise(x * freq, y * freq);
    total += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return value / total;
}

// ─── CLOUD PARTICLES ───
let cloudParticles = [];

function initCloudParticles() {
  cloudParticles = [];

  for (const cloud of CFG.clouds) {
    const cx = cloud.cx * W;
    const cy = cloud.cy * H;
    const baseR = cloud.r * Math.min(W, H);

    for (let i = 0; i < cloud.count; i++) {
      // Pick a random puff to spawn in
      const puff = cloud.puffs[Math.floor(Math.random() * cloud.puffs.length)];
      const puffCx = cx + puff.ox * baseR;
      const puffCy = cy + puff.oy * baseR;
      const puffR = puff.r * baseR;

      // Sample within this puff — gaussian-ish distribution (sum of randoms)
      const angle = Math.random() * Math.PI * 2;
      // Use sqrt for uniform disk, then bias toward center for density
      const rawDist = Math.random() * 0.5 + Math.random() * 0.3 + Math.random() * 0.2;
      const dist = Math.min(rawDist, 1);
      let px = puffCx + Math.cos(angle) * dist * puffR;
      let py = puffCy + Math.sin(angle) * dist * puffR * 0.65; // flatten vertically

      // Add noise displacement for organic edges
      const nv = fbm(px * 0.004, py * 0.006, 3);
      px += nv * baseR * 0.15;
      py += nv * baseR * 0.1;

      // Density: center-heavy falloff
      const densityFalloff = 1 - dist * dist;

      // Depth layer
      const depth = Math.random();

      // Size: larger near center, smaller at edges
      const sizeT = densityFalloff * (0.5 + depth * 0.5);
      const size = CFG.cloudMinSize + sizeT * (CFG.cloudMaxSize - CFG.cloudMinSize);

      // Alpha: more opaque in center, transparent at edges
      // Also top of cloud brighter (lighting)
      const normalizedY = (py - (cy - baseR)) / (baseR * 2); // 0=top, 1=bottom
      const lightFactor = 1.0 - normalizedY * 0.25; // top 100%, bottom 75%
      const alpha = Math.min(0.7, densityFalloff * (0.15 + depth * 0.4) * lightFactor);

      // Color: slightly gray at bottom for shadow
      const gray = Math.floor(255 * (0.85 + lightFactor * 0.15));

      cloudParticles.push({
        originX: px,
        originY: py,
        x: px,
        y: py,
        depth,
        size,
        noiseOffsetX: Math.random() * 1000,
        noiseOffsetY: Math.random() * 1000,
        baseAlpha: alpha,
        r: gray, g: gray, b: gray,
      });
    }
  }
}

// ─── TEXT PARTICLES ───
let particles = [];
let time = 0;

function sampleText(text) {
  const off = document.createElement("canvas");
  off.width = W * dpr;
  off.height = H * dpr;
  const octx = off.getContext("2d");
  octx.setTransform(dpr, 0, 0, dpr, 0, 0);
  octx.fillStyle = "#000";
  octx.fillRect(0, 0, W, H);
  octx.fillStyle = "#fff";
  const lines = text.split("\n");
  const fontSize = lines.length > 1 ? CFG.fontSize : CFG.fontSize * 1.2;
  octx.font = `${CFG.fontWeight} ${fontSize}px ${CFG.fontFamily}`;
  octx.textAlign = "center";
  octx.textBaseline = "middle";
  const lineHeight = fontSize * 1.15;
  const totalHeight = lines.length * lineHeight;
  const startY = H / 2 - totalHeight / 2 + lineHeight / 2;
  lines.forEach((line, i) => {
    octx.fillText(line, W / 2, startY + i * lineHeight);
  });
  const imageData = octx.getImageData(0, 0, W * dpr, H * dpr);
  const data = imageData.data;
  const points = [];
  // Convert CSS pixel gap to device pixels so density looks the same on all screens
  const gap = Math.round(CFG.samplingGap * dpr);
  for (let y = 0; y < H * dpr; y += gap) {
    for (let x = 0; x < W * dpr; x += gap) {
      const idx = (y * W * dpr + x) * 4;
      if (data[idx] > 128) {
        const ox = (Math.random() - 0.5) * gap * 0.8;
        const oy = (Math.random() - 0.5) * gap * 0.8;
        points.push({
          originX: x / dpr + ox / dpr,
          originY: y / dpr + oy / dpr,
          x: x / dpr + ox / dpr,
          y: y / dpr + oy / dpr,
          vx: 0, vy: 0,
          depth: Math.random(),
          noiseOffsetX: Math.random() * 1000,
          noiseOffsetY: Math.random() * 1000,
          char: CFG.charSet[Math.floor(Math.random() * CFG.charSet.length)],
        });
      }
    }
  }
  return points;
}

let currentTextIndex = 0;
let textIntervalId = null;

function initTextParticles() {
  particles = sampleText(CFG.texts[0]);
  if (textIntervalId) clearInterval(textIntervalId);
  textIntervalId = setInterval(transitionToNextText, CFG.textInterval);
}

function transitionToNextText() {
  currentTextIndex = (currentTextIndex + 1) % CFG.texts.length;
  const newPoints = sampleText(CFG.texts[currentTextIndex]);
  const maxLen = Math.max(particles.length, newPoints.length);
  const merged = [];
  for (let i = 0; i < maxLen; i++) {
    if (i < particles.length && i < newPoints.length) {
      const p = particles[i];
      p.originX = newPoints[i].originX;
      p.originY = newPoints[i].originY;
      merged.push(p);
    } else if (i < newPoints.length) {
      const src = particles[Math.floor(Math.random() * particles.length)];
      const np = newPoints[i];
      np.x = src ? src.x : np.originX;
      np.y = src ? src.y : np.originY;
      np.vx = (Math.random() - 0.5) * 2;
      np.vy = (Math.random() - 0.5) * 2;
      merged.push(np);
    }
  }
  particles = merged;
}

function initAll() {
  document.fonts.ready.then(() => {
    initTextParticles();
    initCloudParticles();
  });
}
initAll();

// ─── TEXT PHYSICS ───
function updateTextParticles(dt) {
  time += dt;
  const mx = mouse.x, my = mouse.y;
  const mvx = mouse.vx, mvy = mouse.vy;
  const cr = CFG.cursorRadius, crSq = cr * cr;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const breathX = smoothNoise(p.noiseOffsetX + time * 0.3, p.noiseOffsetY) * CFG.breathing * 20;
    const breathY = smoothNoise(p.noiseOffsetX, p.noiseOffsetY + time * 0.3) * CFG.breathing * 20;
    const targetX = p.originX + breathX;
    const targetY = p.originY + breathY;

    const dx = p.x - mx, dy = p.y - my;
    const distSq = dx * dx + dy * dy;
    if (distSq < crSq && distSq > 0.01) {
      const dist = Math.sqrt(distSq);
      const t = 1 - dist / cr;
      const ndx = dx / dist, ndy = dy / dist;
      if (CFG.radial > 0) { p.vx += ndx * t * t * CFG.radial * 15; p.vy += ndy * t * t * CFG.radial * 15; }
      if (CFG.wind > 0) { p.vx += mvx * t * CFG.wind * 0.8; p.vy += mvy * t * CFG.wind * 0.8; }
      if (CFG.vortex > 0) { p.vx += -ndy * t * CFG.vortex * 5; p.vy += ndx * t * CFG.vortex * 5; }
      if (CFG.turbulence > 0) { const f = t * CFG.turbulence * 8; p.vx += (Math.random() - 0.5) * f; p.vy += (Math.random() - 0.5) * f; }
    }
    p.vx += (targetX - p.x) * CFG.spring;
    p.vy += (targetY - p.y) * CFG.spring;
    p.vx *= CFG.damping;
    p.vy *= CFG.damping;
    p.x += p.vx;
    p.y += p.vy;
  }
}

// ─── CLOUD PHYSICS ───
function updateCloudParticles(dt) {
  const mx = mouse.x, my = mouse.y;
  const cr = CFG.cloudMouseRadius, crSq = cr * cr;

  for (let i = 0; i < cloudParticles.length; i++) {
    const p = cloudParticles[i];

    // Wind drift — deeper particles move slower (parallax)
    p.originX += CFG.cloudWindSpeed * (0.3 + p.depth * 0.7) * dt;

    // Wrap
    if (p.originX > W + 60) p.originX -= W + 120;
    if (p.originX < -60) p.originX += W + 120;

    // Breathing
    const bx = smoothNoise(p.noiseOffsetX + time * 0.15, p.noiseOffsetY) * CFG.cloudBreathing * 8;
    const by = smoothNoise(p.noiseOffsetX, p.noiseOffsetY + time * 0.15) * CFG.cloudBreathing * 5;

    p.x = p.originX + bx;
    p.y = p.originY + by;

    // Mouse push
    const dx = p.x - mx, dy = p.y - my;
    const distSq = dx * dx + dy * dy;
    if (distSq < crSq && distSq > 0.01) {
      const dist = Math.sqrt(distSq);
      const t = 1 - dist / cr;
      p.x += (dx / dist) * t * t * CFG.cloudMouseForce;
      p.y += (dy / dist) * t * t * CFG.cloudMouseForce;
    }
  }
}

// ─── RENDER ───
function renderSky() {
  const [r1, g1, b1] = CFG.skyTop;
  const [r2, g2, b2] = CFG.skyBottom;
  const grd = ctx.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, `rgb(${r1},${g1},${b1})`);
  grd.addColorStop(1, `rgb(${r2},${g2},${b2})`);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);
}

function renderClouds() {
  for (let i = 0; i < cloudParticles.length; i++) {
    const p = cloudParticles[i];
    const ds = (1 - CFG.cloudDepthRange) + p.depth * CFG.cloudDepthRange;
    const size = p.size * ds;
    ctx.globalAlpha = p.baseAlpha * ds;
    ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function renderText() {
  const [r, g, b] = CFG.particleColor;
  const mx = mouse.x, my = mouse.y;
  const cr = CFG.cursorRadius, crSq = cr * cr;

  if (CFG.renderMode === "dot") {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const ds = (1 - CFG.depthRange) + p.depth * CFG.depthRange;
      let size = CFG.particleSize * ds;
      const alpha = 0.3 + p.depth * 0.7;

      const cdx = p.x - mx, cdy = p.y - my;
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
  } else if (CFG.renderMode === "char") {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const ds = (1 - CFG.depthRange) + p.depth * CFG.depthRange;
      const alpha = 0.3 + p.depth * 0.7;
      const fontSize = CFG.particleSize * 5 * ds;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.font = `${fontSize}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.char, p.x, p.y);
    }
  }
  ctx.globalAlpha = 1;
}

// ─── LOOP ───
let lastTime = performance.now();
function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  updateTextParticles(dt);
  updateCloudParticles(dt);

  renderSky();
  renderClouds();
  renderText();

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ─── MODE SWITCH (press M) ───
document.addEventListener("keydown", e => {
  if (e.key === "m" || e.key === "M") {
    CFG.renderMode = CFG.renderMode === "dot" ? "char" : "dot";
  }
});
