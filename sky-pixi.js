(async () => {
  // ─── CONFIG ───
  const CFG = {
    texts: ["ʕ´• ᴥ•̥`ʔ", "(≧ω≦)", ",,Ծ‸Ծ,,"],
    textInterval: 3000,
    fontFamily: "-apple-system, 'PingFang SC', 'Helvetica Neue', sans-serif",
    fontSize: 180,
    fontWeight: "700",

    // Text particles
    samplingGap: 2,
    particleSize: 1.0,
    depthRange: 0.6,

    // Text forces
    spring: 0.015,
    damping: 0.73,
    breathing: 0.15,
    radial: 1.0,
    wind: 0.8,
    vortex: 1.0,
    turbulence: 0.3,
    cursorRadius: 85,
    dotSizeBoost: 3.0,

    // Sky
    skyTop: 0x1e5ac6,
    skyBottom: 0x50a0eb,

    // Clouds — pure dot particles, no gradients
    cloudCount: 60000,
    cloudMinSize: 0.4,
    cloudMaxSize: 2.5,
    cloudWindSpeed: 6,
    cloudBreathing: 0.25,
    cloudMouseRadius: 170,
    cloudMouseForce: 25,

    // Cloud shapes: puffs compose each cloud
    clouds: [
      { cx: 0.65, cy: 0.62, r: 0.12, count: 14000, puffs: [
        {ox: 0, oy: 0, r: 1.0}, {ox: -0.6, oy: 0.1, r: 0.7}, {ox: 0.5, oy: -0.1, r: 0.8},
        {ox: -0.3, oy: -0.3, r: 0.6}, {ox: 0.3, oy: -0.25, r: 0.65}, {ox: 0.7, oy: 0.2, r: 0.5},
        {ox: -0.8, oy: -0.05, r: 0.45}, {ox: 0.1, oy: 0.25, r: 0.55},
      ]},
      { cx: 0.22, cy: 0.68, r: 0.10, count: 11000, puffs: [
        {ox: 0, oy: 0, r: 1.0}, {ox: -0.5, oy: -0.15, r: 0.7}, {ox: 0.6, oy: 0.05, r: 0.65},
        {ox: 0.2, oy: -0.3, r: 0.6}, {ox: -0.3, oy: 0.2, r: 0.5}, {ox: 0.5, oy: -0.2, r: 0.4},
      ]},
      { cx: 0.82, cy: 0.28, r: 0.07, count: 7000, puffs: [
        {ox: 0, oy: 0, r: 1.0}, {ox: -0.5, oy: 0.1, r: 0.6}, {ox: 0.4, oy: -0.1, r: 0.7},
        {ox: 0.6, oy: 0.15, r: 0.4},
      ]},
      { cx: 0.14, cy: 0.24, r: 0.05, count: 5000, puffs: [
        {ox: 0, oy: 0, r: 1.0}, {ox: 0.5, oy: -0.1, r: 0.6}, {ox: -0.4, oy: 0.1, r: 0.5},
      ]},
      { cx: 0.48, cy: 0.48, r: 0.09, count: 8000, puffs: [
        {ox: -0.5, oy: 0, r: 0.6}, {ox: 0, oy: 0, r: 0.7}, {ox: 0.5, oy: 0, r: 0.6},
        {ox: -0.9, oy: 0.05, r: 0.35}, {ox: 0.9, oy: -0.05, r: 0.35},
      ]},
      { cx: 0.50, cy: 0.90, r: 0.07, count: 15000, puffs: [
        {ox: -1.8, oy: 0, r: 0.6}, {ox: -1.0, oy: 0, r: 0.7}, {ox: -0.3, oy: 0, r: 0.8},
        {ox: 0.3, oy: 0, r: 0.8}, {ox: 1.0, oy: 0, r: 0.7}, {ox: 1.8, oy: 0, r: 0.6},
      ]},
    ],
  };

  const W = window.innerWidth;
  const H = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;

  // ─── PIXI APP ───
  const app = new PIXI.Application();
  await app.init({
    width: W,
    height: H,
    resolution: dpr,
    autoDensity: true,
    backgroundColor: CFG.skyTop,
    antialias: false,
  });
  document.body.appendChild(app.canvas);

  // ─── SKY GRADIENT (strip-based, no radial) ───
  const skyGfx = new PIXI.Graphics();
  const steps = 64;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const r1 = (CFG.skyTop >> 16) & 0xff, g1 = (CFG.skyTop >> 8) & 0xff, b1 = CFG.skyTop & 0xff;
    const r2 = (CFG.skyBottom >> 16) & 0xff, g2 = (CFG.skyBottom >> 8) & 0xff, b2 = CFG.skyBottom & 0xff;
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    skyGfx.rect(0, t * H, W, H / steps + 1);
    skyGfx.fill((r << 16) | (g << 8) | b);
  }
  app.stage.addChild(skyGfx);

  // ─── DOT TEXTURE (solid circle, no gradient) ───
  const dotCanvas = document.createElement("canvas");
  dotCanvas.width = 8;
  dotCanvas.height = 8;
  const dctx = dotCanvas.getContext("2d");
  dctx.fillStyle = "white";
  dctx.beginPath();
  dctx.arc(4, 4, 4, 0, Math.PI * 2);
  dctx.fill();
  const dotTexture = PIXI.Texture.from(dotCanvas);

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
  function fbm(x, y, oct) {
    let v = 0, a = 1, f = 1, tot = 0;
    for (let i = 0; i < oct; i++) { v += a * smoothNoise(x * f, y * f); tot += a; a *= 0.5; f *= 2; }
    return v / tot;
  }

  // ─── MOUSE ───
  const mouse = { x: -9999, y: -9999, vx: 0, vy: 0 };
  const prevMouse = { x: -9999, y: -9999 };
  const cursorEl = document.getElementById("cursor");

  window.addEventListener("mousemove", e => {
    mouse.vx = e.clientX - prevMouse.x;
    mouse.vy = e.clientY - prevMouse.y;
    prevMouse.x = mouse.x; prevMouse.y = mouse.y;
    mouse.x = e.clientX; mouse.y = e.clientY;
    cursorEl.style.left = e.clientX + "px"; cursorEl.style.top = e.clientY + "px";
  });
  window.addEventListener("mouseleave", () => { mouse.x = -9999; });
  window.addEventListener("touchmove", e => {
    e.preventDefault();
    const t = e.touches[0];
    mouse.vx = t.clientX - mouse.x; mouse.vy = t.clientY - mouse.y;
    mouse.x = t.clientX; mouse.y = t.clientY;
  }, { passive: false });
  window.addEventListener("touchend", () => { mouse.x = -9999; });

  // ─── CLOUD PARTICLES ───
  const cloudContainer = new PIXI.Container();
  app.stage.addChild(cloudContainer);

  const cloudData = []; // physics data
  const cloudSprites = []; // pixi sprites

  for (const cloud of CFG.clouds) {
    const cx = cloud.cx * W;
    const cy = cloud.cy * H;
    const baseR = cloud.r * Math.min(W, H);

    for (let i = 0; i < cloud.count; i++) {
      const puff = cloud.puffs[Math.floor(Math.random() * cloud.puffs.length)];
      const pcx = cx + puff.ox * baseR;
      const pcy = cy + puff.oy * baseR;
      const pr = puff.r * baseR;

      const angle = Math.random() * Math.PI * 2;
      const rawDist = Math.random() * 0.5 + Math.random() * 0.3 + Math.random() * 0.2;
      const dist = Math.min(rawDist, 1);
      let px = pcx + Math.cos(angle) * dist * pr;
      let py = pcy + Math.sin(angle) * dist * pr * 0.6;

      // Noise displacement
      const nv = fbm(px * 0.004, py * 0.006, 3);
      px += nv * baseR * 0.12;
      py += nv * baseR * 0.08;

      const depth = Math.random();
      const densityFalloff = 1 - dist * dist;
      const sizeT = densityFalloff * (0.4 + depth * 0.6);
      const size = CFG.cloudMinSize + sizeT * (CFG.cloudMaxSize - CFG.cloudMinSize);

      // Lighting: top brighter, bottom slightly darker
      const normalizedY = (py - (cy - baseR)) / (baseR * 2);
      const lightFactor = 1.0 - normalizedY * 0.2;
      const alpha = Math.min(0.65, densityFalloff * (0.1 + depth * 0.35) * lightFactor);

      const sprite = new PIXI.Sprite(dotTexture);
      sprite.anchor.set(0.5);
      sprite.x = px;
      sprite.y = py;
      sprite.scale.set(size / 4); // dotTexture is 8px, so /4 = diameter in px
      sprite.alpha = alpha;
      cloudContainer.addChild(sprite);
      cloudSprites.push(sprite);

      cloudData.push({
        originX: px,
        originY: py,
        depth,
        noiseOffsetX: Math.random() * 1000,
        noiseOffsetY: Math.random() * 1000,
      });
    }
  }

  // ─── TEXT PARTICLES ───
  const textContainer = new PIXI.Container();
  app.stage.addChild(textContainer);

  let textPoints = [];
  let textSprites = [];
  let time = 0;

  function sampleText(text) {
    const off = document.createElement("canvas");
    off.width = W * dpr; off.height = H * dpr;
    const octx = off.getContext("2d");
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    octx.fillStyle = "#000"; octx.fillRect(0, 0, W, H);
    octx.fillStyle = "#fff";
    const lines = text.split("\n");
    const fontSize = lines.length > 1 ? CFG.fontSize : CFG.fontSize * 1.2;
    octx.font = `${CFG.fontWeight} ${fontSize}px ${CFG.fontFamily}`;
    octx.textAlign = "center"; octx.textBaseline = "middle";
    const lh = fontSize * 1.15;
    const th = lines.length * lh;
    const sy = H / 2 - th / 2 + lh / 2;
    lines.forEach((l, i) => octx.fillText(l, W / 2, sy + i * lh));
    const img = octx.getImageData(0, 0, W * dpr, H * dpr);
    const d = img.data, pts = [], gap = Math.round(CFG.samplingGap * dpr);
    for (let y = 0; y < H * dpr; y += gap) {
      for (let x = 0; x < W * dpr; x += gap) {
        if (d[(y * W * dpr + x) * 4] > 128) {
          const ox = (Math.random() - 0.5) * gap * 0.8;
          const oy = (Math.random() - 0.5) * gap * 0.8;
          pts.push({
            originX: x / dpr + ox / dpr, originY: y / dpr + oy / dpr,
            x: x / dpr + ox / dpr, y: y / dpr + oy / dpr,
            vx: 0, vy: 0, depth: Math.random(),
            noiseOffsetX: Math.random() * 1000, noiseOffsetY: Math.random() * 1000,
          });
        }
      }
    }
    return pts;
  }

  function buildTextSprites(pts) {
    textContainer.removeChildren();
    const sprites = [];
    for (const p of pts) {
      const s = new PIXI.Sprite(dotTexture);
      s.anchor.set(0.5);
      s.x = p.x; s.y = p.y;
      const ds = (1 - CFG.depthRange) + p.depth * CFG.depthRange;
      s.scale.set(CFG.particleSize * ds / 4);
      s.alpha = 0.3 + p.depth * 0.7;
      s.baseScale = CFG.particleSize * ds / 4;
      textContainer.addChild(s);
      sprites.push(s);
    }
    return sprites;
  }

  let currentTextIndex = 0;
  textPoints = sampleText(CFG.texts[0]);
  textSprites = buildTextSprites(textPoints);

  setInterval(() => {
    currentTextIndex = (currentTextIndex + 1) % CFG.texts.length;
    const np = sampleText(CFG.texts[currentTextIndex]);
    const maxLen = Math.max(textPoints.length, np.length);
    const merged = [];
    for (let i = 0; i < maxLen; i++) {
      if (i < textPoints.length && i < np.length) {
        textPoints[i].originX = np[i].originX;
        textPoints[i].originY = np[i].originY;
        merged.push(textPoints[i]);
      } else if (i < np.length) {
        const src = textPoints[Math.floor(Math.random() * textPoints.length)];
        np[i].x = src ? src.x : np[i].originX;
        np[i].y = src ? src.y : np[i].originY;
        np[i].vx = (Math.random() - 0.5) * 2;
        np[i].vy = (Math.random() - 0.5) * 2;
        merged.push(np[i]);
      }
    }
    textPoints = merged;
    textSprites = buildTextSprites(textPoints);
  }, CFG.textInterval);

  // ─── GAME LOOP ───
  app.ticker.add((ticker) => {
    const dt = Math.min(ticker.deltaMS / 1000, 0.05);
    time += dt;
    const mx = mouse.x, my = mouse.y, mvx = mouse.vx, mvy = mouse.vy;
    const cr = CFG.cursorRadius, crSq = cr * cr;

    // Text particles
    for (let i = 0; i < textPoints.length; i++) {
      const p = textPoints[i];
      if (!textSprites[i]) continue;
      const bx = smoothNoise(p.noiseOffsetX + time * 0.3, p.noiseOffsetY) * CFG.breathing * 20;
      const by = smoothNoise(p.noiseOffsetX, p.noiseOffsetY + time * 0.3) * CFG.breathing * 20;
      const tx = p.originX + bx, ty = p.originY + by;
      const dx = p.x - mx, dy = p.y - my, dSq = dx * dx + dy * dy;
      if (dSq < crSq && dSq > 0.01) {
        const d = Math.sqrt(dSq), t = 1 - d / cr, nx = dx / d, ny = dy / d;
        p.vx += nx * t * t * CFG.radial * 15; p.vy += ny * t * t * CFG.radial * 15;
        p.vx += mvx * t * CFG.wind * 0.8; p.vy += mvy * t * CFG.wind * 0.8;
        p.vx += -ny * t * CFG.vortex * 5; p.vy += nx * t * CFG.vortex * 5;
        const f = t * CFG.turbulence * 8;
        p.vx += (Math.random() - 0.5) * f; p.vy += (Math.random() - 0.5) * f;
      }
      p.vx += (tx - p.x) * CFG.spring; p.vy += (ty - p.y) * CFG.spring;
      p.vx *= CFG.damping; p.vy *= CFG.damping;
      p.x += p.vx; p.y += p.vy;
      const s = textSprites[i];
      s.x = p.x; s.y = p.y;
      const cdSq = (p.x - mx) ** 2 + (p.y - my) ** 2;
      if (cdSq < crSq) {
        const t = 1 - Math.sqrt(cdSq) / cr;
        s.scale.set(s.baseScale * (1 + t * (CFG.dotSizeBoost - 1)));
      } else {
        s.scale.set(s.baseScale);
      }
    }

    // Cloud particles
    const cmr = CFG.cloudMouseRadius, cmrSq = cmr * cmr;
    for (let i = 0; i < cloudData.length; i++) {
      const cd = cloudData[i];
      const cs = cloudSprites[i];
      cd.originX += CFG.cloudWindSpeed * (0.3 + cd.depth * 0.7) * dt;
      if (cd.originX > W + 80) cd.originX -= W + 160;
      if (cd.originX < -80) cd.originX += W + 160;
      const bx = smoothNoise(cd.noiseOffsetX + time * 0.15, cd.noiseOffsetY) * CFG.cloudBreathing * 8;
      const by = smoothNoise(cd.noiseOffsetX, cd.noiseOffsetY + time * 0.15) * CFG.cloudBreathing * 5;
      let x = cd.originX + bx, y = cd.originY + by;
      const dx = x - mx, dy = y - my, dSq = dx * dx + dy * dy;
      if (dSq < cmrSq && dSq > 0.01) {
        const d = Math.sqrt(dSq), t = 1 - d / cmr;
        x += (dx / d) * t * t * CFG.cloudMouseForce;
        y += (dy / d) * t * t * CFG.cloudMouseForce;
      }
      cs.x = x; cs.y = y;
    }
  });

  window.addEventListener("resize", () => location.reload());
})();
