import * as THREE from "three";
import { OrbitControls } from "./vendor/OrbitControls.js";
import { Reflector } from "./vendor/Reflector.js";

const canvas = document.getElementById("scene");

/* ==========================================================================
   Renderer / scene / camera
   ========================================================================== */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070a12);
scene.fog = new THREE.Fog(0x070a12, 30, 60);

// soft environment for glossy reflections
const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 16, 8), new THREE.MeshBasicMaterial({ color: 0x16243a, side: THREE.BackSide })));
const warmPatch = new THREE.Mesh(new THREE.PlaneGeometry(5, 3), new THREE.MeshBasicMaterial({ color: 0xffc98a }));
warmPatch.position.set(0, 1.4, -4);
envScene.add(warmPatch);
scene.environment = pmrem.fromScene(envScene, 0.15).texture;
scene.environmentIntensity = 0.55;

const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, 0.1, 220);
camera.position.set(12, 9, 13);

const controls = new OrbitControls(camera, canvas);
controls.target.set(1.2, 1.5, -1.6);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 8;
controls.maxDistance = 40;
controls.maxPolarAngle = Math.PI / 2 - 0.05;

/* ==========================================================================
   Helpers
   ========================================================================== */
const gradientMap = (() => {
  const c = document.createElement("canvas");
  c.width = 5;
  c.height = 1;
  const ctx = c.getContext("2d");
  ["#3a3a3a", "#6f6f6f", "#9a9a9a", "#c8c8c8", "#ffffff"].forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(i, 0, 1, 1);
  });
  const t = new THREE.CanvasTexture(c);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  return t;
})();

function toon(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05, ...opts });
}

const edgeMat = new THREE.LineBasicMaterial({ color: 0x0a0f18, transparent: true, opacity: 0.16 });

function part(geo, mat, x = 0, y = 0, z = 0, outline = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  if (outline) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 24), edgeMat));
  return m;
}

function canvasTexture(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/* ==========================================================================
   Textures
   ========================================================================== */
const stripeTex = canvasTexture(256, 64, (ctx) => {
  ctx.fillStyle = "#f4f6f8";
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = "#3b7ed6";
  for (let i = 0; i < 8; i++) ctx.fillRect(i * 32, 0, 16, 64);
});

const signTex = canvasTexture(1024, 200, (ctx) => {
  ctx.fillStyle = "#f4f6f8";
  ctx.fillRect(0, 0, 1024, 200);
  ctx.fillStyle = "#1f5fd0";
  ctx.fillRect(0, 0, 1024, 70);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 44px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("KONBINI", 40, 50);
  ctx.fillStyle = "#1f5fd0";
  ctx.font = "bold 72px sans-serif";
  ctx.fillText("24", 810, 140);
  ctx.fillStyle = "#1d2a3a";
  ctx.font = "bold 46px sans-serif";
  ctx.fillText("OPEN EVERY DAY", 40, 150);
});

const vendTex = canvasTexture(256, 512, (ctx) => {
  ctx.fillStyle = "#c8202c";
  ctx.fillRect(0, 0, 256, 512);
  ctx.fillStyle = "#f4f6f9";
  ctx.fillRect(18, 18, 220, 300);
  const colors = ["#3aa0ff", "#ffb03a", "#36c46b", "#ff5a5a", "#8a6bff", "#33d1c9"];
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = colors[(r * 6 + i) % colors.length];
      ctx.fillRect(30 + i * 32, 30 + r * 90, 24, 70);
    }
  }
  ctx.fillStyle = "#1a1d22";
  ctx.fillRect(18, 340, 220, 60);
  ctx.fillStyle = "#12151a";
  ctx.fillRect(18, 420, 220, 70);
});

const posterTex = canvasTexture(256, 512, (ctx) => {
  ctx.fillStyle = "#f2e9d8";
  ctx.fillRect(0, 0, 256, 512);
  ctx.fillStyle = "#d23b3b";
  ctx.fillRect(20, 30, 216, 130);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 64px sans-serif";
  ctx.fillText("SALE", 42, 118);
  ctx.fillStyle = "#8b93a3";
  for (let i = 0; i < 9; i++) ctx.fillRect(24, 200 + i * 30, 208, 8);
});

const glowTex = canvasTexture(128, 128, (ctx) => {
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
});

