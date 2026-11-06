/**
 * NOCTURNE — real-time villa model
 * ------------------------------------------------------------
 * One low-poly, procedurally built diorama shared by four pages.
 * All UI copy and camera destinations live in the page markup.
 */

import * as THREE from "three";
import { OrbitControls } from "../vendor/OrbitControls.js";
import { EffectComposer } from "../vendor/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "../vendor/jsm/postprocessing/RenderPass.js";
import { OutlinePass } from "../vendor/jsm/postprocessing/OutlinePass.js";
import { OutputPass } from "../vendor/jsm/postprocessing/OutputPass.js";
import { CSS2DObject, CSS2DRenderer } from "../vendor/jsm/renderers/CSS2DRenderer.js";

const gsap = window.gsap;
const viewer = document.getElementById("viewer");
const canvas = document.getElementById("scene");
const captionEl = document.getElementById("current-view");
const fallbackEl = document.getElementById("viewer-fallback");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobileQuery = window.matchMedia("(max-width: 900px)");

const DEG = Math.PI / 180;
const FINAL_GLASS = 0.2;
const FINAL_GLASS_RAIL = 0.22;

/* Camera destinations ------------------------------------------------------ */
/* The model is roughly 10 × 10 world units. Each view is written as a
   target plus an orbit position; the position is pushed back on narrow
   screens so the black plinth always fits. */
const VIEWS = {
  overview:   { target: [1.2, 2.2, 0.6], position: [15.0, 10.4, 23.2] },
  architecture:{ target: [0.2, 2.25, 0.8], position: [14.7, 8.8, 20.9] },
  interior:   { target: [0.15, 2.1, 0.55], position: [13.6, 8.4, 19.4] },
  garden:     { target: [-0.1, 1.65, 1.3], position: [14.0, 8.0, 22.4] },

  living:     { target: [0.8, 1.1, 0.2], position: [5.2, 2.8, 8.0] },
  dining:     { target: [-1.0, 1.45, -0.1], position: [7.8, 4.6, 13.2] },
  bedroom:    { target: [-0.6, 4.85, -0.8], position: [10.7, 8.2, 12.4] },
  terrace:    { target: [2.0, 4.35, 0.2], position: [12.4, 8.2, 12.2] },
  stone:      { target: [-2.15, 3.35, 0.8], position: [6.6, 4.4, 7.2] },
  cantilever: { target: [0.0, 4.2, 0.2], position: [-12.4, 6.8, 14.2] },
  glass:      { target: [0.5, 3.7, 0.4], position: [15.4, 7.4, 13.0] },
  reading:    { target: [0.25, 4.55, -0.2], position: [9.0, 6.8, 9.4] },
  sofa:       { target: [-2.35, 0.9, 3.05], position: [2.4, 3.2, 8.5] },
  path:       { target: [0.6, 0.35, 3.25], position: [4.9, 4.0, 11.1] },
  shrubs:     { target: [-3.3, 0.9, 2.45], position: [-7.0, 3.2, 8.1] },

  teaRoom:    { target: [-3.65, 4.75, 0.6], position: [-10.1, 6.2, 10.8] },
  study:      { target: [4.35, 5.02, -1.72], position: [6.66, 6.10, 3.95] },
  garage:     { target: [6.55, 0.2, -0.25], position: [13.0, 6.0, 11.0] },

  lawn:       { target: [-0.4, 0.7, 2.55], position: [9.4, 5.0, 13.2] },
};

const ROOM_LABELS = [
  { roomId: "living", zh: "客厅", en: "Living", position: [0.95, 2.9, 0.25] },
  { roomId: "teaRoom", zh: "茶室", en: "Tea Room", position: [-3.65, 6.45, 0.55] },
  { roomId: "bedroom", zh: "主卧", en: "Master Suite", position: [-0.55, 6.95, -1.0] },
  { roomId: "study", zh: "书房/次卧", en: "Study", position: [4.55, 7.05, -1.0] },
  { roomId: "terrace", zh: "露台", en: "Terrace", position: [2.2, 4.62, 0.9] },
  { roomId: "garage", zh: "车库", en: "Garage", position: [6.8, 1.28, -0.5] },
  { roomId: "onsen", zh: "温泉", en: "Onsen", position: [-6.3, 2.78, 4.25] },
];

const LIGHT_PRESETS = {
  night: {
    label: "NIGHT",
    exposure: 1.18,
    environmentIntensity: 0.64,
    hemi: { color: 0x8fa6c0, groundColor: 0x1c1812, intensity: 0.72 },
    ambient: { color: 0x59657a, intensity: 0.16 },
    moon: { color: 0xc1d4ef, intensity: 2.55 },
    coolFill: { color: 0x7089a9, intensity: 0.62 },
    rim: { color: 0x9bb9d6, intensity: 0.82 },
    living: { color: 0xffb775, intensity: 16.5 },
    bedroom: { color: 0xffb474, intensity: 13 },
    reading: { color: 0xffc38c, intensity: 5 },
    tea: { color: 0xffc38c, intensity: 7.5 },
    study: { color: 0xffbd80, intensity: 8.5 },
    patio: { color: 0xffb579, intensity: 4.2 },
    stoneUplight: { color: 0xffb574, intensity: 28 },
    treeUplight: { color: 0xffa869, intensity: 18 },
    lampColor: 0xffc68b,
    lampSoftColor: 0xffd7ad,
    lampSoftOpacity: 0.75,
    glow: 1,
  },
  dusk: {
    label: "DUSK",
    exposure: 1.2,
    environmentIntensity: 0.58,
    hemi: { color: 0xffb78a, groundColor: 0x241b2a, intensity: 0.58 },
    ambient: { color: 0xffb98a, intensity: 0.08 },
    moon: { color: 0xffb06e, intensity: 1.72 },
    coolFill: { color: 0x6983b0, intensity: 0.66 },
    rim: { color: 0xffac77, intensity: 0.62 },
    living: { color: 0xffb274, intensity: 12.5 },
    bedroom: { color: 0xffac6b, intensity: 10 },
    reading: { color: 0xffc28c, intensity: 4 },
    tea: { color: 0xffb97b, intensity: 5.5 },
    study: { color: 0xffb87a, intensity: 6.2 },
    patio: { color: 0xffae68, intensity: 4.2 },
    stoneUplight: { color: 0xffa862, intensity: 22 },
    treeUplight: { color: 0xff9b5d, intensity: 14 },
    lampColor: 0xffb97b,
    lampSoftColor: 0xffc89a,
    lampSoftOpacity: 0.62,
    glow: 0.72,
  },
  day: {
    label: "DAYLIGHT",
    exposure: 1.04,
    environmentIntensity: 0.3,
    hemi: { color: 0xeaf4ff, groundColor: 0x8a7d69, intensity: 1.28 },
    ambient: { color: 0xb7cde0, intensity: 0.34 },
    moon: { color: 0xfff3df, intensity: 2.9 },
    coolFill: { color: 0xc3d9eb, intensity: 0.68 },
    rim: { color: 0xe7f2ff, intensity: 0.44 },
    living: { color: 0xd5e3ed, intensity: 1.2 },
    bedroom: { color: 0xd5e3ed, intensity: 1.0 },
    reading: { color: 0xd5e3ed, intensity: 0.6 },
    tea: { color: 0xd5e3ed, intensity: 0.35 },
    study: { color: 0xd5e3ed, intensity: 0.4 },
    patio: { color: 0xd5e3ed, intensity: 0 },
    stoneUplight: { color: 0xffe9c8, intensity: 0 },
    treeUplight: { color: 0xffe6c2, intensity: 0 },
    lampColor: 0x4b4640,
    lampSoftColor: 0x5a5348,
    lampSoftOpacity: 0.08,
    glow: 0.02,
  },
};

const LIGHT_RIG_KEYS = [
  "hemi",
  "ambient",
  "moon",
  "coolFill",
  "rim",
  "living",
  "bedroom",
  "reading",
  "tea",
  "study",
  "patio",
  "stoneUplight",
  "treeUplight",
];

const HOTSPOTS = [
  {
    id: "stone",
    title: "文化石柱",
    text: "天然文化石饰面",
    position: [-2.54, 3.35, 1.42],
    normal: [0, 0, 1],
  },
  {
    id: "terrace",
    title: "二层露台",
    text: "二层观景露台",
    position: [2.15, 4.14, 1.64],
    normal: [0, 0, 1],
  },
  {
    id: "sofa",
    title: "户外沙发",
    text: "庭院里的户外起居",
    position: [-2.78, 0.9, 2.96],
    normal: [0, 1, 0],
  },
  {
    id: "window",
    title: "主卧窗户",
    text: "全景落地窗，引入庭院夜色",
    position: [-0.35, 4.9, 0.42],
    normal: [0, 0, 1],
    requires: "glass",
  },
  {
    id: "pathLight",
    title: "路径灯",
    text: "点击依次点亮步道灯",
    activeText: "再次点击重播路径灯",
    action: "pathLights",
    position: [2.65, 0.36, 3.85],
    normal: [0, 1, 0],
  },
  {
    id: "shrubs",
    title: "庭院灌木",
    text: "点击召唤萤火虫",
    activeText: "再次点击收起萤火虫",
    action: "fireflies",
    position: [4.18, 0.76, 2.15],
    normal: [0, 1, 0],
    requires: "plants",
  },
];

const state = {
  views: {},
  currentView: "overview",
  introPlaying: false,
  introSeen: false,
  introTl: null,
  cameraTween: null,
  lights: [],
  glows: [],
  userMoved: false,
  timePreset: "night",
  lightRig: null,
  lampMaterials: [],
  layerFades: {},
  layerTweens: {},
  layerHidden: { roof: false, glass: false, plants: false },
  hotspots: [],
  hotspotLayer: null,
  exploded: false,
  explodeTl: null,
  explodeGlass: [],
  explodeUpperInterior: [],
  pathLights: [],
  pathLightTl: null,
  fireflies: null,
  blueprint: false,
  blueprintTl: null,
  blueprintMaterial: null,
  blueprintMeshes: [],
  blueprintSprites: [],
  sectionActive: false,
  roomGroups: {},
  focus: null,
  focusTween: null,
  accordion: null,
};

let lastViewerAspect = 0;

/* Utilities --------------------------------------------------------------- */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(20261105);

function canvas2d(width, height) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return { canvas: c, ctx: c.getContext("2d") };
}

function makeCanvasTexture(width, height, draw, { color = true, repeat = [1, 1] } = {}) {
  const { canvas: c, ctx } = canvas2d(width, height);
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(c);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function cloneTexture(texture, repeatX, repeatY) {
  const clone = texture.clone();
  clone.needsUpdate = true;
  clone.wrapS = THREE.RepeatWrapping;
  clone.wrapT = THREE.RepeatWrapping;
  clone.repeat.set(repeatX, repeatY);
  return clone;
}

/* Shared geometry --------------------------------------------------------- */
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitPlane = new THREE.PlaneGeometry(1, 1);
const unitCylinder = new THREE.CylinderGeometry(1, 1, 1, 12);
const leafGeometry = new THREE.IcosahedronGeometry(1, 1);
const lowLeafGeometry = new THREE.IcosahedronGeometry(1, 0);
const coneGeometry = new THREE.ConeGeometry(1, 1, 5);

/* Scene, renderer, camera ------------------------------------------------- */
let renderer;
let scene;
let camera;
let controls;
let root;
let composer;
let renderPass;
let outlinePass;
let outputPass;
let raycaster;
let pointerNdc;
let pointerDown = null;
let labelRenderer;
let labelRoot;
let fogMaterial;
let fogMesh;
const roomLabels = [];
const labelHitMeshes = [];
const labelRaycaster = new THREE.Raycaster();
const labelNdc = new THREE.Vector2();
const labelWorld = new THREE.Vector3();
const interactiveGroups = [];
const osState = {
  active: false,
  closing: false,
  shown: false,
  suspended: false,
  overlay: null,
  mainView: null,
  bootView: null,
  desktopEl: null,
  desktopOpen: false,
  activeApp: "home",
  appPanels: [],
  dockButtons: [],
  activeAppEl: null,
  menuTitleEl: null,
  windowTitleEl: null,
  desktopEnvEl: null,
  desktopAudioEl: null,
  desktopClockEl: null,
  homeEnvEl: null,
  homeAudioEl: null,
  envPreviewEl: null,
  projectDetailOpen: false,
  projectPage: 0,
  projectFilter: "all",
  projectPanelEl: null,
  projectGridEl: null,
  projectSummaryEl: null,
  projectPageInfoEl: null,
  projectPrevEl: null,
  projectNextEl: null,
  projectDetailEl: null,
  projectActionEl: null,
  projectPreviewEl: null,
  activeProjectId: null,
  previewOpen: false,
  previewEl: null,
  previewFrame: null,
  previewTitleEl: null,
  galleryDetailOpen: false,
  galleryGridEl: null,
  galleryLightboxEl: null,
  galleryFilter: "all",
  activeGalleryIndex: 0,
  selectedAudio: "rain",
  audioTimer: null,
  audioVolume: 42,
  audioPlayButton: null,
  audioVolumeInput: null,
  audioArtEl: null,
  audioTitleEl: null,
  audioSubtitleEl: null,
  audioDescriptionEl: null,
  audioCodeEl: null,
  audioTimeEl: null,
  audioDurationEl: null,
  audioProgressFillEl: null,
  audioMixEl: null,
  audioRows: [],
  blueprintView: null,
  blueprintOpen: false,
  terminalEl: null,
  progressFill: null,
  progressLabel: null,
  percentEl: null,
  clockEl: null,
  statusEl: null,
  envStatusEl: null,
  modeButtons: [],
  envButtons: [],
  audioButtons: [],
  original: null,
  cameraTween: null,
  overlayTween: null,
  terminalTl: null,
  progressTween: null,
  clockTimer: null,
  savedUserMoved: false,
  savedIntro: false,
};

let currentEnvMode = "night";
const audioTracks = { rain: false, wind: false, jazz: false };
const audioElements = {};
const environmentState = {
  pendingMode: "night",
  baseline: null,
  tween: null,
  roomKeys: ["living", "bedroom", "reading", "tea", "study"],
  backgroundWasNull: true,
};

const OS_APPS = {
  home: { label: "HOME", title: "SYSTEM OVERVIEW", meta: "SESSION 04 / PRIVATE" },
  projects: { label: "PROJECTS", title: "ARCHIVE / PROJECTS", meta: "04 ENTRIES / 2026" },
  gallery: { label: "GALLERY", title: "ARCHIVE / RENDERS", meta: "05 FRAMES / NIGHT" },
  audio: { label: "AUDIO", title: "MEDIA / AMBIENCE", meta: "03 LOOPS / LIVE" },
  environment: { label: "ENVIRONMENT", title: "CONTROL / ATMOSPHERE", meta: "NIGHT / DUSK" },
};

const portfolioData = [
  {
    id: "villa",
    index: "01",
    title: "NOCTURNE VILLA",
    category: "ARCHITECTURE / NIGHT",
    image: "assets/gallery-villa.png",
    tags: ["Architecture", "410 m²", "Three.js"],
    description:
      "A two-storey residence suspended over a black stone base. The villa is organised around a glass living room, a cantilevered tea room and a private night garden.",
    meta: "2026 / 410 M² / FOUR BEDROOMS",
  },
  {
    id: "konbini",
    index: "02",
    title: "RAINY NIGHT / KONBINI",
    category: "3D DIORAMA / THREE.JS",
    image: "assets/portfolio-konbini.png",
    tags: ["Three.js", "Cel-shaded", "Diorama"],
    description:
      "A small collectible 3D diorama of a Japanese convenience-store corner on a rainy night. The warm shop, street furniture, puddles, rain and passing traffic are built entirely with Three.js and freely orbitable.",
    meta: "THREE.JS / INTERACTIVE DIORAMA",
    isExternal: true,
    url: "previews/konbini/index.html",
  },
  {
    id: "refreshments",
    index: "03",
    title: "REFRESHMENTS",
    category: "BRAND CONCEPT / WEB",
    image: "assets/portfolio-refreshments.png",
    tags: ["HTML / CSS", "GSAP", "Concept"],
    description:
      "A cinematic concept showcase of five classic drinks — Coca-Cola, Sprite, Fanta, Minute Maid and Cherry — built with plain HTML, CSS and JavaScript plus GSAP scroll effects. Includes product close-ups, flavour meters and a match-your-drink quiz.",
    meta: "GITHUB PAGES / LIVE",
    isExternal: true,
    url: "https://czhcyber.github.io/refreshments/",
  },
  {
    id: "learning-html",
    index: "04",
    title: "PERSONAL PORTFOLIO",
    category: "PORTFOLIO / WEB",
    image: "assets/portfolio-learning.png",
    tags: ["HTML / CSS", "Vanilla JS", "Responsive"],
    description:
      "A hand-written, responsive personal site with a glassmorphism dark theme and four interactive projects: a Pomodoro study timer, a card game, a password generator and a useless machine. Includes theme persistence and accessible navigation.",
    meta: "GITHUB PAGES / LIVE",
    isExternal: true,
    url: "https://czhcyber.github.io/learning-html/",
  },
];

const OS_GALLERY = [
  {
    id: "villa",
    title: "THE VILLA / NIGHT",
    category: "exterior",
    categoryLabel: "EXTERIOR / NIGHT",
    image: "assets/gallery-villa.png",
    meta: "NOCTURNE RESIDENCE / 2026",
    description: "A white volume suspended above a black stone base, held between the hillside and the night sky.",
  },
  {
    id: "living",
    title: "LIVING ROOM / SOUTH",
    category: "interior",
    categoryLabel: "INTERIOR / SOUTH",
    image: "assets/gallery-living.png",
    meta: "LEVEL 01 / 38 M²",
    description: "The glazed living room opens to the garden; warm light gathers around the stone threshold.",
  },
  {
    id: "study",
    title: "STUDY / GUEST ROOM",
    category: "interior",
    categoryLabel: "INTERIOR / LEVEL 02",
    image: "assets/gallery-study.png",
    meta: "LEVEL 02 / 30 M²",
    description: "Walnut, paper and a single monitor. The study is the most private room in the house.",
  },
  {
    id: "bedroom",
    title: "MASTER SUITE / EAST",
    category: "interior",
    categoryLabel: "INTERIOR / LEVEL 02",
    image: "assets/gallery-bedroom.png",
    meta: "LEVEL 02 / 42 M²",
    description: "A low bed, a glass wall and the landscape beyond. The room is designed to be read in shadow.",
  },
  {
    id: "terrace",
    title: "NIGHT GARDEN / TERRACE",
    category: "exterior",
    categoryLabel: "EXTERIOR / GARDEN",
    image: "assets/gallery-terrace.png",
    meta: "LEVEL 01 / 22 M²",
    description: "Stone, grasses and path lights. The exterior is deliberately quieter than the illuminated interior.",
  },
];

const OS_AUDIO = {
  rain: {
    title: "AMBIENT RAIN",
    subtitle: "FIELD RECORDING / SOFT RAIN",
    code: "TRK-01",
    description: "A low, filtered rain loop recorded for the glass rooms. Best with the night garden in view.",
  },
  wind: {
    title: "WIND",
    subtitle: "LOW FREQUENCY / HILLSIDE",
    code: "TRK-02",
    description: "Slow wind moving through the trees and the cantilevered tea room. Keep it under the rain.",
  },
  jazz: {
    title: "JAZZ",
    subtitle: "SOFT CHORDS / LATE HOURS",
    code: "TRK-03",
    description: "A quiet four-bar progression for the late evening. Warm, unresolved and deliberately small.",
  },
};

const photoFrameState = {
  group: null,
  photo: null,
  frameMaterial: null,
  photoMaterial: null,
  fallbackBorder: null,
  spotlight: null,
  texture: null,
  input: null,
  maxWidth: 0.98,
  maxHeight: 0.68,
  hovering: false,
  lastTime: 0,
};

const onsenState = {
  group: null,
  steamPoints: null,
  steamBase: null,
  steamPhase: null,
  water: null,
  light: null,
  waterLight: null,
  waterGlow: null,
  ripples: [],
  steamOn: true,
  lightOn: true,
  time: 0,
};

const studyState = {
  screenMode: 0,
  screenRaf: null,
  screenCanvas: null,
  screenCtx: null,
  screenTexture: null,
  screenLight: null,
  screenStart: 0,
  lampOn: true,
  lampLight: null,
  lampBulb: null,
  shelfOn: false,
  shelfLight: null,
  shelfLed: null,
};

const G = {
  base: new THREE.Group(),
  site: new THREE.Group(),
  ground: new THREE.Group(),
  upper: new THREE.Group(),
  roof: new THREE.Group(),
  glass: new THREE.Group(),
  stone: new THREE.Group(),
  interior: new THREE.Group(),
  terrace: new THREE.Group(),
  plants: new THREE.Group(),
  outdoor: new THREE.Group(),
  details: new THREE.Group(),
  extensions: new THREE.Group(),
  lights: new THREE.Group(),
};

let TEX = {};
let MAT = {};
let glowTexture;

/* Basic scene helpers ----------------------------------------------------- */
function addBox(parent, w, h, d, material, x = 0, y = 0, z = 0, opts = {}) {
  const mesh = new THREE.Mesh(unitBox, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(w, h, d);
  if (opts.rotation) {
    mesh.rotation.set(
      opts.rotation[0] || 0,
      opts.rotation[1] || 0,
      opts.rotation[2] || 0
    );
  }
  mesh.castShadow = opts.cast !== false;
  mesh.receiveShadow = opts.receive !== false;
  parent.add(mesh);
  return mesh;
}

function addPlane(parent, w, h, material, x = 0, y = 0, z = 0, opts = {}) {
  const mesh = new THREE.Mesh(unitPlane, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(w, h, 1);
  if (opts.rotation) {
    mesh.rotation.set(
      opts.rotation[0] || 0,
      opts.rotation[1] || 0,
      opts.rotation[2] || 0
    );
  }
  mesh.castShadow = opts.cast === true;
  mesh.receiveShadow = opts.receive !== false;
  parent.add(mesh);
  return mesh;
}

function addGround(parent, w, d, material, x = 0, y = 0, z = 0) {
  return addPlane(parent, w, d, material, x, y, z, {
    rotation: [-Math.PI / 2, 0, 0],
    cast: false,
    receive: true,
  });
}

function addCylinder(parent, radius, height, material, x = 0, y = 0, z = 0, opts = {}) {
  const mesh = new THREE.Mesh(unitCylinder, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(radius, height, radius);
  if (opts.rotation) {
    mesh.rotation.set(
      opts.rotation[0] || 0,
      opts.rotation[1] || 0,
      opts.rotation[2] || 0
    );
  }
  mesh.castShadow = opts.cast !== false;
  mesh.receiveShadow = opts.receive !== false;
  parent.add(mesh);
  return mesh;
}

function addCylinderGeo(parent, top, bottom, height, segments, material, x, y, z, opts = {}) {
  const geometry = new THREE.CylinderGeometry(top, bottom, height, segments);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  if (opts.rotation) {
    mesh.rotation.set(
      opts.rotation[0] || 0,
      opts.rotation[1] || 0,
      opts.rotation[2] || 0
    );
  }
  mesh.castShadow = opts.cast !== false;
  mesh.receiveShadow = opts.receive !== false;
  parent.add(mesh);
  return mesh;
}

function addGlow(parent, x, y, z, color, opacity, scaleX, scaleY, scaleZ = 1) {
  const material = new THREE.SpriteMaterial({
    map: glowTexture,
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.position.set(x, y, z);
  sprite.scale.set(scaleX, scaleY, scaleZ);
  parent.add(sprite);
  state.glows.push({ sprite, target: opacity });
  return sprite;
}

function addLightPool(parent, x, z, size, opacity = 0.16, y = 0.028) {
  const material = new THREE.MeshBasicMaterial({
    map: glowTexture,
    color: 0xffb574,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const mesh = addPlane(parent, size, size, material, x, y, z, {
    rotation: [-Math.PI / 2, 0, 0],
    receive: false,
    cast: false,
  });
  mesh.renderOrder = 2;
  mesh.userData.noBlueprint = true;
  state.glows.push({ sprite: mesh, target: opacity });
  return mesh;
}

function addContactShadow(parent, w, d, x, z, opacity = 0.4) {
  const material = new THREE.MeshBasicMaterial({
    map: TEX.contactShadow,
    transparent: true,
    opacity,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = addPlane(parent, w, d, material, x, 0.035, z, {
    rotation: [-Math.PI / 2, 0, 0],
    receive: false,
    cast: false,
  });
  mesh.renderOrder = 1;
  mesh.userData.noBlueprint = true;
  return mesh;
}

/* Textures ---------------------------------------------------------------- */
function buildTextures() {
  TEX.plaster = makeCanvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#bcb8ae";
    ctx.fillRect(0, 0, w, h);
    const rand = mulberry32(4);
    for (let i = 0; i < 9000; i += 1) {
      const v = 155 + Math.floor(rand() * 50);
      ctx.fillStyle = `rgba(${v}, ${v - 3}, ${v - 8}, .16)`;
      const s = 0.5 + rand() * 1.4;
      ctx.fillRect(rand() * w, rand() * h, s, s);
    }
  }, { color: false, repeat: [3, 3] });

  const stone = makeStoneTextures();
  TEX.stone = stone.map;
  TEX.stoneBump = stone.bump;

  TEX.lawn = makeCanvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#3c4a2d";
    ctx.fillRect(0, 0, w, h);
    const rand = mulberry32(17);
    for (let i = 0; i < 9000; i += 1) {
      const green = 55 + Math.floor(rand() * 45);
      ctx.strokeStyle = `rgba(${green - 18}, ${green + 12}, ${green - 23}, ${0.08 + rand() * 0.16})`;
      ctx.lineWidth = 0.6;
      const x = rand() * w;
      const y = rand() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand() - 0.5) * 2, y - 2 - rand() * 5);
      ctx.stroke();
    }
    // Very faint mowing bands.
    for (let i = 0; i < 8; i += 1) {
      ctx.fillStyle = i % 2 ? "rgba(255,255,255,.018)" : "rgba(0,0,0,.025)";
      ctx.fillRect(0, (i * h) / 8, w, h / 8);
    }
  }, { repeat: [3.5, 3.5] });

  TEX.oak = makeCanvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#6b4a30";
    ctx.fillRect(0, 0, w, h);
    const rand = mulberry32(9);
    const plank = 64;
    for (let x = 0; x < w; x += plank) {
      const tone = 68 + Math.floor(rand() * 20);
      ctx.fillStyle = `rgb(${tone + 37}, ${tone + 14}, ${tone - 8})`;
      ctx.fillRect(x + 1, 0, plank - 2, h);
      ctx.strokeStyle = "rgba(30, 16, 8, .35)";
      ctx.strokeRect(x + 0.5, 0, plank - 1, h);
      for (let i = 0; i < 16; i += 1) {
        const y = rand() * h;
        ctx.strokeStyle = `rgba(35, 19, 10, ${0.03 + rand() * 0.1})`;
        ctx.lineWidth = 0.6 + rand();
        ctx.beginPath();
        ctx.moveTo(x + 4, y);
        ctx.bezierCurveTo(x + 20, y + 8, x + 42, y - 8, x + plank - 4, y + 2);
        ctx.stroke();
      }
    }
  }, { repeat: [2.4, 2.4] });

  TEX.deck = makeCanvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#3b2a1d";
    ctx.fillRect(0, 0, w, h);
    const rand = mulberry32(26);
    for (let y = 0; y < h; y += 42) {
      const tone = 61 + Math.floor(rand() * 16);
      ctx.fillStyle = `rgb(${tone + 16}, ${tone + 8}, ${tone - 4})`;
      ctx.fillRect(0, y + 2, w, 38);
      ctx.fillStyle = "rgba(10, 8, 5, .38)";
      ctx.fillRect(0, y, w, 2);
      for (let i = 0; i < 12; i += 1) {
        ctx.strokeStyle = `rgba(18, 11, 6, ${0.08 + rand() * 0.12})`;
        ctx.beginPath();
        ctx.moveTo(0, y + 6 + rand() * 29);
        ctx.lineTo(w, y + 6 + rand() * 29);
        ctx.stroke();
      }
    }
  }, { repeat: [2.3, 2.3] });

  TEX.path = makeCanvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#8b877d";
    ctx.fillRect(0, 0, w, h);
    const rand = mulberry32(31);
    for (let i = 0; i < 4800; i += 1) {
      const v = 100 + Math.floor(rand() * 70);
      ctx.fillStyle = `rgba(${v}, ${v - 2}, ${v - 7}, ${0.03 + rand() * 0.14})`;
      const r = 0.5 + rand() * 3.5;
      ctx.beginPath();
      ctx.arc(rand() * w, rand() * h, r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 16; i += 1) {
      ctx.strokeStyle = `rgba(45, 42, 35, ${0.04 + rand() * 0.1})`;
      ctx.beginPath();
      const y = rand() * h;
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + (rand() - 0.5) * 50);
      ctx.stroke();
    }
  }, { repeat: [1, 1] });

  TEX.terrace = makeCanvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#9c978c";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(53, 51, 46, .25)";
    ctx.lineWidth = 2;
    for (let i = 0; i <= 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo((i * w) / 4, 0);
      ctx.lineTo((i * w) / 4, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, (i * h) / 4);
      ctx.lineTo(w, (i * h) / 4);
      ctx.stroke();
    }
    const rand = mulberry32(51);
    for (let i = 0; i < 2600; i += 1) {
      ctx.fillStyle = `rgba(50, 47, 41, ${0.02 + rand() * 0.07})`;
      ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1 + rand() * 2);
    }
  }, { repeat: [3, 3] });

  TEX.contactShadow = makeCanvasTexture(256, 256, (ctx, w, h) => {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, "rgba(0,0,0,.55)");
    gradient.addColorStop(0.36, "rgba(0,0,0,.33)");
    gradient.addColorStop(0.72, "rgba(0,0,0,.09)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }, { color: false });

  glowTexture = makeCanvasTexture(256, 256, (ctx, w, h) => {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.12, "rgba(255,255,255,.9)");
    gradient.addColorStop(0.36, "rgba(255,255,255,.3)");
    gradient.addColorStop(0.7, "rgba(255,255,255,.06)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }, { color: true });

  TEX.plaque = makeCanvasTexture(1024, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(185, 170, 144, .88)";
    ctx.font = "500 30px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.letterSpacing = "10px";
    ctx.fillText("NOCTURNE   ·   MMXXVI", w / 2, h / 2 + 1);
  }, { repeat: [1, 1] });

  TEX.curtain = makeCanvasTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "rgba(203, 192, 173, .58)";
    ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 26) {
      const alpha = 0.06 + (Math.sin(x * 0.21) + 1) * 0.04;
      ctx.fillStyle = `rgba(255, 248, 233, ${alpha})`;
      ctx.fillRect(x, 0, 10 + (x % 5), h);
    }
  }, { repeat: [1, 1] });
}

function makeStoneTextures() {
  const w = 512;
  const h = 512;
  const color = canvas2d(w, h);
  const bump = canvas2d(w, h);
  const rand = mulberry32(23);
  const colors = [
    "#8c8579",
    "#7e776c",
    "#968e82",
    "#746e63",
    "#a39a8c",
    "#898175",
    "#6d685e",
  ];
  color.ctx.fillStyle = "#5a554b";
  color.ctx.fillRect(0, 0, w, h);
  bump.ctx.fillStyle = "#4b4b4b";
  bump.ctx.fillRect(0, 0, w, h);

  function paintStone(ctx, bumpCtx, x, y, width, height, tint) {
    if (width < 4 || height < 4) return;
    ctx.fillStyle = tint;
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = "rgba(255,255,255,.065)";
    ctx.fillRect(x + 1, y + 1, width - 2, 2);
    ctx.fillStyle = "rgba(25,22,18,.13)";
    ctx.fillRect(x + 1, y + height - 3, width - 2, 2);
    // A small chipped highlight, unique to each stone.
    ctx.fillStyle = "rgba(255,255,255,.045)";
    ctx.fillRect(x + 2, y + 2 + rand() * Math.max(2, height - 8), Math.max(2, width * 0.18), 1);

    const light = 150 + Math.floor(rand() * 72);
    bumpCtx.fillStyle = `rgb(${light},${light},${light})`;
    bumpCtx.fillRect(x, y, width, height);
    bumpCtx.fillStyle = "rgba(255,255,255,.28)";
    bumpCtx.fillRect(x + 1, y + 1, width - 2, 3);
    bumpCtx.fillStyle = "rgba(0,0,0,.28)";
    bumpCtx.fillRect(x + 1, y + height - 3, width - 2, 3);
  }

  let y = -26;
  while (y < h) {
    const rowH = 28 + rand() * 44;
    let x = -60 + rand() * 34;
    while (x < w) {
      const stoneW = 34 + rand() * 96;
      const jitter = (rand() - 0.5) * 8;
      paintStone(
        color.ctx,
        bump.ctx,
        x + 4,
        y + 3 + jitter,
        stoneW - 8,
        rowH - 6,
        colors[Math.floor(rand() * colors.length)]
      );
      // Occasional split faces read as stacked, cut stone rather than siding.
      if (rand() > 0.7 && stoneW > 58) {
        color.ctx.fillStyle = "rgba(40,36,29,.2)";
        color.ctx.fillRect(x + 4 + stoneW * 0.44, y + 4, 2, rowH - 8);
        bump.ctx.fillStyle = "rgba(45,45,45,.45)";
        bump.ctx.fillRect(x + 4 + stoneW * 0.44, y + 4, 2, rowH - 8);
      }
      x += stoneW + 5;
    }
    y += rowH + 5;
  }

  // Larger, irregular stones overpaint some courses and break the banding.
  for (let i = 0; i < 12; i += 1) {
    const sx = rand() * w;
    const sy = rand() * h;
    const sw = 28 + rand() * 54;
    const sh = 42 + rand() * 78;
    paintStone(
      color.ctx,
      bump.ctx,
      sx,
      sy,
      sw,
      sh,
      colors[Math.floor(rand() * colors.length)]
    );
    color.ctx.strokeStyle = "rgba(45,41,33,.26)";
    color.ctx.lineWidth = 1.4;
    color.ctx.strokeRect(sx + 0.7, sy + 0.7, sw - 1.4, sh - 1.4);
  }

  // Hairline cracks and pits.
  for (let i = 0; i < 16; i += 1) {
    const x = rand() * w;
    const y = rand() * h;
    color.ctx.strokeStyle = `rgba(25,22,17,${0.08 + rand() * 0.12})`;
    color.ctx.lineWidth = 0.7 + rand() * 0.8;
    color.ctx.beginPath();
    color.ctx.moveTo(x, y);
    color.ctx.lineTo(x + (rand() - 0.5) * 42, y + (rand() - 0.3) * 28);
    color.ctx.stroke();
  }

  for (let i = 0; i < 5000; i += 1) {
    const alpha = 0.025 + rand() * 0.08;
    color.ctx.fillStyle = `rgba(29, 26, 21, ${alpha})`;
    color.ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1 + rand() * 2);
    if (rand() > 0.55) {
      const v = 100 + Math.floor(rand() * 90);
      bump.ctx.fillStyle = `rgba(${v},${v},${v},.12)`;
      bump.ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1 + rand() * 2);
    }
  }

  const map = new THREE.CanvasTexture(color.canvas);
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const bumpMap = new THREE.CanvasTexture(bump.canvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.anisotropy = map.anisotropy;
  return { map, bump: bumpMap };
}

