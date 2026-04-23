import * as THREE from "three";
import {
  SparkRenderer,
  SplatMesh,
  textSplats,
} from "@sparkjsdev/spark";

// ─── CONFIG ───
const CFG = {
  texts: ["ʕ´• ᴥ•̥`ʔ", "(≧ω≦)", ",,Ծ‸Ծ,,"],
  textInterval: 3000,
  fontSize: 80,
  font: "-apple-system, PingFang SC, Helvetica Neue, sans-serif",

  // Cloud params
  cloudCount: 15000,
  cloudOpacity: 0.4,
  cloudWindSpeed: -0.15,
  cloudBounds: {
    minX: -10, maxX: 10,
    minY: 1.5, maxY: 3.5,
    minZ: -8, maxZ: 2,
  },

  // Mouse interaction
  cursorRadius: 2.0,
  pushForce: 0.15,
  vortexForce: 0.08,

  // Colors
  bgColor: 0x0a0a0a,
  textColor: new THREE.Color(1, 1, 1),
  cloudColor1: new THREE.Color(0.9, 0.92, 0.95),
  cloudColor2: new THREE.Color(0.6, 0.62, 0.68),
};

// ─── SCENE SETUP ───
const scene = new THREE.Scene();
scene.background = new THREE.Color(CFG.bgColor);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const spark = new SparkRenderer({ renderer });
scene.add(spark);

// ─── RESIZE ───
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── MOUSE ───
const mouse = { x: -9999, y: -9999, vx: 0, vy: 0, ndcX: 0, ndcY: 0 };
const cursor = document.getElementById("cursor");
const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2();
// World-space mouse position on a plane at z=0
const mouseWorld = new THREE.Vector3();
const mousePlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

renderer.domElement.addEventListener("mousemove", (e) => {
  mouse.vx = e.clientX - mouse.x;
  mouse.vy = e.clientY - mouse.y;
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  cursor.style.left = e.clientX + "px";
  cursor.style.top = e.clientY + "px";

  // NDC
  mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;

  // Raycast to world plane
  raycaster.setFromCamera(mouseNDC, camera);
  raycaster.ray.intersectPlane(mousePlane, mouseWorld);
});

renderer.domElement.addEventListener("mouseleave", () => {
  mouse.x = -9999;
  mouseWorld.set(-9999, -9999, -9999);
});

renderer.domElement.addEventListener("touchmove", (e) => {
  e.preventDefault();
  const t = e.touches[0];
  mouse.vx = t.clientX - mouse.x;
  mouse.vy = t.clientY - mouse.y;
  mouse.x = t.clientX;
  mouse.y = t.clientY;

  mouseNDC.x = (t.clientX / window.innerWidth) * 2 - 1;
  mouseNDC.y = -(t.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouseNDC, camera);
  raycaster.ray.intersectPlane(mousePlane, mouseWorld);
}, { passive: false });

renderer.domElement.addEventListener("touchend", () => {
  mouse.x = -9999;
  mouseWorld.set(-9999, -9999, -9999);
});

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

// ─── TEXT SPLATS ───
let currentTextIndex = 0;
let textMesh = null;

function createTextMesh(text) {
  const mesh = textSplats({
    text: text,
    font: "Arial",
    fontSize: CFG.fontSize,
    color: CFG.textColor,
  });
  // Scale and position to be centered
  mesh.scale.setScalar(0.4 / CFG.fontSize);
  mesh.position.set(0, 0, 0);
  return mesh;
}

// Create initial text
textMesh = createTextMesh(CFG.texts[0]);
scene.add(textMesh);

// Text rotation
setInterval(() => {
  currentTextIndex = (currentTextIndex + 1) % CFG.texts.length;
  const newMesh = createTextMesh(CFG.texts[currentTextIndex]);

  if (textMesh) {
    scene.remove(textMesh);
    textMesh.dispose?.();
  }
  textMesh = newMesh;
  scene.add(textMesh);
}, CFG.textInterval);

// ─── CLOUD SPLATS ───
const B = CFG.cloudBounds;

function fBMNoise(x, y, z, t) {
  let value = 0, amp = 0.5, freq = 0.3;
  for (let i = 0; i < 4; i++) {
    const to = t * 0.1 * (i + 1);
    value += amp * Math.sin(x * freq + to) * Math.sin(y * freq + to) * Math.sin(z * freq + to);
    freq *= 2.0;
    amp *= 0.5;
  }
  return value;
}

function wrap(val, min, max) {
  const range = max - min;
  return ((((val - min) % range) + range) % range) + min;
}

// Store original positions for mouse interaction
const cloudOriginalZ = new Float32Array(CFG.cloudCount);
const cloudSeeds = new Float32Array(CFG.cloudCount);