const fridgeTex = canvasTexture(256, 512, (ctx) => {
  ctx.fillStyle = "#0b1420";
  ctx.fillRect(0, 0, 256, 512);
  const colors = ["#3aa0ff", "#ffb03a", "#36c46b", "#ff5a5a", "#8a6bff", "#33d1c9"];
  for (let r = 0; r < 5; r++) {
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = colors[(r * 3 + i) % colors.length];
      ctx.fillRect(14 + i * 38, 18 + r * 96, 28, 78);
    }
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(0, 18 + r * 96 + 82, 256, 6);
  }
});

const magTex = canvasTexture(512, 256, (ctx) => {
  ctx.fillStyle = "#e8e2d6";
  ctx.fillRect(0, 0, 512, 256);
  const colors = ["#d23b3b", "#3aa0ff", "#f2b03a", "#36c46b", "#8a6bff", "#ff5a5a"];
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(10 + i * 84, 20, 72, 200);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(18 + i * 84, 34, 56, 26);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(18 + i * 84, 140, 56, 60);
  }
});

const menuTex = canvasTexture(512, 256, (ctx) => {
  ctx.fillStyle = "#18222f";
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = "#f2e9d8";
  ctx.font = "bold 30px sans-serif";
  ctx.fillText("HOT SNACKS", 24, 58);
  ctx.fillText("COFFEE", 24, 118);
  ctx.fillText("ODEN", 24, 178);
  ctx.fillStyle = "#36d69a";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText("¥150  ¥180", 330, 58);
  ctx.fillText("¥120  ¥200", 330, 118);
  ctx.fillText("¥80 / piece", 330, 178);
});

/* ==========================================================================
   Base: rounded plinth with a light rim + wet mirror ground
   ========================================================================== */
const baseBody = new THREE.Mesh(
  new THREE.ExtrudeGeometry(roundedRect(18.8, 18.8, 1.4), { depth: 0.9, bevelEnabled: false }),
  toon(0x121a2a)
);
baseBody.rotation.x = -Math.PI / 2;
baseBody.position.y = -0.9;
scene.add(baseBody);

const rimShape = roundedRect(18.4, 18.4, 1.3);
rimShape.holes.push(new THREE.Path(roundedRect(17.3, 17.3, 1.1).getPoints(40)));
const rim = new THREE.Mesh(new THREE.ShapeGeometry(rimShape), toon(0xc9ced8));
rim.rotation.x = -Math.PI / 2;
rim.position.y = 0.02;
scene.add(rim);