/* Materials --------------------------------------------------------------- */
function buildMaterials() {
  const stone = (repeatX, repeatY) =>
    new THREE.MeshStandardMaterial({
      map: cloneTexture(TEX.stone, repeatX, repeatY),
      bumpMap: cloneTexture(TEX.stoneBump, repeatX, repeatY),
      bumpScale: 0.068,
      color: 0xc5bcab,
      roughness: 0.92,
      metalness: 0.01,
      envMapIntensity: 0.35,
    });

  MAT = {
    base: new THREE.MeshStandardMaterial({
      color: 0x0f1013,
      roughness: 0.23,
      metalness: 0.52,
      envMapIntensity: 1.15,
    }),
    baseEdge: new THREE.MeshStandardMaterial({
      color: 0x4a4740,
      roughness: 0.25,
      metalness: 0.72,
      envMapIntensity: 1.2,
    }),
    white: new THREE.MeshStandardMaterial({
      color: 0xe2ded4,
      roughness: 0.72,
      metalness: 0.01,
      bumpMap: TEX.plaster,
      bumpScale: 0.012,
      envMapIntensity: 0.36,
    }),
    whiteWarm: new THREE.MeshStandardMaterial({
      color: 0xe8e3d7,
      roughness: 0.66,
      metalness: 0,
      envMapIntensity: 0.3,
    }),
    soffit: new THREE.MeshStandardMaterial({
      color: 0x282623,
      roughness: 0.82,
      metalness: 0.02,
    }),
    stone: stone(1.35, 1.4),
    stoneWall: stone(1.15, 1.1),
    limestone: new THREE.MeshStandardMaterial({
      color: 0x9d998e,
      map: TEX.path,
      roughness: 0.84,
      metalness: 0.02,
    }),
    terrace: new THREE.MeshStandardMaterial({
      color: 0xb0aa9d,
      map: TEX.terrace,
      roughness: 0.72,
      metalness: 0.02,
      envMapIntensity: 0.35,
    }),
    path: new THREE.MeshStandardMaterial({
      color: 0xbfb9ac,
      map: TEX.path,
      roughness: 0.77,
      metalness: 0.01,
    }),
    darkMetal: new THREE.MeshStandardMaterial({
      color: 0x181a1b,
      roughness: 0.3,
      metalness: 0.75,
      envMapIntensity: 0.8,
    }),
    blackMetal: new THREE.MeshStandardMaterial({
      color: 0x090a0b,
      roughness: 0.34,
      metalness: 0.7,
    }),
    brass: new THREE.MeshStandardMaterial({
      color: 0x9f8152,
      roughness: 0.33,
      metalness: 0.85,
      envMapIntensity: 1.1,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xadc0c7,
      transparent: true,
      opacity: FINAL_GLASS,
      roughness: 0.055,
      metalness: 0.05,
      envMapIntensity: 2.5,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    glassRail: new THREE.MeshPhysicalMaterial({
      color: 0xd4e9eb,
      transmission: 0.96,
      thickness: 0.035,
      ior: 1.45,
      transparent: true,
      opacity: FINAL_GLASS_RAIL,
      roughness: 0.045,
      metalness: 0,
      envMapIntensity: 2.1,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    glassDark: new THREE.MeshStandardMaterial({
      color: 0x17272b,
      transparent: true,
      opacity: 0.75,
      roughness: 0.1,
      metalness: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    teaGlass: new THREE.MeshPhysicalMaterial({
      color: 0xb6ced1,
      transmission: 1,
      roughness: 0.1,
      thickness: 0.28,
      ior: 1.45,
      transparent: true,
      opacity: 0.76,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
      envMapIntensity: 1.35,
    }),
    woodSlat: new THREE.MeshStandardMaterial({
      color: 0x745037,
      roughness: 0.4,
      metalness: 0.04,
    }),
    studyGlow: new THREE.MeshBasicMaterial({
      color: 0xffb878,
      transparent: true,
      opacity: 0.48,
      toneMapped: false,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    slabTrim: new THREE.MeshStandardMaterial({
      color: 0x08090a,
      roughness: 0.62,
      metalness: 0.18,
    }),
    shearConcrete: new THREE.MeshStandardMaterial({
      color: 0x2c2d2a,
      roughness: 0.88,
      metalness: 0.02,
    }),
    garageConcrete: new THREE.MeshStandardMaterial({
      color: 0x1c1d1b,
      roughness: 0.92,
      metalness: 0.03,
    }),
    rampConcrete: new THREE.MeshStandardMaterial({
      color: 0x3a3b36,
      roughness: 0.86,
      metalness: 0.04,
    }),
    garageDeck: new THREE.MeshStandardMaterial({
      color: 0x08090a,
      roughness: 0.7,
      metalness: 0.2,
    }),
    neon: new THREE.MeshBasicMaterial({
      color: 0x7fe6ff,
      toneMapped: false,
    }),
    carBody: new THREE.MeshStandardMaterial({
      color: 0x59636a,
      roughness: 0.26,
      metalness: 0.8,
    }),
    carGlass: new THREE.MeshStandardMaterial({
      color: 0x0b1316,
      roughness: 0.16,
      metalness: 0.45,
    }),
    carLight: new THREE.MeshBasicMaterial({
      color: 0xfff0cf,
      toneMapped: false,
    }),
    carTail: new THREE.MeshBasicMaterial({
      color: 0xff5a45,
      toneMapped: false,
    }),
    lawn: new THREE.MeshStandardMaterial({
      map: TEX.lawn,
      color: 0xa4b48b,
      roughness: 0.98,
      metalness: 0,
    }),
    soil: new THREE.MeshStandardMaterial({
      color: 0x171813,
      roughness: 1,
    }),
    gravel: new THREE.MeshStandardMaterial({
      color: 0x272720,
      roughness: 0.95,
    }),
    oak: new THREE.MeshStandardMaterial({
      map: TEX.oak,
      color: 0x8f6b4a,
      roughness: 0.66,
      metalness: 0,
    }),
    oakDark: new THREE.MeshStandardMaterial({
      color: 0x503526,
      roughness: 0.7,
      metalness: 0,
    }),
    deck: new THREE.MeshStandardMaterial({
      map: TEX.deck,
      color: 0x8b6c50,
      roughness: 0.78,
      metalness: 0,
    }),
    teak: new THREE.MeshStandardMaterial({
      color: 0x3f2d20,
      roughness: 0.76,
      metalness: 0,
    }),
    walnut: new THREE.MeshStandardMaterial({
      color: 0x2e2119,
      roughness: 0.6,
      metalness: 0,
    }),
    travertine: new THREE.MeshStandardMaterial({
      color: 0xb7ab97,
      roughness: 0.72,
      metalness: 0,
    }),
    darkStone: new THREE.MeshStandardMaterial({
      color: 0x22211e,
      roughness: 0.44,
      metalness: 0.1,
    }),
    fabric: new THREE.MeshStandardMaterial({
      color: 0xa89d8b,
      roughness: 1,
      metalness: 0,
    }),
    fabricLight: new THREE.MeshStandardMaterial({
      color: 0xc8bdab,
      roughness: 1,
      metalness: 0,
    }),
    fabricDark: new THREE.MeshStandardMaterial({
      color: 0x423b32,
      roughness: 1,
    }),
    linen: new THREE.MeshStandardMaterial({
      color: 0xd7cebd,
      roughness: 1,
    }),
    rug: new THREE.MeshStandardMaterial({
      color: 0x81776a,
      roughness: 1,
      metalness: 0,
    }),
    rugLight: new THREE.MeshStandardMaterial({
      color: 0xa99e8c,
      roughness: 1,
    }),
    rugDark: new THREE.MeshStandardMaterial({
      color: 0x0d0e0e,
      roughness: 0.96,
      metalness: 0.02,
    }),
    studyRug: new THREE.MeshStandardMaterial({
      color: 0x6e665b,
      roughness: 1,
      metalness: 0,
    }),
    ledStrip: new THREE.MeshStandardMaterial({
      color: 0x2a1c0f,
      emissive: 0xffb36b,
      emissiveIntensity: 2.8,
      roughness: 0.38,
      metalness: 0,
    }),
    bookRust: new THREE.MeshStandardMaterial({
      color: 0x6b3c2b,
      roughness: 0.82,
    }),
    bookMoss: new THREE.MeshStandardMaterial({
      color: 0x344a3a,
      roughness: 0.86,
    }),
    bookOchre: new THREE.MeshStandardMaterial({
      color: 0x8b703f,
      roughness: 0.76,
    }),
    bookSlate: new THREE.MeshStandardMaterial({
      color: 0x34414c,
      roughness: 0.82,
    }),
    bookCream: new THREE.MeshStandardMaterial({
      color: 0xb9aa90,
      roughness: 0.9,
    }),
    leaf: new THREE.MeshStandardMaterial({
      color: 0x263b25,
      roughness: 0.92,
      flatShading: true,
    }),
    leafLight: new THREE.MeshStandardMaterial({
      color: 0x3a4b2e,
      roughness: 0.92,
      flatShading: true,
    }),
    leafOlive: new THREE.MeshStandardMaterial({
      color: 0x52593a,
      roughness: 0.9,
      flatShading: true,
    }),
    bark: new THREE.MeshStandardMaterial({
      color: 0x3b2c20,
      roughness: 0.95,
    }),
    warmGlow: new THREE.MeshBasicMaterial({
      color: 0xffc68b,
      toneMapped: false,
    }),
    warmGlowSoft: new THREE.MeshBasicMaterial({
      color: 0xffd7ad,
      transparent: true,
      opacity: 0.75,
      toneMapped: false,
      depthWrite: false,
    }),
    coolGlow: new THREE.MeshBasicMaterial({
      color: 0x9bb8c8,
      toneMapped: false,
    }),
    curtain: new THREE.MeshStandardMaterial({
      color: 0xcfc5b2,
      map: TEX.curtain,
      transparent: true,
      opacity: 0.46,
      roughness: 0.92,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    art: new THREE.MeshStandardMaterial({
      color: 0x6f6656,
      roughness: 0.9,
    }),
    artLight: new THREE.MeshStandardMaterial({
      color: 0x9e9078,
      roughness: 0.88,
    }),
  };
}

/* Environment map --------------------------------------------------------- */
function buildEnvironment() {
  const { canvas: c, ctx } = canvas2d(1024, 512);
  const sky = ctx.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, "#05070b");
  sky.addColorStop(0.42, "#10161c");
  sky.addColorStop(0.58, "#171b1e");
  sky.addColorStop(1, "#050506");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1024, 512);

  const moon = ctx.createRadialGradient(210, 155, 2, 210, 155, 140);
  moon.addColorStop(0, "rgba(214,228,247,.95)");
  moon.addColorStop(0.12, "rgba(161,184,212,.38)");
  moon.addColorStop(0.45, "rgba(78,97,119,.1)");
  moon.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = moon;
  ctx.fillRect(0, 0, 1024, 512);

  // Warm architectural reflections.
  const warm = ctx.createLinearGradient(520, 235, 530, 460);
  warm.addColorStop(0, "rgba(255,190,123,.7)");
  warm.addColorStop(0.2, "rgba(228,145,79,.24)");
  warm.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = warm;
  ctx.fillRect(492, 225, 110, 240);
  ctx.fillStyle = "rgba(255, 197, 132, .22)";
  ctx.fillRect(700, 330, 72, 95);
  ctx.fillStyle = "rgba(143, 169, 186, .12)";
  ctx.fillRect(0, 320, 280, 70);

  const texture = new THREE.CanvasTexture(c);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(texture).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.64;
  texture.dispose();
  pmrem.dispose();
}

/* Base -------------------------------------------------------------------- */
function buildBase() {
  addBox(G.base, 10, 0.56, 10, MAT.base, 0, -0.28, 0, {
    cast: true,
    receive: true,
  });
  addBox(G.base, 9.7, 0.12, 9.7, MAT.baseEdge, 0, -0.005, 0, {
    cast: false,
    receive: true,
  });

  // Hairline edge around the top, so the black plinth reads against the night.
  addBox(G.base, 10.02, 0.018, 0.08, MAT.baseEdge, 0, 0.004, -4.96, {
    cast: false,
    receive: false,
  });
  addBox(G.base, 10.02, 0.018, 0.08, MAT.baseEdge, 0, 0.004, 4.96, {
    cast: false,
    receive: false,
  });
  addBox(G.base, 0.08, 0.018, 10.02, MAT.baseEdge, -4.96, 0.004, 0, {
    cast: false,
    receive: false,
  });
  addBox(G.base, 0.08, 0.018, 10.02, MAT.baseEdge, 4.96, 0.004, 0, {
    cast: false,
    receive: false,
  });

  const plaqueMaterial = new THREE.MeshBasicMaterial({
    map: TEX.plaque,
    transparent: true,
    opacity: 0.74,
    depthWrite: false,
    toneMapped: false,
  });
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.31), plaqueMaterial);
  plaque.position.set(0, -0.31, 5.006);
  G.base.add(plaque);

  addGlow(G.base, 0, -0.7, 0, 0x8b7658, 0.04, 14, 2.4);
}

/* Site, landscape, outdoor furniture ------------------------------------- */
function buildSite() {
  addGround(G.site, 9.25, 9.25, MAT.lawn, 0, 0.012, 0);

  // Dark planted beds around the perimeter.
  addGround(G.site, 8.9, 0.95, MAT.soil, 0, 0.022, -4.05);
  addGround(G.site, 0.95, 8.2, MAT.soil, -4.2, 0.022, 0.0);
  addGround(G.site, 0.8, 3.1, MAT.soil, 4.25, 0.022, 2.2);
  addBox(G.site, 0.82, 0.07, 8.1, MAT.gravel, -4.22, 0.045, 0.0, {
    cast: false,
  });

  buildPath();
  buildOutdoorDeck();

  // Stone framing around the foot of the house.
  addBox(G.site, 6.25, 0.22, 4.85, MAT.limestone, 0.1, 0.17, -0.7, {
    cast: true,
    receive: true,
  });

  // Main steps.
  addBox(G.site, 2.8, 0.14, 0.52, MAT.limestone, 1.4, 0.08, 2.02, {
    cast: true,
  });
  addBox(G.site, 2.45, 0.14, 0.42, MAT.limestone, 1.4, 0.22, 1.66, {
    cast: true,
  });

  // Low stone garden wall opposite the entry.
  addBox(G.site, 0.32, 0.48, 2.1, MAT.stoneWall, -3.86, 0.24, 0.5, {
    cast: true,
  });
  addBox(G.site, 0.42, 0.06, 2.25, MAT.limestone, -3.86, 0.5, 0.5, {
    cast: true,
  });
}

function buildPath() {
  const slabs = [
    [1.45, 4.24, 1.25, 0.48, -2],
    [1.58, 3.71, 1.1, 0.44, 2],
    [1.29, 3.18, 1.32, 0.48, -1],
    [1.48, 2.64, 1.05, 0.44, 2],
    [1.25, 2.13, 1.22, 0.5, -1],
  ];
  // Gravel joints between the pavers.
  addBox(G.site, 1.9, 0.016, 3.0, MAT.gravel, 1.4, 0.035, 3.1, {
    cast: false,
    receive: true,
  });
  slabs.forEach(([x, z, w, d, rot]) => {
    addBox(G.site, w, 0.06, d, MAT.path, x, 0.056, z, {
      rotation: [0, rot * DEG, 0],
      cast: true,
      receive: true,
    });
    addContactShadow(G.site, w * 1.3, d * 1.6, x, z, 0.2);
  });
}

function buildOutdoorDeck() {
  const deckX = -2.65;
  const deckZ = 3.18;
  const deckW = 2.7;
  const deckD = 2.02;

  addBox(G.outdoor, deckW, 0.1, deckD, MAT.deck, deckX, 0.07, deckZ, {
    cast: true,
    receive: true,
  });

  // A slim edge around the timber deck.
  addBox(G.outdoor, deckW + 0.08, 0.12, 0.07, MAT.teak, deckX, 0.075, deckZ - deckD / 2, {
    cast: true,
  });
  addBox(G.outdoor, deckW + 0.08, 0.12, 0.07, MAT.teak, deckX, 0.075, deckZ + deckD / 2, {
    cast: true,
  });

  addOutdoorSofa(deckX - 0.2, deckZ - 0.3);
  addOutdoorTable(deckX + 0.2, deckZ + 0.48);
  addContactShadow(G.outdoor, 3.4, 2.5, deckX, deckZ, 0.34);

  // Small lantern on the table.
  addBox(G.outdoor, 0.16, 0.28, 0.16, MAT.brass, deckX + 0.2, 0.49, deckZ + 0.48, {
    cast: true,
  });
  addBox(G.outdoor, 0.12, 0.12, 0.12, MAT.warmGlow, deckX + 0.2, 0.63, deckZ + 0.48, {
    cast: false,
  });
  addGlow(G.outdoor, deckX + 0.2, 0.64, deckZ + 0.48, 0xffbb78, 0.45, 0.9, 0.8);
  addLightPool(G.outdoor, deckX + 0.2, deckZ + 0.48, 1.55, 0.12, 0.14);
}

function addOutdoorSofa(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0.12, z);
  G.outdoor.add(group);

  addBox(group, 2.35, 0.28, 0.92, MAT.teak, 0, 0.16, 0, { cast: true });
  addBox(group, 2.16, 0.18, 0.78, MAT.fabricLight, 0, 0.38, 0.03, { cast: true });
  for (let i = 0; i < 3; i += 1) {
    addBox(group, 0.67, 0.15, 0.7, MAT.fabricLight, -0.72 + i * 0.72, 0.5, 0.03, {
      cast: true,
    });
    addBox(group, 0.62, 0.5, 0.14, MAT.fabric, -0.72 + i * 0.72, 0.66, -0.4, {
      rotation: [-8 * DEG, 0, 0],
      cast: true,
    });
  }
  addBox(group, 0.16, 0.44, 0.9, MAT.teak, -1.12, 0.36, 0, { cast: true });
  addBox(group, 0.16, 0.44, 0.9, MAT.teak, 1.12, 0.36, 0, { cast: true });
  addBox(group, 0.36, 0.28, 0.12, MAT.fabricDark, 0.75, 0.68, -0.34, {
    rotation: [-9 * DEG, 0, 0],
    cast: true,
  });
}

function addOutdoorTable(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0.12, z);
  G.outdoor.add(group);
  addBox(group, 1.02, 0.09, 0.6, MAT.darkStone, 0, 0.42, 0, { cast: true });
  addBox(group, 0.07, 0.38, 0.07, MAT.darkMetal, -0.36, 0.2, -0.18, { cast: true });
  addBox(group, 0.07, 0.38, 0.07, MAT.darkMetal, 0.36, 0.2, -0.18, { cast: true });
  addBox(group, 0.07, 0.38, 0.07, MAT.darkMetal, -0.36, 0.2, 0.18, { cast: true });
  addBox(group, 0.07, 0.38, 0.07, MAT.darkMetal, 0.36, 0.2, 0.18, { cast: true });
  addBox(group, 0.26, 0.04, 0.18, MAT.brass, 0.24, 0.48, 0.04, { cast: true });
}

/* House ------------------------------------------------------------------- */
function buildHouse() {
  buildGroundFloor();
  buildUpperFloor();
  buildRoof();
  buildGlass();
  buildStoneColumn();
  buildTerrace();
  buildInterior();
}

function buildGroundFloor() {
  // Floor plate and warm oak finish inside.
  addBox(G.ground, 5.7, 0.16, 4.12, MAT.white, 0.1, 0.36, -0.7, {
    cast: true,
    receive: true,
  });
  addGround(G.interior, 5.38, 3.78, MAT.oak, 0.1, 0.447, -0.72);

  // Back and left walls.
  addBox(G.ground, 5.7, 2.95, 0.16, MAT.white, 0.1, 1.92, -2.72, {
    cast: true,
    receive: true,
  });
  addBox(G.ground, 0.16, 2.95, 4.04, MAT.white, -2.69, 1.92, -0.7, {
    cast: true,
    receive: true,
  });
  addBox(G.ground, 0.16, 2.95, 1.22, MAT.white, 2.89, 1.92, -2.15, {
    cast: true,
    receive: true,
  });

  // White header and deep shadow reveal under the cantilever.
  addBox(G.ground, 5.74, 0.3, 0.16, MAT.white, 0.1, 3.25, 1.27, {
    cast: true,
  });
  addBox(G.ground, 5.58, 0.06, 0.04, MAT.darkMetal, 0.1, 3.08, 1.3, {
    cast: false,
  });

  // Ground-floor ceiling and terrace structure.
  addBox(G.ground, 6.15, 0.25, 4.7, MAT.white, 0.1, 3.51, -0.7, {
    cast: true,
    receive: true,
  });
  addBox(G.ground, 6.18, 0.07, 4.66, MAT.soffit, 0.1, 3.37, -0.7, {
    cast: false,
  });
  addBox(G.ground, 6.18, 0.04, 0.08, MAT.darkMetal, 0.1, 3.625, 1.57, {
    cast: false,
  });

  // A discreet entrance detail.
  addBox(G.ground, 0.035, 1.14, 0.035, MAT.brass, 2.2, 1.72, 1.37, {
    cast: false,
  });
  addBox(G.ground, 1.24, 0.035, 0.04, MAT.darkMetal, 1.83, 2.7, 1.36, {
    cast: false,
  });

  // Soffit downlights (visible but inexpensive).
  [-1.9, -0.2, 1.5].forEach((x) => {
    addCylinder(G.ground, 0.055, 0.035, MAT.warmGlow, x, 3.34, 1.55, {
      cast: false,
      receive: false,
    });
    addGlow(G.details, x, 3.28, 1.66, 0xffc083, 0.22, 0.55, 0.4);
  });

  // Curtains just inside the glass.
  addCurtain(-2.23, 1.05);
  addCurtain(2.42, 1.05);
}

function addCurtain(x, z) {
  for (let i = 0; i < 2; i += 1) {
    const panel = addPlane(
      G.interior,
      0.34,
      2.62,
      MAT.curtain,
      x + i * 0.19,
      1.75,
      z,
      { rotation: [0, 0, 0], receive: false, cast: false }
    );
    panel.renderOrder = 3;
  }
}

function buildUpperFloor() {
  // Upper floor plate.
  addBox(G.upper, 4.0, 0.2, 3.15, MAT.white, -0.78, 3.72, -1.3, {
    cast: true,
    receive: true,
  });
  addGround(G.interior, 3.66, 2.84, MAT.oak, -0.78, 3.832, -1.3);

  // Back and left walls.
  addBox(G.upper, 4.0, 2.55, 0.15, MAT.white, -0.78, 5.0, -2.72, {
    cast: true,
    receive: true,
  });
  addBox(G.upper, 0.15, 2.55, 3.05, MAT.white, -2.69, 5.0, -1.28, {
    cast: true,
    receive: true,
  });
  addBox(G.upper, 0.15, 2.55, 1.18, MAT.white, 1.17, 5.0, -2.12, {
    cast: true,
    receive: true,
  });

  // The front beam of the white upper box.
  addBox(G.upper, 4.05, 0.28, 0.14, MAT.white, -0.78, 6.17, 0.24, {
    cast: true,
  });
  addBox(G.upper, 0.14, 2.6, 0.15, MAT.white, -2.69, 5.0, 0.19, {
    cast: true,
  });

  // Shadow reveals around the white volume.
  addBox(G.upper, 4.16, 0.045, 0.04, MAT.darkMetal, -0.78, 3.84, 0.32, {
    cast: false,
  });
  addBox(G.upper, 4.16, 0.05, 0.04, MAT.darkMetal, -0.78, 6.05, 0.32, {
    cast: false,
  });

  // A quiet white fascia closes the gap beneath the floating roof.
  addBox(G.upper, 4.12, 0.17, 0.14, MAT.white, -0.78, 6.36, 0.22, {
    cast: true,
  });
  addBox(G.upper, 4.12, 0.17, 0.14, MAT.white, -0.78, 6.36, -2.7, {
    cast: true,
  });
  addBox(G.upper, 0.14, 0.17, 3.05, MAT.white, -2.7, 6.36, -1.25, {
    cast: true,
  });
  addBox(G.upper, 0.14, 0.17, 2.9, MAT.white, 1.17, 6.36, -1.28, {
    cast: true,
  });

  // Bedroom curtains.
  addPlane(G.interior, 0.3, 2.25, MAT.curtain, -2.26, 5.02, 0.12, {
    receive: false,
    cast: false,
  }).renderOrder = 3;
  addPlane(G.interior, 0.3, 2.25, MAT.curtain, 0.91, 5.02, 0.12, {
    receive: false,
    cast: false,
  }).renderOrder = 3;

  buildUpperGlassFrames();
}

function buildUpperGlassFrames() {
  const frameZ = 0.27;
  [-2.35, -1.1, 0.18, 0.74].forEach((x) => {
    addBox(G.glass, 0.04, 2.3, 0.055, MAT.darkMetal, x, 5.0, frameZ, {
      cast: false,
    });
  });
  addBox(G.glass, 3.82, 0.04, 0.055, MAT.darkMetal, -0.78, 3.88, frameZ, {
    cast: false,
  });
  addBox(G.glass, 3.82, 0.04, 0.055, MAT.darkMetal, -0.78, 6.05, frameZ, {
    cast: false,
  });

  const frameX = 1.21;
  [-2.55, -1.65, -0.72, 0.14].forEach((z) => {
    addBox(G.glass, 0.055, 2.3, 0.04, MAT.darkMetal, frameX, 5.0, z, {
      cast: false,
    });
  });
  addBox(G.glass, 0.055, 0.04, 2.75, MAT.darkMetal, frameX, 3.88, -1.3, {
    cast: false,
  });
  addBox(G.glass, 0.055, 0.04, 2.75, MAT.darkMetal, frameX, 6.05, -1.3, {
    cast: false,
  });
}

function buildRoof() {
  addBox(G.roof, 4.2, 0.2, 3.45, MAT.white, -0.76, 6.52, -1.27, {
    cast: true,
    receive: true,
  });
  // Slim dark edge instead of a dark roof deck: the white roof should catch
  // the moon and read as the house's fifth elevation.
  addBox(G.roof, 4.26, 0.035, 0.055, MAT.darkMetal, -0.76, 6.625, 0.49, {
    cast: false,
  });
  addBox(G.roof, 0.055, 0.035, 3.48, MAT.darkMetal, 1.33, 6.625, -1.27, {
    cast: false,
  });
  addBox(G.roof, 4.26, 0.05, 0.05, MAT.soffit, -0.76, 6.4, 0.45, {
    cast: false,
  });
  // A sliver of roof glazing / skylight.
  addBox(G.roof, 0.62, 0.025, 1.35, MAT.glassDark, -1.55, 6.655, -1.4, {
    cast: false,
    receive: false,
  });
  addBox(G.roof, 0.68, 0.025, 0.025, MAT.darkMetal, -1.55, 6.67, -2.08, {
    cast: false,
  });
  addBox(G.roof, 0.68, 0.025, 0.025, MAT.darkMetal, -1.55, 6.67, -0.72, {
    cast: false,
  });

  buildTopRoofRail();
}

function buildTopRoofRail() {
  // Slim frameless glass at the roof edge, matching the terrace balustrade.
  const bottom = 6.65;
  const height = 0.62;
  const top = bottom + height;
  const frontZ = 0.6;
  addPlane(G.roof, 4.2, height, MAT.glassRail, -0.805, bottom + height / 2, frontZ, {
    receive: false,
    cast: false,
  }).renderOrder = 2;
  addBox(G.roof, 4.24, 0.012, 0.025, MAT.darkMetal, -0.805, bottom + 0.006, frontZ, {
    cast: false,
  });
  addBox(G.roof, 4.24, 0.018, 0.018, MAT.darkMetal, -0.805, top, frontZ, {
    cast: false,
  });
}

function buildGlass() {
  const bottom = 0.46;
  const top = 3.1;
  const height = top - bottom;
  const frontZ = 1.32;
  const frontPanels = [
    [-2.67, 1.2],
    [-1.41, 1.2],
    [-0.15, 1.2],
    [1.11, 1.2],
    [2.37, 0.48],
  ];
  frontPanels.forEach(([x, w]) => {
    addPlane(G.glass, w, height, MAT.glass, x + w / 2, (bottom + top) / 2, frontZ, {
      receive: false,
      cast: false,
    }).renderOrder = 2;
  });

  // Sliding entry leaf, slightly proud of the main facade.
  addPlane(G.glass, 1.14, height - 0.04, MAT.glass, 1.93, (bottom + top) / 2, 1.355, {
    receive: false,
    cast: false,
  }).renderOrder = 2;
  addBox(G.glass, 0.035, height - 0.08, 0.035, MAT.brass, 2.46, 1.74, 1.38, {
    cast: false,
  });

  // Vertical and horizontal window frames.
  [-2.7, -1.47, -0.21, 1.05, 2.31, 2.86].forEach((x) => {
    addBox(G.glass, 0.042, height + 0.04, 0.055, MAT.darkMetal, x, (bottom + top) / 2, 1.33, {
      cast: false,
    });
  });
  addBox(G.glass, 5.62, 0.035, 0.055, MAT.darkMetal, 0.08, bottom, 1.33, {
    cast: false,
  });
  addBox(G.glass, 5.62, 0.035, 0.055, MAT.darkMetal, 0.08, top, 1.33, {
    cast: false,
  });
  addBox(G.glass, 5.62, 0.03, 0.055, MAT.darkMetal, 0.08, 2.78, 1.33, {
    cast: false,
  });

  // Right-hand glass.
  const rightZ = [-1.48, -0.23, 1.03];
  rightZ.slice(0, -1).forEach((z, i) => {
    addPlane(
      G.glass,
      rightZ[i + 1] - z,
      height,
      MAT.glass,
      2.905,
      (bottom + top) / 2,
      z + (rightZ[i + 1] - z) / 2,
      { rotation: [0, Math.PI / 2, 0], receive: false, cast: false }
    ).renderOrder = 2;
  });
  rightZ.forEach((z) => {
    addBox(G.glass, 0.052, height + 0.04, 0.042, MAT.darkMetal, 2.91, (bottom + top) / 2, z, {
      cast: false,
    });
  });
  addBox(G.glass, 0.052, 0.035, 2.7, MAT.darkMetal, 2.91, bottom, -0.22, {
    cast: false,
  });
  addBox(G.glass, 0.052, 0.035, 2.7, MAT.darkMetal, 2.91, top, -0.22, {
    cast: false,
  });
  addBox(G.glass, 0.052, 0.03, 2.7, MAT.darkMetal, 2.91, 2.78, -0.22, {
    cast: false,
  });

  // Upper glass front and right return.
  const upperBottom = 3.89;
  const upperTop = 6.03;
  const upperH = upperTop - upperBottom;
  const upperFrontZ = 0.325;
  [
    [-2.65, 1.1],
    [-1.52, 1.1],
    [-0.39, 1.1],
    [0.74, 0.41],
  ].forEach(([x, w]) => {
    addPlane(G.glass, w, upperH, MAT.glass, x + w / 2, (upperBottom + upperTop) / 2, upperFrontZ, {
      receive: false,
      cast: false,
    }).renderOrder = 2;
  });
  [
    [-2.66, upperH],
    [-1.57, upperH],
    [-0.44, upperH],
    [0.69, upperH],
  ].forEach(([x, h]) => {
    // This loop intentionally draws only the verticals; the panels above
    // already provide the transparent surface.
    addBox(G.glass, 0.042, h + 0.04, 0.055, MAT.darkMetal, x, (upperBottom + upperTop) / 2, 0.33, {
      cast: false,
    });
  });
  addBox(G.glass, 3.7, 0.035, 0.055, MAT.darkMetal, -0.9, upperBottom, 0.33, {
    cast: false,
  });
  addBox(G.glass, 3.7, 0.035, 0.055, MAT.darkMetal, -0.9, upperTop, 0.33, {
    cast: false,
  });

  [
    [-2.55, -1.56],
    [-1.56, -0.57],
    [-0.57, 0.15],
  ].forEach(([z0, z1]) => {
    addPlane(
      G.glass,
      z1 - z0,
      upperH,
      MAT.glass,
      1.245,
      (upperBottom + upperTop) / 2,
      z0 + (z1 - z0) / 2,
      { rotation: [0, Math.PI / 2, 0], receive: false, cast: false }
    ).renderOrder = 2;
  });
  [-2.62, -1.64, -0.65, 0.22].forEach((z) => {
    addBox(G.glass, 0.055, upperH + 0.04, 0.042, MAT.darkMetal, 1.25, (upperBottom + upperTop) / 2, z, {
      cast: false,
    });
  });
  addBox(G.glass, 0.055, 0.035, 2.9, MAT.darkMetal, 1.25, upperBottom, -1.2, {
    cast: false,
  });
  addBox(G.glass, 0.055, 0.035, 2.9, MAT.darkMetal, 1.25, upperTop, -1.2, {
    cast: false,
  });

  addGlow(G.details, 0.0, 1.9, 1.58, 0xffbd80, 0.12, 4.4, 2.1);
  addGlow(G.details, -0.7, 4.94, 0.49, 0xffbd80, 0.1, 3.4, 1.55);
  addGlow(G.details, 2.35, 1.96, 1.58, 0xffc389, 0.08, 1.5, 1.8);
}

function buildStoneColumn() {
  // The hand-laid stone blade is the one piece of visual weight in the house.
  addBox(G.stone, 0.74, 6.05, 0.68, MAT.stone, -2.54, 3.32, 0.98, {
    cast: true,
    receive: true,
  });
  addBox(G.stone, 0.82, 0.09, 0.76, MAT.limestone, -2.54, 6.37, 0.98, {
    cast: true,
  });
  addBox(G.stone, 0.82, 0.08, 0.76, MAT.darkStone, -2.54, 0.31, 0.98, {
    cast: true,
  });
  addBox(G.stone, 0.78, 0.04, 0.72, MAT.darkMetal, -2.54, 6.42, 0.98, {
    cast: false,
  });

  // A short continuation of the stone language at the base.
  addBox(G.stone, 0.52, 0.55, 1.1, MAT.stoneWall, -2.54, 0.42, 1.83, {
    cast: true,
  });

  // A low stone planter at the foot of the blade.
  addBox(G.stone, 0.9, 0.34, 0.58, MAT.stoneWall, -2.54, 0.15, 2.3, {
    cast: true,
  });

  // A shorter stone pier at the right-hand entrance, echoing the heavier
  // stacked-stone language in the reference without closing the glass corner.
  addBox(G.stone, 0.5, 3.3, 0.52, MAT.stoneWall, 2.68, 2.1, 1.04, {
    cast: true,
    receive: true,
  });
  addBox(G.stone, 0.58, 0.07, 0.6, MAT.limestone, 2.68, 3.78, 1.04, {
    cast: true,
  });
  addBox(G.stone, 0.54, 0.06, 0.56, MAT.darkStone, 2.68, 0.47, 1.04, {
    cast: true,
  });

  // A handful of proud, irregular stones catch the uplight and break the
  // otherwise too-even surface of the blade.
  [
    [-2.68, 0.92, 0.29, 0.13, 0.34],
    [-2.35, 1.66, 0.18, 0.09, 0.26],
    [-2.61, 2.46, 0.25, 0.2, 0.38],
    [-2.37, 3.12, 0.2, 0.06, 0.3],
    [-2.66, 3.92, 0.2, 0.16, 0.4],
    [-2.42, 4.72, 0.18, 0.12, 0.27],
    [-2.6, 5.48, 0.22, 0.18, 0.31],
  ].forEach(([x, y, w, h, d]) => {
    addBox(G.stone, w, h, d, MAT.stone, x, y, 1.335, {
      cast: true,
      receive: true,
    });
  });
}

function buildTerrace() {
  // Stone deck over the ground-floor roof: an L around the upper box.
  addBox(G.terrace, 2.1, 0.035, 4.2, MAT.terrace, 2.1, 3.65, -0.72, {
    cast: false,
    receive: true,
  });
  addBox(G.terrace, 3.74, 0.035, 1.32, MAT.terrace, -0.88, 3.65, 0.9, {
    cast: false,
    receive: true,
  });

  // Glass balustrade on the two open sides.
  addGlassRailing();
  addTerraceFurniture();
}

function addGlassRailing() {
  const bottom = 3.68;
  const height = 0.74;
  const top = bottom + height;

  // Frameless glass: one continuous pane per side, with no intermediate
  // mullions and only a hairline handrail on top.
  const frontZ = 1.59;
  addPlane(G.terrace, 5.54, height, MAT.glassRail, 0.15, bottom + height / 2, frontZ, {
    receive: false,
    cast: false,
  }).renderOrder = 2;
  addBox(G.terrace, 5.58, 0.012, 0.025, MAT.darkMetal, 0.15, bottom + 0.006, frontZ, {
    cast: false,
  });
  addBox(G.terrace, 5.58, 0.018, 0.018, MAT.darkMetal, 0.15, top, frontZ, {
    cast: false,
  });
}

function addTerraceFurniture() {
  // The long lounge now sits on the new study balcony. The old terrace keeps
  // a slim side table and planter as the quieter, shaded counterpoint.
  addCylinder(G.terrace, 0.19, 0.045, MAT.darkStone, 2.9, 3.82, 0.05, {
    cast: true,
  });
  addCylinder(G.terrace, 0.024, 0.28, MAT.darkMetal, 2.9, 3.67, 0.05, {
    cast: true,
  });

  addBox(G.terrace, 0.44, 0.42, 0.44, MAT.darkStone, 2.9, 3.88, -2.3, {
    cast: true,
  });
  makeBush(2.9, -2.3, 0.34, MAT.leafOlive, 4.08, G.terrace);
}

/* Interiors --------------------------------------------------------------- */
function buildInterior() {
  buildGroundInterior();
  buildUpperInterior();
  buildInteriorLightPanels();
}

function captureInteriorRoom(key, name, start) {
  const group = new THREE.Group();
  group.name = name;
  group.userData.roomId = key;
  const children = G.interior.children.splice(start);
  group.add(...children);
  G.interior.add(group);
  state.roomGroups[key] = group;
  return group;
}

function buildGroundInterior() {
  // Living room. The box rug sits above the floor plane and lets the sofa
  // rest on a clean, dark surface instead of clipping into the timber.
  const livingStart = G.interior.children.length;
  addGround(G.interior, 2.8, 2.1, MAT.rug, 0.95, 0.458, 0.0);
  addBox(G.interior, 3.0, 0.035, 2.2, MAT.rugDark, 1.05, 0.466, -0.55, {
    cast: false,
    receive: true,
  });
  addSofa(1.1, -0.55);
  addBox(G.interior, 1.4, 0.11, 0.68, MAT.darkStone, 1.12, 0.76, 0.32, {
    cast: true,
  });
  addBox(G.interior, 0.08, 0.31, 0.08, MAT.brass, 0.58, 0.57, 0.11, { cast: true });
  addBox(G.interior, 0.08, 0.31, 0.08, MAT.brass, 1.66, 0.57, 0.11, { cast: true });
  addBox(G.interior, 0.08, 0.31, 0.08, MAT.brass, 0.58, 0.57, 0.55, { cast: true });
  addBox(G.interior, 0.08, 0.31, 0.08, MAT.brass, 1.66, 0.57, 0.55, { cast: true });
  addBox(G.interior, 0.32, 0.045, 0.22, MAT.artLight, 1.0, 0.83, 0.34, {
    cast: true,
  });

  // A single sofa keeps the room uncluttered; the secondary lounge chair
  // that used to sit in front of it has been removed.
  addFloorLamp(2.27, -0.17, 1.9);
  captureInteriorRoom("living", "Living Room", livingStart);

  // Dining table, four chairs and the kitchen along the back wall.
  const diningStart = G.interior.children.length;
  addDining(-1.35, -0.45);
  addKitchen();
  captureInteriorRoom("dining", "Kitchen & Dining", diningStart);

  // Reading corner.
  const readingStart = G.interior.children.length;
  addReadingNook();
  addIndoorPlant(2.4, -2.2, 1.1);
  captureInteriorRoom("reading", "Reading Corner", readingStart);

  addContactShadow(G.interior, 5.0, 3.5, 1.1, -0.25, 0.15);
}

function addSofa(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0.5, z);
  G.interior.add(group);
  addBox(group, 2.4, 0.3, 0.92, MAT.fabricDark, 0, 0.15, 0, { cast: false });
  addBox(group, 2.2, 0.19, 0.78, MAT.fabricLight, 0, 0.39, 0.02, { cast: false });
  for (let i = 0; i < 3; i += 1) {
    addBox(group, 0.67, 0.13, 0.7, MAT.fabricLight, -0.72 + i * 0.72, 0.54, 0.02, {
      cast: false,
    });
    addBox(group, 0.64, 0.52, 0.16, MAT.fabricLight, -0.72 + i * 0.72, 0.7, -0.4, {
      rotation: [-7 * DEG, 0, 0],
      cast: false,
    });
  }
  addBox(group, 0.15, 0.45, 0.9, MAT.fabricDark, -1.14, 0.39, 0, { cast: false });
  addBox(group, 0.15, 0.45, 0.9, MAT.fabricDark, 1.14, 0.39, 0, { cast: false });
  addBox(group, 0.34, 0.1, 0.55, MAT.teak, -0.95, 0.055, 0, { cast: false });
  addBox(group, 0.34, 0.1, 0.55, MAT.teak, 0.95, 0.055, 0, { cast: false });
  addBox(group, 0.38, 0.38, 0.13, MAT.rugLight, 0.7, 0.72, -0.31, {
    rotation: [-8 * DEG, 0, -4 * DEG],
    cast: false,
  });
}

function addArmchair(x, z, rotationY, { scale = 1 } = {}) {
  const group = new THREE.Group();
  group.position.set(x, 0.47, z);
  group.rotation.y = rotationY;
  group.scale.setScalar(scale);
  G.interior.add(group);
  addBox(group, 0.74, 0.25, 0.72, MAT.fabricDark, 0, 0.16, 0, { cast: false });
  addBox(group, 0.66, 0.16, 0.62, MAT.fabricLight, 0, 0.34, 0.03, { cast: false });
  addBox(group, 0.66, 0.58, 0.14, MAT.fabricLight, 0, 0.56, -0.28, {
    rotation: [-8 * DEG, 0, 0],
    cast: false,
  });
  addBox(group, 0.1, 0.36, 0.66, MAT.fabricLight, -0.32, 0.4, 0, { cast: false });
  addBox(group, 0.1, 0.36, 0.66, MAT.fabricLight, 0.32, 0.4, 0, { cast: false });
}

function addFloorLamp(x, z, height) {
  addCylinder(G.interior, 0.018, height, MAT.darkMetal, x, 0.47 + height / 2, z, {
    cast: false,
  });
  addCylinder(G.interior, 0.16, 0.04, MAT.darkMetal, x, 0.49, z, { cast: false });
  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.27, 0.26, 16, 1, true),
    MAT.linen
  );
  shade.position.set(x, 0.47 + height - 0.04, z);
  shade.castShadow = false;
  G.interior.add(shade);
  addCylinder(G.interior, 0.08, 0.03, MAT.warmGlow, x, 0.47 + height - 0.17, z, {
    cast: false,
    receive: false,
  });
  addGlow(G.interior, x, 0.47 + height - 0.11, z, 0xffc286, 0.32, 0.8, 0.7);
}

function addDining(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0.47, z);
  G.interior.add(group);
  addBox(group, 1.75, 0.08, 0.84, MAT.walnut, 0, 0.74, 0, { cast: false });
  addBox(group, 0.1, 0.66, 0.1, MAT.darkMetal, -0.68, 0.36, -0.28, { cast: false });
  addBox(group, 0.1, 0.66, 0.1, MAT.darkMetal, 0.68, 0.36, -0.28, { cast: false });
  addBox(group, 0.1, 0.66, 0.1, MAT.darkMetal, -0.68, 0.36, 0.28, { cast: false });
  addBox(group, 0.1, 0.66, 0.1, MAT.darkMetal, 0.68, 0.36, 0.28, { cast: false });

  const chair = (cx, cz, rot) => {
    const c = new THREE.Group();
    c.position.set(cx, 0, cz);
    c.rotation.y = rot;
    group.add(c);
    addBox(c, 0.4, 0.06, 0.4, MAT.walnut, 0, 0.46, 0, { cast: false });
    addBox(c, 0.4, 0.44, 0.06, MAT.walnut, 0, 0.68, -0.17, {
      rotation: [-4 * DEG, 0, 0],
      cast: false,
    });
    addBox(c, 0.035, 0.44, 0.035, MAT.darkMetal, -0.16, 0.22, -0.16, { cast: false });
    addBox(c, 0.035, 0.44, 0.035, MAT.darkMetal, 0.16, 0.22, -0.16, { cast: false });
    addBox(c, 0.035, 0.44, 0.035, MAT.darkMetal, -0.16, 0.22, 0.16, { cast: false });
    addBox(c, 0.035, 0.44, 0.035, MAT.darkMetal, 0.16, 0.22, 0.16, { cast: false });
  };
  chair(-0.55, -0.7, 0);
  chair(0.55, -0.7, 0);
  chair(-0.55, 0.7, Math.PI);
  chair(0.55, 0.7, Math.PI);

  addCylinder(G.interior, 0.045, 0.02, MAT.warmGlow, 0, 1.5, 0, {
    cast: false,
  });
  addGlow(G.interior, 0, 1.48, 0, 0xffc288, 0.22, 0.6, 0.55);
}

