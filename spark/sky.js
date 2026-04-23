// ─── CONFIG ───
const CFG = {
  // Text rotation (foreground kaomoji)
  texts: ["ʕ´• ᴥ•̥`ʔ", "(≧ω≦)", ",,Ծ‸Ծ,,"],
  textInterval: 3000,
  fontFamily: "-apple-system, 'PingFang SC', 'Helvetica Neue', sans-serif",
  fontSize: 180,
  fontWeight: "700",

  // Text particles
  textSamplingGap: 5,
  textParticleSize: 1.0,
  textParticleColor: [255, 255, 255],

  // Text physics
  spring: 0.015,
  damping: 0.73,
  breathing: 0.15,

  // Mouse interaction
  cursorRadius: 85,
  dotSizeBoost: 3.0,
  radial: 1.0,
  wind: 0.8,
  vortex: 1.0,
  turbulence: 0.3,

  // Depth for text particles
  depthRange: 0.6,

  // ─── SKY & CLOUDS ───
  // Background gradient
  skyTop: [30, 90, 200],      // deep blue
  skyBottom: [80, 160, 235],   // lighter blue

  // Cloud particles
  cloudCount: 25000,
  cloudParticleSize: 1.2,
  cloudColor: [255, 255, 255],

  // Cloud shapes — defined as ellipses {cx, cy (fraction of screen), rx, ry, density}
  clouds: [
    // Large cloud bottom-right
    { cx: 0.72, cy: 0.7, rx: 0.22, ry: 0.15, density: 1.0 },
    // Large cloud bottom-left
    { cx: 0.25, cy: 0.75, rx: 0.18, ry: 0.12, density: 0.9 },
    // Medium cloud top-right
    { cx: 0.85, cy: 0.35, rx: 0.12, ry: 0.08, density: 0.7 },
    // Small cloud top-left
    { cx: 0.15, cy: 0.3, rx: 0.1, ry: 0.06, density: 0.6 },
    // Wispy cloud middle
    { cx: 0.5, cy: 0.55, rx: 0.25, ry: 0.08, density: 0.5 },
    // Bottom band of clouds
    { cx: 0.5, cy: 0.88, rx: 0.5, ry: 0.1, density: 0.8 },
  ],

  // Cloud movement
  cloudWindSpeed: 0.15,  // pixels per frame
  cloudBreathing: 0.3,

  // Cloud depth
  cloudDepthRange: 0.5,
};

// ─── CANVAS SETUP ───
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
const cursorEl = document.getElementById("cursor");
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
window.addEventListener("resize", () => { resize(); initTextParticles(); initCloudParticles(); });

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
  cursorEl.style.left = e.clientX + "px";
  cursorEl.style.top = e.clientY + "px";
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

// fBM noise for cloud density
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
  const clouds = CFG.clouds;

  // Distribute particles across clouds proportionally to density
  const totalDensity = clouds.reduce((sum, c) => sum + c.density * c.rx * c.ry, 0);

  for (const cloud of clouds) {
    const count = Math.floor(CFG.cloudCount * (cloud.density * cloud.rx * cloud.ry) / totalDensity);
    const cx = cloud.cx * W;
    const cy = cloud.cy * H;
    const rx = cloud.rx * W;
    const ry = cloud.ry * H;

    for (let i = 0; i < count; i++) {
      // Sample within ellipse using rejection sampling + noise-based density
      let px, py, attempts = 0;
      while (attempts < 10) {
        // Random point in ellipse bounding box
        const ax = (Math.random() - 0.5) * 2;
        const ay = (Math.random() - 0.5) * 2;
        // Check if inside ellipse
        if (ax * ax + ay * ay <= 1) {
          px = cx + ax * rx;
          py = cy + ay * ry;

          // Use noise to create lumpy cloud shape
          const noiseVal = fbm(px * 0.003, py * 0.005, 4);
          // Distance from center (0 at center, 1 at edge)
          const dist = Math.sqrt(ax * ax + ay * ay);
          // Density falls off toward edges, modulated by noise
          const density = Math.max(0, (1 - dist * dist) * (0.5 + noiseVal * 0.5));

          if (Math.random() < density) {
            break;
          }
        }
        attempts++;
      }

      if (attempts >= 10) continue;

      const depth = Math.random();
      cloudParticles.push({
        originX: px,
        originY: py,
        x: px,
        y: py,
        depth: depth,
        noiseOffsetX: Math.random() * 1000,
        noiseOffsetY: Math.random() * 1000,
        // Opacity: denser in cloud center, sparser at edges
        baseAlpha: 0.15 + depth * 0.5,
      });
    }
  }
}

// ─── TEXT PARTICLES ───
let textParticles = [];
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
  const gap = CFG.textSamplingGap;
  for (let y = 0; y < H * dpr; y += gap) {
    for (let x = 0; x < W * dpr; x += gap) {
      const idx = (y * W * dpr + x) * 4;
      if (data[idx] > 128) {
        const ox = (Math.random() - 0.5) * gap * 0.8;
        const oy = (Math.random() - 0.5) * gap * 0.8;
        const px = x / dpr + ox / dpr;
        const py = y / dpr + oy / dpr;
        const depth = Math.random();
        points.push({
          originX: px, originY: py,
          x: px, y: py,
          vx: 0, vy: 0,
          depth: depth,
          noiseOffsetX: Math.random() * 1000,
          noiseOffsetY: Math.random() * 1000,
        });
      }
    }
  }
  return points;
}