const mirror = new Reflector(new THREE.PlaneGeometry(17.2, 17.2), {
  clipBias: 0.002,
  textureWidth: 512,
  textureHeight: 512,
  color: 0x0d1420
});
mirror.rotation.x = -Math.PI / 2;
mirror.position.y = 0.008;
scene.add(mirror);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(17.2, 17.2),
  new THREE.MeshStandardMaterial({ color: 0x161c2a, roughness: 0.32, metalness: 0.5, transparent: true, opacity: 0.42 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0.012;
ground.receiveShadow = true;
scene.add(ground);

const walkMat = toon(0x3a3f4d);
scene.add(part(new THREE.BoxGeometry(6.4, 0.12, 1.1), walkMat, 0, 0.06, 0.55));
scene.add(part(new THREE.BoxGeometry(1.1, 0.12, 6.4), walkMat, 3.55, 0.06, -3));

/* ==========================================================================
   Store shell — corner shop, glass on south + east
   ========================================================================== */
const S = { x: 0, z: -3, w: 6, d: 6, h: 3.6 };
const wallMat = toon(0xece8de);
const trimMat = toon(0x1f5fd0);

// floor
scene.add(part(new THREE.BoxGeometry(S.w, 0.12, S.d), toon(0xc9c2b2), S.x, 0.06, S.z, false));
// north + west walls
scene.add(part(new THREE.BoxGeometry(S.w, S.h, 0.16), wallMat, S.x, S.h / 2, S.z - S.d / 2));
scene.add(part(new THREE.BoxGeometry(0.16, S.h, S.d), wallMat, S.x - S.w / 2, S.h / 2, S.z));
// roof + parapet
scene.add(part(new THREE.BoxGeometry(S.w + 0.35, 0.16, S.d + 0.35), toon(0x2a3140), S.x, S.h, S.z));
scene.add(part(new THREE.BoxGeometry(S.w + 0.4, 0.18, 0.12), toon(0xd8d2c4), S.x, S.h + 0.12, S.z + S.d / 2 + 0.12, false));

// warm interior back wall
const interior = new THREE.Mesh(
  new THREE.PlaneGeometry(S.w - 0.4, S.h - 0.3),
  new THREE.MeshBasicMaterial({ color: 0xffd8a0 })
);
interior.position.set(S.x, S.h / 2, S.z - S.d / 2 + 0.12);
scene.add(interior);

// glass: south + east
const glassMat = new THREE.MeshStandardMaterial({ color: 0x33496b, roughness: 0.08, metalness: 0.6, transparent: true, opacity: 0.22 });
const glassS = new THREE.Mesh(new THREE.PlaneGeometry(S.w - 0.3, 2.4), glassMat);
glassS.position.set(S.x, 1.3, S.z + S.d / 2 - 0.02);
scene.add(glassS);
const glassE = new THREE.Mesh(new THREE.PlaneGeometry(S.d - 0.3, 2.4), glassMat);
glassE.rotation.y = Math.PI / 2;
glassE.position.set(S.x + S.w / 2 - 0.02, 1.3, S.z);
scene.add(glassE);

// frames for the glass
const frameMat = toon(0xdfe3ea);
scene.add(part(new THREE.BoxGeometry(0.1, 2.5, 0.1), frameMat, S.x - S.w / 2 + 0.12, 1.3, S.z + S.d / 2, false));
scene.add(part(new THREE.BoxGeometry(0.1, 2.5, 0.1), frameMat, S.x + S.w / 2 - 0.12, 1.3, S.z + S.d / 2, false));
scene.add(part(new THREE.BoxGeometry(0.1, 2.5, 0.1), frameMat, S.x + S.w / 2, 1.3, S.z - S.d / 2 + 0.12, false));
scene.add(part(new THREE.BoxGeometry(0.1, 2.5, 0.1), frameMat, S.x + S.w / 2, 1.3, S.z + S.d / 2 - 0.12, false));
scene.add(part(new THREE.BoxGeometry(S.w - 0.2, 0.1, 0.1), frameMat, S.x, 2.55, S.z + S.d / 2, false));

// door near the corner
const doorL = part(new THREE.BoxGeometry(0.9, 2.25, 0.05), toon(0x3a4e6e), S.x + 1.05, 1.22, S.z + S.d / 2 - 0.04);
const doorR = part(new THREE.BoxGeometry(0.9, 2.25, 0.05), toon(0x3a4e6e), S.x + 2.0, 1.22, S.z + S.d / 2 - 0.04);
scene.add(doorL, doorR);
scene.add(part(new THREE.BoxGeometry(2.0, 0.08, 0.08), toon(0x9fa6b4), S.x + 1.5, 2.36, S.z + S.d / 2 - 0.04, false));

// doormat
scene.add(part(new THREE.BoxGeometry(1.9, 0.04, 0.55), toon(0x2a2f3a), S.x + 1.5, 0.03, S.z + S.d / 2 + 0.45, false));

// striped awning (south + east)
const awningS = new THREE.Mesh(
  new THREE.BoxGeometry(S.w + 0.6, 0.42, 0.14),
  new THREE.MeshBasicMaterial({ map: stripeTex })
);
awningS.position.set(S.x, 2.62, S.z + S.d / 2 + 0.06);
scene.add(awningS);
const awningE = new THREE.Mesh(
  new THREE.BoxGeometry(0.14, 0.42, S.d + 0.6),
  new THREE.MeshBasicMaterial({ map: stripeTex })
);
awningE.position.set(S.x + S.w / 2 + 0.06, 2.62, S.z);
scene.add(awningE);

// blue sign band (south + east)
const signBandS = new THREE.Mesh(new THREE.BoxGeometry(S.w + 0.6, 0.55, 0.16), new THREE.MeshBasicMaterial({ map: signTex }));
signBandS.position.set(S.x, 3.2, S.z + S.d / 2 + 0.05);
scene.add(signBandS);
const signBandE = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.55, S.d + 0.6), new THREE.MeshBasicMaterial({ map: signTex }));
signBandE.position.set(S.x + S.w / 2 + 0.05, 3.2, S.z);
scene.add(signBandE);
const signLight = new THREE.PointLight(0x6fa8ff, 14, 12, 2);
signLight.position.set(S.x + 2.2, 3.4, S.z + 3.2);
scene.add(signLight);

/* ==========================================================================
   Store interior
   ========================================================================== */
const inner = new THREE.Group();
scene.add(inner);

const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 4.8), new THREE.MeshBasicMaterial({ color: 0xfff2d8 }));
ceiling.rotation.x = Math.PI / 2;
ceiling.position.set(S.x, S.h - 0.14, S.z);
inner.add(ceiling);

const innerFloor = new THREE.Mesh(new THREE.PlaneGeometry(S.w - 0.4, S.d - 0.4), toon(0xe2dccb));
innerFloor.rotation.x = -Math.PI / 2;
innerFloor.position.set(S.x, 0.13, S.z);
inner.add(innerFloor);