function addKitchen() {
  const z = -2.35;
  addBox(G.interior, 3.75, 0.8, 0.52, MAT.walnut, -0.3, 0.86, z, {
    cast: false,
  });
  addBox(G.interior, 3.82, 0.08, 0.58, MAT.darkStone, -0.3, 1.29, z, {
    cast: false,
  });
  addBox(G.interior, 3.82, 0.035, 0.06, MAT.warmGlow, -0.3, 1.24, z + 0.3, {
    cast: false,
    receive: false,
  });
  addBox(G.interior, 0.52, 0.52, 1.18, MAT.whiteWarm, 1.82, 1.48, -2.1, {
    cast: false,
  });
  addBox(G.interior, 0.06, 0.58, 0.06, MAT.brass, 1.25, 0.78, -2.06, {
    cast: false,
  });
  addCylinder(G.interior, 0.04, 0.24, MAT.brass, 1.25, 0.69, -2.18, {
    cast: false,
  });

  // Island.
  addBox(G.interior, 1.65, 0.84, 0.78, MAT.whiteWarm, 0.12, 0.88, -1.25, {
    cast: false,
  });
  addBox(G.interior, 1.72, 0.075, 0.86, MAT.darkStone, 0.12, 1.34, -1.25, {
    cast: false,
  });
  addBox(G.interior, 0.38, 0.015, 0.3, MAT.darkMetal, 0.38, 1.38, -1.22, {
    cast: false,
  });
  addCylinder(G.interior, 0.09, 0.025, MAT.brass, 0.38, 1.39, -1.22, {
    cast: false,
  });

  // Pendants above the island.
  [-0.35, 0.12, 0.6].forEach((x) => {
    addCylinder(G.interior, 0.007, 1.0, MAT.darkMetal, x, 2.25, -1.25, {
      cast: false,
    });
    addCylinder(G.interior, 0.11, 0.025, MAT.brass, x, 1.75, -1.25, {
      cast: false,
    });
    addCylinder(G.interior, 0.075, 0.12, MAT.warmGlow, x, 1.72, -1.25, {
      cast: false,
      receive: false,
    });
    addGlow(G.interior, x, 1.68, -1.25, 0xffc286, 0.2, 0.45, 0.4);
  });
}

function addReadingNook() {
  addBox(G.interior, 0.95, 0.06, 1.15, MAT.rugLight, -2.02, 0.45, 0.56, {
    cast: false,
    receive: false,
  });
  addBox(G.interior, 0.46, 0.46, 0.46, MAT.walnut, -2.42, 0.72, 1.18, {
    cast: false,
  });
  addCylinder(G.interior, 0.18, 0.04, MAT.brass, -2.42, 0.96, 1.18, {
    cast: false,
  });
  addBox(G.interior, 0.3, 0.045, 0.22, MAT.linen, -2.42, 1.0, 1.18, {
    cast: false,
  });
  // Console and books.
  addBox(G.interior, 0.33, 0.92, 1.64, MAT.walnut, -2.51, 0.9, 0.0, {
    cast: false,
  });
  for (let i = 0; i < 7; i += 1) {
    addBox(
      G.interior,
      0.22,
      0.24,
      0.055,
      i % 2 ? MAT.artLight : MAT.fabricDark,
      -2.48,
      1.08 + (i % 3) * 0.25,
      -0.57 + i * 0.17,
      { cast: false }
    );
  }
}

function addIndoorPlant(x, z, scale = 1) {
  addCylinder(G.interior, 0.23 * scale, 0.32 * scale, MAT.darkStone, x, 0.61, z, {
    cast: false,
  });
  addCylinderGeo(
    G.interior,
    0.035 * scale,
    0.06 * scale,
    0.9 * scale,
    6,
    MAT.bark,
    x,
    1.25,
    z,
    { cast: false }
  );
  const leaves = [
    [0.0, 1.48, 0.03, 0.38],
    [-0.2, 1.62, 0.03, 0.3],
    [0.19, 1.7, 0.0, 0.29],
    [0.02, 1.83, -0.12, 0.25],
    [-0.08, 2.0, 0.1, 0.22],
  ];
  leaves.forEach(([dx, y, dz, s]) => {
    const mesh = new THREE.Mesh(lowLeafGeometry, MAT.leafOlive);
    mesh.position.set(x + dx, y, z + dz);
    mesh.scale.set(s, s * 1.2, s);
    mesh.castShadow = false;
    G.interior.add(mesh);
  });
}

function buildUpperInterior() {
  const bedroomStart = G.interior.children.length;

  // Bedroom rug.
  addGround(G.interior, 2.85, 2.25, MAT.rug, -0.8, 3.84, -1.2);
  addBed(-0.92, -1.54);
  addBox(G.interior, 1.25, 0.38, 0.36, MAT.walnut, -0.94, 4.09, -0.08, {
    cast: false,
  });
  addBox(G.interior, 1.28, 0.09, 0.4, MAT.fabricLight, -0.94, 4.31, -0.08, {
    cast: false,
  });

  // Bedside tables + lamps.
  [-2.02, 0.22].forEach((x) => {
    addBox(G.interior, 0.42, 0.36, 0.4, MAT.walnut, x, 4.04, -2.32, {
      cast: false,
    });
    addCylinder(G.interior, 0.07, 0.26, MAT.brass, x, 4.35, -2.32, {
      cast: false,
    });
    addCylinder(G.interior, 0.11, 0.02, MAT.warmGlow, x, 4.48, -2.32, {
      cast: false,
      receive: false,
    });
    addGlow(G.interior, x, 4.48, -2.28, 0xffc58d, 0.18, 0.45, 0.35);
  });

  // Floor lamp by the glass. The misplaced reading chair has been removed so
  // no second seat intrudes into the living-room composition below.
  addFloorLampUpper(0.74, -1.04);
  addBox(G.interior, 0.95, 0.36, 0.36, MAT.walnut, -2.05, 4.06, -0.35, {
    cast: false,
  });
  addGround(G.interior, 1.08, 0.95, MAT.rugLight, -2.05, 3.855, -0.35);

  buildFamilyPhoto();
  captureInteriorRoom("bedroom", "Master Suite", bedroomStart);
}

function buildFamilyPhoto() {
  const frameWidth = 1.12;
  const frameHeight = 0.82;
  const border = 0.045;
  const frameDepth = 0.035;
  const centerX = -0.86;
  const centerY = 5.18;
  const centerZ = -2.53;

  const group = new THREE.Group();
  group.name = "Bedroom Family Photo";
  group.position.set(centerX, centerY, centerZ);
  group.userData.interaction = "photoUpload";
  G.interior.add(group);

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a1b12,
    roughness: 0.62,
    metalness: 0.04,
    transparent: true,
    opacity: 1,
  });

  const addStrip = (w, h, d, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), frameMaterial);
    mesh.position.set(x, y, z);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    group.add(mesh);
    return mesh;
  };

  addStrip(border, frameHeight, frameDepth, -(frameWidth / 2 - border / 2), 0, 0);
  addStrip(border, frameHeight, frameDepth, frameWidth / 2 - border / 2, 0, 0);
  addStrip(frameWidth, border, frameDepth, 0, frameHeight / 2 - border / 2, 0);
  addStrip(frameWidth, border, frameDepth, 0, -(frameHeight / 2 - border / 2), 0);

  const photoMaterial = new THREE.MeshStandardMaterial({
    color: 0x242321,
    roughness: 0.8,
    metalness: 0,
    side: THREE.FrontSide,
    transparent: true,
    opacity: 1,
  });
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), photoMaterial);
  photo.position.z = 0.022;
  photo.castShadow = false;
  photo.receiveShadow = false;
  group.add(photo);

  // A restrained gold inner border is shown while family.jpg loads and stays
  // visible if the image is unavailable. It reads as a designed placeholder.
  const fallbackBorder = new THREE.Group();
  fallbackBorder.visible = true;
  const goldMaterial = new THREE.MeshStandardMaterial({
    color: 0xc7a77a,
    roughness: 0.38,
    metalness: 0.48,
    transparent: true,
    opacity: 1,
  });
  const innerW = 0.86;
  const innerH = 0.56;
  const gold = 0.012;
  [
    [innerW, gold, 0, innerH / 2],
    [innerW, gold, 0, -innerH / 2],
    [gold, innerH, -innerW / 2, 0],
    [gold, innerH, innerW / 2, 0],
  ].forEach(([w, h, x, y]) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.008), goldMaterial);
    mesh.position.set(x, y, 0.03);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    fallbackBorder.add(mesh);
  });
  group.add(fallbackBorder);

  const target = new THREE.Object3D();
  target.position.set(0, 0, 0);
  group.add(target);
  const spotLight = new THREE.SpotLight(0xffd8a8, 0.5, 5.2, Math.PI / 4, 0.8, 2);
  spotLight.position.set(0, 0.72, 0.92);
  spotLight.target = target;
  spotLight.castShadow = false;
  group.add(spotLight);

  photoFrameState.group = group;
  photoFrameState.photo = photo;
  photoFrameState.frameMaterial = frameMaterial;
  photoFrameState.photoMaterial = photoMaterial;
  photoFrameState.fallbackBorder = fallbackBorder;
  photoFrameState.spotlight = spotLight;

  interactiveGroups.push(group);

  const loader = new THREE.TextureLoader();
  loader.load(
    "family.jpg",
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      applyPhotoTexture(texture);
    },
    undefined,
    () => {
      photoMaterial.map = null;
      photoMaterial.color.set(0x242321);
      photoMaterial.needsUpdate = true;
      fallbackBorder.visible = true;
    }
  );
}

function applyPhotoTexture(texture) {
  const photo = photoFrameState.photo;
  const material = photoFrameState.photoMaterial;
  if (!photo || !material || !texture.image) return;

  const imageWidth = texture.image.naturalWidth || texture.image.width || 1;
  const imageHeight = texture.image.naturalHeight || texture.image.height || 1;
  const aspect = imageWidth / Math.max(1, imageHeight);
  let width = photoFrameState.maxWidth;
  let height = width / aspect;
  if (height > photoFrameState.maxHeight) {
    height = photoFrameState.maxHeight;
    width = height * aspect;
  }
  photo.scale.set(width, height, 1);

  const previous = photoFrameState.texture;
  material.map = texture;
  material.color.set(0xffffff);
  material.needsUpdate = true;
  photoFrameState.texture = texture;
  photoFrameState.fallbackBorder.visible = false;
  if (previous && previous !== texture) previous.dispose();
}

function initPhotoInteraction() {
  if (!photoFrameState.group || photoFrameState.input) return;

  const input = document.createElement("input");
  input.type = "file";
  input.id = "photo-upload";
  input.accept = "image/*";
  input.style.display = "none";
  document.body.appendChild(input);
  photoFrameState.input = input;

  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const texture = new THREE.Texture(image);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = renderer?.capabilities?.getMaxAnisotropy?.() || 1;
        texture.needsUpdate = true;
        applyPhotoTexture(texture);
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
    input.value = "";
  });

  const hoverRaycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const setCursor = (active) => {
    if (photoFrameState.hovering === active) return;
    photoFrameState.hovering = active;
    document.body.style.cursor = active ? "pointer" : "default";
    canvas.style.cursor = active ? "pointer" : "";
  };

  canvas.addEventListener("pointermove", (event) => {
    if (osState.active) {
      setCursor(false);
      return;
    }
    const rect = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    hoverRaycaster.setFromCamera(pointer, camera);
    setCursor(hoverRaycaster.intersectObject(photoFrameState.group, true).length > 0);
  });
  canvas.addEventListener("pointerleave", () => setCursor(false));
}

function animatePhotoSpotlight(dimmed) {
  const spotLight = photoFrameState.spotlight;
  if (!spotLight) return;
  const targetIntensity = dimmed ? 0.5 * 0.15 : 0.5;
  if (gsap && !reducedMotion) {
    gsap.killTweensOf(spotLight);
    gsap.to(spotLight, {
      intensity: targetIntensity,
      duration: 0.5,
      ease: "power2.out",
      overwrite: true,
    });
  } else {
    spotLight.intensity = targetIntensity;
  }
}

function addBed(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 3.84, z);
  G.interior.add(group);
  addBox(group, 2.0, 0.3, 2.04, MAT.walnut, 0, 0.17, 0, { cast: false });
  addBox(group, 1.88, 0.24, 1.86, MAT.linen, 0, 0.41, 0.02, { cast: false });
  addBox(group, 2.12, 1.05, 0.14, MAT.fabricDark, 0, 0.58, -0.98, {
    cast: false,
  });
  addBox(group, 1.94, 0.45, 0.28, MAT.fabricLight, 0, 0.67, 0.78, {
    rotation: [4 * DEG, 0, 0],
    cast: false,
  });
  addBox(group, 0.68, 0.1, 0.48, MAT.fabricLight, -0.46, 0.51, 0.5, {
    rotation: [-2 * DEG, 0, -8 * DEG],
    cast: false,
  });
  addBox(group, 0.68, 0.1, 0.48, MAT.fabricLight, 0.46, 0.51, 0.5, {
    rotation: [-2 * DEG, 0, 8 * DEG],
    cast: false,
  });
  addBox(group, 0.42, 0.09, 0.38, MAT.rugLight, 0.15, 0.55, 0.28, {
    rotation: [0, 0, 9 * DEG],
    cast: false,
  });
}

function addFloorLampUpper(x, z) {
  addCylinder(G.interior, 0.015, 1.25, MAT.darkMetal, x, 4.47, z, {
    cast: false,
  });
  addCylinder(G.interior, 0.13, 0.03, MAT.darkMetal, x, 3.86, z, {
    cast: false,
  });
  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.21, 0.22, 16, 1, true),
    MAT.linen
  );
  shade.position.set(x, 5.06, z);
  shade.castShadow = false;
  G.interior.add(shade);
  addCylinder(G.interior, 0.065, 0.025, MAT.warmGlow, x, 4.95, z, {
    cast: false,
    receive: false,
  });
  addGlow(G.interior, x, 5.02, z, 0xffc286, 0.24, 0.65, 0.55);
}

function buildInteriorLightPanels() {
  // Recessed linear light on the ground ceiling.
  addBox(G.interior, 2.9, 0.018, 0.07, MAT.warmGlowSoft, 0.1, 3.385, -0.4, {
    cast: false,
    receive: false,
  });
  addBox(G.interior, 0.07, 0.018, 1.8, MAT.warmGlowSoft, 2.28, 3.385, -1.45, {
    cast: false,
    receive: false,
  });
  // Upper bedroom strip.
  addBox(G.interior, 2.4, 0.018, 0.06, MAT.warmGlowSoft, -0.72, 6.19, -1.35, {
    cast: false,
    receive: false,
  });
  // A warm wash inside the kitchen.
  addGlow(G.interior, -0.25, 1.7, -2.1, 0xffbd83, 0.15, 2.4, 1.1);
}

/* Landscape --------------------------------------------------------------- */
function buildLandscape() {
  addTree(-4.0, -3.45, 1.0);
  addBushBed();
  addGardenLights();
}

/* Volumetric extensions --------------------------------------------------- */
function buildExtensions() {
  state.roomGroups.terrace = G.terrace;

  const teaRoom = new THREE.Group();
  teaRoom.name = "Cantilevered Tea Room";
  teaRoom.userData.roomId = "teaRoom";
  teaRoom.position.x = 0.5;
  G.extensions.add(teaRoom);
  state.roomGroups.teaRoom = teaRoom;

  const study = new THREE.Group();
  study.name = "Guest Study";
  study.userData.roomId = "study";
  G.extensions.add(study);
  state.roomGroups.study = study;

  const garage = new THREE.Group();
  garage.name = "Sunken Garage";
  garage.userData.roomId = "garage";
  G.extensions.add(garage);
  state.roomGroups.garage = garage;

  const onsen = new THREE.Group();
  onsen.name = "Onsen Pavilion";
  onsen.userData.roomId = "onsen";
  G.outdoor.add(onsen);
  state.roomGroups.onsen = onsen;
  onsenState.group = onsen;

  buildTeaRoom(teaRoom);
  buildStudy(study);
  buildSunkenGarage(garage);
  buildOnsen(onsen);
  buildInterlockingSlabs();
}

/* Outdoor onsen ----------------------------------------------------------- */
function buildOnsen(group) {
  const cx = -6.3;
  const cz = 4.25;

  addBox(group, 4.95, 0.16, 4.15, MAT.darkStone, cx, 0.045, cz, {
    cast: true,
    receive: true,
  });
  addBox(group, 4.45, 0.045, 3.65, MAT.limestone, cx, 0.135, cz, {
    cast: false,
    receive: true,
  });

  addBox(group, 2.15, 0.05, 0.5, MAT.path, -4.15, 0.135, cz, {
    rotation: [0, -4 * DEG, 0],
    cast: true,
    receive: true,
  });
  addBox(group, 0.52, 0.05, 0.42, MAT.path, -3.38, 0.135, cz - 0.12, {
    rotation: [0, 8 * DEG, 0],
    cast: true,
    receive: true,
  });

  addBox(group, 2.7, 0.2, 1.65, MAT.stone, cx + 0.05, 0.21, cz - 0.05, {
    cast: true,
    receive: true,
  });
  addBox(group, 2.28, 0.18, 1.23, MAT.darkStone, cx + 0.05, 0.28, cz - 0.05, {
    cast: false,
    receive: true,
  });
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(2.08, 1.02, 1, 1),
    new THREE.MeshPhysicalMaterial({
      color: 0x2b6263,
      roughness: 0.18,
      metalness: 0.28,
      transparent: true,
      opacity: 0.9,
      envMapIntensity: 1.1,
      emissive: 0x0c2928,
      emissiveIntensity: 1.1,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(cx + 0.05, 0.325, cz - 0.05);
  water.receiveShadow = true;
  water.userData.roomId = "onsen";
  group.add(water);
  onsenState.water = water;

  for (let i = 0; i < 4; i += 1) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.22, 0.235, 40),
      new THREE.MeshBasicMaterial({
        color: 0x9ac3bd,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(
      cx + 0.05 + (Math.random() - 0.5) * 1.35,
      0.34,
      cz - 0.05 + (Math.random() - 0.5) * 0.62
    );
    ring.userData.phase = Math.random();
    ring.userData.roomId = "onsen";
    ring.renderOrder = 2;
    group.add(ring);
    onsenState.ripples.push(ring);
  }

  [-1.64, 1.64].forEach((ox) => {
    [-1.42, 1.42].forEach((oz) => {
      addBox(group, 0.075, 2.18, 0.075, MAT.walnut, cx + ox, 1.24, cz + oz, {
        cast: true,
      });
    });
  });
  addBox(group, 3.42, 0.08, 0.095, MAT.walnut, cx, 2.31, cz - 1.38, { cast: true });
  addBox(group, 3.42, 0.08, 0.095, MAT.walnut, cx, 2.31, cz + 1.38, { cast: true });
  for (let i = 0; i < 9; i += 1) {
    addBox(group, 0.05, 0.045, 2.82, MAT.walnut, cx - 1.54 + i * 0.385, 2.35, cz, {
      cast: false,
    });
  }

  for (let i = 0; i < 11; i += 1) {
    addBox(group, 0.025, 1.52, 0.025, MAT.teak, cx - 1.72, 0.94, cz - 1.05 + i * 0.21, {
      cast: false,
    });
  }
  addBox(group, 0.06, 0.06, 2.34, MAT.darkMetal, cx - 1.72, 0.24, cz, { cast: true });
  addBox(group, 0.06, 0.06, 2.34, MAT.darkMetal, cx - 1.72, 1.68, cz, { cast: true });

  addBox(group, 0.62, 0.35, 1.65, MAT.teak, cx + 1.38, 0.32, cz + 0.02, { cast: true });
  addBox(group, 0.54, 0.08, 1.5, MAT.fabricLight, cx + 1.38, 0.53, cz + 0.02, { cast: true });
  addBox(group, 0.28, 0.09, 0.56, MAT.fabric, cx + 1.28, 0.62, cz + 0.44, {
    rotation: [0, 0, -8 * DEG],
    cast: true,
  });

  [-1.25, 1.25].forEach((ox) => {
    const x = cx + ox;
    const z = cz + 1.55;
    addBox(group, 0.22, 0.42, 0.22, MAT.darkStone, x, 0.35, z, { cast: true });
    addBox(group, 0.16, 0.18, 0.16, MAT.warmGlow, x, 0.62, z, { cast: false });
    addGlow(group, x, 0.64, z, 0xffc28a, 0.38, 0.82, 0.82);
  });

  const light = new THREE.PointLight(0xffbd83, 3.4, 6.2, 2);
  light.position.set(cx + 0.05, 1.28, cz);
  light.userData.roomId = "onsen";
  group.add(light);
  onsenState.light = light;

  const waterLight = new THREE.PointLight(0x8fc9bd, 1.8, 4.1, 2);
  waterLight.position.set(cx + 0.05, 0.7, cz - 0.05);
  waterLight.userData.roomId = "onsen";
  group.add(waterLight);
  onsenState.waterLight = waterLight;
  onsenState.waterGlow = addGlow(group, cx + 0.05, 0.45, cz - 0.05, 0x6fc3b5, 0.22, 2.2, 1.1, 2.2);

  const steamCount = 28;
  const positions = new Float32Array(steamCount * 3);
  const base = new Float32Array(steamCount * 2);
  const phase = new Float32Array(steamCount);
  for (let i = 0; i < steamCount; i += 1) {
    base[i * 2] = cx + (Math.random() - 0.5) * 1.9;
    base[i * 2 + 1] = cz + (Math.random() - 0.5) * 0.74;
    phase[i] = Math.random();
    positions[i * 3] = base[i * 2];
    positions[i * 3 + 1] = 0.4 + Math.random() * 0.95;
    positions[i * 3 + 2] = base[i * 2 + 1];
  }
  const steamGeometry = new THREE.BufferGeometry();
  steamGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const steam = new THREE.Points(
    steamGeometry,
    new THREE.PointsMaterial({
      color: 0xd9e6df,
      size: 0.56,
      map: glowTexture,
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      sizeAttenuation: true,
    })
  );
  steam.frustumCulled = false;
  steam.userData.roomId = "onsen";
  group.add(steam);
  onsenState.steamPoints = steam;
  onsenState.steamBase = base;
  onsenState.steamPhase = phase;

  for (let i = 0; i < 6; i += 1) {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.22 + Math.random() * 0.12, 0),
      MAT.darkStone
    );
    rock.position.set(cx - 1.95 + Math.random() * 0.35, 0.25, cz - 1.4 + i * 0.52);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.scale.y = 0.55 + Math.random() * 0.35;
    rock.castShadow = true;
    rock.receiveShadow = true;
    rock.userData.roomId = "onsen";
    group.add(rock);
  }
}

function updateOnsen(time) {
  if (!onsenState.steamPoints) return;
  const delta = Math.min(0.05, Math.max(0, time - onsenState.time));
  onsenState.time = time;
  const positions = onsenState.steamPoints.geometry.attributes.position.array;
  for (let i = 0; i < onsenState.steamPhase.length; i += 1) {
    const phase = (time * 0.075 + onsenState.steamPhase[i]) % 1;
    positions[i * 3] =
      onsenState.steamBase[i * 2] + Math.sin(time * 0.8 + i * 1.7) * 0.1 * phase;
    positions[i * 3 + 1] = 0.38 + phase * 1.7;
    positions[i * 3 + 2] =
      onsenState.steamBase[i * 2 + 1] + Math.cos(time * 0.6 + i) * 0.06 * phase;
  }
  onsenState.steamPoints.geometry.attributes.position.needsUpdate = true;
  onsenState.steamPoints.visible = onsenState.steamOn;
  onsenState.steamPoints.material.opacity = onsenState.steamOn
    ? 0.12 + Math.sin(time * 0.7) * 0.025
    : 0;
  if (onsenState.light) {
    onsenState.light.intensity = onsenState.lightOn
      ? 3.2 + Math.sin(time * 0.9) * 0.25
      : 0;
  }
  if (onsenState.waterLight) {
    onsenState.waterLight.intensity = onsenState.lightOn ? 1.7 : 0;
  }
  if (onsenState.waterGlow) {
    onsenState.waterGlow.material.opacity = onsenState.lightOn
      ? 0.22 + Math.sin(time * 0.8) * 0.03
      : 0;
  }
  onsenState.ripples.forEach((ring) => {
    ring.userData.phase = (ring.userData.phase + delta * 0.18) % 1;
    const phase = ring.userData.phase;
    ring.scale.setScalar(1 + phase * 2.4);
    ring.material.opacity = 0.24 * (1 - phase);
  });
  if (onsenState.water) {
    onsenState.water.material.opacity = 0.84 + Math.sin(time * 0.9) * 0.035;
  }
}

function buildAtmosphere() {
  fogMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0.085 },
      uColor: { value: new THREE.Color(0x93a6ae) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uOpacity;
      uniform vec3 uColor;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float vnoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 4; i++) {
          value += amplitude * vnoise(p);
          p *= 2.03;
          amplitude *= 0.5;
        }
        return value;
      }

      void main() {
        vec2 uv = vUv;
        float n = fbm(uv * vec2(3.2, 2.4) + vec2(uTime * 0.018, -uTime * 0.012));
        n += fbm(uv * vec2(7.0, 5.0) - vec2(uTime * 0.011, uTime * 0.007)) * 0.32;
        float edge =
          smoothstep(0.0, 0.18, uv.x) *
          (1.0 - smoothstep(0.82, 1.0, uv.x)) *
          smoothstep(0.0, 0.16, uv.y) *
          (1.0 - smoothstep(0.84, 1.0, uv.y));
        float mist = smoothstep(0.36, 0.72, n) * edge;
        gl_FragColor = vec4(uColor, mist * uOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });

  fogMesh = new THREE.Mesh(new THREE.PlaneGeometry(18, 15, 1, 1), fogMaterial);
  fogMesh.rotation.x = -Math.PI / 2;
  fogMesh.position.set(0.8, 0.14, 0.3);
  fogMesh.frustumCulled = false;
  fogMesh.renderOrder = 1;
  scene.add(fogMesh);
}

function buildInterlockingSlabs() {
  // A white transfer slab reaches from the main upper volume into the tea
  // room. The tea box is shifted 0.5 into the villa so the plates overlap.
  addBox(G.upper, 1.15, 0.24, 2.85, MAT.white, -2.95, 3.83, 0.55, {
    cast: false,
  });
  addBox(G.upper, 1.28, 0.035, 2.96, MAT.slabTrim, -2.95, 3.675, 0.55, {
    cast: false,
  });

  // Recessed shadow line under the main second-floor slab.
  addBox(G.upper, 4.28, 0.035, 3.38, MAT.slabTrim, -0.78, 3.602, -1.3, {
    cast: false,
  });

  // The same dark edge under the terrace plates.
  addBox(G.terrace, 2.16, 0.03, 4.26, MAT.slabTrim, 2.1, 3.616, -0.72, {
    cast: false,
  });
  addBox(G.terrace, 3.8, 0.03, 1.38, MAT.slabTrim, -0.88, 3.616, 0.9, {
    cast: false,
  });

}

function buildTeaRoom(group) {
  // A single low-poly glass volume, held by four thin steel pins.
  addBox(group, 2.5, 2.0, 2.8, MAT.teaGlass, -4.15, 5.0, 0.55, {
    cast: false,
    receive: false,
  });
  addBox(group, 2.66, 0.12, 2.96, MAT.darkStone, -4.15, 3.96, 0.55, {
    cast: false,
  });
  addBox(group, 2.78, 0.045, 3.08, MAT.slabTrim, -4.15, 3.875, 0.55, {
    cast: false,
  });
  addBox(group, 2.66, 0.08, 2.96, MAT.white, -4.15, 6.03, 0.55, {
    cast: false,
  });
  addBox(group, 2.68, 0.035, 0.06, MAT.darkMetal, -4.15, 4.02, 1.99, {
    cast: false,
  });
  addBox(group, 2.68, 0.035, 0.06, MAT.darkMetal, -4.15, 4.02, -0.89, {
    cast: false,
  });
  addBox(group, 0.05, 2.0, 0.05, MAT.darkMetal, -5.42, 5.0, 1.96, {
    cast: false,
  });
  addBox(group, 0.05, 2.0, 0.05, MAT.darkMetal, -2.88, 5.0, 1.96, {
    cast: false,
  });
  addBox(group, 0.05, 2.0, 0.05, MAT.darkMetal, -5.42, 5.0, -0.86, {
    cast: false,
  });
  addBox(group, 0.05, 2.0, 0.05, MAT.darkMetal, -2.88, 5.0, -0.86, {
    cast: false,
  });

  [-4.92, -3.38].forEach((x) => {
    [-0.58, 1.68].forEach((z) => {
      const pillar = new THREE.Group();
      pillar.position.set(x, 0, z);
      // Slightly thicker pins, tilted inwards from their base plates toward
      // the tea-room centre.
      pillar.rotation.z = -Math.sign(-4.15 - x) * 0.052;
      pillar.rotation.x = Math.sign(0.55 - z) * 0.042;
      group.add(pillar);
      addCylinder(pillar, 0.055, 3.94, MAT.darkMetal, 0, 1.97, 0, {
        cast: false,
        receive: false,
      });
      addCylinder(group, 0.105, 0.04, MAT.darkMetal, x, 0.02, z, {
        cast: false,
        receive: false,
      });
    });
  });

  // Tea table and two low seats inside the vitrine.
  addBox(group, 0.92, 0.055, 0.52, MAT.walnut, -4.15, 4.28, 0.55, {
    cast: false,
  });
  addBox(group, 0.06, 0.22, 0.4, MAT.darkMetal, -4.56, 4.12, 0.55, {
    cast: false,
  });
  addBox(group, 0.06, 0.22, 0.4, MAT.darkMetal, -3.74, 4.12, 0.55, {
    cast: false,
  });
  [-0.46, 1.46].forEach((z) => {
    addBox(group, 0.66, 0.08, 0.36, MAT.fabricLight, -4.15, 4.22, z, {
      cast: false,
    });
    addBox(group, 0.08, 0.16, 0.36, MAT.fabricDark, -4.49, 4.15, z, {
      cast: false,
    });
    addBox(group, 0.08, 0.16, 0.36, MAT.fabricDark, -3.81, 4.15, z, {
      cast: false,
    });
  });
  addCylinder(group, 0.037, 0.12, MAT.brass, -4.15, 5.91, 0.55, {
    cast: false,
  });
  addCylinder(group, 0.11, 0.025, MAT.warmGlow, -4.15, 5.83, 0.55, {
    cast: false,
    receive: false,
  });
  addGlow(group, -4.15, 4.68, 0.55, 0xffc38c, 0.28, 1.4, 0.7);
  addGlow(group, -4.15, 5.77, 0.55, 0xffc38c, 0.2, 0.75, 0.48);
}