let currentTextIndex = 0;

function initTextParticles() {
  document.fonts.ready.then(() => {
    textParticles = sampleText(CFG.texts[0]);
    setInterval(transitionToNextText, CFG.textInterval);
  });
}

function transitionToNextText() {
  currentTextIndex = (currentTextIndex + 1) % CFG.texts.length;
  const newPoints = sampleText(CFG.texts[currentTextIndex]);
  const maxLen = Math.max(textParticles.length, newPoints.length);
  const merged = [];
  for (let i = 0; i < maxLen; i++) {
    if (i < textParticles.length && i < newPoints.length) {
      const p = textParticles[i];
      p.originX = newPoints[i].originX;
      p.originY = newPoints[i].originY;
      merged.push(p);
    } else if (i < newPoints.length) {
      const src = textParticles[Math.floor(Math.random() * textParticles.length)];
      const np = newPoints[i];
      np.x = src ? src.x : np.originX;
      np.y = src ? src.y : np.originY;
      np.vx = (Math.random() - 0.5) * 2;
      np.vy = (Math.random() - 0.5) * 2;
      merged.push(np);
    }
  }
  textParticles = merged;
}

initTextParticles();
initCloudParticles();

// ─── PHYSICS (text particles) ───
function updateTextParticles(dt) {
  time += dt;
  const mx = mouse.x, my = mouse.y;
  const mvx = mouse.vx, mvy = mouse.vy;
  const cr = CFG.cursorRadius, crSq = cr * cr;

  for (let i = 0; i < textParticles.length; i++) {
    const p = textParticles[i];
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
      if (CFG.radial > 0) { const f = t * t * CFG.radial * 15; p.vx += ndx * f; p.vy += ndy * f; }
      if (CFG.wind > 0) { const f = t * CFG.wind * 0.8; p.vx += mvx * f; p.vy += mvy * f; }
      if (CFG.vortex > 0) { const f = t * CFG.vortex * 5; p.vx += -ndy * f; p.vy += ndx * f; }
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

// ─── PHYSICS (cloud particles — gentle drift + mouse interaction) ───
function updateCloudParticles(dt) {
  const mx = mouse.x, my = mouse.y;
  const cr = CFG.cursorRadius * 2; // larger influence radius for clouds
  const crSq = cr * cr;

  for (let i = 0; i < cloudParticles.length; i++) {
    const p = cloudParticles[i];

    // Gentle wind drift
    const windOffset = CFG.cloudWindSpeed * (0.5 + p.depth * 0.5);
    p.originX += windOffset * dt;

    // Wrap around screen
    if (p.originX > W + 50) p.originX -= W + 100;
    if (p.originX < -50) p.originX += W + 100;

    // Breathing
    const breathX = smoothNoise(p.noiseOffsetX + time * 0.15, p.noiseOffsetY) * CFG.cloudBreathing * 8;
    const breathY = smoothNoise(p.noiseOffsetX, p.noiseOffsetY + time * 0.15) * CFG.cloudBreathing * 5;

    p.x = p.originX + breathX;
    p.y = p.originY + breathY;

    // Mouse pushes clouds apart gently
    const dx = p.x - mx, dy = p.y - my;
    const distSq = dx * dx + dy * dy;
    if (distSq < crSq && distSq > 0.01) {
      const dist = Math.sqrt(distSq);
      const t = 1 - dist / cr;
      const ndx = dx / dist, ndy = dy / dist;
      p.x += ndx * t * t * 20;
      p.y += ndy * t * t * 20;
    }
  }
}

// ─── RENDER ───
function renderSkyGradient() {
  const [r1, g1, b1] = CFG.skyTop;
  const [r2, g2, b2] = CFG.skyBottom;
  const grd = ctx.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, `rgb(${r1},${g1},${b1})`);
  grd.addColorStop(1, `rgb(${r2},${g2},${b2})`);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);
}

function renderCloudParticles() {
  const [r, g, b] = CFG.cloudColor;
  for (let i = 0; i < cloudParticles.length; i++) {
    const p = cloudParticles[i];
    const depthScale = (1 - CFG.cloudDepthRange) + p.depth * CFG.cloudDepthRange;
    const size = CFG.cloudParticleSize * depthScale;
    const alpha = p.baseAlpha * depthScale;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function renderTextParticles() {
  const [r, g, b] = CFG.textParticleColor;
  const mx = mouse.x, my = mouse.y;
  const cr = CFG.cursorRadius, crSq = cr * cr;

  for (let i = 0; i < textParticles.length; i++) {
    const p = textParticles[i];
    const depthScale = (1 - CFG.depthRange) + p.depth * CFG.depthRange;
    let size = CFG.textParticleSize * depthScale;
    const alpha = 0.3 + p.depth * 0.7;

    // Size boost near cursor
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
  ctx.globalAlpha = 1;
}

// ─── LOOP ───
let lastTime = performance.now();
function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  updateTextParticles(dt);
  updateCloudParticles(dt);

  renderSkyGradient();
  renderCloudParticles();   // clouds behind text
  renderTextParticles();    // text on top

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ─── MODE SWITCH (press M) ───
document.addEventListener("keydown", e => {
  if (e.key === "m" || e.key === "M") {
    // Could toggle render modes in future
  }
});