// floor guide
for (let i = 0; i < 3; i++) {
  const g = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.1), new THREE.MeshBasicMaterial({ color: 0x36d69a, transparent: true, opacity: 0.55 }));
  g.rotation.x = -Math.PI / 2;
  g.position.set(S.x - 1.3, 0.14, S.z + 1.6 - i * 0.7);
  inner.add(g);
}

// back shelves with products
const shelfMat = toon(0xd9d3c4);
for (let row = 0; row < 4; row++) {
  const y = 0.55 + row * 0.42;
  inner.add(part(new THREE.BoxGeometry(4.4, 0.05, 0.4), shelfMat, S.x, y, S.z - 2.6, false));
  const colors = [0xd23b3b, 0x3aa0ff, 0xf2b03a, 0x36c46b, 0x8a6bff, 0xe8e2d6];
  for (let i = 0; i < 11; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.27, 0.22), toon(colors[(row + i) % colors.length]));
    b.position.set(S.x - 2.1 + i * 0.42, y + 0.16, S.z - 2.6);
    inner.add(b);
  }
}

// drink fridge on the west wall
const fridge = new THREE.Mesh(
  new THREE.BoxGeometry(0.35, 2.1, 2.0),
  [new THREE.MeshBasicMaterial({ map: fridgeTex }), toon(0x0b1420), toon(0x0b1420), toon(0x0b1420), toon(0x0b1420), toon(0x0b1420)]
);
fridge.position.set(S.x - 2.55, 1.18, S.z - 0.6);
inner.add(fridge);

// bento + onigiri table
inner.add(part(new THREE.BoxGeometry(1.9, 0.5, 0.75), toon(0xbdb6a6), S.x - 0.1, 0.38, S.z + 1.1, false));
const bentoColors = [0xd23b3b, 0xe8b13a, 0x36c46b, 0xf2e9d8];
for (let i = 0; i < 4; i++) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.4), toon(bentoColors[i]));
  b.position.set(S.x - 0.7 + i * 0.42, 0.68, S.z + 1.1);
  inner.add(b);
}
for (let i = 0; i < 5; i++) {
  const onigiri = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.12, 3), toon(0xf7f3e8));
  onigiri.position.set(S.x - 0.7 + i * 0.2, 0.72, S.z + 1.55);
  inner.add(onigiri);
}

// checkout counter
inner.add(part(new THREE.BoxGeometry(1.7, 1.0, 0.65), toon(0xbdb6a6), S.x + 1.7, 0.63, S.z + 1.0, false));
const register = part(new THREE.BoxGeometry(0.42, 0.26, 0.32), toon(0x2a2f3a), S.x + 1.35, 1.25, S.z + 1.0, false);
inner.add(register);
const monitor = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.24), new THREE.MeshBasicMaterial({ color: 0x8fe3ff }));
monitor.position.set(S.x + 1.75, 1.55, S.z + 0.72);
inner.add(monitor);

// coffee machine
inner.add(part(new THREE.BoxGeometry(0.4, 0.58, 0.38), toon(0x2a2f3a), S.x + 2.3, 1.4, S.z + 1.0, false));
const coffeeScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.15), new THREE.MeshBasicMaterial({ color: 0xffd39a }));
coffeeScreen.position.set(S.x + 2.3, 1.55, S.z + 0.8);
inner.add(coffeeScreen);

// oden pot
const oden = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.17, 12), toon(0x8a5a3a));
oden.position.set(S.x + 0.95, 1.2, S.z + 1.0);
inner.add(oden);

// magazine rack on the west wall
const mags = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.85), new THREE.MeshBasicMaterial({ map: magTex }));
mags.rotation.y = Math.PI / 2;
mags.position.set(S.x - 2.6, 1.0, S.z + 1.9);
inner.add(mags);

// chest freezer
inner.add(part(new THREE.BoxGeometry(1.0, 0.78, 0.55), toon(0xd8d2c4), S.x + 2.1, 0.52, S.z + 2.1, false));
const freezerTop = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.65 }));
freezerTop.rotation.x = -Math.PI / 2;
freezerTop.position.set(S.x + 2.1, 0.92, S.z + 2.1);
inner.add(freezerTop);

