(async () => {
  // ─── CONFIG ───
  const CFG = {
    texts: ["ʕ´• ᴥ•̥`ʔ", "(≧ω≦)", ",,Ծ‸Ծ,,"],
    textInterval: 3000,
    fontFamily: "-apple-system, 'PingFang SC', 'Helvetica Neue', sans-serif",
    fontSize: 180,
    fontWeight: "700",

    // Text particles
    samplingGap: 2,     // CSS pixels
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

    // Clouds
    cloudPuffs: [
      // Big cloud bottom-right: multiple overlapping sprites
      { x: 0.65, y: 0.62, scale: 2.2, alpha: 0.85 },
      { x: 0.72, y: 0.65, scale: 1.8, alpha: 0.8 },
      { x: 0.58, y: 0.64, scale: 1.6, alpha: 0.75 },
      { x: 0.68, y: 0.58, scale: 1.4, alpha: 0.7 },
      { x: 0.75, y: 0.60, scale: 1.5, alpha: 0.65 },
      { x: 0.62, y: 0.68, scale: 1.3, alpha: 0.6 },

      // Big cloud bottom-left
      { x: 0.22, y: 0.68, scale: 2.0, alpha: 0.8 },
      { x: 0.28, y: 0.70, scale: 1.6, alpha: 0.75 },
      { x: 0.18, y: 0.72, scale: 1.4, alpha: 0.7 },
      { x: 0.25, y: 0.64, scale: 1.2, alpha: 0.65 },
      { x: 0.30, y: 0.66, scale: 1.3, alpha: 0.6 },

      // Medium cloud top-right
      { x: 0.82, y: 0.28, scale: 1.4, alpha: 0.7 },
      { x: 0.87, y: 0.30, scale: 1.1, alpha: 0.6 },
      { x: 0.79, y: 0.26, scale: 1.0, alpha: 0.55 },

      // Small cloud top-left
      { x: 0.14, y: 0.24, scale: 1.0, alpha: 0.6 },
      { x: 0.18, y: 0.22, scale: 0.8, alpha: 0.5 },

      // Wispy middle
      { x: 0.45, y: 0.48, scale: 1.5, alpha: 0.5 },
      { x: 0.52, y: 0.46, scale: 1.2, alpha: 0.45 },
      { x: 0.40, y: 0.50, scale: 1.0, alpha: 0.4 },
      { x: 0.56, y: 0.49, scale: 0.9, alpha: 0.35 },

      // Bottom horizon haze
      { x: 0.30, y: 0.90, scale: 2.5, alpha: 0.5 },
      { x: 0.50, y: 0.92, scale: 2.8, alpha: 0.55 },
      { x: 0.70, y: 0.90, scale: 2.5, alpha: 0.5 },
      { x: 0.15, y: 0.93, scale: 2.0, alpha: 0.4 },
      { x: 0.85, y: 0.91, scale: 2.0, alpha: 0.4 },
    ],
    cloudWindSpeed: 5, // px/s
    cloudMouseRadius: 200,
    cloudMouseForce: 30,

    // Cloud particles (small dots within cloud regions)
    cloudDotCount: 15000,
    cloudDotSize: 1.2,
    cloudDotAlpha: 0.4,
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
    antialias: true,
  });
  document.body.appendChild(app.canvas);

  // ─── SKY GRADIENT ───
  const skyGfx = new PIXI.Graphics();
  // Draw gradient with horizontal strips
  const steps = 64;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const r1 = (CFG.skyTop >> 16) & 0xff, g1 = (CFG.skyTop >> 8) & 0xff, b1 = CFG.skyTop & 0xff;
    const r2 = (CFG.skyBottom >> 16) & 0xff, g2 = (CFG.skyBottom >> 8) & 0xff, b2 = CFG.skyBottom & 0xff;
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    const color = (r << 16) | (g << 8) | b;
    const stripH = H / steps + 1;
    skyGfx.rect(0, t * H, W, stripH);
    skyGfx.fill(color);
  }
  app.stage.addChild(skyGfx);

  // ─── CLOUD SPRITE TEXTURE ───
  // Generate a soft circular cloud puff texture
  const cloudTexSize = 256;
  const cloudCanvas = document.createElement("canvas");
  cloudCanvas.width = cloudTexSize;
  cloudCanvas.height = cloudTexSize;
  const cctx = cloudCanvas.getContext("2d");
  const gradient = cctx.createRadialGradient(
    cloudTexSize / 2, cloudTexSize / 2, 0,
    cloudTexSize / 2, cloudTexSize / 2, cloudTexSize / 2
  );
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.3, "rgba(255,255,255,0.8)");
  gradient.addColorStop(0.6, "rgba(255,255,255,0.3)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  cctx.fillStyle = gradient;
  cctx.fillRect(0, 0, cloudTexSize, cloudTexSize);
  const cloudTexture = PIXI.Texture.from(cloudCanvas);

  // ─── CLOUD PUFF SPRITES ───
  const cloudContainer = new PIXI.Container();
  app.stage.addChild(cloudContainer);

  const cloudSprites = [];
  for (const puff of CFG.cloudPuffs) {
    const sprite = new PIXI.Sprite(cloudTexture);
    sprite.anchor.set(0.5);
    sprite.originX = puff.x * W;
    sprite.originY = puff.y * H;
    sprite.x = sprite.originX;
    sprite.y = sprite.originY;
    sprite.scale.set(puff.scale);
    sprite.alpha = puff.alpha;
    sprite.baseAlpha = puff.alpha;
    sprite.noiseOffset = Math.random() * 1000;
    cloudContainer.addChild(sprite);
    cloudSprites.push(sprite);
  }

  // ─── CLOUD DOT PARTICLES (granular texture) ───
  const cloudDotContainer = new PIXI.Container();
  app.stage.addChild(cloudDotContainer);

  // Create dot texture
  const dotCanvas = document.createElement("canvas");
  dotCanvas.width = 4;
  dotCanvas.height = 4;
  const dctx = dotCanvas.getContext("2d");
  dctx.fillStyle = "white";
  dctx.beginPath();
  dctx.arc(2, 2, 2, 0, Math.PI * 2);
  dctx.fill();
  const dotTexture = PIXI.Texture.from(dotCanvas);

  // Spawn dots within cloud regions
  const cloudDots = [];
  for (let i = 0; i < CFG.cloudDotCount; i++) {
    // Pick a random puff to spawn near
    const puff = CFG.cloudPuffs[Math.floor(Math.random() * CFG.cloudPuffs.length)];
    const px = puff.x * W + (Math.random() - 0.5) * puff.scale * 180;
    const py = puff.y * H + (Math.random() - 0.5) * puff.scale * 120;
    const depth = Math.random();

    const sprite = new PIXI.Sprite(dotTexture);
    sprite.anchor.set(0.5);
    sprite.originX = px;
    sprite.originY = py;
    sprite.x = px;
    sprite.y = py;
    sprite.scale.set(CFG.cloudDotSize * (0.5 + depth * 0.5) / 2);
    sprite.alpha = CFG.cloudDotAlpha * (0.3 + depth * 0.7);
    sprite.baseAlpha = sprite.alpha;
    sprite.depth = depth;
    sprite.noiseOffsetX = Math.random() * 1000;
    sprite.noiseOffsetY = Math.random() * 1000;
    cloudDotContainer.addChild(sprite);
    cloudDots.push(sprite);
  }

  // ─── TEXT PARTICLE CONTAINER ───
  const textContainer = new PIXI.Container();
  app.stage.addChild(textContainer);

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

  // ─── MOUSE ───
  const mouse = { x: -9999, y: -9999, vx: 0, vy: 0 };
  const prevMouse = { x: -9999, y: -9999 };
  const cursorEl = document.getElementById("cursor");

  window.addEventListener("mousemove", e => {
    mouse.vx = e.clientX - prevMouse.x;
    mouse.vy = e.clientY - prevMouse.y;
    prevMouse.x = mouse.x;
    prevMouse.y = mouse.y;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    cursorEl.style.left = e.clientX + "px";
    cursorEl.style.top = e.clientY + "px";
  });
  window.addEventListener("mouseleave", () => { mouse.x = -9999; mouse.y = -9999; });
  window.addEventListener("touchmove", e => {
    e.preventDefault();
    const t = e.touches[0];
    mouse.vx = t.clientX - mouse.x;
    mouse.vy = t.clientY - mouse.y;
    mouse.x = t.clientX;
    mouse.y = t.clientY;
  }, { passive: false });
  window.addEventListener("touchend", () => { mouse.x = -9999; mouse.y = -9999; });

  // ─── TEXT PARTICLES ───
  let textParticles = [];
  let time = 0;

  function sampleText(text) {
    const offCanvas = document.createElement("canvas");
    offCanvas.width = W * dpr;
    offCanvas.height = H * dpr;
    const octx = offCanvas.getContext("2d");
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
          });
        }
      }
    }
    return points;
  }

  // Create dot sprites for text
  function buildTextSprites(points) {
    // Clear old
    textContainer.removeChildren();
    const sprites = [];
    for (const p of points) {
      const s = new PIXI.Sprite(dotTexture);
      s.anchor.set(0.5);
      s.x = p.x;
      s.y = p.y;
      const ds = (1 - CFG.depthRange) + p.depth * CFG.depthRange;
      s.scale.set(CFG.particleSize * ds / 2);
      s.alpha = 0.3 + p.depth * 0.7;
      s.baseAlpha = s.alpha;
      s.baseScale = CFG.particleSize * ds / 2;
      textContainer.addChild(s);
      sprites.push(s);
    }
    return sprites;
  }

  let currentTextIndex = 0;
  let textPoints = sampleText(CFG.texts[0]);
  let textSprites = buildTextSprites(textPoints);

  setInterval(() => {
    currentTextIndex = (currentTextIndex + 1) % CFG.texts.length;
    const newPoints = sampleText(CFG.texts[currentTextIndex]);
    const maxLen = Math.max(textPoints.length, newPoints.length);
    const merged = [];

    for (let i = 0; i < maxLen; i++) {
      if (i < textPoints.length && i < newPoints.length) {
        textPoints[i].originX = newPoints[i].originX;
        textPoints[i].originY = newPoints[i].originY;
        merged.push(textPoints[i]);
      } else if (i < newPoints.length) {
        const src = textPoints[Math.floor(Math.random() * textPoints.length)];
        const np = newPoints[i];
        np.x = src ? src.x : np.originX;
        np.y = src ? src.y : np.originY;
        np.vx = (Math.random() - 0.5) * 2;
        np.vy = (Math.random() - 0.5) * 2;
        merged.push(np);
      }
    }

    textPoints = merged;
    textSprites = buildTextSprites(textPoints);
  }, CFG.textInterval);

  // ─── GAME LOOP ───
  app.ticker.add((ticker) => {
    const dt = Math.min(ticker.deltaMS / 1000, 0.05);
    time += dt;

    const mx = mouse.x, my = mouse.y;
    const mvx = mouse.vx, mvy = mouse.vy;
    const cr = CFG.cursorRadius, crSq = cr * cr;

    // ── Update text particles ──
    for (let i = 0; i < textPoints.length; i++) {
      const p = textPoints[i];
      if (!textSprites[i]) continue;

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

      const s = textSprites[i];
      s.x = p.x;
      s.y = p.y;

      // Size boost near cursor
      const cdSq = (p.x - mx) * (p.x - mx) + (p.y - my) * (p.y - my);
      if (cdSq < crSq) {
        const t = 1 - Math.sqrt(cdSq) / cr;
        s.scale.set(s.baseScale * (1 + t * (CFG.dotSizeBoost - 1)));
      } else {
        s.scale.set(s.baseScale);
      }
    }

    // ── Update cloud puff sprites ──
    const cmr = CFG.cloudMouseRadius, cmrSq = cmr * cmr;
    for (const sprite of cloudSprites) {
      // Wind drift
      sprite.originX += CFG.cloudWindSpeed * dt;
      if (sprite.originX > W + 200) sprite.originX -= W + 400;

      // Gentle breathing
      const bx = smoothNoise(sprite.noiseOffset + time * 0.1, 0) * 10;
      const by = smoothNoise(0, sprite.noiseOffset + time * 0.1) * 6;

      sprite.x = sprite.originX + bx;
      sprite.y = sprite.originY + by;

      // Mouse push
      const dx = sprite.x - mx, dy = sprite.y - my;
      const distSq = dx * dx + dy * dy;
      if (distSq < cmrSq && distSq > 0.01) {
        const dist = Math.sqrt(distSq);
        const t = 1 - dist / cmr;
        sprite.x += (dx / dist) * t * t * CFG.cloudMouseForce;
        sprite.y += (dy / dist) * t * t * CFG.cloudMouseForce;
      }
    }

    // ── Update cloud dot particles ──
    for (const dot of cloudDots) {
      dot.originX += CFG.cloudWindSpeed * (0.3 + dot.depth * 0.7) * dt;
      if (dot.originX > W + 100) dot.originX -= W + 200;

      const bx = smoothNoise(dot.noiseOffsetX + time * 0.15, dot.noiseOffsetY) * 6;
      const by = smoothNoise(dot.noiseOffsetX, dot.noiseOffsetY + time * 0.15) * 4;
      dot.x = dot.originX + bx;
      dot.y = dot.originY + by;

      const dx = dot.x - mx, dy = dot.y - my;
      const distSq = dx * dx + dy * dy;
      if (distSq < cmrSq && distSq > 0.01) {
        const dist = Math.sqrt(distSq);
        const t = 1 - dist / cmr;
        dot.x += (dx / dist) * t * t * CFG.cloudMouseForce * 0.5;
        dot.y += (dy / dist) * t * t * CFG.cloudMouseForce * 0.5;
      }
    }
  });

  // ─── RESIZE ───
  window.addEventListener("resize", () => {
    location.reload();
  });

  // ─── MODE SWITCH ───
  document.addEventListener("keydown", e => {
    if (e.key === "m" || e.key === "M") {
      // Future: toggle render modes
    }
  });
})();