function buildStudy(group) {
  // A light guest-study volume replaces the heavy black box. It is held by a
  // white plate, a glass curtain wall and a warm slatted timber screen.
  const floorY = 3.72;
  addBox(group, 3.05, 0.2, 3.15, MAT.white, 4.475, floorY, -1.22, {
    cast: true,
    receive: true,
  });
  addGround(group, 2.82, 2.68, MAT.oak, 4.475, 3.832, -1.23);
  addBox(group, 3.12, 0.035, 3.22, MAT.slabTrim, 4.475, 3.602, -1.22, {
    cast: false,
  });

  // Rear wall and a white header that meets the extended roof.
  addBox(group, 2.95, 2.28, 0.14, MAT.white, 4.475, 5.04, -2.72, {
    cast: true,
    receive: true,
  });
  addBox(group, 3.05, 0.18, 0.16, MAT.white, 4.475, 6.22, 0.22, {
    cast: true,
  });
  addBox(group, 2.95, 0.18, 0.16, MAT.white, 4.475, 6.22, -2.72, {
    cast: true,
  });
  addBox(group, 0.16, 0.18, 2.95, MAT.white, 5.9, 6.22, -1.24, {
    cast: true,
  });
  addBox(group, 0.16, 0.18, 2.95, MAT.white, 3.04, 6.22, -1.24, {
    cast: true,
  });

  // Continuous glass curtain wall to the terrace and the view.
  const glassTop = 6.16;
  const glassBottom = 3.9;
  const glassHeight = glassTop - glassBottom;
  addPlane(group, 2.84, glassHeight, MAT.glass, 4.475, 5.03, 0.28, {
    receive: false,
    cast: false,
  }).renderOrder = 2;
  addPlane(group, 2.86, glassHeight, MAT.glass, 3.04, 5.03, -1.23, {
    rotation: [0, Math.PI / 2, 0],
    receive: false,
    cast: false,
  }).renderOrder = 2;

  [3.06, 4.48, 5.89].forEach((x) => {
    addBox(group, 0.035, glassHeight + 0.04, 0.05, MAT.darkMetal, x, 5.03, 0.3, {
      cast: false,
    });
  });
  [-2.65, -1.25, 0.18].forEach((z) => {
    addBox(group, 0.05, glassHeight + 0.04, 0.035, MAT.darkMetal, 3.06, 5.03, z, {
      cast: false,
    });
  });
  addBox(group, 2.86, 0.035, 0.05, MAT.darkMetal, 4.475, glassBottom, 0.3, {
    cast: false,
  });
  addBox(group, 2.86, 0.035, 0.05, MAT.darkMetal, 4.475, glassTop, 0.3, {
    cast: false,
  });
  addBox(group, 0.05, 0.035, 2.9, MAT.darkMetal, 3.06, glassBottom, -1.23, {
    cast: false,
  });
  addBox(group, 0.05, 0.035, 2.9, MAT.darkMetal, 3.06, glassTop, -1.23, {
    cast: false,
  });

  // Vertical timber screen on the right side; warm light leaks between the
  // narrow strips onto the balcony.
  addPlane(group, 2.78, 2.15, MAT.studyGlow, 5.91, 5.03, -1.22, {
    rotation: [0, Math.PI / 2, 0],
    receive: false,
    cast: false,
  }).renderOrder = 3;
  for (let i = 0; i < 21; i += 1) {
    const z = -2.64 + i * 0.137;
    addBox(group, 0.05, 2.2, 0.06, MAT.woodSlat, 5.95, 5.03, z, {
      cast: false,
    });
  }
  addBox(group, 0.09, 0.08, 2.78, MAT.woodSlat, 5.95, 3.9, -1.22, {
    cast: false,
  });
  addBox(group, 0.09, 0.08, 2.78, MAT.woodSlat, 5.95, 6.14, -1.22, {
    cast: false,
  });

  // Wrap-around balcony plate and frameless glass balustrade.
  addBox(group, 0.83, 0.06, 4.4, MAT.terrace, 6.37, 3.68, -0.6, {
    cast: false,
    receive: true,
  });
  addBox(group, 3.0, 0.06, 1.3, MAT.terrace, 4.45, 3.68, 0.95, {
    cast: false,
    receive: true,
  });
  addPlane(group, 3.83, 0.72, MAT.glassRail, 4.87, 4.05, 1.59, {
    receive: false,
    cast: false,
  }).renderOrder = 2;
  addPlane(group, 4.39, 0.72, MAT.glassRail, 6.78, 4.05, -0.6, {
    rotation: [0, Math.PI / 2, 0],
    receive: false,
    cast: false,
  }).renderOrder = 2;
  addBox(group, 3.87, 0.012, 0.025, MAT.darkMetal, 4.87, 3.726, 1.59, {
    cast: false,
  });
  addBox(group, 0.025, 0.012, 4.43, MAT.darkMetal, 6.78, 3.726, -0.6, {
    cast: false,
  });
  addBox(group, 3.87, 0.018, 0.018, MAT.brass, 4.87, 4.42, 1.59, {
    cast: false,
  });
  addBox(group, 0.018, 0.018, 4.43, MAT.brass, 6.78, 4.42, -0.6, {
    cast: false,
  });

  // Minimal lounge chair on the balcony, facing out over the garden.
  const lounge = new THREE.Group();
  lounge.position.set(5.55, 3.715, 0.93);
  lounge.rotation.y = Math.PI / 2;
  group.add(lounge);
  addBox(lounge, 0.64, 0.06, 1.58, MAT.teak, 0, 0.16, 0, { cast: true });
  addBox(lounge, 0.58, 0.09, 1.03, MAT.fabricLight, 0, 0.23, 0.17, {
    cast: true,
  });
  addBox(lounge, 0.58, 0.42, 0.09, MAT.fabricLight, 0, 0.38, -0.68, {
    rotation: [-24 * DEG, 0, 0],
    cast: true,
  });
  addBox(lounge, 0.42, 0.11, 0.26, MAT.linen, 0, 0.34, -0.5, {
    rotation: [-24 * DEG, 0, 0],
    cast: false,
  });
  [-0.24, 0.24].forEach((x) => {
    [-0.58, 0.64].forEach((z) => {
      addBox(lounge, 0.05, 0.14, 0.05, MAT.darkMetal, x, 0.07, z, {
        cast: true,
      });
    });
  });
  addCylinder(group, 0.18, 0.04, MAT.darkStone, 6.42, 4.0, 0.3, {
    cast: true,
  });
  addCylinder(group, 0.022, 0.29, MAT.darkMetal, 6.42, 3.855, 0.3, {
    cast: true,
  });

  // Study interior: desk, guest daybed and a detailed interactive desk setup.
  buildStudyDeskScene(group);
  addBox(group, 1.55, 0.32, 0.7, MAT.fabricLight, 4.9, 4.02, -2.28, {
    cast: true,
  });
  addBox(group, 1.4, 0.12, 0.58, MAT.linen, 4.9, 4.23, -2.28, {
    cast: false,
  });
  addBox(group, 1.42, 0.09, 0.2, MAT.fabricDark, 4.9, 4.17, -2.6, {
    rotation: [-8 * DEG, 0, 0],
    cast: false,
  });
  addCylinder(group, 0.16, 0.035, MAT.darkMetal, 5.6, 3.84, -2.32, {
    cast: true,
  });
  addCylinder(group, 0.018, 1.1, MAT.darkMetal, 5.6, 4.4, -2.32, {
    cast: true,
  });
  addCylinder(group, 0.14, 0.15, MAT.linen, 5.6, 4.98, -2.32, {
    cast: false,
  });
  addGlow(group, 5.6, 4.95, -2.32, 0xffc28b, 0.22, 0.7, 0.5);
  addContactShadow(group, 2.4, 2.4, 4.575, -1.2, 0.2);

  // A white beam reaches back across the rear edge of the terrace so the new
  // floor plate is tied into the main upper slab.
  addBox(group, 1.9, 0.22, 0.4, MAT.white, 2.0, 3.55, -2.45, {
    cast: false,
  });

  // The garage retaining wall / spine rises into this foundation beam.
  addBox(group, 3.0, 0.2, 0.45, MAT.shearConcrete, 4.475, 3.58, -2.52, {
    cast: false,
    receive: true,
  });
  addBox(group, 0.36, 3.7, 0.55, MAT.shearConcrete, 5.1, 1.85, -2.45, {
    cast: true,
    receive: true,
  });

  // The main roof extends right as an L-shaped cantilever: a narrow spine
  // leaves the old open terrace intact while the wide plate covers the new
  // study and its balcony.
  addBox(G.roof, 5.66, 0.2, 0.8, MAT.white, 4.17, 6.52, -2.6, {
    cast: true,
    receive: true,
  });
  addBox(G.roof, 4.05, 0.2, 4.0, MAT.white, 4.975, 6.52, -0.2, {
    cast: true,
    receive: true,
  });
  // A narrow tie beam keeps the horizontal roof line continuous across the
  // open terrace without roofing the whole outdoor room.
  addBox(G.roof, 1.61, 0.2, 0.35, MAT.white, 2.145, 6.52, 0.28, {
    cast: true,
    receive: true,
  });
  addBox(G.roof, 4.08, 0.035, 0.05, MAT.slabTrim, 4.975, 6.41, 1.79, {
    cast: false,
  });
  addBox(G.roof, 1.64, 0.035, 0.04, MAT.slabTrim, 2.145, 6.41, 0.44, {
    cast: false,
  });
  addBox(G.roof, 0.05, 0.035, 4.0, MAT.slabTrim, 6.99, 6.41, -0.2, {
    cast: false,
  });
}

function registerStudyInteractive(object, type) {
  object.userData.interaction = type;
  interactiveGroups.push(object);
}

function buildStudyDeskScene(group) {
  // Warm-grey plane rug under the desk and chair.
  addGround(group, 2.8, 1.9, MAT.studyRug, 4.16, 3.837, -1.2);

  // Wider desk so the monitor, keyboard and lamp can coexist cleanly.
  addBox(group, 1.65, 0.06, 0.62, MAT.walnut, 4.15, 4.55, -1.58, {
    cast: true,
    receive: true,
  });
  addBox(group, 0.06, 0.7, 0.54, MAT.walnut, 3.36, 4.18, -1.58, {
    cast: true,
  });
  addBox(group, 0.06, 0.7, 0.54, MAT.walnut, 4.94, 4.18, -1.58, {
    cast: true,
  });
  addBox(group, 0.06, 0.06, 1.1, MAT.walnut, 4.15, 3.86, -1.58, {
    cast: false,
  });

  // Desk chair with four legs, a backrest and slim armrests.
  const chair = new THREE.Group();
  chair.position.set(4.04, 3.84, -0.88);
  group.add(chair);
  addBox(chair, 0.52, 0.07, 0.48, MAT.fabricDark, 0, 0.48, 0, {
    cast: true,
  });
  addBox(chair, 0.46, 0.06, 0.42, MAT.fabricLight, 0, 0.54, 0.01, {
    cast: true,
  });
  addBox(chair, 0.46, 0.44, 0.08, MAT.fabricDark, 0, 0.73, 0.23, {
    rotation: [-7 * DEG, 0, 0],
    cast: true,
  });
  [-0.27, 0.27].forEach((x) => {
    addBox(chair, 0.06, 0.06, 0.4, MAT.darkMetal, x, 0.61, 0.02, {
      cast: true,
    });
  });
  [-0.21, 0.21].forEach((x) => {
    [-0.18, 0.18].forEach((z) => {
      addBox(chair, 0.035, 0.44, 0.035, MAT.darkMetal, x, 0.22, z, {
        cast: true,
      });
    });
  });

  buildStudyComputer(group);
  buildStudyDeskLamp(group);
  buildStudyBookshelf(group);
}

function buildStudyComputer(group) {
  const computer = new THREE.Group();
  computer.position.set(4.02, 4.58, -1.8);
  computer.rotation.y = 0.12;
  group.add(computer);

  addBox(computer, 0.38, 0.025, 0.24, MAT.darkMetal, 0, 0.0125, 0, {
    cast: true,
  });
  addCylinder(computer, 0.032, 0.38, MAT.darkMetal, 0, 0.21, -0.02, {
    cast: true,
  });
  addBox(computer, 0.98, 0.58, 0.055, MAT.darkMetal, 0, 0.66, 0, {
    cast: true,
    receive: true,
  });

  const screenCanvas = document.createElement("canvas");
  screenCanvas.width = 640;
  screenCanvas.height = 360;
  const screenCtx = screenCanvas.getContext("2d");
  const screenTexture = new THREE.CanvasTexture(screenCanvas);
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  screenTexture.minFilter = THREE.LinearFilter;
  screenTexture.magFilter = THREE.LinearFilter;
  screenTexture.generateMipmaps = false;
  const screenMaterial = new THREE.MeshBasicMaterial({
    map: screenTexture,
    toneMapped: false,
  });
  const screen = addPlane(
    computer,
    0.9,
    0.5,
    screenMaterial,
    0,
    0.66,
    0.031,
    { cast: false, receive: false }
  );
  screen.renderOrder = 3;

  const screenLight = new THREE.PointLight(0xbfe8ff, 0, 3.4, 2);
  screenLight.position.set(0, 0.66, 0.28);
  computer.add(screenLight);

  // Keyboard and mouse.
  addBox(computer, 0.72, 0.025, 0.2, MAT.darkMetal, 0, 0.015, 0.38, {
    cast: true,
  });
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 9; column += 1) {
      addBox(
        computer,
        0.052,
        0.008,
        0.035,
        MAT.brass,
        (column - 4) * 0.07,
        0.032,
        0.31 + row * 0.045,
        { cast: false }
      );
    }
  }
  addBox(computer, 0.1, 0.035, 0.16, MAT.darkMetal, 0.47, 0.02, 0.42, {
    cast: true,
  });

  registerStudyInteractive(computer, "computer");
  studyState.screenCanvas = screenCanvas;
  studyState.screenCtx = screenCtx;
  studyState.screenTexture = screenTexture;
  studyState.screenLight = screenLight;
  studyState.screenMesh = screen;
  studyState.screenStart = performance.now();
  drawStudyScreen(0, studyState.screenStart);
}

function buildStudyDeskLamp(group) {
  const lamp = new THREE.Group();
  lamp.position.set(4.78, 4.58, -1.7);
  group.add(lamp);

  addCylinder(lamp, 0.12, 0.025, MAT.darkMetal, 0, 0.0125, 0, {
    cast: true,
  });
  addCylinder(lamp, 0.016, 0.4, MAT.brass, 0, 0.22, -0.02, {
    cast: true,
  });
  addCylinder(lamp, 0.075, 0.015, MAT.brass, 0, 0.43, 0, {
    cast: true,
  });
  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.145, 0.14, 16, 1, true),
    MAT.linen
  );
  shade.position.set(0, 0.51, 0);
  shade.castShadow = false;
  lamp.add(shade);
  const bulb = addCylinder(lamp, 0.035, 0.02, MAT.warmGlow, 0, 0.46, 0, {
    cast: false,
    receive: false,
  });

  const lampLight = new THREE.PointLight(0xffc48a, 2.2, 2.8, 2);
  lampLight.position.set(0, 0.45, 0.02);
  lamp.add(lampLight);

  registerStudyInteractive(lamp, "deskLamp");
  studyState.lampLight = lampLight;
  studyState.lampBulb = bulb;
}

function buildStudyBookshelf(group) {
  const shelf = new THREE.Group();
  group.add(shelf);

  // Wall-mounted oak bookcase with five shelves.
  addBox(shelf, 0.09, 1.56, 0.32, MAT.walnut, 3.3, 5.38, -2.53, {
    cast: true,
  });
  addBox(shelf, 0.09, 1.56, 0.32, MAT.walnut, 5.52, 5.38, -2.53, {
    cast: true,
  });
  [4.6, 5.02, 5.44, 5.86, 6.14].forEach((y) => {
    addBox(shelf, 2.31, 0.045, 0.34, MAT.walnut, 4.41, y, -2.53, {
      cast: true,
    });
  });

  const bookMaterials = [
    MAT.bookRust,
    MAT.bookMoss,
    MAT.bookOchre,
    MAT.bookSlate,
    MAT.bookCream,
  ];
  [4.64, 5.06, 5.48].forEach((baseY, shelfIndex) => {
    for (let i = 0; i < 7; i += 1) {
      const height = 0.2 + ((i + shelfIndex) % 4) * 0.035;
      const x = 3.52 + i * 0.28;
      addBox(
        shelf,
        0.065 + (i % 3) * 0.012,
        height,
        0.19,
        bookMaterials[(i + shelfIndex * 2) % bookMaterials.length],
        x,
        baseY + height / 2,
        -2.49,
        { cast: false }
      );
    }
  });

  addBox(shelf, 2.12, 0.012, 0.022, MAT.ledStrip, 4.41, 4.57, -2.36, {
    cast: false,
    receive: false,
  });
  const ledStrip = shelf.children[shelf.children.length - 1];
  ledStrip.visible = false;

  const shelfLight = new THREE.PointLight(0xffb36b, 0, 3.2, 2);
  shelfLight.position.set(4.4, 4.72, -2.2);
  shelf.add(shelfLight);

  registerStudyInteractive(shelf, "bookshelf");
  studyState.shelfLed = ledStrip;
  studyState.shelfLight = shelfLight;
}

function drawStudyScreen(mode = studyState.screenMode, now = performance.now()) {
  const canvas = studyState.screenCanvas;
  const ctx = studyState.screenCtx;
  if (!canvas || !ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  if (mode === 0) {
    ctx.fillStyle = "#020303";
    ctx.fillRect(0, 0, W, H);
  } else if (mode === 1) {
    ctx.fillStyle = "#040b09";
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W * 0.55, H * 0.48, 10, W * 0.55, H * 0.48, W * 0.7);
    glow.addColorStop(0, "rgba(47, 112, 82, 0.22)");
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#3d6b57";
    ctx.font = "600 13px 'Courier New', monospace";
    ctx.textAlign = "left";
    ctx.fillText("NOCTURNE / TERMINAL", 30, 31);
    ctx.textAlign = "right";
    ctx.fillStyle = "#a9f3ca";
    ctx.fillText("SYS.ONLINE", W - 30, 31);
    ctx.fillStyle = "rgba(126, 221, 172, 0.3)";
    ctx.fillRect(30, 47, W - 60, 1);

    const elapsed = Math.max(0, now - studyState.screenStart) / 1000;
    ctx.textAlign = "left";
    ctx.shadowColor = "#6ff0b1";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#effff5";
    ctx.font = "600 23px 'Courier New', monospace";
    ctx.fillText("> INITIALIZE NOCTURNE...", 48, 92);
    ctx.shadowBlur = 0;

    const logs = [
      "OBSIDIAN CORE ................ OK",
      "AMBIENT BUS .................. ACTIVE",
      "GLASS CURTAIN ................ SEALED",
      "MOOD PROFILE ................. NIGHT",
      "DESK TELEMETRY ............... NOMINAL",
      "LIGHT FIELD .................. SYNCED",
      "STUDY CLIMATE ................ 22.4 C",
      "LISTENING FOR INPUT...",
    ];
    const offset = Math.floor(elapsed * 1.25) % logs.length;
    ctx.font = "17px 'Courier New', monospace";
    for (let i = 0; i < 6; i += 1) {
      ctx.fillStyle =
        i === 0
          ? "#b8ffd8"
          : i % 2 === 0
          ? "#88eab5"
          : "rgba(192, 241, 216, 0.76)";
      ctx.fillText(`> ${logs[(offset + i) % logs.length]}`, 48, 132 + i * 27);
    }
    ctx.fillStyle = "#9dffd0";
    ctx.fillText(">", 48, 316);
    if (Math.floor(elapsed * 2) % 2 === 0) {
      ctx.shadowColor = "#6ff0b1";
      ctx.shadowBlur = 9;
      ctx.fillRect(62, 299, 12, 19);
      ctx.shadowBlur = 0;
    }
    ctx.fillStyle = "rgba(120, 220, 168, 0.05)";
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
  } else {
    ctx.fillStyle = "#08060b";
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createLinearGradient(0, 0, W, H);
    glow.addColorStop(0, "rgba(67, 33, 83, 0.34)");
    glow.addColorStop(1, "rgba(128, 67, 48, 0.22)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#9b8f9c";
    ctx.font = "600 12px 'Courier New', monospace";
    ctx.fillText("SIGNAL / NIGHT DRIVE", 30, 30);
    ctx.fillStyle = "#f0a173";
    ctx.textAlign = "right";
    ctx.fillText("LIVE 02", W - 30, 30);
    ctx.textAlign = "left";

    const time = now * 0.001;
    const bars = 27;
    const barWidth = 13;
    const gap = 7;
    const startX = (W - bars * (barWidth + gap)) / 2;
    for (let i = 0; i < bars; i += 1) {
      const envelope = 0.3 + 0.7 * Math.sin((i / (bars - 1)) * Math.PI);
      const wave = 0.5 + 0.5 * Math.sin(time * 2.2 + i * 0.47);
      const height = 28 + wave * 132 * envelope;
      const gradient = ctx.createLinearGradient(0, 300 - height, 0, 300);
      gradient.addColorStop(0, i % 2 ? "#f0a06c" : "#b46d86");
      gradient.addColorStop(1, "rgba(92, 47, 75, 0.28)");
      ctx.fillStyle = gradient;
      ctx.fillRect(startX + i * (barWidth + gap), 300 - height, barWidth, height);
    }

    ctx.strokeStyle = "rgba(244, 178, 128, 0.72)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 28; x < W - 28; x += 4) {
      const y = 304 + Math.sin(x * 0.025 + time * 2.4) * 16;
      if (x === 28) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = "rgba(230, 199, 184, 0.65)";
    ctx.font = "13px 'Courier New', monospace";
    ctx.fillText("00:42  /  NOCTURNE SESSIONS", 30, 336);
  }

  if (studyState.screenTexture) studyState.screenTexture.needsUpdate = true;
}

function stopStudyScreenLoop() {
  if (studyState.screenRaf) {
    cancelAnimationFrame(studyState.screenRaf);
    studyState.screenRaf = null;
  }
}

function startStudyScreenLoop() {
  stopStudyScreenLoop();
  if (!studyState.screenMode) {
    drawStudyScreen(0, performance.now());
    return;
  }
  const tick = (now) => {
    if (!studyState.screenMode) return;
    drawStudyScreen(studyState.screenMode, now);
    studyState.screenRaf = requestAnimationFrame(tick);
  };
  drawStudyScreen(studyState.screenMode, performance.now());
  studyState.screenRaf = requestAnimationFrame(tick);
}

function setStudyScreenLight(mode) {
  const light = studyState.screenLight;
  if (!light) return;
  const config =
    mode === 1
      ? { color: 0xbfe8ff, intensity: 2.8 }
      : mode === 2
      ? { color: 0xffa06f, intensity: 3.2 }
      : { color: 0xbfe8ff, intensity: 0 };
  const color = new THREE.Color(config.color);
  const quick = !gsap || reducedMotion;
  gsap?.killTweensOf(light);
  gsap?.killTweensOf(light.color);
  if (quick) {
    light.intensity = config.intensity;
    light.color.copy(color);
    return;
  }
  gsap.to(light, {
    intensity: config.intensity,
    duration: 0.55,
    ease: "power2.out",
  });
  gsap.to(light.color, {
    r: color.r,
    g: color.g,
    b: color.b,
    duration: 0.55,
    ease: "power2.out",
  });
}

function setStudyScreenMode(mode) {
  const next = clamp(Math.round(Number(mode) || 0), 0, 2);
  studyState.screenMode = next;
  if (next === 1) {
    studyState.screenStart = performance.now();
  }
  setStudyScreenLight(next);
  if (next === 0) {
    stopStudyScreenLoop();
    drawStudyScreen(0, performance.now());
  } else {
    startStudyScreenLoop();
  }
  syncOsModeButtons();
}

function cycleStudyScreen() {
  setStudyScreenMode((studyState.screenMode + 1) % 3);
}

function toggleStudyBookshelf() {
  const on = !studyState.shelfOn;
  studyState.shelfOn = on;
  if (studyState.shelfLed) studyState.shelfLed.visible = on;
  if (!studyState.shelfLight) return;
  const quick = !gsap || reducedMotion;
  gsap?.killTweensOf(studyState.shelfLight);
  if (quick) {
    studyState.shelfLight.intensity = on ? 1.7 : 0;
  } else {
    gsap.to(studyState.shelfLight, {
      intensity: on ? 1.7 : 0,
      duration: 0.55,
      ease: "power2.out",
    });
  }
}

function toggleStudyDeskLamp() {
  studyState.lampOn = !studyState.lampOn;
  const on = studyState.lampOn;
  const mainLight = state.lightRig?.study;
  const preset = LIGHT_PRESETS[state.timePreset]?.study;
  const base = preset?.intensity ?? 8.5;
  const lampTarget = on ? 2.2 : 0;
  const mainTarget = on ? base : base * 0.14;

  if (studyState.lampBulb) studyState.lampBulb.visible = on;
  const quick = !gsap || reducedMotion;
  if (studyState.lampLight) {
    gsap?.killTweensOf(studyState.lampLight);
    if (quick) studyState.lampLight.intensity = lampTarget;
    else {
      gsap.to(studyState.lampLight, {
        intensity: lampTarget,
        duration: 0.55,
        ease: "power2.out",
      });
    }
  }
  if (mainLight) {
    gsap?.killTweensOf(mainLight);
    if (quick) mainLight.intensity = mainTarget;
    else {
      gsap.to(mainLight, {
        intensity: mainTarget,
        duration: 0.55,
        ease: "power2.out",
      });
    }
  }
}

function handleStudyInteraction(type) {
  if (type === "computer") openNocturneOS();
  else if (type === "bookshelf") toggleStudyBookshelf();
  else if (type === "deskLamp") toggleStudyDeskLamp();
  else if (type === "photoUpload") photoFrameState.input?.click();
}

function buildSunkenGarage(group) {
  // Attach the forecourt to the right side of the plinth. The four deck
  // segments leave a void for a sloped vehicle ramp and the basement below.
  const deckY = -0.07;
  addBox(group, 0.7, 0.18, 5.0, MAT.garageDeck, 5.3, deckY, -0.65, {
    cast: false,
    receive: true,
  });
  addBox(group, 0.4, 0.18, 5.0, MAT.garageDeck, 8.25, deckY, -0.65, {
    cast: false,
    receive: true,
  });
  addBox(group, 2.4, 0.18, 0.4, MAT.garageDeck, 6.85, deckY, -2.95, {
    cast: false,
    receive: true,
  });
  addBox(group, 0.4, 0.18, 0.3, MAT.garageDeck, 5.85, deckY, 1.7, {
    cast: false,
    receive: true,
  });
  addBox(group, 0.4, 0.18, 0.3, MAT.garageDeck, 7.85, deckY, 1.7, {
    cast: false,
    receive: true,
  });

  // Outer skirt of the new plinth extension.
  addBox(group, 0.12, 0.9, 5.0, MAT.garageConcrete, 5.01, -0.4, -0.65, {
    cast: false,
  });
  addBox(group, 0.12, 0.9, 5.0, MAT.garageConcrete, 8.39, -0.4, -0.65, {
    cast: false,
  });
  addBox(group, 3.5, 0.9, 0.12, MAT.garageConcrete, 6.7, -0.4, -3.09, {
    cast: false,
  });
  addBox(group, 1.1, 0.9, 0.12, MAT.garageConcrete, 5.5, -0.4, 1.79, {
    cast: false,
  });
  addBox(group, 0.8, 0.9, 0.12, MAT.garageConcrete, 8.05, -0.4, 1.79, {
    cast: false,
  });

  // Basement slab, retaining walls and the ramp entry.
  addBox(group, 2.4, 0.14, 4.3, MAT.garageConcrete, 6.85, -0.73, -0.6, {
    cast: false,
    receive: true,
  });
  addBox(group, 0.14, 0.88, 4.3, MAT.garageConcrete, 5.72, -0.3, -0.6, {
    cast: false,
  });
  addBox(group, 0.14, 0.88, 4.3, MAT.garageConcrete, 7.98, -0.3, -0.6, {
    cast: false,
  });
  addBox(group, 2.26, 0.88, 0.14, MAT.garageConcrete, 6.85, -0.3, -2.68, {
    cast: false,
  });
  addBox(group, 0.26, 0.2, 0.13, MAT.garageConcrete, 5.85, -0.62, 1.55, {
    cast: false,
  });
  addBox(group, 0.26, 0.2, 0.13, MAT.garageConcrete, 7.85, -0.62, 1.55, {
    cast: false,
  });

  // The retaining wall / concrete spine ties the garage to the first-floor
  // slab. The transfer beam reaches into the main volume.
  addBox(group, 0.36, 4.4, 0.55, MAT.shearConcrete, 4.99, 1.35, -2.45, {
    cast: true,
    receive: true,
  });
  addBox(group, 2.2, 0.32, 1.0, MAT.shearConcrete, 4.0, 3.42, -2.45, {
    cast: true,
    receive: true,
  });
  addBox(group, 0.18, 0.88, 4.5, MAT.garageConcrete, 5.66, -0.42, -0.6, {
    cast: false,
  });

  // Sloped ramp: a rotated BoxGeometry, with an LED strip on either edge.
  const ramp = new THREE.Group();
  ramp.position.set(6.85, -0.38, 0.55);
  ramp.rotation.x = -0.32;
  group.add(ramp);
  addBox(ramp, 1.56, 0.08, 2.55, MAT.rampConcrete, 0, 0, 0, {
    cast: false,
    receive: true,
  });
  [-0.83, 0.83].forEach((x) => {
    addBox(ramp, 0.12, 0.16, 2.55, MAT.garageConcrete, x, 0.02, 0, {
      cast: false,
    });
    addBox(ramp, 0.025, 0.022, 2.45, MAT.neon, x, 0.1, 0, {
      cast: false,
      receive: false,
    });
  });

  // Linear LEDs along the retaining walls.
  addBox(group, 1.9, 0.024, 0.018, MAT.neon, 6.85, -0.12, -2.58, {
    cast: false,
    receive: false,
  });
  addBox(group, 0.018, 0.024, 2.6, MAT.neon, 5.8, -0.12, -0.6, {
    cast: false,
    receive: false,
  });
  addBox(group, 0.018, 0.024, 2.6, MAT.neon, 7.9, -0.12, -0.6, {
    cast: false,
    receive: false,
  });

  // A stone threshold and planting bed stitch the garage into the garden.
  addBox(group, 1.9, 0.04, 0.55, MAT.gravel, 6.85, 0.018, 2.05, {
    cast: false,
    receive: true,
  });
  addBox(group, 0.62, 0.06, 2.55, MAT.gravel, 8.63, 0.03, -0.8, {
    cast: false,
    receive: true,
  });
  addBox(group, 0.38, 0.24, 2.4, MAT.darkStone, 8.62, 0.12, -0.8, {
    cast: true,
  });
  makeBush(8.62, -1.55, 0.26, MAT.leafOlive, 0.24, group);

  // Low-poly car in the basement.
  const car = new THREE.Group();
  car.position.set(6.85, -0.66, -1.55);
  group.add(car);
  addBox(car, 1.3, 0.26, 2.0, MAT.carBody, 0, 0.2, 0, { cast: false });
  addBox(car, 1.02, 0.3, 0.95, MAT.carBody, 0, 0.44, -0.12, { cast: false });
  addBox(car, 0.92, 0.2, 0.58, MAT.carGlass, 0, 0.48, 0.22, {
    cast: false,
  });
  [-0.72, 0.72].forEach((x) => {
    [-0.6, 0.6].forEach((z) => {
      addCylinder(car, 0.17, 0.12, MAT.darkMetal, x, 0.16, z, {
        rotation: [0, 0, Math.PI / 2],
        cast: false,
      });
    });
  });
  [-0.4, 0.4].forEach((x) => {
    addBox(car, 0.2, 0.06, 0.02, MAT.carLight, x, 0.21, 1.01, {
      cast: false,
      receive: false,
    });
    addBox(car, 0.2, 0.06, 0.02, MAT.carTail, x, 0.22, -1.01, {
      cast: false,
      receive: false,
    });
  });

  const garageLight = new THREE.PointLight(0xa7e2ff, 11, 4.4, 2);
  garageLight.position.set(6.85, 0.3, -1.0);
  group.add(garageLight);
}

function addBushBed() {
  const bushes = [
    [-3.8, -3.4, 0.84, MAT.leaf],
    [-4.2, -2.25, 0.62, MAT.leafLight],
    [-4.2, 2.82, 0.65, MAT.leafOlive],
    [3.92, -2.78, 0.78, MAT.leaf],
    [4.18, 2.15, 0.55, MAT.leafLight],
    [3.56, 3.87, 0.66, MAT.leaf],
    [-1.05, 4.22, 0.48, MAT.leafOlive],
    [0.7, 4.18, 0.42, MAT.leafLight],
    [1.0, 1.56, 0.42, MAT.leafOlive],
    [3.0, 1.68, 0.46, MAT.leaf],
  ];
  bushes.forEach(([x, z, s, mat], i) => {
    makeBush(x, z, s, mat, 0.03, G.plants);
    addContactShadow(G.plants, s * 3.2, s * 3.2, x, z, 0.25);
  });

  // Tufts of ornamental grass at the edges of the beds.
  const tufts = [
    [-3.55, -2.72],
    [-4.0, 1.2],
    [-3.72, 0.6],
    [3.66, 3.3],
    [3.9, 2.86],
    [3.2, -2.3],
    [-1.22, 4.15],
    [1.0, 4.25],
  ];
  tufts.forEach(([x, z]) => makeGrassTuft(x, z, G.plants));
}

function makeBush(x, z, s, material, y = 0.03, parent = G.plants) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  parent.add(group);
  const blobs = 3 + Math.floor(random() * 3);
  for (let i = 0; i < blobs; i += 1) {
    const mesh = new THREE.Mesh(lowLeafGeometry, material);
    const angle = random() * Math.PI * 2;
    const radius = random() * s * 0.55;
    mesh.position.set(
      Math.cos(angle) * radius,
      s * (0.45 + random() * 0.25),
      Math.sin(angle) * radius
    );
    mesh.scale.set(
      s * (0.45 + random() * 0.34),
      s * (0.55 + random() * 0.42),
      s * (0.48 + random() * 0.32)
    );
    mesh.rotation.y = random() * Math.PI;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}

function makeGrassTuft(x, z, parent) {
  const group = new THREE.Group();
  group.position.set(x, 0.02, z);
  parent.add(group);
  for (let i = 0; i < 7; i += 1) {
    const blade = new THREE.Mesh(coneGeometry, MAT.leafOlive);
    blade.position.set(
      (random() - 0.5) * 0.26,
      0.18 + random() * 0.16,
      (random() - 0.5) * 0.26
    );
    blade.scale.set(0.012 + random() * 0.018, 0.33 + random() * 0.35, 0.012);
    blade.rotation.z = (random() - 0.5) * 0.35;
    blade.rotation.x = (random() - 0.5) * 0.3;
    blade.castShadow = true;
    group.add(blade);
  }
}

function addTree(x, z, scale = 1) {
  addCylinderGeo(G.plants, 0.055 * scale, 0.12 * scale, 3.55 * scale, 7, MAT.bark, x, 1.8 * scale, z, {
    cast: true,
  });
  addCylinderGeo(G.plants, 0.02 * scale, 0.045 * scale, 1.2 * scale, 5, MAT.bark, x + 0.2, 2.85 * scale, z - 0.05, {
    rotation: [0, 0, -0.38],
    cast: true,
  });
  addCylinderGeo(G.plants, 0.018 * scale, 0.04 * scale, 1.0 * scale, 5, MAT.bark, x - 0.2, 2.7 * scale, z + 0.1, {
    rotation: [0.2, 0, 0.5],
    cast: true,
  });
  const canopy = [
    [0.0, 3.85, 0.0, 1.08],
    [-0.45, 4.22, 0.16, 0.8],
    [0.45, 4.24, 0.07, 0.76],
    [0.18, 4.55, -0.26, 0.62],
    [-0.2, 4.06, -0.35, 0.7],
    [0.35, 3.95, 0.36, 0.54],
  ];
  canopy.forEach(([dx, y, dz, s]) => {
    const mesh = new THREE.Mesh(leafGeometry, MAT.leaf);
    mesh.position.set(x + dx * scale, y * scale, z + dz * scale);
    mesh.scale.set(s * scale, s * scale * 0.8, s * scale);
    mesh.rotation.y = random() * Math.PI;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    G.plants.add(mesh);
  });
  addContactShadow(G.plants, 2.1, 1.8, x, z, 0.42);
}

function addGardenLights() {
  const bollards = [
    [2.65, 3.85],
    [0.16, 3.1],
    [-1.12, 3.78],
    [3.28, -0.45],
  ];
  bollards.forEach(([x, z]) => {
    addCylinder(G.details, 0.035, 0.28, MAT.darkMetal, x, 0.16, z, {
      cast: false,
    });
    addCylinder(G.details, 0.06, 0.025, MAT.warmGlow, x, 0.31, z, {
      cast: false,
      receive: false,
    });
    const glow = addGlow(G.details, x, 0.32, z, 0xffb874, 0.4, 0.55, 0.42);
    const pool = addLightPool(G.details, x, z, 1.35, 0.14);
    state.pathLights.push({
      glow,
      pool,
      glowBase: glow.material.opacity,
      poolBase: pool.material.opacity,
      scale: glow.scale.clone(),
      z,
    });
  });

  // Linear light under the house edge.
  addBox(G.details, 3.9, 0.025, 0.028, MAT.warmGlow, 0.6, 0.19, 2.77, {
    cast: false,
    receive: false,
  });
  addGlow(G.details, 0.6, 0.2, 2.82, 0xffb77a, 0.13, 3.4, 0.45);

  // Uplit tree lens.
  addCylinder(G.details, 0.07, 0.05, MAT.darkMetal, -3.7, 0.03, -2.72, {
    cast: false,
  });
  addCylinder(G.details, 0.045, 0.022, MAT.warmGlow, -3.7, 0.065, -2.72, {
    cast: false,
    receive: false,
  });
  addGlow(G.details, -3.7, 0.1, -2.72, 0xffae68, 0.3, 0.6, 0.32);
  addLightPool(G.details, -3.9, -3.03, 2.4, 0.12);
}

/* Lighting ---------------------------------------------------------------- */
function addLight(light, targetIntensity) {
  light.intensity = targetIntensity;
  G.lights.add(light);
  if (light.target) {
    G.lights.add(light.target);
  }
  state.lights.push({ light, target: targetIntensity });
  return light;
}

function setupLights() {
  const hemi = new THREE.HemisphereLight(0x8fa6c0, 0x1c1812, 0.72);
  addLight(hemi, 0.72);

  const ambient = new THREE.AmbientLight(0x59657a, 0.16);
  addLight(ambient, 0.16);

  const moon = new THREE.DirectionalLight(0xc1d4ef, 2.55);
  moon.position.set(-7.8, 11.5, 7.2);
  moon.target.position.set(0, 2.4, 0);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  moon.shadow.camera.left = -12;
  moon.shadow.camera.right = 12;
  moon.shadow.camera.top = 12;
  moon.shadow.camera.bottom = -10;
  moon.shadow.camera.near = 0.5;
  moon.shadow.camera.far = 42;
  moon.shadow.bias = -0.00035;
  moon.shadow.normalBias = 0.035;
  addLight(moon, 2.55);

  const coolFill = new THREE.DirectionalLight(0x7089a9, 0.62);
  coolFill.position.set(7.2, 4.8, 7.5);
  coolFill.target.position.set(0, 2.2, 0);
  addLight(coolFill, 0.62);

  const rim = new THREE.DirectionalLight(0x9bb9d6, 0.82);
  rim.position.set(9.2, 5.2, -7.8);
  rim.target.position.set(0, 2.0, 0);
  addLight(rim, 0.82);

  const living = new THREE.PointLight(0xffb775, 16.5, 7.2, 2);
  living.position.set(0.7, 2.35, 0.15);
  addLight(living, 16.5);

  const bedroom = new THREE.PointLight(0xffb474, 13, 5.7, 2);
  bedroom.position.set(-0.6, 5.28, -1.0);
  addLight(bedroom, 13);

  const reading = new THREE.PointLight(0xffc38c, 5, 3.4, 2);
  reading.position.set(-2.14, 1.45, 0.7);
  addLight(reading, 5);

  const tea = new THREE.PointLight(0xffc38c, 7.5, 4.6, 2);
  tea.position.set(-3.65, 4.65, 0.55);
  addLight(tea, 7.5);

  const study = new THREE.PointLight(0xffbd80, 8.5, 4.8, 2);
  study.position.set(4.35, 4.8, -1.2);
  addLight(study, 8.5);

  const patio = new THREE.PointLight(0xffb579, 4.2, 4.2, 2);
  patio.position.set(-2.15, 0.58, 3.35);
  addLight(patio, 4.2);

  const stoneUplight = new THREE.SpotLight(0xffb574, 28, 9.5, 0.34, 0.82, 2);
  stoneUplight.position.set(-3.52, 0.08, 3.12);
  stoneUplight.target.position.set(-2.42, 4.8, 1.05);
  stoneUplight.castShadow = false;
  addLight(stoneUplight, 28);
  addGlow(G.details, -3.52, 0.12, 3.12, 0xffb268, 0.24, 0.6, 0.35);
  addLightPool(G.details, -3.1, 2.86, 2.2, 0.11);

  const treeUplight = new THREE.SpotLight(0xffa869, 18, 6.4, 0.42, 0.82, 2);
  treeUplight.position.set(-3.55, 0.06, -2.8);
  treeUplight.target.position.set(-4.0, 3.6, -3.3);
  treeUplight.castShadow = false;
  addLight(treeUplight, 18);

  state.lightRig = {
    hemi,
    ambient,
    moon,
    coolFill,
    rim,
    living,
    bedroom,
    reading,
    tea,
    study,
    patio,
    stoneUplight,
    treeUplight,
  };
}

/* Camera & UI ------------------------------------------------------------- */
function fitFactor() {
  const aspect = viewer.clientWidth / Math.max(1, viewer.clientHeight);
  const narrow = aspect < 1.06 ? clamp(1.06 / aspect, 1, 1.32) : 1;
  return clamp(narrow * 1.3, 1.22, 1.6);
}

function poseFor(name, factor = fitFactor()) {
  const view = VIEWS[name] || VIEWS.overview;
  const target = new THREE.Vector3(...view.target);
  const offset = new THREE.Vector3(...view.position).sub(target);
  offset.multiplyScalar(factor);
  return { position: target.clone().add(offset), target };
}

function setCaption(text) {
  if (!captionEl || captionEl.textContent === text) return;
  captionEl.classList.add("is-switching");
  window.setTimeout(() => {
    captionEl.textContent = text;
    captionEl.classList.remove("is-switching");
  }, 150);
}

function setActiveButton(name) {
  let match = null;
  document.querySelectorAll(".space-row").forEach((button) => {
    const active = button.dataset.view === name;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
    if (active) match = button;
  });
  return match;
}

function setTimePreset(name, { instant = false } = {}) {
  const preset = LIGHT_PRESETS[name];
  if (!preset || !state.lightRig) return;

  if (state.focus) clearRoomFocus({ instant: true });

  if (state.pathLightTl) {
    state.pathLightTl.kill();
    state.pathLightTl = null;
  }

  state.timePreset = name;
  const quick = instant || reducedMotion || !gsap;
  const duration = 1.15;
  const rig = state.lightRig;

  LIGHT_RIG_KEYS.forEach((key) => {
    const light = rig[key];
    const config = preset[key];
    if (!light || !config) return;
    const targetColor = new THREE.Color(config.color);
    const targetIntensity =
      key === "study" && !studyState.lampOn
        ? config.intensity * 0.14
        : config.intensity;

    if (quick) {
      light.intensity = targetIntensity;
      light.color.copy(targetColor);
      if (light.groundColor && config.groundColor != null) {
        light.groundColor.setHex(config.groundColor);
      }
      return;
    }

    gsap.killTweensOf(light);
    gsap.killTweensOf(light.color);
    if (light.groundColor) gsap.killTweensOf(light.groundColor);

    gsap.to(light, {
      intensity: targetIntensity,
      duration,
      ease: "power2.inOut",
    });
    gsap.to(light.color, {
      r: targetColor.r,
      g: targetColor.g,
      b: targetColor.b,
      duration,
      ease: "power2.inOut",
    });
    if (light.groundColor && config.groundColor != null) {
      const ground = new THREE.Color(config.groundColor);
      gsap.to(light.groundColor, {
        r: ground.r,
        g: ground.g,
        b: ground.b,
        duration,
        ease: "power2.inOut",
      });
    }
  });

  if (fogMaterial) {
    const fogTarget =
      name === "night" ? 0.085 : name === "dusk" ? 0.045 : 0.018;
    if (quick) {
      fogMaterial.uniforms.uOpacity.value = fogTarget;
    } else {
      gsap.to(fogMaterial.uniforms.uOpacity, {
        value: fogTarget,
        duration,
        ease: "power2.inOut",
      });
    }
  }

  if (quick) {
    renderer.toneMappingExposure = preset.exposure;
    scene.environmentIntensity = preset.environmentIntensity;
  } else {
    gsap.to(renderer, {
      toneMappingExposure: preset.exposure,
      duration,
      ease: "power2.inOut",
    });
    gsap.to(scene, {
      environmentIntensity: preset.environmentIntensity,
      duration,
      ease: "power2.inOut",
    });
  }

  // Interior fixtures have their own emissive faces. Dim those materials too,
  // otherwise the lamps would stay bright after their point lights go out.
  if (MAT.warmGlow) {
    const warm = new THREE.Color(preset.lampColor);
    gsap.killTweensOf(MAT.warmGlow.color);
    if (quick) {
      MAT.warmGlow.color.copy(warm);
    } else {
      gsap.to(MAT.warmGlow.color, {
        r: warm.r,
        g: warm.g,
        b: warm.b,
        duration,
        ease: "power2.inOut",
      });
    }
  }
  if (MAT.warmGlowSoft) {
    const soft = new THREE.Color(preset.lampSoftColor);
    gsap.killTweensOf(MAT.warmGlowSoft.color);
    gsap.killTweensOf(MAT.warmGlowSoft);
    if (quick) {
      MAT.warmGlowSoft.color.copy(soft);
      MAT.warmGlowSoft.opacity = preset.lampSoftOpacity;
    } else {
      gsap.to(MAT.warmGlowSoft.color, {
        r: soft.r,
        g: soft.g,
        b: soft.b,
        duration,
        ease: "power2.inOut",
      });
      gsap.to(MAT.warmGlowSoft, {
        opacity: preset.lampSoftOpacity,
        duration,
        ease: "power2.inOut",
      });
    }
  }

  state.glows.forEach(({ sprite, nightTarget, target }) => {
    const base = nightTarget ?? target ?? sprite.material.opacity;
    const next = base * preset.glow;
    gsap.killTweensOf(sprite.material);
    if (quick) {
      sprite.material.opacity = next;
    } else {
      gsap.to(sprite.material, {
        opacity: next,
        duration,
        ease: "power2.inOut",
      });
    }
  });

  document.querySelectorAll(".stage-sky").forEach((layer) => {
    const next = layer.dataset.sky === name ? 1 : 0;
    if (quick) {
      layer.style.opacity = String(next);
    } else {
      gsap.to(layer, {
        opacity: next,
        duration: 1,
        ease: "power2.inOut",
      });
    }
  });

  viewer.dataset.preset = name;
  const sceneMode = document.getElementById("scene-mode");
  if (sceneMode) sceneMode.textContent = `NOCTURNE / ${preset.label}`;
  const timeMode = document.getElementById("time-mode");
  if (timeMode) timeMode.textContent = preset.label;

  document.querySelectorAll(".preset-button").forEach((button) => {
    const active = button.dataset.time === name;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function collectGroupMaterials(group, skipMaterial = null) {
  const clones = new Map();
  const items = [];
  group.traverse((object) => {
    if (!object.isMesh || !object.material) return;
    if (skipMaterial && object.material === skipMaterial) return;
    let clone = clones.get(object.material);
    if (!clone) {
      clone = object.material.clone();
      clone.transparent = object.material.transparent;
      clone.opacity = object.material.opacity;
      clone.depthWrite = object.material.depthWrite;
      clone.needsUpdate = true;
      clones.set(object.material, clone);
      items.push({
        material: clone,
        baseOpacity: object.material.opacity,
        baseTransparent: object.material.transparent,
        baseDepthWrite: object.material.depthWrite,
      });
    }
    object.material = clone;
  });
  return items;
}

function prepareLayerFade(layer) {
  if (state.layerFades[layer]) return state.layerFades[layer];

  let fade = null;
  if (layer === "roof") {
    fade = {
      group: G.roof,
      items: collectGroupMaterials(G.roof),
    };
  } else if (layer === "glass") {
    fade = {
      group: G.glass,
      items: collectGroupMaterials(G.glass, MAT.glass),
      glassMaterial: MAT.glass,
      glassOpacity: FINAL_GLASS,
    };
  } else if (layer === "plants") {
    fade = {
      group: G.plants,
      items: collectGroupMaterials(G.plants),
    };
  }

  if (!fade) return null;
  fade.baseY = fade.group.position.y;
  state.layerFades[layer] = fade;
  return fade;
}

function setLayerHidden(layer, hidden) {
  if (!(layer in state.layerHidden)) return;
  if (state.layerHidden[layer] === hidden) return;
  if (state.introPlaying) finishIntro(true);
  if (state.focus) clearRoomFocus({ instant: true });

  const fade = prepareLayerFade(layer);
  if (!fade) return;
  state.layerHidden[layer] = hidden;

  if (state.layerTweens[layer]) {
    state.layerTweens[layer].kill();
    state.layerTweens[layer] = null;
  }

  const { group, items } = fade;
  const materials = items.map((item) => item.material);
  const quick = !gsap || reducedMotion;

  const settle = (showing) => {
    group.visible = showing;
    if (layer === "roof") {
      group.position.y = showing ? fade.baseY : fade.baseY + 0.35;
    }
    if (layer === "glass" && fade.glassMaterial) {
      fade.glassMaterial.opacity = showing ? fade.glassOpacity : 0;
    }
    items.forEach((item) => {
      item.material.transparent = showing
        ? item.baseTransparent
        : true;
      item.material.depthWrite = showing
        ? item.baseDepthWrite
        : false;
      item.material.opacity = showing ? item.baseOpacity : 0;
      item.material.needsUpdate = true;
    });
    if (!showing) group.visible = false;
    if (renderer) renderer.shadowMap.needsUpdate = true;
  };

  if (quick) {
    items.forEach((item) => {
      item.material.transparent = true;
      item.material.depthWrite = false;
      item.material.opacity = hidden ? 0 : item.baseOpacity;
      item.material.needsUpdate = true;
    });
    if (layer === "glass" && fade.glassMaterial) {
      fade.glassMaterial.opacity = hidden ? 0 : fade.glassOpacity;
    }
    settle(!hidden);
    return;
  }

  group.visible = true;
  items.forEach((item) => {
    item.material.transparent = true;
    item.material.depthWrite = false;
    item.material.opacity = hidden ? item.material.opacity : 0;
    item.material.needsUpdate = true;
  });
  if (layer === "glass" && fade.glassMaterial) {
    if (hidden) {
      fade.glassMaterial.transparent = true;
    } else {
      fade.glassMaterial.opacity = 0;
    }
  }

  const tl = gsap.timeline({
    defaults: { ease: "power2.inOut" },
    onComplete: () => settle(!hidden),
  });
  state.layerTweens[layer] = tl;

  if (layer === "roof") {
    tl.to(group.position, {
      y: hidden ? fade.baseY + 0.35 : fade.baseY,
      duration: 0.72,
    }, 0);
  }

  if (hidden) {
    tl.to(materials, { opacity: 0, duration: 0.52 }, 0);
    if (layer === "glass" && fade.glassMaterial) {
      tl.to(fade.glassMaterial, { opacity: 0, duration: 0.52 }, 0);
    }
  } else {
    tl.to(materials, {
      opacity: (index) => items[index].baseOpacity,
      duration: 0.62,
    }, 0);
    if (layer === "glass" && fade.glassMaterial) {
      tl.to(fade.glassMaterial, {
        opacity: fade.glassOpacity,
        duration: 0.62,
      }, 0);
    }
  }
}

function initExploreControls() {
  document.querySelectorAll(".preset-button").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.classList.contains("is-active")) return;
      if (state.introPlaying) finishIntro(true);
      setTimePreset(button.dataset.time);
    });
  });

  document.querySelectorAll(".layer-toggle input[data-layer]").forEach((input) => {
    input.addEventListener("change", () => {
      if (state.introPlaying) finishIntro(true);
      setLayerHidden(input.dataset.layer, input.checked);
    });
  });
}