// back door + lockers
inner.add(part(new THREE.BoxGeometry(0.8, 1.85, 0.06), toon(0x4a5262), S.x + 2.1, 1.03, S.z - S.d / 2 + 0.12, false));
for (let i = 0; i < 3; i++) {
  inner.add(part(new THREE.BoxGeometry(0.32, 1.1, 0.28), toon(0x8a93a6), S.x - 2.55, 0.68, S.z - 2.4 + i * 0.38, false));
}

// menu board + poster
const menu = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.75), new THREE.MeshBasicMaterial({ map: menuTex }));
menu.rotation.y = Math.PI;
menu.position.set(S.x, 2.75, S.z - 0.6);
inner.add(menu);
const posterIn = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.8), new THREE.MeshBasicMaterial({ map: posterTex }));
posterIn.rotation.y = Math.PI / 2;
posterIn.position.set(S.x - 2.58, 1.75, S.z - 2.0);
inner.add(posterIn);

/* ==========================================================================
   Exterior props
   ========================================================================== */
// vending machine (left of the entrance)
const vend = new THREE.Mesh(
  new THREE.BoxGeometry(0.9, 1.85, 0.65),
  [toon(0xc8202c), toon(0xc8202c), toon(0x8f1620), toon(0x2a2f3a), new THREE.MeshBasicMaterial({ map: vendTex }), toon(0x8f1620)]
);
vend.position.set(S.x - 2.9, 0.93, S.z + 3.5);
vend.rotation.y = -0.5;
vend.add(new THREE.LineSegments(new THREE.EdgesGeometry(vend.geometry, 24), edgeMat));
scene.add(vend);
const vendLight = new THREE.PointLight(0xff5a5a, 4, 6, 2);
vendLight.position.set(S.x - 2.6, 1.3, S.z + 3.8);
scene.add(vendLight);

// bins
scene.add(part(new THREE.CylinderGeometry(0.2, 0.22, 0.75, 14), toon(0xdfe3ea), S.x + 3.1, 0.38, S.z + 3.2));
scene.add(part(new THREE.CylinderGeometry(0.2, 0.22, 0.75, 14), toon(0x3a7ed6), S.x + 3.5, 0.38, S.z + 3.5));

// A-frame sign
const aframe = new THREE.Group();
const boardMat = toon(0xf2e9d8);
const b1 = part(new THREE.BoxGeometry(0.7, 0.9, 0.04), boardMat, 0, 0.45, 0.18);
b1.rotation.x = 0.22;
const b2 = part(new THREE.BoxGeometry(0.7, 0.9, 0.04), boardMat, 0, 0.45, -0.18);
b2.rotation.x = -0.22;
aframe.add(b1, b2);
const aframePoster = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.75), new THREE.MeshBasicMaterial({ map: posterTex }));
aframePoster.position.set(0, 0.5, 0.235);
aframePoster.rotation.x = 0.22;
aframe.add(aframePoster);
aframe.position.set(S.x + 3.0, 0, S.z + 3.8);
scene.add(aframe);

// plant
const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.3, 12), toon(0x8a5a3a));
pot.position.set(S.x - 3.4, 0.15, S.z + 2.6);
scene.add(pot);
for (let i = 0; i < 4; i++) {
  const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.55, 5), toon(0x2f7a52));
  leaf.position.set(S.x - 3.4 + (i - 1.5) * 0.09, 0.5, S.z + 2.6);
  leaf.rotation.z = (i - 1.5) * 0.22;
  scene.add(leaf);
}

// umbrella stand
scene.add(part(new THREE.BoxGeometry(0.48, 0.5, 0.48), toon(0x2b3242), S.x - 1.9, 0.25, S.z + 3.3));
[0x3aa0ff, 0xff5a5a, 0x36c46b].forEach((color, i) => {
  const u = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.95, 6), toon(color));
  u.position.set(S.x - 2.0 + i * 0.1, 0.5, S.z + 3.3);
  u.rotation.z = 0.12 - i * 0.1;
  scene.add(u);
});

// bicycle
function makeBike() {
  const g = new THREE.Group();
  const frameMat = toon(0x2b3242);
  const wheelMat = toon(0x1a1e28);
  const wheelGeo = new THREE.TorusGeometry(0.3, 0.025, 8, 22);
  const w1 = new THREE.Mesh(wheelGeo, wheelMat);
  w1.position.set(-0.42, 0.3, 0);
  const w2 = new THREE.Mesh(wheelGeo, wheelMat);
  w2.position.set(0.42, 0.3, 0);
  g.add(w1, w2);
  const tube = (x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.03, 0.03), frameMat);
    m.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
    m.rotation.z = Math.atan2(dy, dx);
    g.add(m);
  };
  tube(-0.42, 0.3, -0.08, 0.66);
  tube(-0.08, 0.66, 0.42, 0.6);
  tube(-0.08, 0.66, 0.08, 0.3);
  tube(0.08, 0.3, 0.42, 0.6);
  tube(-0.42, 0.3, 0.08, 0.3);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.1), frameMat);
  seat.position.set(-0.1, 0.7, 0);
  g.add(seat);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.34), frameMat);
  bar.position.set(0.42, 0.66, 0);
  g.add(bar);
  g.rotation.y = -0.9;
  g.rotation.z = -0.05;
  return g;
}
const bike = makeBike();
bike.position.set(S.x - 3.0, 0.12, S.z + 4.6);
scene.add(bike);