const clouds = new SplatMesh({
  maxSplats: CFG.cloudCount,
  constructSplats: (splats) => {
    const center = new THREE.Vector3();
    const scales = new THREE.Vector3(0.15, 0.08, 0.15);
    const quaternion = new THREE.Quaternion();
    const color = new THREE.Color();

    for (let i = 0; i < CFG.cloudCount; i++) {
      const seed = i * 0.12345;
      const rx = Math.abs((Math.sin(seed * 12.9898) * 43758.5453) % 1);
      const ry = Math.abs((Math.sin(seed * 78.233) * 43758.5453) % 1);
      const rz = Math.abs((Math.sin(seed * 37.719) * 43758.5453) % 1);
      const rw = Math.abs((Math.sin(seed * 93.989) * 43758.5453) % 1);

      cloudSeeds[i] = seed;

      let x = THREE.MathUtils.lerp(B.minX, B.maxX, rx);
      let y = THREE.MathUtils.lerp(B.minY, B.maxY, ry);
      let z = THREE.MathUtils.lerp(B.minZ, B.maxZ, rz);

      // Fluffiness
      y += Math.sin(rw * Math.PI * 2) * 0.5;
      x += Math.sin(rw * Math.PI * 8) * 0.3;

      cloudOriginalZ[i] = z;

      // Color gradient by height
      const t = THREE.MathUtils.clamp((y - B.minY) / (B.maxY - B.minY), 0, 1);
      color.copy(CFG.cloudColor2).lerp(CFG.cloudColor1, t);

      const opacity = Math.max(0.1, CFG.cloudOpacity * (0.8 + 0.4 * Math.abs(Math.sin(rw * Math.PI * 2))));

      center.set(x, y, z);
      splats.pushSplat(center, scales, quaternion, opacity, color);
    }
  },
  onFrame: ({ mesh, time, deltaTime }) => {
    const t = time;
    const mx = mouseWorld.x;
    const my = mouseWorld.y;
    const crSq = CFG.cursorRadius * CFG.cursorRadius;

    mesh.packedSplats.forEachSplat((index, center, scales, quaternion, opacity, color) => {
      // Wind movement
      const seed = cloudSeeds[index];
      const rz = Math.abs((Math.sin(seed * 37.719) * 43758.5453) % 1);
      const zZero = THREE.MathUtils.lerp(B.minZ, B.maxZ, rz);

      const displacement = CFG.cloudWindSpeed * t;
      let newZ = zZero + displacement;
      newZ = wrap(newZ, B.minZ, B.maxZ);

      // Vertical breathing via noise
      const rx = Math.abs((Math.sin(seed * 12.9898) * 43758.5453) % 1);
      const baseX = THREE.MathUtils.lerp(B.minX, B.maxX, rx);
      const breathY = smoothNoise(baseX * 0.5 + t * 0.2, newZ * 0.5) * 0.15;

      let cx = center.x;
      let cy = center.y + breathY * deltaTime;

      // Mouse interaction — push cloud splats away
      // Project cloud to approximate screen plane (clouds are above text)
      const dx = cx - mx;
      const dy = cy - my;
      const distSq = dx * dx + dy * dy;

      if (distSq < crSq * 4 && distSq > 0.01 && mx > -999) {
        const dist = Math.sqrt(distSq);
        const influence = 1 - dist / (CFG.cursorRadius * 2);
        if (influence > 0) {
          const ndx = dx / dist;
          const ndy = dy / dist;
          cx += ndx * influence * CFG.pushForce;
          cy += ndy * influence * CFG.pushForce;
        }
      }

      center.set(cx, cy, newZ);
      mesh.packedSplats.setSplat(index, center, scales, quaternion, opacity, color);
    });

    mesh.packedSplats.needsUpdate = true;
    mesh.needsUpdate = true;
  },
});

clouds.position.set(0, 0, -3);
scene.add(clouds);

// ─── AMBIENT STARS ───
const stars = new SplatMesh({
  constructSplats: (splats) => {
    const NUM = 5000;
    const center = new THREE.Vector3();
    const scales = new THREE.Vector3().setScalar(0.005);
    const quaternion = new THREE.Quaternion();
    const color = new THREE.Color();

    for (let i = 0; i < NUM; i++) {
      center.set(
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 20,
        -5 - Math.random() * 15,
      );
      const brightness = 0.3 + Math.random() * 0.7;
      color.set(brightness, brightness, brightness * 1.1);
      splats.pushSplat(center, scales, quaternion, 0.3 + Math.random() * 0.5, color);
    }
  },
});
scene.add(stars);

// ─── TEXT INTERACTION ───
// We need to interact with text splats too
// The textSplats are rendered via Spark's shader pipeline
// For now, text interaction will be handled in a future iteration
// since textSplats don't expose per-splat onFrame easily

// ─── ANIMATION LOOP ───
renderer.setAnimationLoop(function animate(time) {
  renderer.render(scene, camera);
});