function createHotspotRipple(entry) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0xc7a77a) },
      uOpacity: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        float r = length(vUv - 0.5) * 2.0;
        float ring = smoothstep(0.15, 0.0, abs(r - 0.68));
        ring *= smoothstep(1.0, 0.84, r);
        gl_FragColor = vec4(uColor, ring * uOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.position.copy(entry.anchor).addScaledVector(entry.normal, 0.018);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    entry.normal.clone().normalize()
  );
  mesh.scale.setScalar(0.22);
  mesh.visible = false;
  mesh.renderOrder = 4;
  mesh.frustumCulled = false;
  scene.add(mesh);

  return { mesh, material };
}

function startHotspotRipple(spot) {
  if (!spot.ripple || spot.rippleTween) return;
  const { mesh, material } = spot.ripple;

  mesh.visible = true;
  material.uniforms.uOpacity.value = 0;
  mesh.scale.setScalar(0.22);

  if (!gsap || reducedMotion) {
    mesh.scale.setScalar(1.15);
    material.uniforms.uOpacity.value = 0.34;
    return;
  }

  spot.rippleTween = gsap.timeline({ repeat: -1, repeatDelay: 0.22 })
    .set(mesh.scale, { x: 0.22, y: 0.22, z: 0.22 })
    .set(material.uniforms.uOpacity, { value: 0.58 })
    .to(mesh.scale, {
      x: 1.9,
      y: 1.9,
      z: 1.9,
      duration: 1.25,
      ease: "power2.out",
    }, 0)
    .to(material.uniforms.uOpacity, {
      value: 0,
      duration: 1.15,
      ease: "power2.in",
    }, 0);
}

function stopHotspotRipple(spot) {
  if (spot.rippleTween) {
    spot.rippleTween.kill();
    spot.rippleTween = null;
  }
  if (spot.ripple) {
    spot.ripple.mesh.visible = false;
    spot.ripple.material.uniforms.uOpacity.value = 0;
  }
}

function setHotspotActionState(spot, active) {
  if (!spot?.element) return;
  spot.element.classList.toggle("is-active", active);
  const text = spot.element.querySelector(".hotspot-text");
  const nextText = active && spot.activeText ? spot.activeText : spot.text;
  if (text) text.textContent = nextText;
  spot.element.setAttribute("aria-label", `${spot.title}：${nextText}`);
  if (spot.action === "fireflies") {
    spot.element.setAttribute("aria-pressed", active ? "true" : "false");
  }
}

function stopPathLightPulse() {
  state.pathLights.forEach((entry) => {
    if (entry.pulse) {
      entry.pulse.kill();
      entry.pulse = null;
    }
  });
}

function startPathLightPulse() {
  if (!state.pathLights.length || !gsap || reducedMotion) return;
  stopPathLightPulse();
  state.pathLights.forEach((entry, index) => {
    const proxy = { value: 0 };
    entry.pulse = gsap.to(proxy, {
      value: 1,
      duration: 2.35 + index * 0.21,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
      delay: index * 0.26,
      onUpdate: () => {
        const breathe = 0.88 + proxy.value * 0.2;
        entry.glow.material.opacity = entry.glowBase * breathe;
        entry.pool.material.opacity = entry.poolBase * (0.9 + proxy.value * 0.16);
        entry.glow.scale
          .copy(entry.scale)
          .multiplyScalar(1 + proxy.value * 0.035);
      },
    });
  });
}

function triggerPathLights(spot) {
  if (!state.pathLights.length) return;

  stopPathLightPulse();
  const lights = [...state.pathLights].sort((a, b) => b.z - a.z);
  if (state.pathLightTl) {
    state.pathLightTl.kill();
    state.pathLightTl = null;
  }

  const quick = !gsap || reducedMotion;
  if (quick) {
    lights.forEach((entry) => {
      entry.glow.material.opacity = entry.glowBase;
      entry.pool.material.opacity = entry.poolBase;
      entry.glow.scale.copy(entry.scale);
    });
    setHotspotActionState(spot, true);
    startPathLightPulse();
    return;
  }

  lights.forEach((entry) => {
    gsap.killTweensOf(entry.glow.material);
    gsap.killTweensOf(entry.pool.material);
    gsap.killTweensOf(entry.glow.scale);
    entry.glow.material.opacity = 0;
    entry.pool.material.opacity = 0;
    entry.glow.scale.copy(entry.scale).multiplyScalar(0.35);
  });

  const tl = gsap.timeline({
    onComplete: () => {
      state.pathLightTl = null;
      startPathLightPulse();
    },
  });

  lights.forEach((entry, index) => {
    const at = 0.08 + index * 0.34;
    tl.to(entry.glow.scale, {
      x: entry.scale.x,
      y: entry.scale.y,
      z: entry.scale.z,
      duration: 0.5,
      ease: "back.out(2)",
    }, at)
      .to(entry.glow.material, {
        opacity: Math.min(entry.glowBase * 1.8, 0.85),
        duration: 0.28,
        ease: "power2.out",
      }, at)
      .to(entry.pool.material, {
        opacity: Math.min(entry.poolBase * 1.7, 0.28),
        duration: 0.35,
        ease: "power2.out",
      }, at)
      .to(entry.glow.material, {
        opacity: entry.glowBase,
        duration: 0.7,
        ease: "power2.inOut",
      }, at + 0.3)
      .to(entry.pool.material, {
        opacity: entry.poolBase,
        duration: 0.7,
        ease: "power2.inOut",
      }, at + 0.3);
  });

  state.pathLightTl = tl;
  setHotspotActionState(spot, true);
}

function ensureFireflies() {
  if (state.fireflies) return state.fireflies;

  const count = 96;
  const clusters = [
    [4.18, 2.15],
    [3.0, 1.68],
    [3.56, 3.87],
  ];
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    const [cx, cz] = clusters[i % clusters.length];
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 0.86;
    positions[i * 3] = cx + Math.cos(angle) * radius;
    positions[i * 3 + 1] = 0.42 + Math.random() * 1.1;
    positions[i * 3 + 2] = cz + Math.sin(angle) * radius;
    sizes[i] = 2.0 + Math.random() * 2.2;
    phases[i] = Math.random() * Math.PI * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.75) },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uPixelRatio;
      attribute float aSize;
      attribute float aPhase;
      varying float vTwinkle;

      float hash(vec3 p) {
        p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      float noise(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash(i), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
              mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
          mix(mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
              mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
          f.z
        );
      }

      void main() {
        vec3 p = position;
        float t = uTime * 0.55 + aPhase;
        p.x += (noise(p * 1.7 + vec3(0.0, t * 0.7, 0.0)) - 0.5) * 0.9;
        p.z += (noise(p * 1.5 + vec3(t * 0.6, 0.0, 0.0)) - 0.5) * 0.9;
        p.y += (noise(p * 2.0 + vec3(0.0, 0.0, t * 0.8)) - 0.5) * 0.5;
        p.x += sin(t * 1.4 + aPhase) * 0.06;
        p.z += cos(t * 1.1 + aPhase * 1.7) * 0.06;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = clamp(aSize * (64.0 / max(4.0, -mv.z)) * uPixelRatio, 1.0, 20.0);
        gl_Position = projectionMatrix * mv;
        vTwinkle = 0.45 + 0.55 * (0.5 + 0.5 * sin(t * 2.6 + aPhase * 3.0));
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying float vTwinkle;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float d = length(p);
        float halo = smoothstep(0.5, 0.04, d);
        float core = smoothstep(0.18, 0.0, d);
        vec3 color = mix(vec3(1.0, 0.56, 0.18), vec3(1.0, 0.93, 0.68), core);
        float alpha = (halo * 0.62 + core) * vTwinkle * uOpacity;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 3;
  points.visible = false;
  G.plants.add(points);

  state.fireflies = {
    points,
    material,
    active: false,
    tl: null,
  };
  return state.fireflies;
}

function toggleFireflies(spot) {
  const fireflies = ensureFireflies();
  if (fireflies.tl) {
    fireflies.tl.kill();
    fireflies.tl = null;
  }

  const quick = !gsap || reducedMotion;

  if (fireflies.active) {
    fireflies.active = false;
    setHotspotActionState(spot, false);
    if (quick) {
      fireflies.material.uniforms.uOpacity.value = 0;
      fireflies.points.visible = false;
      return;
    }
    fireflies.tl = gsap.to(fireflies.material.uniforms.uOpacity, {
      value: 0,
      duration: 0.6,
      ease: "power2.in",
      onComplete: () => {
        fireflies.points.visible = false;
        fireflies.tl = null;
      },
    });
    return;
  }

  fireflies.active = true;
  fireflies.points.visible = true;
  setHotspotActionState(spot, true);

  if (quick) {
    fireflies.material.uniforms.uOpacity.value = 1;
    fireflies.tl = null;
    return;
  }

  fireflies.tl = gsap.to(fireflies.material.uniforms.uOpacity, {
    value: 1,
    duration: 0.9,
    ease: "power2.out",
    onComplete: () => {
      fireflies.tl = null;
    },
  });
}

function createHotspots() {
  const layer = document.createElement("div");
  layer.className = "hotspot-layer";
  layer.setAttribute("role", "group");
  layer.setAttribute("aria-label", "空间标记");
  viewer.appendChild(layer);

  HOTSPOTS.forEach((spot) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "hotspot";
    button.dataset.hotspot = spot.id;
    if (spot.action) button.dataset.action = spot.action;
    if (spot.action === "fireflies") {
      button.setAttribute("aria-pressed", "false");
    }
    const tooltipId = `hotspot-tooltip-${spot.id}`;
    button.setAttribute("aria-label", `${spot.title}：${spot.text}`);
    button.setAttribute("aria-describedby", tooltipId);
    button.innerHTML = `
      <span class="hotspot-dot" aria-hidden="true"></span>
      <span class="hotspot-tooltip" id="${tooltipId}" role="tooltip">
        <span class="hotspot-title">${spot.title}</span>
        <span class="hotspot-text">${spot.text}</span>
      </span>`;

    const entry = {
      ...spot,
      element: button,
      anchor: new THREE.Vector3(...spot.position),
      normal: new THREE.Vector3(...spot.normal),
      pointerInside: false,
      focused: false,
    };
    entry.ripple = createHotspotRipple(entry);

    const sync = () => {
      const isOpen = entry.pointerInside || entry.focused;
      button.classList.toggle("is-open", isOpen);
      if (isOpen) {
        startHotspotRipple(entry);
      } else {
        stopHotspotRipple(entry);
      }
    };

    button.addEventListener("pointerenter", () => {
      entry.pointerInside = true;
      sync();
    });
    button.addEventListener("pointerleave", () => {
      entry.pointerInside = false;
      sync();
    });
    button.addEventListener("focus", () => {
      entry.focused = true;
      sync();
    });
    button.addEventListener("blur", () => {
      entry.focused = false;
      sync();
    });
    button.addEventListener("click", () => {
      entry.focused = true;
      sync();
      if (entry.action === "pathLights") {
        triggerPathLights(entry);
      } else if (entry.action === "fireflies") {
        toggleFireflies(entry);
      }
    });

    layer.appendChild(button);
    state.hotspots.push(entry);
  });

  state.hotspotLayer = layer;

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.activeElement?.classList.contains("hotspot")) {
      document.activeElement.blur();
    }
  });
}