// streetlight
const streetlight = new THREE.Group();
const poleMat = toon(0x2a3040);
const lpole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, 3.4, 8), poleMat);
lpole.position.y = 1.7;
streetlight.add(lpole);
const larm = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.07, 0.07), poleMat);
larm.position.set(0.5, 3.35, 0);
streetlight.add(larm);
const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.09, 0.22), new THREE.MeshBasicMaterial({ color: 0xfff0c8 }));
lamp.position.set(0.95, 3.3, 0);
streetlight.add(lamp);
const streetLight = new THREE.PointLight(0xffe1b0, 22, 15, 2);
streetLight.position.set(0.95, 3.15, 0);
streetlight.add(streetLight);
streetlight.position.set(-3.6, 0.12, 0.9);
streetlight.rotation.y = 0.3;
scene.add(streetlight);

// utility pole + wires
const poleMat2 = toon(0x3a3f4d);
const utility = new THREE.Group();
const upole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 6.6, 8), poleMat2);
upole.position.y = 3.3;
utility.add(upole);
for (let i = 0; i < 3; i++) {
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 0.06), poleMat2);
  arm.position.y = 5.5 + i * 0.42;
  utility.add(arm);
}
utility.position.set(-7.4, 0, 1.2);
scene.add(utility);

function makeWire(a, b, sag) {
  const pts = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const p = new THREE.Vector3().lerpVectors(a, b, t);
    p.y -= Math.sin(Math.PI * t) * sag;
    pts.push(p);
  }
  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: 0x0b0f18, transparent: true, opacity: 0.9 })
  );
}
scene.add(makeWire(new THREE.Vector3(-7.4, 6.5, 1.2), new THREE.Vector3(3.1, 3.8, -6.0), 0.5));
scene.add(makeWire(new THREE.Vector3(-7.4, 6.1, 1.2), new THREE.Vector3(3.1, 3.8, -5.4), 0.55));

// white fence
const fenceMat = toon(0xdfe3ea);
for (let i = 0; i < 7; i++) {
  scene.add(part(new THREE.BoxGeometry(0.05, 0.55, 0.05), fenceMat, -7.2 + i * 0.85, 0.28, 0.2));
}
scene.add(part(new THREE.BoxGeometry(5.2, 0.05, 0.05), fenceMat, -4.6, 0.48, 0.2));
scene.add(part(new THREE.BoxGeometry(5.2, 0.05, 0.05), fenceMat, -4.6, 0.22, 0.2));

// traffic light
const tl = new THREE.Group();
const tlp = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 3.8, 8), toon(0x2a3040));
tlp.position.y = 1.9;
tl.add(tlp);
const tlBox = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.85, 0.24), toon(0x1a1f2a));
tlBox.position.y = 3.6;
tl.add(tlBox);
const tlRed = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), new THREE.MeshBasicMaterial({ color: 0x551111 }));
tlRed.position.set(0, 3.82, 0.13);
tl.add(tlRed);
const tlGreen = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), new THREE.MeshBasicMaterial({ color: 0x116644 }));
tlGreen.position.set(0, 3.38, 0.13);
tl.add(tlGreen);
tl.position.set(7.4, 0, 4.6);
tl.rotation.y = -0.6;
scene.add(tl);

// road sign
const signPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.4, 8), toon(0x8a93a6));
signPole.position.set(-6.0, 1.2, 0.9);
scene.add(signPole);
const roadSign = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 16), toon(0x3b7ed6));
roadSign.rotation.x = Math.PI / 2;
roadSign.position.set(-6.0, 2.3, 0.9);
scene.add(roadSign);

// crosswalk + parking
const stripeMat = toon(0xdfe3ea);
for (let i = 0; i < 6; i++) {
  scene.add(part(new THREE.BoxGeometry(0.42, 0.02, 2.6), stripeMat, 4.6, 0.03, -1.4 + i * 0.8));
}
for (let i = 0; i < 4; i++) {
  scene.add(part(new THREE.BoxGeometry(2.4, 0.02, 0.06), stripeMat, -4.0, 0.03, 5.2 + i * 0.7));
}

