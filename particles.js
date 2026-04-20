// ─── CONFIG ───
const CFG = {
  // Text
  text: "Jesse\nLai",
  fontFamily: "Noto Serif SC",
  fontSize: 180,
  fontWeight: "900",

  // Particles
  particleSize: 0.8,      // base dot radius — tiny dust
  samplingGap: 2,         // pixel gap when sampling text (lower = more particles)
  particleColor: [255, 255, 255],

  // Render mode: "dot" | "char"
  renderMode: "dot",
  charSet: "01", // characters to use in char mode

  // Physics
  friction: 0.88,
  returnSpeed: 0.08,      // how fast particles return to origin
  mouseRadius: 100,       // influence radius
  mouseForce: 8,          // push strength

  // Multiple forces for organic feel
  forces: [
    { radius: 100, strength: 12, type: "push" },
    { radius: 60,  strength: 5,  type: "turbulence" },
    { radius: 150, strength: 2,  type: "push" },  // gentle outer push
  ],

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
let mouse = { x: -9999, y: -9999, vx: 0, vy: 0, down: false };
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
canvas.addEventListener("mousedown", () => { mouse.down = true; });
canvas.addEventListener("mouseup", () => { mouse.down = false; });
canvas.addEventListener("mouseleave", () => { mouse.x = -9999; mouse.y = -9999; });

// Touch
canvas.addEventListener("touchmove", e => {
  e.preventDefault();
  const t = e.touches[0];
  mouse.vx = t.clientX - mouse.x;
  mouse.vy = t.clientY - mouse.y;
  mouse.x = t.clientX;
  mouse.y = t.clientY;
}, { passive: false });
canvas.addEventListener("touchend", () => { mouse.x = -9999; mouse.y = -9999; });

// ─── PARTICLES ───
let particles = [];

function sampleText() {
  // Render text to offscreen canvas, sample pixel positions
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

  // Sample pixels
  const imageData = octx.getImageData(0, 0, W * dpr, H * dpr);
  const data = imageData.data;
  const points = [];
  const gap = CFG.samplingGap;

  for (let y = 0; y < H * dpr; y += gap) {
    for (let x = 0; x < W * dpr; x += gap) {
      const i = (y * W * dpr + x) * 4;
      if (data[i] > 128) {
        points.push({
          originX: x / dpr,
          originY: y / dpr,
          x: x / dpr,
          y: y / dpr,
          vx: 0,
          vy: 0,
          char: CFG.charSet[Math.floor(Math.random() * CFG.charSet.length)],
        });
      }
    }
  }
  return points;
}

function initParticles() {
  // Wait for font to load
  document.fonts.ready.then(() => {
    particles = sampleText();
  });
}

initParticles();

// ─── PHYSICS ───
function updateParticles() {
  const mx = mouse.x;
  const my = mouse.y;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];

    // Mouse forces (multiple for organic feel)
    for (const f of CFG.forces) {
      const dx = p.x - mx;
      const dy = p.y - my;
      const distSq = dx * dx + dy * dy;
      const r = f.radius;

      if (distSq < r * r) {
        const dist = Math.sqrt(distSq) || 1;
        const force = (1 - dist / r) * f.strength;

        if (f.type === "push") {
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        } else if (f.type === "turbulence") {
          // Perpendicular + random for organic scatter
          const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.5;
          p.vx += Math.cos(angle) * force;
          p.vy += Math.sin(angle) * force;
        }
      }
    }

    // Return to origin (spring)
    p.vx += (p.originX - p.x) * CFG.returnSpeed;
    p.vy += (p.originY - p.y) * CFG.returnSpeed;

    // Friction
    p.vx *= CFG.friction;
    p.vy *= CFG.friction;

    // Update position
    p.x += p.vx;
    p.y += p.vy;
  }
}

// ─── RENDER ───
function render() {
  ctx.fillStyle = CFG.bgColor;
  ctx.fillRect(0, 0, W, H);

  const [r, g, b] = CFG.particleColor;

  if (CFG.renderMode === "dot") {
    // Batch draw dots
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.beginPath();
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const dx = p.x - p.originX;
      const dy = p.y - p.originY;
      const displacement = Math.sqrt(dx * dx + dy * dy);
      // Size grows slightly when displaced
      const size = CFG.particleSize + Math.min(displacement * 0.01, 0.6);
      ctx.moveTo(p.x + size, p.y);
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
    }
    ctx.fill();
  } else if (CFG.renderMode === "char") {
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.font = `${CFG.particleSize * 4}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.fillText(p.char, p.x, p.y);
    }
  }
}

// ─── LOOP ───
function loop() {
  updateParticles();
  render();
  requestAnimationFrame(loop);
}
loop();

// ─── MODE SWITCH (press M) ───
document.addEventListener("keydown", e => {
  if (e.key === "m" || e.key === "M") {
    CFG.renderMode = CFG.renderMode === "dot" ? "char" : "dot";
  }
});