function updateHotspots() {
  if (!state.hotspots.length) return;
  const width = viewer.clientWidth;
  const height = viewer.clientHeight;
  camera.updateMatrixWorld();

  state.hotspots.forEach((spot) => {
    let visible = !state.introPlaying && !state.exploded && !state.blueprint;
    if (spot.requires && state.layerHidden[spot.requires]) visible = false;

    if (visible) {
      const toCamera = camera.position.clone().sub(spot.anchor);
      if (toCamera.dot(spot.normal) < 0.08) visible = false;
    }

    let x = 0;
    let y = 0;
    if (visible) {
      const projected = spot.anchor.clone().project(camera);
      if (projected.z < -1 || projected.z > 1) {
        visible = false;
      } else {
        x = (projected.x * 0.5 + 0.5) * width;
        y = (-projected.y * 0.5 + 0.5) * height;
        if (x < 10 || x > width - 10 || y < 10 || y > height - 10) {
          visible = false;
        }
      }
    }

    if (!visible) {
      stopHotspotRipple(spot);
      spot.element.classList.remove("is-open");
      spot.element.style.opacity = "0";
      spot.element.style.visibility = "hidden";
      return;
    }

    spot.element.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) translate(-50%, -50%)`;
    spot.element.style.opacity = "1";
    spot.element.style.visibility = "visible";
    spot.element.classList.toggle("is-left", x > width * 0.72);
    spot.element.classList.toggle("is-below", y < height * 0.16);
  });
}

function prepareExplodedStudy() {
  if (state.explodeGlass.length) return;

  G.glass.traverse((object) => {
    if (!object.isMesh) return;
    state.explodeGlass.push({
      object,
      origin: object.position.clone(),
    });
  });

  G.interior.children.forEach((object) => {
    if (object.position.y > 3.4) {
      state.explodeUpperInterior.push({
        object,
        originY: object.position.y,
      });
    }
  });

  const bedroom = state.roomGroups.bedroom;
  if (bedroom && !state.explodeUpperInterior.some((entry) => entry.object === bedroom)) {
    state.explodeUpperInterior.push({
      object: bedroom,
      originY: bedroom.position.y,
    });
  }
}

function explodedGlassTarget(origin, index) {
  const dx = origin.x - 0.1;
  const dz = origin.z + 0.7;
  let dirX = 0;
  let dirZ = 0;
  if (Math.abs(dx) > Math.abs(dz)) {
    dirX = Math.sign(dx) || 1;
  } else {
    dirZ = Math.sign(dz) || 1;
  }
  const distance = 1 + (index % 4) * 0.18;
  const lift = origin.y > 3.4 ? 1.1 : 0.03;
  return {
    x: origin.x + dirX * distance,
    y: origin.y + lift + (index % 3) * 0.04,
    z: origin.z + dirZ * distance,
  };
}

function enterExplodedStudy() {
  if (!document.getElementById("arch-dock")) return;
  if (state.introPlaying) finishIntro(true);
  if (state.exploded) return;
  if (state.focus) clearRoomFocus({ instant: true });

  prepareExplodedStudy();
  state.exploded = true;
  updateArchPanel();

  if (state.explodeTl) state.explodeTl.kill();
  const quick = !gsap || reducedMotion;
  if (renderer) renderer.shadowMap.autoUpdate = true;

  const targets = state.explodeGlass.map((entry, index) =>
    explodedGlassTarget(entry.origin, index)
  );

  if (quick) {
    G.roof.position.y = 2.45;
    G.upper.position.y = 1.1;
    G.terrace.position.y = 0.5;
    state.explodeUpperInterior.forEach(({ object, originY }) => {
      object.position.y = originY + 1.1;
    });
    state.explodeGlass.forEach(({ object }, index) => {
      object.position.set(targets[index].x, targets[index].y, targets[index].z);
    });
    if (renderer) {
      renderer.shadowMap.autoUpdate = false;
      renderer.shadowMap.needsUpdate = true;
    }
    return;
  }

  const tl = gsap.timeline({
    defaults: { ease: "power3.out" },
    onComplete: () => {
      state.explodeTl = null;
      if (renderer) {
        renderer.shadowMap.autoUpdate = false;
        renderer.shadowMap.needsUpdate = true;
      }
    },
  });

  tl.to(G.roof.position, { y: 2.45, duration: 1.8 }, 0)
    .to(G.upper.position, { y: 1.1, duration: 1.8 }, 0)
    .to(G.terrace.position, { y: 0.5, duration: 1.6 }, 0);

  state.explodeUpperInterior.forEach(({ object, originY }, index) => {
    tl.to(object.position, {
      y: originY + 1.1,
      duration: 1.65,
    }, 0.04 + (index % 8) * 0.014);
  });

  state.explodeGlass.forEach(({ object }, index) => {
    const target = targets[index];
    tl.to(object.position, {
      x: target.x,
      y: target.y,
      z: target.z,
      duration: 1.55,
    }, 0.04 + (index % 8) * 0.016);
  });

  state.explodeTl = tl;
}

function collapseExplodedStudy() {
  if (!state.exploded) return;

  state.exploded = false;
  updateArchPanel();
  if (state.explodeTl) {
    state.explodeTl.kill();
    state.explodeTl = null;
  }

  const quick = !gsap || reducedMotion;
  if (renderer) renderer.shadowMap.autoUpdate = true;

  if (quick) {
    G.roof.position.y = 0;
    G.upper.position.y = 0;
    G.terrace.position.y = 0;
    state.explodeUpperInterior.forEach(({ object, originY }) => {
      object.position.y = originY;
    });
    state.explodeGlass.forEach(({ object, origin }) => {
      object.position.copy(origin);
    });
    if (renderer) {
      renderer.shadowMap.autoUpdate = false;
      renderer.shadowMap.needsUpdate = true;
    }
    return;
  }

  const tl = gsap.timeline({
    defaults: { ease: "power3.out" },
    onComplete: () => {
      state.explodeTl = null;
      if (renderer) {
        renderer.shadowMap.autoUpdate = false;
        renderer.shadowMap.needsUpdate = true;
      }
    },
  });

  tl.to(G.roof.position, { y: 0, duration: 1.2 }, 0)
    .to(G.upper.position, { y: 0, duration: 1.2 }, 0)
    .to(G.terrace.position, { y: 0, duration: 1.1 }, 0);

  state.explodeUpperInterior.forEach(({ object, originY }, index) => {
    tl.to(object.position, { y: originY, duration: 1.15 }, (index % 8) * 0.01);
  });
  state.explodeGlass.forEach(({ object, origin }, index) => {
    tl.to(object.position, {
      x: origin.x,
      y: origin.y,
      z: origin.z,
      duration: 1.1,
    }, (index % 8) * 0.01);
  });

  state.explodeTl = tl;
}

function updateArchPanel() {
  const dock = document.getElementById("arch-dock");
  if (!dock) return;

  const expanded = state.exploded || state.blueprint;
  dock.classList.toggle("is-expanded", expanded);
  dock.classList.toggle("is-exploded", state.exploded);
  dock.closest(".panel")?.classList.toggle("is-study", expanded);

  const mode = document.getElementById("arch-mode");
  if (mode) {
    mode.textContent = state.exploded && state.blueprint
      ? "EXPLODED / BLUEPRINT"
      : state.exploded
        ? "EXPLODED"
        : state.blueprint
          ? "BLUEPRINT"
          : "SECTION";
  }

  const reset = document.getElementById("arch-reset");
  if (reset) reset.hidden = !state.exploded;

  const body = document.getElementById("section-body");
  if (body) body.setAttribute("aria-hidden", expanded ? "false" : "true");

  const status = document.getElementById("scene-mode");
  if (status) {
    status.textContent = state.blueprint
      ? "NOCTURNE / BLUEPRINT"
      : state.exploded
        ? "NOCTURNE / EXPLODED"
        : "NOCTURNE / NIGHT";
  }

  if (expanded && !state.sectionActive) {
    state.sectionActive = true;
    drawSection();
  } else if (!expanded) {
    state.sectionActive = false;
  }
}

function drawSection() {
  const paths = document.querySelectorAll(".bp-draw");
  const labels = document.querySelectorAll(".bp-label, .bp-note");
  if (!paths.length) return;

  if (!gsap || reducedMotion) {
    paths.forEach((path) => {
      path.style.strokeDashoffset = "0";
    });
    labels.forEach((label) => {
      label.style.opacity = "1";
    });
    return;
  }

  gsap.killTweensOf(paths);
  gsap.killTweensOf(labels);
  gsap.set(paths, { strokeDashoffset: 1 });
  gsap.set(labels, { opacity: 0 });
  gsap.to(paths, {
    strokeDashoffset: 0,
    duration: 1.15,
    stagger: 0.025,
    ease: "power2.out",
    delay: 0.1,
  });
  gsap.to(labels, {
    opacity: 1,
    duration: 0.45,
    stagger: 0.07,
    ease: "power2.out",
    delay: 0.42,
  });
}

function applyBlueprintScene(enabled) {
  if (!enabled) {
    scene.overrideMaterial = null;
    state.blueprintMeshes.forEach(({ object, visible }) => {
      object.visible = visible;
    });
    state.blueprintMeshes = [];
    state.blueprintSprites.forEach(({ sprite, visible }) => {
      sprite.visible = visible;
    });
    state.blueprintSprites = [];
    if (state.fireflies && state.fireflies.active) {
      state.fireflies.points.visible = true;
    }
    viewer.classList.remove("is-blueprint");
    return;
  }

  if (!state.blueprintMaterial) {
    state.blueprintMaterial = new THREE.MeshBasicMaterial({
      color: 0x63d8ff,
      wireframe: true,
      transparent: true,
      opacity: 0.27,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      fog: false,
    });
  }

  scene.overrideMaterial = state.blueprintMaterial;
  state.blueprintMeshes = [];
  scene.traverse((object) => {
    if (object.isMesh && object.userData.noBlueprint) {
      state.blueprintMeshes.push({ object, visible: object.visible });
      object.visible = false;
    }
  });
  state.blueprintSprites = [];
  state.glows.forEach(({ sprite }) => {
    if (sprite.isSprite) {
      state.blueprintSprites.push({ sprite, visible: sprite.visible });
      sprite.visible = false;
    }
  });
  if (state.fireflies) {
    state.fireflies.points.visible = false;
  }
  viewer.classList.add("is-blueprint");
}

function setBlueprint(enabled, { instant = false } = {}) {
  if (state.blueprint === enabled) return;
  if (!document.getElementById("arch-dock")) return;
  if (state.introPlaying) finishIntro(true);
  if (enabled && state.focus) clearRoomFocus({ instant: true });

  state.blueprint = enabled;
  updateArchPanel();

  const veil = document.querySelector(".blueprint-veil");
  const quick = instant || reducedMotion || !gsap || !veil;

  if (state.blueprintTl) {
    state.blueprintTl.kill();
    state.blueprintTl = null;
  }

  if (!enabled) viewer.classList.remove("is-blueprint");
  if (quick) {
    applyBlueprintScene(enabled);
    return;
  }

  viewer.classList.toggle("is-blueprint", enabled);

  state.blueprintTl = gsap.timeline({
    onComplete: () => {
      state.blueprintTl = null;
    },
  });
  state.blueprintTl
    .to(veil, { opacity: 1, duration: 0.24, ease: "power1.in" })
    .call(() => applyBlueprintScene(enabled))
    .to(veil, { opacity: 0, duration: 0.68, ease: "power2.out" });
}

function initArchitectureStudy() {
  const toggle = document.getElementById("blueprint-toggle");
  if (toggle) {
    toggle.addEventListener("change", () => {
      setBlueprint(toggle.checked);
    });
  }

  const reset = document.getElementById("arch-reset");
  if (reset) {
    reset.addEventListener("click", () => {
      collapseExplodedStudy();
    });
  }

  updateArchPanel();
}

const ROOM_CAPTIONS = {
  living: "客厅 / Living Room",
  dining: "餐厨 / Kitchen & Dining",
  bedroom: "主卧 / Master Suite",
  reading: "阅读角 / Reading Corner",
  terrace: "露台 / Roof Terrace",
  teaRoom: "茶室 / Tea Room",
  study: "书房/次卧 / Study / Guest Room",
  garage: "车库 / Sunken Garage",
  onsen: "温泉 / Outdoor Onsen",
};

function cloneSelectedMaterials(group) {
  const clones = [];
  group.traverse((object) => {
    if (!object.isMesh || !object.material) return;
    if (Array.isArray(object.material)) {
      const cloned = object.material.map((material) => material.clone());
      clones.push({ object, original: object.material, cloned });
      object.material = cloned;
    } else {
      const cloned = object.material.clone();
      clones.push({ object, original: object.material, cloned });
      object.material = cloned;
    }
  });
  return clones;
}

function restoreSelectedMaterials(clones) {
  clones.forEach(({ object, original, cloned }) => {
    object.material = original;
    const materials = Array.isArray(cloned) ? cloned : [cloned];
    materials.forEach((material) => material.dispose());
  });
}

function collectFocusDimMaterials(group) {
  const selectedNodes = new Set();
  group.traverse((object) => selectedNodes.add(object));

  const dim = new Map();
  scene.traverse((object) => {
    if (!object.isMesh || selectedNodes.has(object) || !object.material) return;
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    materials.forEach((material) => {
      if (!material || typeof material.opacity !== "number") return;
      if (!dim.has(material)) {
        dim.set(material, {
          opacity: material.opacity,
          transparent: material.transparent,
        });
      }
    });
  });
  return dim;
}

function openAccordionItem(roomId) {
  document.querySelectorAll(".space-item").forEach((item) => {
    const open = item.dataset.room === roomId;
    item.classList.toggle("is-open", open);
    const row = item.querySelector(".space-row");
    if (row) row.setAttribute("aria-expanded", open ? "true" : "false");

  });
}

function closeAccordion() {
  document.querySelectorAll(".space-item").forEach((item) => {
    item.classList.remove("is-open");
    const row = item.querySelector(".space-row");
    if (row) row.setAttribute("aria-expanded", "false");
  });
}

function focusRoom(roomId) {
  if (!outlinePass || state.exploded || state.blueprint) return false;
  const group = state.roomGroups[roomId];
  if (!group) return false;
  if (state.focus?.roomId === roomId) return true;

  clearRoomFocus({ instant: true });

  const clones = cloneSelectedMaterials(group);
  const dim = collectFocusDimMaterials(group);
  if (!clones.length || !dim.size) {
    restoreSelectedMaterials(clones);
    return false;
  }

  state.focus = { roomId, group, clones, dim };
  outlinePass.selectedObjects = [group];
  outlinePass.enabled = true;
  animatePhotoSpotlight(roomId !== "bedroom");

  if (!gsap || reducedMotion) {
    dim.forEach((entry, material) => {
      material.transparent = true;
      material.needsUpdate = true;
      material.opacity = 0.15;
    });
    return true;
  }

  const tl = gsap.timeline({
    onComplete: () => {
      state.focusTween = null;
    },
  });
  dim.forEach((entry, material) => {
    material.transparent = true;
    material.needsUpdate = true;
    tl.to(material, {
      opacity: 0.15,
      duration: 0.5,
      ease: "power2.out",
    }, 0);
  });
  state.focusTween = tl;
  return true;
}

function clearRoomFocus({ instant = false } = {}) {
  if (!outlinePass) return;
  outlinePass.enabled = false;
  outlinePass.selectedObjects = [];

  if (!state.focus) {
    closeAccordion();
    syncRoomLabelFocus(null);
    animatePhotoSpotlight(false);
    return;
  }

  const focus = state.focus;
  if (state.focusTween) {
    state.focusTween.kill();
    state.focusTween = null;
  }

  const restore = () => {
    focus.dim.forEach(({ opacity, transparent }, material) => {
      material.opacity = opacity;
      material.transparent = transparent;
      material.needsUpdate = true;
    });
    restoreSelectedMaterials(focus.clones);
    state.focus = null;
    closeAccordion();
    syncRoomLabelFocus(null);
    animatePhotoSpotlight(false);
  };

  if (instant || !gsap || reducedMotion) {
    restore();
    return;
  }

  const tl = gsap.timeline({ onComplete: restore });
  focus.dim.forEach(({ opacity }, material) => {
    tl.to(material, {
      opacity,
      duration: 0.45,
      ease: "power2.out",
    }, 0);
  });
  state.focusTween = tl;
}

function selectRoom(roomId, { fly = true } = {}) {
  if (state.exploded || state.blueprint) return false;
  const group = state.roomGroups[roomId];
  if (!group) return false;

  if (state.focus?.roomId === roomId) {
    clearRoomFocus();
    syncRoomLabelFocus(null);
    return false;
  }

  const focused = focusRoom(roomId);
  if (!focused) return false;

  openAccordionItem(roomId);
  syncRoomLabelFocus(roomId);

  if (fly) {
    flyToRoom(roomId);
  }
  return true;
}

function initRaycaster() {
  if (!raycaster) return;

  canvas.addEventListener("pointerdown", (event) => {
    if (osState.active) return;
    if (event.button !== 0) return;
    pointerDown = {
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
    };
  });

  canvas.addEventListener("pointerup", (event) => {
    if (osState.active) return;
    if (!pointerDown) return;
    const down = pointerDown;
    pointerDown = null;
    const distance = Math.hypot(event.clientX - down.x, event.clientY - down.y);
    if (distance > 6 || performance.now() - down.time > 650) return;
    if (state.exploded || state.blueprint) return;

    const rect = canvas.getBoundingClientRect();
    pointerNdc.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(pointerNdc, camera);

    // Furniture interactions take priority over room selection. This keeps a
    // click on the monitor, bookshelf or lamp from also flying the camera.
    const interactiveHits = raycaster.intersectObjects(interactiveGroups, true);
    if (interactiveHits.length) {
      let interactiveNode = interactiveHits[0].object;
      while (interactiveNode && !interactiveNode.userData?.interaction) {
        interactiveNode = interactiveNode.parent;
      }
      if (interactiveNode) {
        if (state.introPlaying) finishIntro(false);
        handleStudyInteraction(interactiveNode.userData.interaction);
        return;
      }
    }

    const hits = raycaster.intersectObject(root, true);
    if (!hits.length) return;

    let node = hits[0].object;
    let roomId = null;
    while (node) {
      if (node.userData?.roomId) {
        roomId = node.userData.roomId;
        break;
      }
      node = node.parent;
    }
    if (roomId) {
      selectRoom(roomId, { fly: true });
    }
  });
}

/* CSS2D room labels ------------------------------------------------------- */
function initRoomLabels() {
  if (!document.querySelector(".space-accordion")) return;

  labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.className = "room-label-layer";
  labelRenderer.domElement.style.pointerEvents = "none";
  labelRenderer.setSize(viewer.clientWidth || 1, viewer.clientHeight || 1);
  viewer.appendChild(labelRenderer.domElement);

  labelRoot = new THREE.Group();
  labelRoot.name = "RoomLabelAnchors";
  scene.add(labelRoot);

  ROOM_LABELS.forEach((config, index) => {
    const anchor = new THREE.Group();
    anchor.position.set(...config.position);
    labelRoot.add(anchor);

    const element = document.createElement("button");
    element.type = "button";
    element.className = "room-label";
    element.dataset.room = config.roomId;
    element.style.pointerEvents = "auto";
    element.setAttribute(
      "aria-label",
      `${config.zh} ${config.en}：聚焦空间`
    );

    const inner = document.createElement("span");
    inner.className = "room-label-inner";
    inner.innerHTML = [
      '<span class="room-label-mark" aria-hidden="true">✦</span>',
      `<span class="room-label-zh">${config.zh}</span>`,
      '<span class="room-label-sep" aria-hidden="true">/</span>',
      `<span class="room-label-en">${config.en}</span>`,
    ].join("");
    element.appendChild(inner);

    const labelObject = new CSS2DObject(element);
    labelObject.center.set(0.5, 0.5);
    anchor.add(labelObject);

    // CSS2D labels are DOM, so a tiny invisible 3D proxy gives the Raycaster
    // a real scene object to hit at the same anchor.
    const hit = new THREE.Mesh(
      new THREE.SphereGeometry(0.65, 8, 6),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        colorWrite: false,
      })
    );
    hit.userData.roomId = config.roomId;
    hit.castShadow = false;
    hit.receiveShadow = false;
    hit.visible = false;
    anchor.add(hit);
    labelHitMeshes.push(hit);

    const entry = {
      ...config,
      anchor,
      element,
      inner,
      focusFade: 1,
      baseY: config.position[1],
    };
    roomLabels.push(entry);

    element.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (state.introPlaying) finishIntro(false);

      const rect = element.getBoundingClientRect();
      const viewerRect = viewer.getBoundingClientRect();
      labelNdc.set(
        ((rect.left + rect.width / 2 - viewerRect.left) / viewerRect.width) * 2 - 1,
        -((rect.top + rect.height / 2 - viewerRect.top) / viewerRect.height) * 2 + 1
      );
      labelRaycaster.setFromCamera(labelNdc, camera);
      const hits = labelRaycaster.intersectObjects(labelHitMeshes, false);
      const roomHit = hits.find(
        (hitResult) => hitResult.object.userData.roomId === config.roomId
      );
      if (!roomHit) return;
      selectRoom(config.roomId, { fly: true });
    });

    if (gsap && !reducedMotion) {
      gsap.to(anchor.position, {
        y: config.position[1] + 0.11,
        duration: 2.6 + index * 0.23,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        delay: index * 0.18,
      });
    }
  });
}

/* Garden map + onsen controls -------------------------------------------- */
function initGardenExperience() {
  if (!viewer || document.querySelector("#garden-map")) return;

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "garden-map-trigger";
  trigger.innerHTML = '<span class="garden-map-dot" aria-hidden="true"></span>GARDEN MAP <span aria-hidden="true">⌘</span>';
  trigger.setAttribute("aria-label", "打开庭院地图");
  viewer.appendChild(trigger);

  const hud = document.createElement("aside");
  hud.className = "onsen-hud";
  hud.id = "onsen-hud";
  hud.setAttribute("aria-hidden", "true");
  hud.innerHTML = `
    <div class="onsen-hud-top"><span>OUTDOOR BATH / 42°C</span><span>ONSEN</span></div>
    <h3>The Onsen</h3>
    <p>Steam, dark stone and warm water at the edge of the garden.</p>
    <div class="onsen-controls">
      <button type="button" data-onsen-steam>STEAM <span>ON</span></button>
      <button type="button" data-onsen-light>BATH LIGHT <span>ON</span></button>
    </div>
    <button type="button" class="onsen-return" data-onsen-return><span aria-hidden="true">←</span> RETURN TO GARDEN</button>
  `;
  viewer.appendChild(hud);

  const map = document.createElement("div");
  map.className = "garden-map";
  map.id = "garden-map";
  map.setAttribute("aria-hidden", "true");
  map.innerHTML = `
    <div class="garden-map-backdrop" data-garden-close></div>
    <section class="garden-map-panel" role="dialog" aria-modal="true" aria-labelledby="garden-map-title">
      <header class="garden-map-head">
        <div>
          <p>NOCTURNE / GROUNDS</p>
          <h2 id="garden-map-title">Garden Map</h2>
        </div>
        <button type="button" class="garden-map-close" data-garden-close aria-label="关闭庭院地图">[ CLOSE × ]</button>
      </header>
      <div class="garden-map-canvas">
        <svg viewBox="0 0 680 360" role="img" aria-label="NOCTURNE 别墅与温泉庭院平面图">
          <defs>
            <linearGradient id="garden-laen" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stop-color="rgba(255,255,255,.07)"/>
              <stop offset="1" stop-color="rgba(255,255,255,.015)"/>
            </linearGradient>
          </defs>
          <path class="map-contour" d="M65 258 C39 207 75 119 175 83 C283 45 429 49 548 94 C623 121 646 194 611 256 C568 330 401 337 266 320 C166 307 87 299 65 258Z"/>
          <path class="map-contour map-contour-inner" d="M118 249 C90 206 118 140 204 111 C300 79 427 84 520 119 C576 140 594 196 566 240 C532 293 397 301 284 287 C198 277 143 282 118 249Z"/>
          <path class="map-path" d="M334 262 C303 259 269 262 232 263 C198 264 168 263 138 267"/>
          <path class="map-path map-path-secondary" d="M384 256 C397 233 420 213 450 201 C476 191 505 180 526 164"/>
          <rect class="map-villa" x="306" y="151" width="151" height="101" rx="5"/>
          <rect class="map-villa-wing" x="252" y="137" width="54" height="83" rx="3"/>
          <rect class="map-garage" x="470" y="177" width="79" height="64" rx="3"/>
          <rect class="map-tea" x="203" y="103" width="48" height="38" rx="2"/>
          <rect class="map-deck" x="387" y="263" width="82" height="27" rx="2"/>
          <rect class="map-onsen" x="94" y="237" width="52" height="37" rx="3"/>
          <circle class="map-water" cx="120" cy="255" r="11"/>
          <path class="map-slat" d="M101 242 L139 269 M108 238 L146 265 M115 234 L153 261"/>
          <circle class="map-tree" cx="288" cy="204" r="21"/>
          <path class="map-tree-mark" d="M288 182 L288 226 M284 195 L272 207 M292 195 L305 207 M282 213 L271 224 M294 213 L306 224"/>
          <text class="map-svg-label" x="382" y="206">VILLA</text>
          <text class="map-svg-label" x="237" y="111">TEA</text>
          <text class="map-svg-label" x="506" y="208">GARAGE</text>
          <text class="map-svg-label" x="111" y="229">ONSEN</text>
          <text class="map-svg-label map-svg-label-muted" x="387" y="304">OUTDOOR DECK / PATH</text>
          <text class="map-svg-label map-svg-label-muted" x="65" y="86">NORTH / GARDEN EDGE</text>
        </svg>
        <button type="button" class="garden-map-node garden-node-villa" data-garden-room="overview">
          <b>01</b><span>MAIN VILLA</span><i>RETURN</i>
        </button>
        <button type="button" class="garden-map-node garden-node-tea" data-garden-room="teaRoom">
          <b>02</b><span>TEA ROOM</span><i>FOCUS</i>
        </button>
        <button type="button" class="garden-map-node garden-node-terrace" data-garden-room="terrace">
          <b>03</b><span>TERRACE</span><i>FOCUS</i>
        </button>
        <button type="button" class="garden-map-node garden-node-garage" data-garden-room="garage">
          <b>04</b><span>GARAGE</span><i>FOCUS</i>
        </button>
        <button type="button" class="garden-map-node garden-node-onsen" data-garden-room="onsen">
          <b>05</b><span>ONSEN</span><i>NEW</i>
        </button>
      </div>
      <footer class="garden-map-foot">
        <span>SELECT A NODE TO MOVE THE CAMERA</span>
        <span>M / ESC TO CLOSE</span>
      </footer>
    </section>
  `;
  document.body.appendChild(map);

  const setMapOpen = (open) => {
    map.classList.toggle("is-open", open);
    map.setAttribute("aria-hidden", open ? "false" : "true");
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("garden-map-open", open);
    if (open && gsap && !reducedMotion) {
      gsap.fromTo(
        map.querySelector(".garden-map-panel"),
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.38, ease: "power3.out" }
      );
    }
  };

  const closeMap = () => setMapOpen(false);
  trigger.addEventListener("click", () => setMapOpen(true));
  map.querySelectorAll("[data-garden-close]").forEach((element) => {
    element.addEventListener("click", closeMap);
  });
  map.querySelectorAll("[data-garden-room]").forEach((button) => {
    button.addEventListener("click", () => {
      const room = button.dataset.gardenRoom;
      setMapOpen(false);
      if (room === "overview") {
        clearRoomFocus();
        flyToView("overview");
      } else {
        selectRoom(room, { fly: true });
      }
    });
  });

  const steamButton = hud.querySelector("[data-onsen-steam]");
  const lightButton = hud.querySelector("[data-onsen-light]");
  const refreshOnsenButtons = () => {
    if (steamButton) {
      steamButton.classList.toggle("is-off", !onsenState.steamOn);
      steamButton.innerHTML = `STEAM <span>${onsenState.steamOn ? "ON" : "OFF"}</span>`;
    }
    if (lightButton) {
      lightButton.classList.toggle("is-off", !onsenState.lightOn);
      lightButton.innerHTML = `BATH LIGHT <span>${onsenState.lightOn ? "ON" : "OFF"}</span>`;
    }
  };
  steamButton?.addEventListener("click", () => {
    onsenState.steamOn = !onsenState.steamOn;
    refreshOnsenButtons();
  });
  lightButton?.addEventListener("click", () => {
    onsenState.lightOn = !onsenState.lightOn;
    if (onsenState.light) onsenState.light.intensity = onsenState.lightOn ? 3.2 : 0;
    if (onsenState.waterLight) onsenState.waterLight.intensity = onsenState.lightOn ? 1.7 : 0;
    if (onsenState.waterGlow) onsenState.waterGlow.material.opacity = onsenState.lightOn ? 0.22 : 0;
    refreshOnsenButtons();
  });
  hud.querySelector("[data-onsen-return]")?.addEventListener("click", () => {
    clearRoomFocus();
    flyToView("overview");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && map.classList.contains("is-open")) {
      event.preventDefault();
      closeMap();
      return;
    }
    if (event.key.toLowerCase() === "m" && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (osState.active) return;
      event.preventDefault();
      setMapOpen(!map.classList.contains("is-open"));
    }
  });

  refreshOnsenButtons();
}

function syncOnsenHud() {
  const hud = document.querySelector("#onsen-hud");
  if (!hud) return;
  const open = state.focus?.roomId === "onsen";
  if (hud.classList.contains("is-visible") === open) return;
  hud.classList.toggle("is-visible", open);
  hud.setAttribute("aria-hidden", open ? "false" : "true");
}

function syncRoomLabelFocus(roomId = null) {
  if (!roomLabels.length || !gsap) {
    roomLabels.forEach((entry) => {
      entry.focusFade = roomId === null || roomId === entry.roomId ? 1 : 0;
    });
    return;
  }
  roomLabels.forEach((entry) => {
    const selected = roomId === entry.roomId;
    entry.element.classList.toggle("is-selected", selected);
    gsap.to(entry, {
      focusFade: selected || roomId === null ? 1 : 0,
      duration: reducedMotion ? 0 : 0.42,
      ease: "power2.out",
      overwrite: true,
    });
  });
}

function updateRoomLabels() {
  if (!labelRenderer) return;
  if (osState.active) {
    labelRenderer.domElement.style.opacity = "0";
    return;
  }
  labelRenderer.domElement.style.opacity = state.introPlaying ? "0" : "1";

  roomLabels.forEach((entry) => {
    entry.anchor.getWorldPosition(labelWorld);
    const distance = camera.position.distanceTo(labelWorld);
    const distanceScale = clamp(1.08 - Math.max(0, distance - 13) * 0.017, 0.58, 1.08);
    const distanceFade = clamp(1 - Math.max(0, distance - 20) / 48, 0.18, 1);
    const opacity = distanceFade * entry.focusFade;
    entry.element.style.opacity = opacity.toFixed(3);
    entry.element.style.visibility = opacity < 0.025 ? "hidden" : "visible";
    entry.inner.style.transform = `translateZ(0) scale(${distanceScale.toFixed(3)})`;
  });
  labelRenderer.render(scene, camera);
}

/* NOCTURNE OS overlay ----------------------------------------------------- */
function initNocturneOS() {
  if (osState.overlay) return;

  const overlay = document.createElement("div");
  overlay.id = "nocturne-os";
  overlay.className = "os-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <div class="os-topbar">
      <div class="os-brand"><span class="os-mark" aria-hidden="true">✦</span><span>NOCTURNE / OS</span></div>
      <div class="os-topmeta"><span>NODE 04</span><span>SECURE LINK</span></div>
      <button class="os-return" type="button">[ ✕ Return to Villa / 返回别墅 ]</button>
    </div>
    <main class="os-stage">
      <section class="os-console" aria-label="NOCTURNE system console">
        <div class="os-main-view">
          <div class="os-boot-view">
            <div class="os-kicker"><span>PRIVATE RESIDENCE INTERFACE</span><span>SESSION 2026.11 / <b id="os-session-mode">NIGHT</b></span></div>
            <h1 class="os-title">NOCTURNE <em>// SYSTEM</em></h1>
            <div class="os-rule"><span></span><span class="os-pulse"></span></div>
            <div class="os-terminal" aria-live="polite">
              <div class="os-terminal-lines"></div>
              <span class="os-cursor" aria-hidden="true"></span>
            </div>
            <div class="os-progress"><span class="os-progress-fill"></span></div>
            <div class="os-progress-meta"><span class="os-progress-label">INITIALIZING SYSTEM</span><span class="os-percent">0%</span></div>
            <div class="os-boot-actions">
              <span>NOCTURNE OS · 2026.11</span>
              <button class="os-skip-boot" type="button">SKIP BOOT →</button>
            </div>
          </div>

          <div class="os-desktop" aria-hidden="true">
            <div class="os-menubar">
              <div class="os-menu-brand"><span class="os-mark" aria-hidden="true">✦</span><span>NOCTURNE / DESKTOP</span></div>
              <div class="os-menu-app"><span id="os-active-app">HOME</span><span class="os-menu-sep">/</span><span id="os-menu-title">SYSTEM OVERVIEW</span></div>
              <div class="os-menu-status">
                <span id="os-desktop-env">NIGHT</span>
                <span id="os-desktop-audio">MIX / SILENT</span>
                <span id="os-desktop-clock">--:--</span>
              </div>
            </div>

            <div class="os-window">
              <div class="os-window-bar">
                <span class="os-traffic" aria-hidden="true"><i></i><i></i><i></i></span>
                <span id="os-window-title">HOME / SYSTEM OVERVIEW</span>
                <span class="os-window-meta">NOCTURNE OS · 2026</span>
              </div>
              <div class="os-window-body" id="os-window-body">
                <section class="os-app is-active" data-os-panel="home">
                  <div class="os-home-layout">
                    <div class="os-home-copy">
                      <p class="os-app-kicker">WELCOME BACK / SESSION 04</p>
                      <h2 class="os-home-title">把夜晚，<br><em>留在桌面。</em></h2>
                      <p class="os-home-desc">A private control surface for the NOCTURNE residence. Projects, renders, sound and atmosphere — all in one place, until the villa calls you back.</p>
                      <div class="os-home-actions">
                        <button class="os-text-link" type="button" data-os-app="projects">OPEN PROJECTS <span>↗</span></button>
                        <button class="os-text-link" type="button" data-os-app="gallery">VIEW GALLERY <span>↗</span></button>
                      </div>
                    </div>
                    <div class="os-home-panel">
                      <div class="os-home-metric"><span>ENVIRONMENT</span><strong id="os-home-env">NIGHT</strong><small>APPLIES ON RETURN</small></div>
                      <div class="os-home-metric"><span>AUDIO MIX</span><strong id="os-home-audio">SILENT</strong><small>PERSISTS ACROSS SESSIONS</small></div>
                      <div class="os-home-metric"><span>ARCHIVE</span><strong>F1 / F2</strong><small>FLOORPLANS AVAILABLE</small></div>
                    </div>
                  </div>
                  <div class="os-home-strip">
                    <button type="button" data-os-app="projects"><span>01</span><strong>PROJECTS</strong><small>04 ENTRIES</small></button>
                    <button type="button" data-os-app="gallery"><span>02</span><strong>GALLERY</strong><small>05 FRAMES</small></button>
                    <button type="button" data-os-app="audio"><span>03</span><strong>AUDIO</strong><small>03 LOOPS</small></button>
                    <button type="button" data-os-app="environment"><span>04</span><strong>ENVIRONMENT</strong><small>NIGHT / DUSK</small></button>
                  </div>
                </section>

                <section class="os-app" data-os-panel="projects">
                  <header class="os-app-head">
                    <div><p class="os-app-kicker">ARCHIVE / 01</p><h2>PROJECTS</h2></div>
                    <span class="os-app-meta">04 ENTRIES / 2026</span>
                  </header>
                  <div class="os-project-toolbar">
                    <div class="os-project-tabs" role="tablist" aria-label="Project filters">
                      <button class="is-active" type="button" data-project-filter="all" role="tab">ALL PROJECTS</button>
                      <button type="button" data-project-filter="external" role="tab">EXTERNAL</button>
                      <button type="button" data-project-filter="internal" role="tab">VILLA</button>
                    </div>
                    <span class="os-project-summary" id="os-project-summary">04 PROJECTS / 02 PAGES</span>
                  </div>
                  <div class="os-project-grid" id="os-project-grid"></div>
                  <div class="os-project-pagination">
                    <span id="os-project-page-info">PAGE 01 / 03</span>
                    <div class="os-project-page-buttons">
                      <button type="button" id="os-project-prev">← PREV</button>
                      <button type="button" id="os-project-next">NEXT →</button>
                    </div>
                  </div>
                  <div class="os-project-detail" id="os-project-detail" aria-hidden="true">
                    <button class="os-inline-back" type="button" data-os-project-back>← BACK TO PROJECTS</button>
                    <div class="os-project-detail-grid">
                      <div class="os-project-detail-art"><img id="os-project-image" alt="" loading="lazy"></div>
                      <div class="os-project-detail-copy">
                        <p class="os-app-kicker" id="os-project-category">ARCHITECTURE / NIGHT</p>
                        <h3 id="os-project-title">NOCTURNE VILLA</h3>
                        <p id="os-project-description"></p>
                        <div class="os-tag-row" id="os-project-tags"></div>
                        <div class="os-project-detail-foot">
                          <span id="os-project-meta"></span>
                          <div class="os-project-actions">
                            <button class="os-text-link" type="button" id="os-project-action" data-os-project-action>OPEN GALLERY <span>↗</span></button>
                            <button class="os-text-link os-project-preview-button" type="button" id="os-project-preview" data-os-project-preview hidden>LIVE PREVIEW <span>↗</span></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section class="os-app" data-os-panel="gallery">
                  <header class="os-app-head">
                    <div><p class="os-app-kicker">ARCHIVE / 02</p><h2>GALLERY</h2></div>
                    <div class="os-gallery-filters">
                      <button type="button" data-gallery-filter="all" class="is-active">ALL</button>
                      <button type="button" data-gallery-filter="interior">INTERIOR</button>
                      <button type="button" data-gallery-filter="exterior">EXTERIOR</button>
                    </div>
                  </header>
                  <div class="os-gallery-grid" id="os-gallery-grid"></div>
                  <div class="os-gallery-lightbox" id="os-gallery-lightbox" aria-hidden="true">
                    <div class="os-lightbox-bar">
                      <button class="os-inline-back" type="button" data-os-gallery-back>← BACK TO GALLERY</button>
                      <span id="os-lightbox-index">01 / 05</span>
                    </div>
                    <div class="os-lightbox-image"><img id="os-lightbox-image" alt="" loading="lazy"></div>
                    <div class="os-lightbox-caption">
                      <div>
                        <span class="os-app-kicker" id="os-lightbox-category">EXTERIOR / NIGHT</span>
                        <h3 id="os-lightbox-title">THE VILLA / NIGHT</h3>
                        <p id="os-lightbox-description"></p>
                        <span class="os-lightbox-meta" id="os-lightbox-meta"></span>
                      </div>
                      <div class="os-lightbox-nav">
                        <button type="button" data-os-gallery-prev aria-label="Previous image">←</button>
                        <button type="button" data-os-gallery-next aria-label="Next image">→</button>
                      </div>
                    </div>
                  </div>
                </section>

                <section class="os-app" data-os-panel="audio">
                  <header class="os-app-head">
                    <div><p class="os-app-kicker">MEDIA / 03</p><h2>AUDIO</h2></div>
                    <span class="os-app-meta">03 LOOPS / LIVE</span>
                  </header>
                  <div class="os-audio-layout">
                    <div class="os-audio-now">
                      <p class="os-app-kicker">NOW SELECTED</p>
                      <div class="os-audio-art" id="os-audio-art" data-track="rain">
                        <span class="os-audio-orbit" aria-hidden="true"></span>
                        <span class="os-audio-vinyl" aria-hidden="true"></span>
                        <span class="os-audio-code" id="os-audio-code">TRK-01</span>
                      </div>
                      <h2 id="os-audio-title">AMBIENT RAIN</h2>
                      <p class="os-audio-subtitle" id="os-audio-subtitle">FIELD RECORDING / SOFT RAIN</p>
                      <p class="os-audio-desc" id="os-audio-description"></p>
                      <div class="os-audio-transport">
                        <button type="button" data-os-audio-prev aria-label="Previous track">←</button>
                        <button class="os-audio-play" type="button" data-os-audio-play id="os-audio-play" aria-label="Play or pause">▶</button>
                        <button type="button" data-os-audio-next aria-label="Next track">→</button>
                      </div>
                      <div class="os-audio-progress"><span id="os-audio-progress-fill"></span></div>
                      <div class="os-audio-times"><span id="os-audio-time">00:00</span><span id="os-audio-duration">00:00</span></div>
                      <label class="os-audio-volume">VOL <input id="os-audio-volume" type="range" min="0" max="100" step="1" value="42"></label>
                    </div>
                    <div class="os-audio-queue">
                      <div class="os-queue-head"><span>MIX / QUEUE</span><span id="os-audio-mix">00 ACTIVE</span></div>
                      <button class="os-audio-row" type="button" data-os-audio="rain">
                        <span class="os-audio-row-code">01</span>
                        <span class="os-audio-row-main"><strong>AMBIENT RAIN</strong><small>FIELD RECORDING / LOOP</small></span>
                        <span class="os-audio-row-state">OFF</span>
                      </button>
                      <button class="os-audio-row" type="button" data-os-audio="wind">
                        <span class="os-audio-row-code">02</span>
                        <span class="os-audio-row-main"><strong>WIND</strong><small>LOW FREQUENCY / LOOP</small></span>
                        <span class="os-audio-row-state">OFF</span>
                      </button>
                      <button class="os-audio-row" type="button" data-os-audio="jazz">
                        <span class="os-audio-row-code">03</span>
                        <span class="os-audio-row-main"><strong>JAZZ</strong><small>SOFT CHORDS / LOOP</small></span>
                        <span class="os-audio-row-state">OFF</span>
                      </button>
                      <p class="os-audio-note">Independent loops. Mix them, or return to the villa with the sound still running.</p>
                    </div>
                  </div>
                </section>

                <section class="os-app" data-os-panel="environment">
                  <header class="os-app-head">
                    <div><p class="os-app-kicker">CONTROL / 04</p><h2>ENVIRONMENT</h2></div>
                    <span class="os-app-meta">NIGHT / DUSK</span>
                  </header>
                  <div class="os-env-layout">
                    <div class="os-env-visual" id="os-env-preview" data-os-env-visual="night">
                      <span class="os-env-sun" aria-hidden="true"></span>
                      <span class="os-env-horizon" aria-hidden="true"></span>
                      <span class="os-env-readout">ENV / NIGHT</span>
                    </div>
                    <div class="os-env-copy">
                      <p class="os-env-desc">Choose the atmosphere for the villa. The selection is staged here and applied only after you return and the camera completes its flight.</p>
                      <div class="os-modes os-env-switch">
                        <button type="button" class="os-mode" data-os-env="night">NIGHT MODE</button>
                        <button type="button" class="os-mode" data-os-env="dusk">DUSK MODE</button>
                      </div>
                      <div class="os-env-status" id="os-env-status">CURRENT / NIGHT · APPLIES ON RETURN</div>
                      <div class="os-env-rule"></div>
                      <div class="os-env-display">
                        <span>DISPLAY MODE</span>
                        <div class="os-modes">
                          <button type="button" class="os-mode" data-os-mode="0">OFF</button>
                          <button type="button" class="os-mode" data-os-mode="1">TERMINAL</button>
                          <button type="button" class="os-mode" data-os-mode="2">SIGNAL</button>
                        </div>
                        <span id="os-mode-status">DISPLAY / OFF</span>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <nav class="os-dock" aria-label="NOCTURNE OS applications">
              <button class="os-dock-item is-active" type="button" data-os-app="home" aria-label="Home">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11.5 12 5l8 6.5V20H4z"/><path d="M9.5 20v-5h5v5"/></svg><span>HOME</span>
              </button>
              <button class="os-dock-item" type="button" data-os-app="projects" aria-label="Projects">
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="7" height="7"/><rect x="13.5" y="4.5" width="7" height="7"/><rect x="3.5" y="14.5" width="7" height="5"/><rect x="13.5" y="14.5" width="7" height="5"/></svg><span>PROJECTS</span>
              </button>
              <button class="os-dock-item" type="button" data-os-app="gallery" aria-label="Gallery">
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15"/><path d="m6 17 4.5-5 3 3 2.5-2.5L20 17"/><circle cx="15.5" cy="9" r="1.4"/></svg><span>GALLERY</span>
              </button>
              <button class="os-dock-item" type="button" data-os-app="audio" aria-label="Audio">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14V10M8 17V7M12 20V4M16 16V8M20 13V11"/></svg><span>AUDIO</span>
              </button>
              <button class="os-dock-item" type="button" data-os-app="environment" aria-label="Environment">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg><span>ENV</span>
              </button>
              <span class="os-dock-divider" aria-hidden="true"></span>
              <button class="os-dock-item os-dock-blueprint" type="button" data-os-blueprint aria-label="Blueprints">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 5.5h17v13h-17zM3.5 11h17M9 5.5v13M15 11v7.5"/></svg><span>PLANS</span>
              </button>
            </nav>
            <div class="os-desktop-foot">
              <span>NOCTURNE OS / DESKTOP</span>
              <span id="os-desktop-status">VAULT / CONNECTED</span>
              <span>ESC / RETURN TO VILLA</span>
            </div>
          </div>
        </div>
        <div class="os-blueprint-view" aria-hidden="true">
          <div class="os-blueprint-head">
            <div>
              <span>ARCHIVE / FLOORPLAN</span>
              <strong>NOCTURNE RESIDENCE · F1 / F2</strong>
            </div>
            <button class="os-blueprint-back" type="button">← Back to Terminal / 返回终端</button>
          </div>
          <div class="os-blueprint-sheet">
            <svg class="os-blueprint-svg" viewBox="0 0 1200 760" role="img" aria-label="NOCTURNE villa floorplans, ground floor and upper floor">
              <defs>
                <pattern id="bpGrid" width="24" height="24" patternUnits="userSpaceOnUse">
                  <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="1"/>
                </pattern>
                <pattern id="bpHatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="10" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
                </pattern>
              </defs>
              <rect width="1200" height="760" fill="rgba(10,12,16,0.22)"/>
              <rect width="1200" height="760" fill="url(#bpGrid)"/>
              <g fill="none" stroke="#f4f4f4">
                <rect x="64" y="106" width="508" height="546" stroke-width="3"/>
                <rect x="628" y="106" width="508" height="546" stroke-width="3"/>
                <path d="M64 300H572M240 106V456M360 300V652M240 456H572M64 516H240" stroke-width="1.5" opacity=".8"/>
                <path d="M628 300H1136M810 106V406M938 300V652M810 406H1136M938 520H1136" stroke-width="1.5" opacity=".8"/>
                <path d="M100 128H540M100 630H540M664 128H1104M664 630H1104" stroke-width=".8" opacity=".45"/>
                <path d="M96 190H168M96 198V182M168 190V182M96 588H168M96 596V580M168 596V588" stroke-width=".7" opacity=".55"/>
                <path d="M660 190H732M660 198V182M732 198V182M660 588H732M660 596V580M732 596V588" stroke-width=".7" opacity=".55"/>
              </g>
              <g fill="none" stroke="rgba(224,224,224,0.34)" stroke-width="1">
                <rect x="72" y="114" width="104" height="72"/>
                <rect x="72" y="114" width="50" height="72"/>
                <rect x="188" y="114" width="172" height="112"/>
                <rect x="80" y="330" width="74" height="148"/>
                <rect x="264" y="330" width="74" height="102"/>
                <rect x="346" y="330" width="42" height="148"/>
                <rect x="262" y="464" width="172" height="58"/>
                <rect x="444" y="466" width="112" height="118"/>
                <rect x="72" y="540" width="182" height="94"/>
                <rect x="644" y="114" width="146" height="74"/>
                <rect x="846" y="114" width="150" height="74"/>
                <rect x="644" y="214" width="146" height="142"/>
                <rect x="846" y="214" width="228" height="142"/>
                <rect x="644" y="462" width="160" height="118"/>
                <rect x="846" y="472" width="236" height="112"/>
                <path d="M1080 114V650M1080 476H1136M1080 524H1136" opacity=".7"/>
                <path d="M200 552h92v58h-92zM474 530h52v92h-52z" opacity=".55"/>
                <path d="M676 490h76v58h-76zM883 502h122v52H883z" opacity=".55"/>
              </g>
              <g fill="rgba(244,244,244,0.08)" stroke="rgba(244,244,244,0.28)" stroke-width="1">
                <rect x="102" y="240" width="104" height="34"/>
                <rect x="284" y="248" width="58" height="64"/>
                <rect x="382" y="122" width="72" height="50"/>
                <rect x="652" y="232" width="76" height="42"/>
                <rect x="882" y="232" width="88" height="42"/>
                <rect x="886" y="478" width="96" height="38"/>
              </g>
              <g fill="#f4f4f4" font-family="-apple-system,BlinkMacSystemFont,'SF Pro Text',Helvetica,Arial,sans-serif" font-size="9" letter-spacing="2">
                <text x="72" y="88">NOCTURNE RESIDENCE / FLOORPLAN</text>
                <text x="72" y="690">F1 / GROUND LEVEL</text>
                <text x="628" y="690">F2 / UPPER LEVEL</text>
                <text x="956" y="88" text-anchor="end">DRAWING 04-A / 1:200</text>
              </g>
              <g fill="rgba(224,224,224,0.75)" font-family="-apple-system,BlinkMacSystemFont,'SF Pro Text',Helvetica,Arial,sans-serif" font-size="10" letter-spacing="1.5">
                <text x="88" y="144">ENTRY</text>
                <text x="92" y="366">TEA ROOM</text>
                <text x="204" y="222">LIVING</text>
                <text x="286" y="330">DINING</text>
                <text x="352" y="306">KITCHEN</text>
                <text x="456" y="532">GARAGE</text>
                <text x="90" y="572">GARDEN / TERRACE</text>
                <text x="662" y="142">MASTER SUITE</text>
                <text x="862" y="142">BATH</text>
                <text x="862" y="228">STUDY / GUEST</text>
                <text x="650" y="434">BALCONY</text>
                <text x="862" y="480">OPEN TERRACE</text>
              </g>
              <g fill="rgba(136,136,136,0.6)" font-family="-apple-system,BlinkMacSystemFont,'SF Pro Text',Helvetica,Arial,sans-serif" font-size="8" letter-spacing="1.2">
                <text x="72" y="718">DIM 12.4M / 8.0M · REINFORCED CONCRETE · LOW-E GLASS</text>
                <text x="628" y="718">CANTILEVER 2.4M · TIMBER SCREEN · FRAMELESS GLASS</text>
                <text x="1010" y="718" text-anchor="end">NOCTURNE / ARCHIVE</text>
              </g>
              <g stroke="rgba(244,244,244,0.22)" stroke-width=".8">
                <path d="M64 676H572M64 676V650M572 676V650"/>
                <path d="M628 676H1136M628 676V650M1136 676V650"/>
                <path d="M588 106V652M588 106H604M588 652H604"/>
              </g>
              <g fill="#f4f4f4" font-family="-apple-system,BlinkMacSystemFont,'SF Pro Text',Helvetica,Arial,sans-serif" font-size="7" letter-spacing="1">
                <text x="66" y="700">0</text>
                <text x="264" y="700">6M</text>
                <text x="540" y="700">12M</text>
                <text x="630" y="700">0</text>
                <text x="828" y="700">6M</text>
                <text x="1104" y="700">12M</text>
              </g>
            </svg>
          </div>
          <div class="os-blueprint-foot">
            <span>ARCHIVE 04-A · VILLA FLOORPLANS</span>
            <span>ESC / BACK TO TERMINAL</span>
          </div>
        </div>
      </section>
    </main>
    <div class="os-live-preview" id="os-live-preview" aria-hidden="true">
      <div class="os-preview-bar">
        <button class="os-preview-close" type="button" aria-label="Close live preview">[ × ]</button>
        <span class="os-preview-title" id="os-preview-title">LIVE PREVIEW</span>
        <span class="os-preview-meta">EXTERNAL / SANDBOXED</span>
      </div>
      <iframe
        id="os-preview-frame"
        title="External project live preview"
        sandbox="allow-scripts allow-same-origin"
        referrerpolicy="no-referrer"
        loading="lazy"
      ></iframe>
    </div>
  `;
  document.body.appendChild(overlay);

  osState.overlay = overlay;
  osState.mainView = overlay.querySelector(".os-main-view");
  osState.blueprintView = overlay.querySelector(".os-blueprint-view");
  osState.terminalEl = overlay.querySelector(".os-terminal-lines");
  osState.progressFill = overlay.querySelector(".os-progress-fill");
  osState.progressLabel = overlay.querySelector(".os-progress-label");
  osState.percentEl = overlay.querySelector(".os-percent");
  osState.clockEl = overlay.querySelector("#os-clock");
  osState.statusEl = overlay.querySelector("#os-mode-status");
  osState.envStatusEl = overlay.querySelector("#os-env-status");
  osState.bootView = overlay.querySelector(".os-boot-view");
  osState.desktopEl = overlay.querySelector(".os-desktop");
  osState.activeAppEl = overlay.querySelector("#os-active-app");
  osState.menuTitleEl = overlay.querySelector("#os-menu-title");
  osState.windowTitleEl = overlay.querySelector("#os-window-title");
  osState.desktopEnvEl = overlay.querySelector("#os-desktop-env");
  osState.desktopAudioEl = overlay.querySelector("#os-desktop-audio");
  osState.desktopClockEl = overlay.querySelector("#os-desktop-clock");
  osState.homeEnvEl = overlay.querySelector("#os-home-env");
  osState.homeAudioEl = overlay.querySelector("#os-home-audio");
  osState.envPreviewEl = overlay.querySelector("#os-env-preview");
  osState.projectPanelEl = overlay.querySelector('[data-os-panel="projects"]');
  osState.projectGridEl = overlay.querySelector("#os-project-grid");
  osState.projectSummaryEl = overlay.querySelector("#os-project-summary");
  osState.projectPageInfoEl = overlay.querySelector("#os-project-page-info");
  osState.projectPrevEl = overlay.querySelector("#os-project-prev");
  osState.projectNextEl = overlay.querySelector("#os-project-next");
  osState.projectDetailEl = overlay.querySelector("#os-project-detail");
  osState.projectActionEl = overlay.querySelector("#os-project-action");
  osState.projectPreviewEl = overlay.querySelector("#os-project-preview");
  osState.previewEl = overlay.querySelector("#os-live-preview");
  osState.previewFrame = overlay.querySelector("#os-preview-frame");
  osState.previewTitleEl = overlay.querySelector("#os-preview-title");
  osState.galleryGridEl = overlay.querySelector("#os-gallery-grid");
  osState.galleryLightboxEl = overlay.querySelector("#os-gallery-lightbox");
  osState.audioPlayButton = overlay.querySelector("[data-os-audio-play]");
  osState.audioVolumeInput = overlay.querySelector("#os-audio-volume");
  osState.audioArtEl = overlay.querySelector("#os-audio-art");
  osState.audioTitleEl = overlay.querySelector("#os-audio-title");
  osState.audioSubtitleEl = overlay.querySelector("#os-audio-subtitle");
  osState.audioDescriptionEl = overlay.querySelector("#os-audio-description");
  osState.audioCodeEl = overlay.querySelector("#os-audio-code");
  osState.audioTimeEl = overlay.querySelector("#os-audio-time");
  osState.audioDurationEl = overlay.querySelector("#os-audio-duration");
  osState.audioProgressFillEl = overlay.querySelector("#os-audio-progress-fill");
  osState.audioMixEl = overlay.querySelector("#os-audio-mix");
  osState.appPanels = [...overlay.querySelectorAll("[data-os-panel]")];
  osState.dockButtons = [...overlay.querySelectorAll(".os-dock-item[data-os-app]")];
  osState.modeButtons = [...overlay.querySelectorAll("[data-os-mode]")];
  osState.envButtons = [...overlay.querySelectorAll("[data-os-env]")];
  osState.audioButtons = [...overlay.querySelectorAll("[data-os-audio]")];
  osState.audioRows = [...overlay.querySelectorAll(".os-audio-row")];

  const returnButton = overlay.querySelector(".os-return");
  returnButton.addEventListener("click", () => closeNocturneOS());
  osState.modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setStudyScreenMode(Number(button.dataset.osMode));
    });
  });
  osState.envButtons.forEach((button) => {
    button.addEventListener("click", () => {
      environmentState.pendingMode = button.dataset.osEnv === "dusk" ? "dusk" : "night";
      syncOsEnvironment();
    });
  });
  osState.audioButtons.forEach((button) => {
    button.addEventListener("click", () => {
      osState.selectedAudio = button.dataset.osAudio;
      toggleAmbientAudio(button.dataset.osAudio);
      updateOsAudioUI();
    });
  });
  overlay.querySelectorAll("[data-os-app]").forEach((button) => {
    button.addEventListener("click", () => openOsApp(button.dataset.osApp));
  });
  if (gsap && !reducedMotion) {
    overlay.querySelectorAll(".os-dock-item").forEach((item) => {
      item.addEventListener("pointerenter", () => {
        gsap.to(item, {
          y: -5,
          scale: 1.1,
          duration: 0.35,
          ease: "power3.out",
          boxShadow: "0 10px 24px rgba(0,0,0,0.28), 0 0 16px rgba(255,255,255,0.14)",
        });
      });
      item.addEventListener("pointerleave", () => {
        gsap.to(item, {
          y: 0,
          scale: 1,
          duration: 0.4,
          ease: "power3.out",
          boxShadow: "0 0 0 rgba(0,0,0,0)",
        });
      });
    });
    overlay.querySelectorAll(".os-text-link").forEach((pill) => {
      pill.addEventListener("pointerenter", () => {
        gsap.to(pill, {
          scale: 1.05,
          duration: 0.3,
          ease: "power3.out",
        });
      });
      pill.addEventListener("pointerleave", () => {
        gsap.to(pill, {
          scale: 1,
          duration: 0.3,
          ease: "power3.out",
        });
      });
    });
  }
  overlay.querySelector(".os-skip-boot")?.addEventListener("click", enterOsDesktop);
  overlay.querySelector("[data-os-blueprint]")?.addEventListener("click", openOsBlueprint);
  overlay.querySelector(".os-blueprint-back")?.addEventListener("click", closeOsBlueprint);
  overlay.querySelector("[data-os-project-back]")?.addEventListener("click", hideProjectDetail);
  overlay.querySelectorAll("[data-project-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      osState.projectFilter = button.dataset.projectFilter;
      osState.projectPage = 0;
      renderOsProjects();
    });
  });
  osState.projectPrevEl?.addEventListener("click", () => {
    if (osState.projectPage > 0) {
      osState.projectPage -= 1;
      renderOsProjects();
    }
  });
  osState.projectNextEl?.addEventListener("click", () => {
    const filtered = portfolioData.filter(
      (project) => osState.projectFilter === "all" || (osState.projectFilter === "external" ? project.isExternal : !project.isExternal)
    );
    const totalPages = Math.max(1, Math.ceil(filtered.length / 2));
    if (osState.projectPage < totalPages - 1) {
      osState.projectPage += 1;
      renderOsProjects();
    }
  });
  osState.projectActionEl?.addEventListener("click", () => {
    const project = portfolioData.find((entry) => entry.id === osState.activeProjectId);
    if (!project) return;
    if (project.isExternal && project.url) {
      window.open(project.url, "_blank", "noopener,noreferrer");
    } else {
      openOsApp("gallery");
    }
  });
  osState.projectPreviewEl?.addEventListener("click", openProjectPreview);
  overlay.querySelector(".os-preview-close")?.addEventListener("click", closeProjectPreview);
  overlay.querySelectorAll("[data-gallery-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      osState.galleryFilter = button.dataset.galleryFilter;
      renderOsGallery();
    });
  });
  osState.projectGridEl?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-project]");
    if (button) showProject(button.dataset.project);
  });
  osState.galleryGridEl?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-gallery-id]");
    if (button) openGalleryItem(button.dataset.galleryId);
  });
  overlay.querySelector("[data-os-gallery-back]")?.addEventListener("click", closeGalleryLightbox);
  overlay.querySelector("[data-os-gallery-prev]")?.addEventListener("click", () => stepGallery(-1));
  overlay.querySelector("[data-os-gallery-next]")?.addEventListener("click", () => stepGallery(1));
  osState.audioPlayButton?.addEventListener("click", () => {
    toggleAmbientAudio(osState.selectedAudio);
    updateOsAudioUI();
  });
  overlay.querySelector("[data-os-audio-prev]")?.addEventListener("click", () => selectAdjacentAudio(-1));
  overlay.querySelector("[data-os-audio-next]")?.addEventListener("click", () => selectAdjacentAudio(1));
  osState.audioVolumeInput?.addEventListener("input", () => {
    osState.audioVolume = Number(osState.audioVolumeInput.value);
    Object.values(audioElements).forEach((audio) => {
      audio.volume = (osState.audioVolume / 100) * 0.9;
    });
  });

  renderOsProjects();
  renderOsGallery();
  updateOsAudioUI();

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !osState.active) return;
    event.preventDefault();
    if (osState.previewOpen) {
      closeProjectPreview();
    } else if (osState.blueprintOpen) {
      closeOsBlueprint();
    } else if (osState.projectDetailOpen) {
      hideProjectDetail();
    } else if (osState.galleryDetailOpen) {
      closeGalleryLightbox();
    } else {
      closeNocturneOS();
    }
  });
}