// drain + manhole
scene.add(part(new THREE.BoxGeometry(0.7, 0.03, 0.3), toon(0x2a2f3a), 0.6, 0.02, 4.4));
const manhole = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.02, 20), toon(0x2a2f3a));
manhole.position.set(-2.6, 0.02, 5.0);
scene.add(manhole);
const manholeGlow = new THREE.Mesh(
  new THREE.PlaneGeometry(1.2, 1.2),
  new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffa050, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })
);
manholeGlow.rotation.x = -Math.PI / 2;
manholeGlow.position.set(-2.6, 0.03, 5.0);
scene.add(manholeGlow);

// light pools
function lightPool(x, z, size, color, opacity) {
  const p = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  p.rotation.x = -Math.PI / 2;
  p.position.set(x, 0.02, z);
  scene.add(p);
}
lightPool(0, 1.6, 9, 0xffd9a0, 0.35);
lightPool(-3.6, 1.4, 5, 0xffe1b0, 0.28);
lightPool(7.4, 5.0, 4, 0xff7a3a, 0.25);

/* ==========================================================================
   Lights
   ========================================================================== */
scene.add(new THREE.HemisphereLight(0x8fb4dd, 0x0a0e18, 1.1));

const moon = new THREE.DirectionalLight(0x9ec8ff, 1.6);
moon.position.set(-9, 13, 9);
moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
moon.shadow.camera.near = 1;
moon.shadow.camera.far = 44;
moon.shadow.camera.left = -13;
moon.shadow.camera.right = 13;
moon.shadow.camera.top = 13;
moon.shadow.camera.bottom = -13;
moon.shadow.bias = -0.0004;
moon.shadow.normalBias = 0.02;
scene.add(moon);

const interiorLight = new THREE.PointLight(0xffd39a, 30, 16, 2);
interiorLight.position.set(S.x, 2.3, S.z + 1.2);
scene.add(interiorLight);

const interiorLight2 = new THREE.PointLight(0xffd39a, 16, 11, 2);
interiorLight2.position.set(S.x, 2.3, S.z - 1.6);
scene.add(interiorLight2);

/* ==========================================================================
   Motion
   ========================================================================== */
// rain
const RAIN_COUNT = 800;
const rainPositions = new Float32Array(RAIN_COUNT * 6);
const rainSpeed = new Float32Array(RAIN_COUNT);
for (let i = 0; i < RAIN_COUNT; i++) {
  const x = (Math.random() - 0.5) * 28;
  const y = Math.random() * 20;
  const z = (Math.random() - 0.5) * 28;
  const len = 0.3 + Math.random() * 0.6;
  rainPositions[i * 6] = x;
  rainPositions[i * 6 + 1] = y;
  rainPositions[i * 6 + 2] = z;
  rainPositions[i * 6 + 3] = x + 0.05;
  rainPositions[i * 6 + 4] = y - len;
  rainPositions[i * 6 + 5] = z;
  rainSpeed[i] = 10 + Math.random() * 12;
}
const rainGeo = new THREE.BufferGeometry();
rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));
scene.add(new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xaecbff, transparent: true, opacity: 0.38 })));

function updateRain(dt) {
  for (let i = 0; i < RAIN_COUNT; i++) {
    const drop = rainSpeed[i] * dt;
    rainPositions[i * 6 + 1] -= drop;
    rainPositions[i * 6 + 4] -= drop;
    if (rainPositions[i * 6 + 4] < 0) {
      const y = 18 + Math.random() * 4;
      const len = 0.3 + Math.random() * 0.6;
      rainPositions[i * 6 + 1] = y;
      rainPositions[i * 6 + 4] = y - len;
    }
  }
  rainGeo.attributes.position.needsUpdate = true;
}