function syncOsModeButtons() {
  if (!osState.overlay) return;
  const names = ["OFF", "TERMINAL", "SIGNAL"];
  osState.modeButtons.forEach((button) => {
    const active = Number(button.dataset.osMode) === studyState.screenMode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
  if (osState.statusEl) {
    osState.statusEl.textContent = `DISPLAY / ${names[studyState.screenMode] || "OFF"}`;
  }
}

function syncOsEnvironment() {
  if (!osState.overlay) return;
  const pending = environmentState.pendingMode;
  osState.envButtons.forEach((button) => {
    const active = button.dataset.osEnv === pending;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
  if (osState.envStatusEl) {
    osState.envStatusEl.textContent =
      pending === currentEnvMode
        ? `CURRENT / ${pending.toUpperCase()} · APPLIES ON RETURN`
        : `PENDING / ${pending.toUpperCase()} · APPLIES ON RETURN`;
  }
  if (osState.homeEnvEl) {
    osState.homeEnvEl.textContent =
      pending === currentEnvMode
        ? currentEnvMode.toUpperCase()
        : `${currentEnvMode.toUpperCase()} → ${pending.toUpperCase()}`;
  }
  if (osState.desktopEnvEl) {
    osState.desktopEnvEl.textContent = currentEnvMode.toUpperCase();
  }
  if (osState.envPreviewEl) {
    osState.envPreviewEl.dataset.osEnvVisual = pending;
    osState.envPreviewEl.classList.toggle("is-dusk", pending === "dusk");
    const readout = osState.envPreviewEl.querySelector(".os-env-readout");
    if (readout) readout.textContent = `ENV / ${pending.toUpperCase()}`;
  }
  const sessionMode = osState.overlay.querySelector("#os-session-mode");
  if (sessionMode) sessionMode.textContent = currentEnvMode.toUpperCase();
}

function syncOsAudioButtons() {
  const activeNames = Object.keys(audioTracks).filter((name) => audioTracks[name]);
  osState.audioButtons.forEach((button) => {
    const active = !!audioTracks[button.dataset.osAudio];
    button.classList.toggle("is-active", active);
    button.classList.toggle("is-selected", button.dataset.osAudio === osState.selectedAudio);
    button.setAttribute("aria-pressed", active ? "true" : "false");
    const state = button.querySelector(".os-audio-row-state");
    if (state) state.textContent = active ? "PLAYING" : "OFF";
  });
  const mixLabel = activeNames.length ? `MIX / ${activeNames.length} ACTIVE` : "MIX / SILENT";
  if (osState.homeAudioEl) {
    osState.homeAudioEl.textContent = activeNames.length
      ? activeNames.map((name) => name.toUpperCase()).join(" + ")
      : "SILENT";
  }
  if (osState.desktopAudioEl) osState.desktopAudioEl.textContent = mixLabel;
  if (osState.audioMixEl) osState.audioMixEl.textContent = `${String(activeNames.length).padStart(2, "0")} ACTIVE`;
  updateOsAudioUI();
}

function formatOsTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function updateOsAudioUI() {
  if (!osState.overlay) return;
  const meta = OS_AUDIO[osState.selectedAudio] || OS_AUDIO.rain;
  if (osState.audioTitleEl) osState.audioTitleEl.textContent = meta.title;
  if (osState.audioSubtitleEl) osState.audioSubtitleEl.textContent = meta.subtitle;
  if (osState.audioDescriptionEl) osState.audioDescriptionEl.textContent = meta.description;
  if (osState.audioCodeEl) osState.audioCodeEl.textContent = meta.code;
  if (osState.audioArtEl) osState.audioArtEl.dataset.track = osState.selectedAudio;
  const audio = audioElements[osState.selectedAudio];
  const playing = !!audioTracks[osState.selectedAudio];
  if (osState.audioPlayButton) {
    osState.audioPlayButton.textContent = playing ? "❚❚" : "▶";
    osState.audioPlayButton.setAttribute("aria-pressed", playing ? "true" : "false");
  }
  if (osState.audioTimeEl) {
    osState.audioTimeEl.textContent = formatOsTime(audio ? audio.currentTime : 0);
  }
  if (osState.audioDurationEl) {
    osState.audioDurationEl.textContent = formatOsTime(audio ? audio.duration : 0);
  }
  if (osState.audioProgressFillEl) {
    const progress = audio && Number.isFinite(audio.duration) && audio.duration > 0
      ? clamp((audio.currentTime / audio.duration) * 100, 0, 100)
      : 0;
    osState.audioProgressFillEl.style.width = `${progress.toFixed(2)}%`;
  }
  if (osState.audioRows) {
    osState.audioRows.forEach((row) => {
      row.classList.toggle("is-selected", row.dataset.osAudio === osState.selectedAudio);
    });
  }
}

function startOsAudioTimer() {
  stopOsAudioTimer();
  osState.audioTimer = setInterval(updateOsAudioUI, 250);
}

function stopOsAudioTimer() {
  if (osState.audioTimer) {
    clearInterval(osState.audioTimer);
    osState.audioTimer = null;
  }
}

function selectAdjacentAudio(direction) {
  const names = Object.keys(OS_AUDIO);
  const current = names.indexOf(osState.selectedAudio);
  osState.selectedAudio = names[(current + direction + names.length) % names.length];
  syncOsAudioButtons();
}

function applyPendingEnvironment() {
  if (environmentState.pendingMode !== currentEnvMode) {
    applyEnvironmentMode(environmentState.pendingMode);
  }
}

function captureEnvironmentBaseline() {
  if (!state.lightRig) return;
  const rig = state.lightRig;
  environmentState.baseline = {
    ambientColor: rig.ambient.color.clone(),
    ambientIntensity: rig.ambient.intensity,
    rooms: Object.fromEntries(
      environmentState.roomKeys.map((key) => [key, rig[key] ? rig[key].intensity : 0])
    ),
    background:
      scene.background && scene.background.isColor ? scene.background.clone() : null,
  };
  environmentState.backgroundWasNull = !scene.background;
}

function applyEnvironmentMode(mode) {
  const target = mode === "dusk" ? "dusk" : "night";
  if (!environmentState.baseline) captureEnvironmentBaseline();
  const baseline = environmentState.baseline;
  if (!baseline || !state.lightRig) return;

  const rig = state.lightRig;
  if (environmentState.tween) environmentState.tween.kill();
  currentEnvMode = target;
  environmentState.pendingMode = target;

  const duration = reducedMotion ? 0.01 : 1.25;
  const tl = gsap.timeline();

  if (target === "dusk") {
    if (!scene.background || !scene.background.isColor) {
      scene.background = new THREE.Color(0x0b090a);
    }
    const duskBackground = new THREE.Color(0x3b292c);
    tl.to(
      scene.background,
      {
        r: duskBackground.r,
        g: duskBackground.g,
        b: duskBackground.b,
        duration,
        ease: "power2.inOut",
      },
      0
    );
    const duskAmbient = new THREE.Color(0xffa36a);
    tl.to(
      rig.ambient.color,
      {
        r: duskAmbient.r,
        g: duskAmbient.g,
        b: duskAmbient.b,
        duration,
        ease: "power2.inOut",
      },
      0
    );
    tl.to(rig.ambient, { intensity: 0.36, duration, ease: "power2.inOut" }, 0);
    environmentState.roomKeys.forEach((key) => {
      if (rig[key]) {
        tl.to(rig[key], { intensity: 0, duration, ease: "power2.inOut" }, 0);
      }
    });
    applyStudyFixtureEnvironment(false);
    viewer.dataset.preset = "dusk";
  } else {
    const nightAmbient = baseline.ambientColor || new THREE.Color(0x59657a);
    tl.to(
      rig.ambient.color,
      {
        r: nightAmbient.r,
        g: nightAmbient.g,
        b: nightAmbient.b,
        duration,
        ease: "power2.inOut",
      },
      0
    );
    tl.to(
      rig.ambient,
      { intensity: baseline.ambientIntensity, duration, ease: "power2.inOut" },
      0
    );
    environmentState.roomKeys.forEach((key) => {
      if (rig[key]) {
        tl.to(
          rig[key],
          {
            intensity: baseline.rooms[key] ?? 0,
            duration,
            ease: "power2.inOut",
          },
          0
        );
      }
    });
    applyStudyFixtureEnvironment(true);
    if (scene.background && scene.background.isColor) {
      const nightBackground = baseline.background || new THREE.Color(0x050506);
      tl.to(
        scene.background,
        {
          r: nightBackground.r,
          g: nightBackground.g,
          b: nightBackground.b,
          duration,
          ease: "power2.inOut",
          onComplete: () => {
            if (!baseline.background) scene.background = null;
          },
        },
        0
      );
    }
    viewer.dataset.preset = "night";
  }

  const timeMode = document.getElementById("time-mode");
  const sceneMode = document.getElementById("scene-mode");
  if (timeMode) timeMode.textContent = target.toUpperCase();
  if (sceneMode) sceneMode.textContent = `NOCTURNE / ${target.toUpperCase()}`;
  environmentState.tween = tl;
}

function applyStudyFixtureEnvironment(enabled) {
  const duration = reducedMotion ? 0.01 : 1.1;
  const screenTargets = [0, 2.8, 3.2];
  if (studyState.lampLight) {
    gsap.to(studyState.lampLight, {
      intensity: enabled && studyState.lampOn ? 2.2 : 0,
      duration,
      ease: "power2.inOut",
    });
  }
  if (studyState.lampBulb) {
    studyState.lampBulb.visible = enabled && studyState.lampOn;
  }
  if (studyState.shelfLight) {
    gsap.to(studyState.shelfLight, {
      intensity: enabled && studyState.shelfOn ? 1.7 : 0,
      duration,
      ease: "power2.inOut",
    });
  }
  if (studyState.shelfLed) {
    studyState.shelfLed.visible = enabled && studyState.shelfOn;
  }
  if (studyState.screenLight) {
    gsap.to(studyState.screenLight, {
      intensity: enabled ? screenTargets[studyState.screenMode] || 0 : 0,
      duration,
      ease: "power2.inOut",
    });
  }
}

function updateOsClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const value = `${hh}:${mm}:${ss}`;
  if (osState.clockEl) osState.clockEl.textContent = value;
  if (osState.desktopClockEl) osState.desktopClockEl.textContent = `${hh}:${mm}`;
}

function writeWavString(view, offset, text) {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index));
  }
}

function encodeWavDataUri(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  writeWavString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeWavString(view, 8, "WAVE");
  writeWavString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeWavString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let index = 0; index < samples.length; index += 1) {
    const value = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(44 + index * 2, value < 0 ? value * 0x8000 : value * 0x7fff, true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(index, index + chunk));
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

function buildAmbientSamples(kind) {
  const sampleRate = 16000;
  const durations = { rain: 4.8, wind: 6.4, jazz: 8 };
  const seconds = durations[kind] || 5;
  const length = Math.floor(sampleRate * seconds);
  const samples = new Float32Array(length);

  if (kind === "rain") {
    let low = 0;
    for (let index = 0; index < length; index += 1) {
      const white = Math.random() * 2 - 1;
      low += (white - low) * 0.18;
      const hiss = white - low;
      const drop = Math.random() < 0.00085 ? (Math.random() * 2 - 1) * 0.28 : 0;
      samples[index] = low * 0.22 + hiss * 0.055 + drop;
    }
  } else if (kind === "wind") {
    let brown = 0;
    for (let index = 0; index < length; index += 1) {
      const t = index / sampleRate;
      const white = Math.random() * 2 - 1;
      brown = (brown + white * 0.018) * 0.995;
      const modulation =
        0.45 + 0.28 * Math.sin((Math.PI * 2 * t) / 5.7) +
        0.12 * Math.sin((Math.PI * 2 * t) / 1.9 + 0.8);
      samples[index] = brown * modulation * 8.5 + white * 0.004;
    }
  } else {
    const chords = [
      [261.63, 329.63, 392.0, 493.88],
      [220.0, 261.63, 329.63, 392.0],
      [174.61, 220.0, 261.63, 329.63],
      [196.0, 246.94, 293.66, 349.23],
    ];
    for (let index = 0; index < length; index += 1) {
      const t = index / sampleRate;
      const bar = Math.floor(t / 2) % chords.length;
      const local = t % 2;
      const attack = Math.min(1, local / 0.14);
      const decay = Math.exp(-local * 0.22);
      let value = 0;
      chords[bar].forEach((frequency, noteIndex) => {
        value +=
          Math.sin(Math.PI * 2 * frequency * t + noteIndex * 0.37) *
          (noteIndex === 0 ? 0.07 : 0.052);
      });
      const brush =
        local < 0.15 ? (Math.random() * 2 - 1) * 0.012 * Math.exp(-local * 24) : 0;
      samples[index] =
        value * attack * decay +
        Math.sin(Math.PI * 2 * chords[bar][0] * 0.5 * t) * 0.025 * attack * decay +
        brush;
    }
  }

  let peak = 0.0001;
  for (let index = 0; index < length; index += 1) {
    peak = Math.max(peak, Math.abs(samples[index]));
  }
  const scale = Math.min(1, 0.72 / peak);
  const fadeLength = Math.floor(sampleRate * 0.12);
  for (let index = 0; index < length; index += 1) {
    let envelope = 1;
    if (index < fadeLength) envelope = index / fadeLength;
    if (index > length - fadeLength) envelope = (length - index) / fadeLength;
    samples[index] = samples[index] * scale * envelope;
  }
  return { samples, sampleRate };
}

function initAmbientAudio() {
  if (Object.keys(audioElements).length) return;
  const volumes = { rain: 0.42, wind: 0.46, jazz: 0.5 };
  Object.keys(audioTracks).forEach((name) => {
    try {
      const { samples, sampleRate } = buildAmbientSamples(name);
      const audio = new Audio(encodeWavDataUri(samples, sampleRate));
      audio.loop = true;
      audio.preload = "auto";
      audio.volume = volumes[name] || 0.4;
      audio.style.display = "none";
      audio.setAttribute("aria-label", `NOCTURNE ${name} ambient loop`);
      document.body.appendChild(audio);
      audioElements[name] = audio;
    } catch {
      // If audio construction is unavailable, the buttons remain inert but usable.
    }
  });
}

function toggleAmbientAudio(name) {
  const audio = audioElements[name];
  if (!audio) return;
  if (audioTracks[name]) {
    audio.pause();
    audioTracks[name] = false;
    syncOsAudioButtons();
    return;
  }
  const playRequest = audio.play();
  audioTracks[name] = true;
  syncOsAudioButtons();
  if (playRequest && typeof playRequest.catch === "function") {
    playRequest.catch(() => {
      audioTracks[name] = false;
      syncOsAudioButtons();
    });
  }
}

function openOsBlueprint() {
  if (!osState.active || osState.blueprintOpen) return;
  const main = osState.mainView;
  const blueprint = osState.blueprintView;
  if (!main || !blueprint) return;
  osState.blueprintOpen = true;
  main.style.pointerEvents = "none";
  gsap.to(main, { opacity: 0, y: 10, duration: 0.35, ease: "power2.inOut" });
  blueprint.style.visibility = "visible";
  blueprint.style.pointerEvents = "none";
  blueprint.setAttribute("aria-hidden", "false");
  gsap.fromTo(
    blueprint,
    { opacity: 0, y: 18 },
    {
      opacity: 1,
      y: 0,
      duration: 0.55,
      delay: 0.08,
      ease: "power3.out",
      onComplete: () => {
        if (osState.active && osState.blueprintOpen) {
          blueprint.style.pointerEvents = "auto";
        }
      },
    }
  );
}

function closeOsBlueprint() {
  if (!osState.blueprintOpen) return;
  const main = osState.mainView;
  const blueprint = osState.blueprintView;
  if (!main || !blueprint) return;
  osState.blueprintOpen = false;
  blueprint.style.pointerEvents = "none";
  gsap.to(blueprint, {
    opacity: 0,
    y: 16,
    duration: 0.35,
    ease: "power2.inOut",
    onComplete: () => {
      blueprint.style.visibility = "hidden";
      blueprint.setAttribute("aria-hidden", "true");
    },
  });
  main.style.pointerEvents = "auto";
  gsap.to(main, { opacity: 1, y: 0, duration: 0.5, delay: 0.06, ease: "power2.out" });
}

function resetOsBlueprintView() {
  osState.blueprintOpen = false;
  const main = osState.mainView;
  const blueprint = osState.blueprintView;
  if (main) {
    gsap.killTweensOf(main);
    main.style.opacity = "1";
    main.style.transform = "none";
    main.style.pointerEvents = "auto";
  }
  if (blueprint) {
    gsap.killTweensOf(blueprint);
    blueprint.style.opacity = "0";
    blueprint.style.transform = "none";
    blueprint.style.visibility = "hidden";
    blueprint.style.pointerEvents = "none";
    blueprint.setAttribute("aria-hidden", "true");
  }
}

function renderOsProjects() {
  if (!osState.projectGridEl) return;
  const filtered = portfolioData.filter((project) => {
    if (osState.projectFilter === "external") return project.isExternal === true;
    if (osState.projectFilter === "internal") return project.isExternal !== true;
    return true;
  });
  const pageSize = 2;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  osState.projectPage = Math.min(Math.max(0, osState.projectPage), totalPages - 1);
  const pageItems = filtered.slice(
    osState.projectPage * pageSize,
    osState.projectPage * pageSize + pageSize
  );

  osState.projectGridEl.innerHTML = pageItems.map(
    (project) => `
      <button class="os-project-card${project.isExternal ? " is-external" : ""}" type="button" data-project="${project.id}">
        <span class="os-project-index">${project.index}</span>
        <span class="os-project-art"><img src="${project.image}" alt="${project.title}" loading="eager"></span>
        <span class="os-project-info">
          <small>${project.category}</small>
          <strong>${project.title}</strong>
          <span class="os-project-view">VIEW DETAILS <span aria-hidden="true">↗</span></span>
        </span>
        ${project.isExternal ? '<span class="os-project-external">EXTERNAL</span>' : ""}
        <span class="os-project-arrow" aria-hidden="true">↗</span>
      </button>
    `
  ).join("");

  osState.overlay.querySelectorAll("[data-project-filter]").forEach((button) => {
    const active = button.dataset.projectFilter === osState.projectFilter;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
  if (osState.projectSummaryEl) {
    osState.projectSummaryEl.textContent = `${String(filtered.length).padStart(2, "0")} PROJECTS / ${String(totalPages).padStart(2, "0")} PAGES`;
  }
  if (osState.projectPageInfoEl) {
    osState.projectPageInfoEl.textContent = `PAGE ${String(osState.projectPage + 1).padStart(2, "0")} / ${String(totalPages).padStart(2, "0")} · ${pageSize} PER PAGE`;
  }
  if (osState.projectPrevEl) osState.projectPrevEl.disabled = osState.projectPage <= 0;
  if (osState.projectNextEl) osState.projectNextEl.disabled = osState.projectPage >= totalPages - 1;
}

function showProject(projectId) {
  const project = portfolioData.find((entry) => entry.id === projectId);
  if (!project || !osState.projectDetailEl || !osState.projectGridEl) return;
  closeProjectPreview();
  osState.activeProjectId = project.id;
  osState.projectDetailOpen = true;
  const image = osState.projectDetailEl.querySelector("#os-project-image");
  const category = osState.projectDetailEl.querySelector("#os-project-category");
  const title = osState.projectDetailEl.querySelector("#os-project-title");
  const description = osState.projectDetailEl.querySelector("#os-project-description");
  const tags = osState.projectDetailEl.querySelector("#os-project-tags");
  const meta = osState.projectDetailEl.querySelector("#os-project-meta");
  if (image) {
    image.src = project.image;
    image.alt = project.title;
  }
  if (category) category.textContent = project.category;
  if (title) title.textContent = project.title;
  if (description) description.textContent = project.description;
  if (tags) {
    tags.innerHTML = project.tags.map((tag) => `<span>${tag}</span>`).join("");
  }
  if (meta) meta.textContent = project.meta;
  if (osState.projectActionEl) {
    osState.projectActionEl.innerHTML = project.isExternal
      ? 'LAUNCH APP <span>↗</span>'
      : 'OPEN GALLERY <span>↗</span>';
    osState.projectActionEl.dataset.external = project.isExternal ? "true" : "false";
  }
  if (osState.projectPreviewEl) {
    osState.projectPreviewEl.hidden = !project.isExternal;
  }
  osState.projectPanelEl?.classList.add("is-detail");
  osState.projectGridEl.classList.add("is-hidden");
  osState.projectDetailEl.classList.add("is-open");
  osState.projectDetailEl.setAttribute("aria-hidden", "false");
  if (gsap) {
    gsap.fromTo(
      osState.projectDetailEl,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.32, ease: "power2.out" }
    );
  }
}

function hideProjectDetail() {
  if (!osState.projectDetailEl || !osState.projectGridEl) return;
  closeProjectPreview();
  osState.projectDetailOpen = false;
  osState.projectDetailEl.classList.remove("is-open");
  osState.projectDetailEl.setAttribute("aria-hidden", "true");
  osState.projectPanelEl?.classList.remove("is-detail");
  osState.projectGridEl.classList.remove("is-hidden");
}

function openProjectPreview() {
  const project = portfolioData.find((entry) => entry.id === osState.activeProjectId);
  if (!project?.isExternal || !project.url || !osState.previewEl || !osState.previewFrame) return;
  osState.previewOpen = true;
  osState.previewEl.classList.add("is-open");
  osState.previewEl.setAttribute("aria-hidden", "false");
  if (osState.previewTitleEl) osState.previewTitleEl.textContent = `${project.title} / LIVE`;
  osState.previewFrame.src = project.url;
}

function closeProjectPreview() {
  if (!osState.previewEl) return;
  osState.previewOpen = false;
  osState.previewEl.classList.remove("is-open");
  osState.previewEl.setAttribute("aria-hidden", "true");
  if (osState.previewFrame) osState.previewFrame.src = "about:blank";
}

function renderOsGallery() {
  if (!osState.galleryGridEl) return;
  const gallery = OS_GALLERY.filter(
    (item) => osState.galleryFilter === "all" || item.category === osState.galleryFilter
  );
  osState.galleryGridEl.innerHTML = gallery
    .map(
      (item, index) => `
        <button class="os-gallery-tile" type="button" data-gallery-id="${item.id}">
          <span class="os-gallery-image"><img src="${item.image}" alt="${item.title}" loading="eager"></span>
          <span class="os-gallery-caption">
            <small>${item.categoryLabel}</small>
            <strong>${item.title}</strong>
            <em>${String(index + 1).padStart(2, "0")}</em>
          </span>
        </button>
      `
    )
    .join("");
  osState.overlay.querySelectorAll("[data-gallery-filter]").forEach((button) => {
    const active = button.dataset.galleryFilter === osState.galleryFilter;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function updateOsGalleryLightbox() {
  const gallery = OS_GALLERY.filter(
    (item) => osState.galleryFilter === "all" || item.category === osState.galleryFilter
  );
  if (!gallery.length) return;
  osState.activeGalleryIndex = ((osState.activeGalleryIndex % gallery.length) + gallery.length) % gallery.length;
  const item = gallery[osState.activeGalleryIndex];
  const image = osState.galleryLightboxEl?.querySelector("#os-lightbox-image");
  const category = osState.galleryLightboxEl?.querySelector("#os-lightbox-category");
  const title = osState.galleryLightboxEl?.querySelector("#os-lightbox-title");
  const description = osState.galleryLightboxEl?.querySelector("#os-lightbox-description");
  const meta = osState.galleryLightboxEl?.querySelector("#os-lightbox-meta");
  const index = osState.galleryLightboxEl?.querySelector("#os-lightbox-index");
  if (image) {
    image.src = item.image;
    image.alt = item.title;
  }
  if (category) category.textContent = item.categoryLabel;
  if (title) title.textContent = item.title;
  if (description) description.textContent = item.description;
  if (meta) meta.textContent = item.meta;
  if (index) index.textContent = `${String(osState.activeGalleryIndex + 1).padStart(2, "0")} / ${String(gallery.length).padStart(2, "0")}`;
}

function openGalleryItem(galleryId) {
  if (!osState.galleryLightboxEl) return;
  const gallery = OS_GALLERY.filter(
    (item) => osState.galleryFilter === "all" || item.category === osState.galleryFilter
  );
  const index = gallery.findIndex((item) => item.id === galleryId);
  if (index < 0) return;
  osState.activeGalleryIndex = index;
  osState.galleryDetailOpen = true;
  osState.galleryLightboxEl.classList.add("is-open");
  osState.galleryLightboxEl.setAttribute("aria-hidden", "false");
  updateOsGalleryLightbox();
  if (gsap) {
    gsap.fromTo(
      osState.galleryLightboxEl,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.32, ease: "power2.out" }
    );
  }
}

function closeGalleryLightbox() {
  if (!osState.galleryLightboxEl) return;
  osState.galleryDetailOpen = false;
  osState.galleryLightboxEl.classList.remove("is-open");
  osState.galleryLightboxEl.setAttribute("aria-hidden", "true");
}

function stepGallery(direction) {
  const gallery = OS_GALLERY.filter(
    (item) => osState.galleryFilter === "all" || item.category === osState.galleryFilter
  );
  if (!gallery.length) return;
  osState.activeGalleryIndex = (osState.activeGalleryIndex + direction + gallery.length) % gallery.length;
  updateOsGalleryLightbox();
}

function setActiveAppUI(name) {
  const info = OS_APPS[name] || OS_APPS.home;
  osState.appPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.osPanel === name);
  });
  osState.dockButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.osApp === name);
  });
  if (osState.activeAppEl) osState.activeAppEl.textContent = info.label;
  if (osState.menuTitleEl) osState.menuTitleEl.textContent = info.title;
  if (osState.windowTitleEl) osState.windowTitleEl.textContent = `${info.label} / ${info.title}`;
}

function openOsApp(name, { instant = false } = {}) {
  if (!osState.desktopOpen || osState.blueprintOpen || !OS_APPS[name]) return;
  if (osState.previewOpen) closeProjectPreview();
  if (osState.projectDetailOpen) hideProjectDetail();
  if (osState.galleryDetailOpen) closeGalleryLightbox();
  osState.activeApp = name;
  setActiveAppUI(name);
  const panel = osState.appPanels.find((entry) => entry.dataset.osPanel === name);
  if (!panel) return;
  if (!instant && gsap && !reducedMotion) {
    gsap.fromTo(panel, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" });
  }
  if (name === "audio") updateOsAudioUI();
  if (name === "environment") syncOsEnvironment();
}

function enterOsDesktop() {
  if (!osState.active || osState.closing || osState.desktopOpen || !osState.desktopEl) return;
  osState.desktopOpen = true;
  startOsAudioTimer();
  const boot = osState.bootView;
  const desktop = osState.desktopEl;
  desktop.classList.add("is-open");
  desktop.style.visibility = "visible";
  desktop.setAttribute("aria-hidden", "false");
  setActiveAppUI("home");
  if (!gsap || reducedMotion) {
    if (boot) {
      boot.style.display = "none";
      boot.style.opacity = "0";
    }
    desktop.style.opacity = "1";
    desktop.style.pointerEvents = "auto";
    openOsApp("home", { instant: true });
    return;
  }
  if (boot) {
    boot.style.pointerEvents = "none";
    gsap.to(boot, {
      opacity: 0,
      y: -8,
      duration: 0.3,
      ease: "power2.inOut",
      onComplete: () => {
        boot.style.display = "none";
      },
    });
  }
  gsap.fromTo(
    desktop,
    { opacity: 0, y: 12 },
    {
      opacity: 1,
      y: 0,
      duration: 0.55,
      delay: 0.08,
      ease: "power3.out",
      onStart: () => {
        desktop.style.pointerEvents = "auto";
      },
    }
  );
  openOsApp("home", { instant: true });
}

function resetOsDesktop() {
  stopOsAudioTimer();
  osState.desktopOpen = false;
  osState.activeApp = "home";
  osState.projectDetailOpen = false;
  osState.projectFilter = "all";
  osState.projectPage = 0;
  osState.galleryDetailOpen = false;
  osState.galleryFilter = "all";
  if (osState.desktopEl) {
    osState.desktopEl.classList.remove("is-open");
    osState.desktopEl.style.opacity = "0";
    osState.desktopEl.style.visibility = "hidden";
    osState.desktopEl.style.pointerEvents = "none";
    osState.desktopEl.setAttribute("aria-hidden", "true");
  }
  if (osState.bootView) {
    osState.bootView.style.display = "flex";
    osState.bootView.style.opacity = "1";
    osState.bootView.style.transform = "none";
    osState.bootView.style.pointerEvents = "auto";
  }
  if (osState.projectDetailEl) {
    osState.projectDetailEl.classList.remove("is-open");
    osState.projectDetailEl.setAttribute("aria-hidden", "true");
  }
  if (osState.projectGridEl) osState.projectGridEl.classList.remove("is-hidden");
  osState.projectPanelEl?.classList.remove("is-detail");
  if (osState.galleryLightboxEl) {
    osState.galleryLightboxEl.classList.remove("is-open");
    osState.galleryLightboxEl.setAttribute("aria-hidden", "true");
  }
  setActiveAppUI("home");
  renderOsProjects();
  renderOsGallery();
  if (osState.audioVolumeInput) osState.audioVolumeInput.value = String(osState.audioVolume);
}

function resetOsUi() {
  if (!osState.overlay) return;
  if (osState.terminalTl) {
    osState.terminalTl.kill();
    osState.terminalTl = null;
  }
  if (osState.progressTween) {
    osState.progressTween.kill();
    osState.progressTween = null;
  }
  osState.terminalEl.innerHTML = "";
  osState.progressFill.style.width = "0%";
  osState.percentEl.textContent = "0%";
  osState.progressLabel.textContent = "INITIALIZING SYSTEM";
  closeProjectPreview();
  resetOsBlueprintView();
  resetOsDesktop();
  updateOsClock();
  syncOsModeButtons();
  syncOsEnvironment();
  syncOsAudioButtons();
}

function startOsUi() {
  if (!osState.active || !osState.overlay) return;
  resetOsUi();

  if (osState.clockTimer) clearInterval(osState.clockTimer);
  osState.clockTimer = setInterval(updateOsClock, 1000);

  const lines = [
    "> ESTABLISHING CONNECTION...",
    "> HANDSHAKE ACCEPTED / PRIVATE NODE",
    "> DECRYPTING NOCTURNE CORE...",
    "> AMBIENT FIELD SYNCED / NIGHT",
    "> WELCOME BACK, GUEST.",
  ];

  if (!gsap || reducedMotion) {
    lines.forEach((text) => {
      const line = document.createElement("p");
      line.className = "os-line";
      line.textContent = text;
      osState.terminalEl.appendChild(line);
    });
    osState.progressFill.style.width = "100%";
    osState.percentEl.textContent = "100%";
    osState.progressLabel.textContent = "SYSTEM READY";
    window.setTimeout(() => {
      if (osState.active && !osState.closing) enterOsDesktop();
    }, 420);
    return;
  }

  const tl = gsap.timeline();
  lines.forEach((text, index) => {
    const line = document.createElement("p");
    line.className = "os-line";
    osState.terminalEl.appendChild(line);
    const proxy = { length: 0 };
    tl.to(
      proxy,
      {
        length: text.length,
        duration: 0.26 + text.length * 0.018,
        ease: "none",
        onUpdate: () => {
          line.textContent = text.slice(0, Math.floor(proxy.length));
        },
      },
      index === 0 ? 0 : "+=0.08"
    );
  });
  osState.terminalTl = tl;

  const progress = { value: 0 };
  osState.progressTween = gsap.to(progress, {
    value: 100,
    duration: 2.15,
    ease: "power2.inOut",
    onUpdate: () => {
      const value = Math.round(progress.value);
      osState.progressFill.style.width = `${value}%`;
      osState.percentEl.textContent = `${value}%`;
    },
    onComplete: () => {
      osState.progressLabel.textContent = "SYSTEM READY";
      window.setTimeout(() => {
        if (osState.active && !osState.closing) enterOsDesktop();
      }, 700);
    },
  });
}

function showNocturneOS() {
  if (!osState.active || !osState.overlay) return;
  osState.shown = true;
  const overlay = osState.overlay;
  overlay.style.visibility = "visible";
  overlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("os-open");
  overlay.style.pointerEvents = "none";
  if (reducedMotion || !gsap) {
    overlay.style.opacity = "1";
    overlay.style.pointerEvents = "auto";
    startOsUi();
    osState.suspended = true;
    return;
  }
  if (osState.overlayTween) gsap.killTweensOf(overlay);

  osState.overlayTween = gsap.to(overlay, {
    opacity: 1,
    duration: reducedMotion ? 0.01 : 0.55,
    ease: "power2.out",
    onComplete: () => {
      if (!osState.active) return;
      overlay.style.pointerEvents = "auto";
      startOsUi();
      osState.suspended = true;
      overlay.querySelector(".os-return")?.focus({ preventScroll: true });
    },
  });
}

function openNocturneOS() {
  if (osState.active) return;
  const screenMesh = studyState.screenMesh;
  if (!screenMesh) return;

  if (state.introPlaying) finishIntro(true);
  if (state.cameraTween) {
    state.cameraTween.kill();
    state.cameraTween = null;
  }

  osState.active = true;
  osState.closing = false;
  osState.shown = false;
  osState.original = {
    position: camera.position.clone(),
    target: controls.target.clone(),
    controlsEnabled: controls.enabled,
    userMoved: state.userMoved,
  };
  osState.savedUserMoved = state.userMoved;
  state.userMoved = true;
  controls.enabled = false;
  environmentState.pendingMode = currentEnvMode;
  resetOsBlueprintView();
  syncOsEnvironment();
  syncOsAudioButtons();

  screenMesh.updateWorldMatrix(true, false);
  const screenPosition = new THREE.Vector3().setFromMatrixPosition(screenMesh.matrixWorld);
  const quaternion = new THREE.Quaternion();
  screenMesh.getWorldQuaternion(quaternion);
  const normal = new THREE.Vector3(0, 0, 1)
    .applyQuaternion(quaternion)
    .normalize();
  const screenWidth = Math.abs(screenMesh.scale.x) || 0.9;
  const screenHeight = Math.abs(screenMesh.scale.y) || 0.5;
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
  const fitWidth = screenWidth / (2 * Math.tan(hFov / 2));
  const fitHeight = screenHeight / (2 * Math.tan(vFov / 2));
  const distance = Math.max(0.52, Math.min(fitWidth, fitHeight) * 0.88);
  const target = screenPosition.clone();
  const position = screenPosition.clone().add(normal.multiplyScalar(distance));

  if (reducedMotion || !gsap) {
    camera.position.copy(position);
    controls.target.copy(target);
    camera.lookAt(controls.target);
    showNocturneOS();
    return;
  }

  const motion = {
    px: camera.position.x,
    py: camera.position.y,
    pz: camera.position.z,
    tx: controls.target.x,
    ty: controls.target.y,
    tz: controls.target.z,
  };
  osState.cameraTween = gsap.to(motion, {
    px: position.x,
    py: position.y,
    pz: position.z,
    tx: target.x,
    ty: target.y,
    tz: target.z,
    duration: reducedMotion ? 0.01 : 1.2,
    ease: "power3.inOut",
    onUpdate: () => {
      camera.position.set(motion.px, motion.py, motion.pz);
      controls.target.set(motion.tx, motion.ty, motion.tz);
      camera.lookAt(controls.target);
    },
    onComplete: () => {
      osState.cameraTween = null;
      if (!osState.active) return;
      showNocturneOS();
    },
  });
}

function closeNocturneOS() {
  if (!osState.active || osState.closing) return;
  osState.closing = true;
  stopOsAudioTimer();
  closeProjectPreview();
  const overlay = osState.overlay;
  if (!overlay || !osState.original) {
    osState.active = false;
    osState.closing = false;
    controls.enabled = true;
    return;
  }

  overlay.style.pointerEvents = "none";
  if (overlay.contains(document.activeElement)) document.activeElement.blur();
  resetOsBlueprintView();
  osState.suspended = false;
  if (osState.overlayTween) gsap.killTweensOf(overlay);
  osState.overlayTween = gsap.to(overlay, {
    opacity: 0,
    duration: reducedMotion ? 0.01 : 0.45,
    ease: "power2.inOut",
    onComplete: () => {
      overlay.style.visibility = "hidden";
      overlay.setAttribute("aria-hidden", "true");
    },
  });

  if (osState.terminalTl) {
    osState.terminalTl.kill();
    osState.terminalTl = null;
  }
  if (osState.progressTween) {
    osState.progressTween.kill();
    osState.progressTween = null;
  }
  if (osState.clockTimer) {
    clearInterval(osState.clockTimer);
    osState.clockTimer = null;
  }

  if (osState.cameraTween) {
    osState.cameraTween.kill();
    osState.cameraTween = null;
  }

  const original = osState.original;
  if (reducedMotion || !gsap) {
    camera.position.copy(original.position);
    controls.target.copy(original.target);
    camera.lookAt(controls.target);
    overlay.style.opacity = "0";
    overlay.style.visibility = "hidden";
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("os-open");
    osState.active = false;
    osState.closing = false;
    osState.shown = false;
    osState.desktopOpen = false;
    osState.original = null;
    controls.enabled = true;
    state.userMoved = osState.savedUserMoved;
    controls.update();
    applyPendingEnvironment();
    return;
  }
  const motion = {
    px: camera.position.x,
    py: camera.position.y,
    pz: camera.position.z,
    tx: controls.target.x,
    ty: controls.target.y,
    tz: controls.target.z,
  };
  osState.cameraTween = gsap.to(motion, {
    px: original.position.x,
    py: original.position.y,
    pz: original.position.z,
    tx: original.target.x,
    ty: original.target.y,
    tz: original.target.z,
    duration: reducedMotion ? 0.01 : 1.2,
    ease: "power3.inOut",
    onUpdate: () => {
      camera.position.set(motion.px, motion.py, motion.pz);
      controls.target.set(motion.tx, motion.ty, motion.tz);
      camera.lookAt(controls.target);
    },
    onComplete: () => {
      osState.cameraTween = null;
      osState.active = false;
      osState.closing = false;
      osState.shown = false;
      osState.desktopOpen = false;
      osState.original = null;
      document.body.classList.remove("os-open");
      if (osState.clockTimer) {
        clearInterval(osState.clockTimer);
        osState.clockTimer = null;
      }
      controls.enabled = true;
      state.userMoved = osState.savedUserMoved;
      controls.update();
      applyPendingEnvironment();
      osState.overlay.style.visibility = "hidden";
      osState.overlay.style.opacity = "0";
      osState.overlay.setAttribute("aria-hidden", "true");
    },
  });
}

function flyToView(name, { instant = false, duration = 1.5, announce = true } = {}) {
  const pose = poseFor(name);
  state.lastPose = pose;
  state.currentView = name;
  state.userMoved = false;
  if (announce) {
    const button = setActiveButton(name);
    const caption = button?.dataset.caption || VIEWS[name]?.caption;
    if (caption) setCaption(caption);
  }
  if (state.cameraTween) {
    state.cameraTween.kill();
    state.cameraTween = null;
  }
  controls.enabled = false;
  if (instant || reducedMotion || !gsap) {
    camera.position.copy(pose.position);
    controls.target.copy(pose.target);
    camera.lookAt(controls.target);
    controls.enabled = true;
    controls.update();
    return;
  }
  const motion = {
    px: camera.position.x,
    py: camera.position.y,
    pz: camera.position.z,
    tx: controls.target.x,
    ty: controls.target.y,
    tz: controls.target.z,
  };
  state.cameraTween = gsap.to(motion, {
    px: pose.position.x,
    py: pose.position.y,
    pz: pose.position.z,
    tx: pose.target.x,
    ty: pose.target.y,
    tz: pose.target.z,
    duration,
    ease: "power3.inOut",
    onUpdate: () => {
      camera.position.set(motion.px, motion.py, motion.pz);
      controls.target.set(motion.tx, motion.ty, motion.tz);
      camera.lookAt(controls.target);
    },
    onComplete: () => {
      state.cameraTween = null;
      controls.enabled = true;
      controls.update();
    },
  });
}

function poseForRoom(roomId) {
  const group = state.roomGroups[roomId];
  if (!group) return null;
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(group);
  if (box.isEmpty()) return null;

  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const preset = VIEWS[roomId] || VIEWS.overview;
  const presetTarget = new THREE.Vector3(...preset.target);
  const direction = new THREE.Vector3(...preset.position)
    .sub(presetTarget)
    .normalize();
  const horizontal = Math.max(size.x, size.z);
  const distance =
    clamp(horizontal * 1.85 + Math.min(size.y, 2.6) * 0.9 + 1.0, 4.4, 14) *
    clamp(1 + (fitFactor() - 1) * 0.28, 1, 1.18);

  const target = center.clone();
  target.y += Math.min(0.85, size.y * 0.2);
  if (roomId === "study") {
    // A frontal close-up reads the monitor and the bookshelf simultaneously;
    // the usual bbox distance would look straight through the timber screen.
    const studyTarget = new THREE.Vector3(4.35, 5.02, -1.72);
    const studyOffset = new THREE.Vector3(7.35, 6.42, 5.65)
      .sub(studyTarget)
      .multiplyScalar(clamp(fitFactor() / 1.3, 1, 1.25));
    return {
      target: studyTarget,
      position: studyTarget.clone().add(studyOffset),
    };
  }
  if (roomId === "onsen") {
    // A three-quarter view from the garden keeps the bath, pergola and the
    // lit villa edge in the same frame.
    const onsenTarget = new THREE.Vector3(-6.05, 0.62, 4.15);
    return {
      target: onsenTarget,
      position: new THREE.Vector3(-2.0, 3.0, 11.8),
    };
  }
  return {
    target,
    position: target.clone().add(direction.multiplyScalar(distance)),
  };
}

function flyToRoom(roomId, { duration = 1.5 } = {}) {
  const pose = poseForRoom(roomId);
  if (!pose) return false;

  state.lastPose = pose;
  state.currentView = roomId;
  state.userMoved = false;
  setActiveButton(roomId);
  setCaption(ROOM_CAPTIONS[roomId] || roomId);

  if (state.cameraTween) {
    state.cameraTween.kill();
    state.cameraTween = null;
  }
  controls.enabled = false;

  if (reducedMotion || !gsap) {
    camera.position.copy(pose.position);
    controls.target.copy(pose.target);
    camera.lookAt(controls.target);
    controls.enabled = true;
    controls.update();
    return true;
  }

  const motion = {
    px: camera.position.x,
    py: camera.position.y,
    pz: camera.position.z,
    tx: controls.target.x,
    ty: controls.target.y,
    tz: controls.target.z,
  };
  state.cameraTween = gsap.to(motion, {
    px: pose.position.x,
    py: pose.position.y,
    pz: pose.position.z,
    tx: pose.target.x,
    ty: pose.target.y,
    tz: pose.target.z,
    duration,
    ease: "power3.inOut",
    onUpdate: () => {
      camera.position.set(motion.px, motion.py, motion.pz);
      controls.target.set(motion.tx, motion.ty, motion.tz);
      camera.lookAt(controls.target);
    },
    onComplete: () => {
      state.cameraTween = null;
      controls.enabled = true;
      controls.update();
    },
  });
  return true;
}

function finishIntro(snapCamera = false) {
  if (!state.introPlaying) return;
  state.introPlaying = false;
  state.introSeen = true;
  if (state.introTl) {
    state.introTl.kill();
    state.introTl = null;
  }
  G.base.position.y = 0;
  G.site.position.y = 0;
  G.ground.position.y = 0;
  G.upper.position.y = 0;
  G.roof.position.y = 0;
  G.glass.position.y = 0;
  G.stone.position.y = 0;
  G.interior.position.y = 0;
  G.extensions.position.y = 0;
  G.extensions.scale.set(1, 1, 1);
  G.terrace.position.y = 0;
  G.outdoor.position.y = 0;
  G.details.position.y = 0;
  G.plants.scale.set(1, 1, 1);
  MAT.glass.opacity = FINAL_GLASS;
  MAT.glassRail.opacity = FINAL_GLASS_RAIL;
  state.lights.forEach(({ light, target }) => {
    light.intensity = target;
  });
  state.glows.forEach(({ sprite, target }) => {
    sprite.material.opacity = target;
  });
  controls.enabled = true;
  if (snapCamera) {
    const pose = poseFor(state.currentView);
    camera.position.copy(pose.position);
    controls.target.copy(pose.target);
  }
  controls.update();
  renderer.shadowMap.needsUpdate = true;
  renderer.shadowMap.autoUpdate = false;
  if (gsap && !reducedMotion) {
    startPathLightPulse();
  }
  try {
    sessionStorage.setItem("nocturne-intro-v1", "1");
  } catch {
    // File protocol or strict privacy mode: no persistence, no problem.
  }
}

function playIntro(defaultView) {
  state.introPlaying = true;
  if (!gsap || reducedMotion) {
    finishIntro(false);
    return;
  }
  controls.enabled = false;

  const pose = poseFor(defaultView);
  camera.position.copy(pose.position);
  controls.target.copy(pose.target);
  camera.position.sub(pose.target).multiplyScalar(1.15).add(pose.target);
  camera.position.y += 1.1;
  camera.lookAt(controls.target);

  G.base.position.y = -0.95;
  G.site.position.y = -0.18;
  G.ground.position.y = -0.95;
  G.upper.position.y = -1.25;
  G.roof.position.y = 0.85;
  G.glass.position.y = -1.05;
  G.stone.position.y = -0.72;
  G.interior.position.y = -0.48;
  G.terrace.position.y = -0.62;
  G.outdoor.position.y = -0.22;
  G.details.position.y = -0.2;
  G.extensions.position.y = -0.75;
  G.extensions.scale.set(0.97, 0.97, 0.97);
  G.plants.scale.set(0.72, 0.72, 0.72);
  MAT.glass.opacity = 0;
  MAT.glassRail.opacity = 0;
  state.lights.forEach(({ light, target }) => {
    light.intensity = target * 0.09;
  });
  state.glows.forEach(({ sprite }) => {
    sprite.material.opacity = 0;
  });

  state.introTl = gsap.timeline({
    defaults: { ease: "power3.out" },
    onComplete: () => finishIntro(false),
  });

  state.introTl
    .to(G.base.position, { y: 0, duration: 1.1 }, 0)
    .to(G.site.position, { y: 0, duration: 1.0 }, 0.18)
    .to(G.ground.position, { y: 0, duration: 1.35 }, 0.34)
    .to(G.stone.position, { y: 0, duration: 1.1 }, 0.48)
    .to(G.upper.position, { y: 0, duration: 1.25 }, 0.55)
    .to(G.glass.position, { y: 0, duration: 1.25 }, 0.62)
    .to(G.interior.position, { y: 0, duration: 1.2 }, 0.76)
    .to(G.terrace.position, { y: 0, duration: 1.15 }, 0.8)
    .to(G.roof.position, { y: 0, duration: 1.15 }, 0.88)
    .to(G.outdoor.position, { y: 0, duration: 0.9 }, 0.9)
    .to(G.details.position, { y: 0, duration: 0.9 }, 1.0)
    .to(G.extensions.position, { y: 0, duration: 1.2 }, 0.68)
    .to(G.extensions.scale, { x: 1, y: 1, z: 1, duration: 1.1 }, 0.68)
    .to(G.plants.scale, { x: 1, y: 1, z: 1, duration: 1.15, ease: "back.out(1.5)" }, 0.55)
    .to(MAT.glass, { opacity: FINAL_GLASS, duration: 1.0 }, 1.0)
    .to(MAT.glassRail, { opacity: FINAL_GLASS_RAIL, duration: 1.0 }, 1.05)
    .to(camera.position, {
      x: pose.position.x,
      y: pose.position.y,
      z: pose.position.z,
      duration: 2.9,
      ease: "power3.inOut",
    }, 0.2);

  state.lights.forEach(({ light, target }, index) => {
    state.introTl.to(light, {
      intensity: target,
      duration: 1.15,
      ease: "power2.out",
    }, 0.85 + index * 0.045);
  });
  state.glows.forEach(({ sprite, target }, index) => {
    state.introTl.to(sprite.material, {
      opacity: target,
      duration: 1.0,
      ease: "power2.out",
    }, 1.1 + index * 0.035);
  });

  // Safety net for throttled background tabs and very slow devices: the
  // finished frame should still be reachable even if the ticker stalls.
  window.setTimeout(() => {
    if (state.introPlaying) finishIntro(true);
  }, 5200);
}

function initUI() {
  document.querySelectorAll(".space-row").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.introPlaying) {
        finishIntro(false);
      }
      const name = button.dataset.view;
      const accordionItem = button.closest(".space-item");
      const isArchitecture = !!document.getElementById("arch-dock");

      if (isArchitecture) {
        if (state.focus) clearRoomFocus({ instant: true });
        if (name === "cantilever" || name === "glass") {
          enterExplodedStudy();
        } else {
          collapseExplodedStudy();
        }
        flyToView(name, { duration: 1.45, announce: true });
      } else if (accordionItem || state.roomGroups[name]) {
        selectRoom(name, { fly: true });
      } else {
        flyToView(name, { duration: 1.45, announce: true });
      }

      if (mobileQuery.matches) {
        window.setTimeout(() => {
          viewer.scrollIntoView({
            behavior: reducedMotion ? "auto" : "smooth",
            block: "start",
          });
        }, 80);
      }
    });
  });

  initExploreControls();
}

/* Resize & render --------------------------------------------------------- */
function resize() {
  if (!renderer) return;
  const w = Math.max(1, viewer.clientWidth);
  const h = Math.max(1, viewer.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(w, h, false);
  if (composer) {
    composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    composer.setSize(w, h);
  }
  if (labelRenderer) labelRenderer.setSize(w, h);
  const aspect = w / h;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();

  const firstMeasure = lastViewerAspect === 0;
  const aspectChanged = !firstMeasure && Math.abs(aspect - lastViewerAspect) > 0.015;
  lastViewerAspect = aspect;
  if ((firstMeasure || aspectChanged) && !state.introPlaying && !state.cameraTween && !state.userMoved && !osState.active) {
    const pose = poseFor(state.currentView);
    camera.position.copy(pose.position);
    controls.target.copy(pose.target);
    camera.lookAt(controls.target);
    controls.update();
  }
}

function renderFrame() {
  if (osState.suspended) return;
  if (state.focus && composer) {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }
}

function animate() {
  if (!renderer) return;
  if (controls.enabled) {
    controls.update();
  } else {
    camera.lookAt(controls.target);
  }
  const time = performance.now() * 0.001;
  if (state.fireflies?.points.visible) {
    state.fireflies.material.uniforms.uTime.value = time;
  }
  updateOnsen(time);
  syncOnsenHud();
  if (fogMaterial) fogMaterial.uniforms.uTime.value = time;
  updateHotspots();
  updateRoomLabels();
  renderFrame();
}

/* Bootstrap --------------------------------------------------------------- */
function init() {
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
  } catch (error) {
    console.error("NOCTURNE: WebGL unavailable", error);
    fallbackEl.classList.add("is-visible");
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.transmissionResolutionScale = 0.45;

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x060607, 0.0065);
  camera = new THREE.PerspectiveCamera(32, 1, 0.1, 120);
  root = new THREE.Group();
  scene.add(root);
  Object.values(G).forEach((group) => root.add(group));

  composer = new EffectComposer(renderer);
  renderPass = new RenderPass(scene, camera);
  outlinePass = new OutlinePass(
    new THREE.Vector2(viewer.clientWidth || 1, viewer.clientHeight || 1),
    scene,
    camera
  );
  outlinePass.enabled = false;
  outlinePass.edgeStrength = 3.6;
  outlinePass.edgeGlow = 0.3;
  outlinePass.edgeThickness = 1.0;
  outlinePass.pulsePeriod = 0;
  outlinePass.visibleEdgeColor.set(0xd9bd91);
  outlinePass.hiddenEdgeColor.set(0x5b4a34);
  outputPass = new OutputPass();
  composer.addPass(renderPass);
  composer.addPass(outlinePass);
  composer.addPass(outputPass);

  raycaster = new THREE.Raycaster();
  pointerNdc = new THREE.Vector2();

  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.enablePan = false;
  controls.minDistance = 8;
  controls.maxDistance = 64;
  controls.minPolarAngle = 0.12;
  controls.maxPolarAngle = Math.PI * 0.475;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.72;
  controls.target.set(0, 2.25, 0);
  controls.addEventListener("start", () => {
    state.userMoved = true;
  });

  buildTextures();
  buildMaterials();
  buildEnvironment();
  buildBase();
  buildSite();
  buildHouse();
  buildLandscape();
  buildExtensions();
  buildAtmosphere();
  setupLights();
  captureEnvironmentBaseline();
  state.glows.forEach((entry) => {
    entry.nightTarget = entry.target;
  });
  initUI();
  createHotspots();
  initRoomLabels();
  initGardenExperience();
  initPhotoInteraction();
  initArchitectureStudy();
  initRaycaster();
  initNocturneOS();
  initAmbientAudio();

  const defaultView = viewer.dataset.defaultView || "overview";
  state.currentView = defaultView;
  flyToView(defaultView, { instant: true, announce: false });
  controls.enabled = false;

  try {
    state.introSeen = sessionStorage.getItem("nocturne-intro-v1") === "1";
  } catch {
    state.introSeen = false;
  }

  resize();
  renderFrame();
  renderer.setAnimationLoop(animate);
  requestAnimationFrame(() => {
    viewer.classList.add("is-ready");
  });

  // Let the browser settle the responsive grid before we frame the model.
  // This matters on phones, where the split layout becomes a vertical stage.
  requestAnimationFrame(() => {
    resize();
    flyToView(defaultView, { instant: true, announce: false });
    if (!state.introSeen && !reducedMotion) {
      playIntro(defaultView);
    } else {
      controls.enabled = true;
      controls.update();
      renderer.shadowMap.needsUpdate = true;
      renderer.shadowMap.autoUpdate = false;
      if (gsap && !reducedMotion) {
        startPathLightPulse();
      }
    }
  });

  const observer = new ResizeObserver(() => resize());
  observer.observe(viewer);
  window.addEventListener("resize", resize, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      renderer.setAnimationLoop(null);
    } else {
      renderer.setAnimationLoop(animate);
    }
  });

  // Exposed for visual QA and local debugging only.
  window.__nocturne = {
    scene,
    camera,
    controls,
    state,
    onsenState,
    photoFrameState,
    renderer,
    flyToView,
    setTimePreset,
    setLayerHidden,
    enterExplodedStudy,
    collapseExplodedStudy,
    setBlueprint,
    selectRoom,
    clearRoomFocus,
    cycleStudyScreen,
    setStudyScreenMode,
    toggleStudyBookshelf,
    toggleStudyDeskLamp,
    openNocturneOS,
    closeNocturneOS,
    applyEnvironmentMode,
    toggleAmbientAudio,
    openOsBlueprint,
    closeOsBlueprint,
    studyState,
    osState,
    environmentState,
    audioElements,
    interactiveGroups,
    composer,
    outlinePass,
    views: VIEWS,
    debug() {
      return {
        viewer: [viewer.clientWidth, viewer.clientHeight],
        fit: fitFactor(),
        introSeen: state.introSeen,
        introPlaying: state.introPlaying,
        introTimeline: state.introTl
          ? {
              time: state.introTl.time(),
              paused: state.introTl.paused(),
              progress: state.introTl.progress(),
              duration: state.introTl.duration(),
            }
          : null,
        gsapTime: gsap?.ticker?.time ?? null,
        currentView: state.currentView,
        timePreset: state.timePreset,
        layerHidden: { ...state.layerHidden },
        exploded: state.exploded,
        blueprint: state.blueprint,
        sectionActive: state.sectionActive,
        focus: state.focus?.roomId || null,
        focusMaterials: state.focus?.dim.size || 0,
        outline: !!outlinePass?.enabled,
        roomGroups: Object.keys(state.roomGroups),
        roomLabels: roomLabels.length,
        labelRenderer: !!labelRenderer,
        fog: !!fogMesh,
        screenMode: studyState.screenMode,
        screenLight: studyState.screenLight
          ? {
              intensity: Number(studyState.screenLight.intensity.toFixed(3)),
              color: `#${studyState.screenLight.color.getHexString()}`,
            }
          : null,
        studyLampOn: studyState.lampOn,
        studyLampLight: studyState.lampLight
          ? Number(studyState.lampLight.intensity.toFixed(3))
          : null,
        studyMainLight: state.lightRig?.study
          ? Number(state.lightRig.study.intensity.toFixed(3))
          : null,
        studyShelfOn: studyState.shelfOn,
        studyShelfLight: studyState.shelfLight
          ? Number(studyState.shelfLight.intensity.toFixed(3))
          : null,
        studyInteractives: interactiveGroups.length,
        osActive: osState.active,
        osShown: osState.shown,
        osClosing: osState.closing,
        osSuspended: osState.suspended,
        osBlueprintOpen: osState.blueprintOpen,
        currentEnvMode,
        pendingEnvMode: environmentState.pendingMode,
        audioTracks: { ...audioTracks },
        pathLightPulse: state.pathLights.some((entry) => !!entry.pulse),
        bedroomRoomY: state.roomGroups.bedroom?.position.y ?? null,
        hotspots: state.hotspots.length,
        pathLights: state.pathLights.length,
        pathLightTween: !!state.pathLightTl,
        fireflies: !!state.fireflies?.active,
        firefliesVisible: !!state.fireflies?.points.visible,
        pathLightOpacity: state.pathLights.map((entry) => Number(entry.glow.material.opacity.toFixed(3))),
        ripples: state.hotspots.map((entry) => [
          entry.id,
          !!entry.ripple?.mesh.visible,
          Number((entry.ripple?.material.uniforms.uOpacity.value ?? 0).toFixed(3)),
        ]),
        explodeGroups: {
          roof: G.roof.position.y,
          upper: G.upper.position.y,
          terrace: G.terrace.position.y,
        },
        cameraTween: !!state.cameraTween,
        userMoved: state.userMoved,
        controlsEnabled: controls.enabled,
        lastPose: state.lastPose
          ? {
              position: state.lastPose.position.toArray(),
              target: state.lastPose.target.toArray(),
            }
          : null,
        session: (() => {
          try {
            return sessionStorage.getItem("nocturne-intro-v1");
          } catch {
            return "blocked";
          }
        })(),
      };
    },
    get triangles() {
      return renderer.info.render.triangles;
    },
  };
}

init();