// eaves drips
const DRIP_COUNT = 7;
const dripData = [];
const dripGeo = new THREE.BufferGeometry();
const dripPositions = new Float32Array(DRIP_COUNT * 6);
dripGeo.setAttribute("position", new THREE.BufferAttribute(dripPositions, 3));
scene.add(new THREE.LineSegments(dripGeo, new THREE.LineBasicMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.7 })));
for (let i = 0; i < DRIP_COUNT; i++) {
  dripData.push({ x: S.x - 2.6 + i * 0.85, z: S.z + S.d / 2 + 0.2, y: 2.4 + Math.random() * 1.2, speed: 2.2 + Math.random() * 1.8 });
}
function updateDrips(dt) {
  for (let i = 0; i < DRIP_COUNT; i++) {
    const d = dripData[i];
    d.y -= d.speed * dt;
    if (d.y < 0.02) d.y = 2.4 + Math.random() * 1.2;
    dripPositions[i * 6] = d.x;
    dripPositions[i * 6 + 1] = d.y;
    dripPositions[i * 6 + 2] = d.z;
    dripPositions[i * 6 + 3] = d.x;
    dripPositions[i * 6 + 4] = d.y + 0.15;
    dripPositions[i * 6 + 5] = d.z;
  }
  dripGeo.attributes.position.needsUpdate = true;
}

// puddle ripples
const ripples = [];
[[-1.6, 4.6], [1.4, 4.0], [-4.4, 4.4], [5.6, 1.2]].forEach(([x, z]) => {
  for (let k = 0; k < 2; k++) {
    const r = new THREE.Mesh(
      new THREE.RingGeometry(0.16, 0.2, 24),
      new THREE.MeshBasicMaterial({ color: 0x9fd0ff, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
    );
    r.rotation.x = -Math.PI / 2;
    r.position.set(x, 0.022, z);
    r.userData = { t: Math.random() * 2, speed: 0.6 + Math.random() * 0.5 };
    scene.add(r);
    ripples.push(r);
  }
});
function updateRipples(dt) {
  ripples.forEach((r) => {
    r.userData.t += dt * r.userData.speed;
    const t = r.userData.t % 2;
    const s = 0.5 + t * 2.6;
    r.scale.set(s, s, s);
    r.material.opacity = Math.max(0, 0.45 * (1 - t / 2));
  });
}

// rain sliding on the glass
const GLASS_DROPS = 12;
const glassDrops = [];
const glassGeo = new THREE.BufferGeometry();
const glassPos = new Float32Array(GLASS_DROPS * 6);
glassGeo.setAttribute("position", new THREE.BufferAttribute(glassPos, 3));
scene.add(new THREE.LineSegments(glassGeo, new THREE.LineBasicMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.45 })));
for (let i = 0; i < GLASS_DROPS; i++) {
  glassDrops.push({ x: S.x - 2.6 + Math.random() * 5.2, y: 2.4, speed: 0.15 + Math.random() * 0.4 });
}
function updateGlassRain(dt) {
  for (let i = 0; i < GLASS_DROPS; i++) {
    const d = glassDrops[i];
    d.y -= d.speed * dt;
    if (d.y < 0.2) d.y = 2.4;
    glassPos[i * 6] = d.x;
    glassPos[i * 6 + 1] = d.y;
    glassPos[i * 6 + 2] = S.z + S.d / 2 - 0.01;
    glassPos[i * 6 + 3] = d.x;
    glassPos[i * 6 + 4] = d.y + 0.24;
    glassPos[i * 6 + 5] = S.z + S.d / 2 - 0.01;
  }
  glassGeo.attributes.position.needsUpdate = true;
}

// sign flicker, traffic light cycle, sliding doors
let doorTimer = 0;
let doorOpen = false;
let tlTimer = 0;

function updateLife(t, dt) {
  const flicker = 0.9 + Math.sin(t * 41) * 0.05 + (Math.random() < 0.015 ? -0.4 : 0);
  signLight.intensity = Math.max(3, 14 * flicker);

  tlTimer = (tlTimer + dt) % 8;
  const red = tlTimer < 4;
  tlRed.material.color.setHex(red ? 0xff3b3b : 0x551111);
  tlGreen.material.color.setHex(red ? 0x116644 : 0x36e08a);

  doorTimer += dt;
  if (!doorOpen && doorTimer > 9) {
    doorTimer = 0;
    doorOpen = true;
  }
  const target = doorOpen ? 0.58 : 0;
  const ease = doorOpen ? 0.09 : 0.05;
  doorL.position.x += ((S.x + 1.05 - target) - doorL.position.x) * ease;
  doorR.position.x += ((S.x + 2.0 + target) - doorR.position.x) * ease;
  if (doorOpen && Math.abs(doorL.position.x - (S.x + 1.05 - 0.58)) < 0.012) {
    doorOpen = false;
    doorTimer = 6;
  }
}

/* ==========================================================================
   Loop
   ========================================================================== */
const clock = new THREE.Clock();

function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.getElapsedTime();

  updateRain(dt);
  updateDrips(dt);
  updateRipples(dt);
  updateGlassRain(dt);
  updateLife(t, dt);

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
