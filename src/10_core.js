import * as THREE from 'three';

/* ================= núcleo ================= */
const $ = id => document.getElementById(id);
const isTouch = matchMedia('(pointer: coarse)').matches;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const HIGH = !isTouch && (navigator.hardwareConcurrency || 4) >= 4;
const DEBUG = location.hash === '#debug';
/* Botão com ícone e texto: no celular aparece só o ícone (o texto vira o nome acessível). */
function setLabel(el, icon, text) {
  const span = document.createElement('span'); span.className = 'lbl'; span.textContent = ' ' + text;
  el.replaceChildren(icon, span); el.setAttribute('aria-label', text);
}

const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
let pixelRatio = Math.min(devicePixelRatio || 1, HIGH ? 1.75 : 1.35);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04060a);
const camera = new THREE.PerspectiveCamera(66, innerWidth / innerHeight, 0.05, 260);
camera.rotation.order = 'YXZ';
const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

/* utilidades */
let _seed = 20260907;
const srand = () => { _seed |= 0; _seed = _seed + 0x6D2B79F5 | 0; let t = Math.imul(_seed ^ _seed >>> 15, 1 | _seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const rnd = (a, b) => a + Math.random() * (b - a);
const srnd = (a, b) => a + srand() * (b - a);
const spick = a => a[(srand() * a.length) | 0];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));
const angDamp = (a, b, l, dt) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * (1 - Math.exp(-l * dt)); };
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const FONT = '"Chivo Mono", ui-monospace, Menlo, Consolas, monospace';
const FONT_D = '"Fraunces", Georgia, serif';
const money = v => { v = Math.round(v * 100) / 100; return (v < 0 ? '-' : '+') + '$' + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
const money0 = v => '$' + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* texturas de canvas */
function canvasTex(w, h, draw, o = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); if (draw) draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (o.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(o.repeat[0], o.repeat[1]); }
  t.anisotropy = maxAniso;
  t.userData.g = g; t.userData.c = c;
  return t;
}

/* materiais */
const MATS = [];
function M(p) { const m = new THREE.MeshStandardMaterial(p); MATS.push(m); return m; }
const _mc = new Map();
function MC(color, rough = 0.8, metal = 0, extra) {
  const k = color + '|' + rough + '|' + metal;
  if (!_mc.has(k)) _mc.set(k, M(Object.assign({ color, roughness: rough, metalness: metal }, extra || {})));
  return _mc.get(k);
}

/* geometrias base (unitárias, escaladas na hora de usar) */
const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 20),
  cyl8: new THREE.CylinderGeometry(1, 1, 1, 8),
  sph: new THREE.SphereGeometry(1, 20, 14),
  plane: new THREE.PlaneGeometry(1, 1),
};
/* caixa arredondada (cantos e arestas suaves) */
const _rb = new Map();
function rbox(w, h, d, r = 0.02, k = 3) {
  const key = [w, h, d, r, k].join('|'); if (_rb.has(key)) return _rb.get(key);
  r = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
  const n = 2 * k + 1;
  const geo = new THREE.BoxGeometry(1, 1, 1, n, n, n);
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const half = [w / 2, h / 2, d / 2];
  const remap = (t, hf) => { const idx = Math.round((t + 0.5) * n); if (idx <= k) return -hf + r * (idx / k); if (idx >= n - k) return hf - r * ((n - idx) / k); return -hf + r + (hf - r) * 2 * ((idx - k) / (n - 2 * k)); };
  const v = new THREE.Vector3(), inner = new THREE.Vector3(), dlt = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.set(remap(pos.getX(i), half[0]), remap(pos.getY(i), half[1]), remap(pos.getZ(i), half[2]));
    inner.set(clamp(v.x, -half[0] + r, half[0] - r), clamp(v.y, -half[1] + r, half[1] - r), clamp(v.z, -half[2] + r, half[2] - r));
    dlt.subVectors(v, inner);
    if (dlt.lengthSq() > 1e-12) { dlt.normalize(); v.copy(inner).addScaledVector(dlt, r); nor.setXYZ(i, dlt.x, dlt.y, dlt.z); }
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true; nor.needsUpdate = true; geo.computeBoundingSphere();
  _rb.set(key, geo); return geo;
}

/* grupos: paredes ficam separadas para a vista aérea poder escondê-las */
const GROUPS = {};
['main', 'wallBack', 'wallLeft', 'wallRight', 'wallFront'].forEach(k => { GROUPS[k] = new THREE.Group(); scene.add(GROUPS[k]); });
const WALL_INFO = {
  wallBack: { p: new THREE.Vector3(0, 0, -6), n: new THREE.Vector3(0, 0, 1) },
  wallLeft: { p: new THREE.Vector3(-8, 0, 0), n: new THREE.Vector3(1, 0, 0) },
  wallRight: { p: new THREE.Vector3(8, 0, 0), n: new THREE.Vector3(-1, 0, 0) },
  wallFront: { p: new THREE.Vector3(0, 0, 6), n: new THREE.Vector3(0, 0, -1) },
};

/* geometria estática mesclada por material (poucas chamadas de desenho) */
const buckets = new Map();
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
function mtx(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, order = 'XYZ') {
  _e.set(rx, ry, rz, order); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx, sy, sz);
  return new THREE.Matrix4().compose(_p, _q, _s);
}
function SM(geo, mat, m, o = {}) {
  const g = o.group || 'main', cast = o.cast !== false, recv = o.recv !== false;
  const key = mat.uuid + '|' + g + '|' + cast + '|' + recv;
  let b = buckets.get(key); if (!b) { b = { mat, g, cast, recv, list: [] }; buckets.set(key, b); }
  const gg = geo.index ? geo.toNonIndexed() : geo.clone();
  gg.applyMatrix4(m); b.list.push(gg);
}
function S(geo, mat, x, y, z, rx, ry, rz, sx, sy, sz, o) { SM(geo, mat, mtx(x, y, z, rx, ry, rz, sx, sy, sz), o); }
/* caixa simples: centro + tamanho */
function B(mat, x, y, z, w, h, d, o, ry = 0) { S(G.box, mat, x, y, z, 0, ry, 0, w, h, d, o); }
function mergeGeos(list) {
  let n = 0; for (const g of list) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let o = 0;
  for (const g of list) {
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    o += c;
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  m.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  m.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  m.computeBoundingSphere(); m.computeBoundingBox();
  return m;
}
/* Andar de cada grupo de paredes (pelo prefixo do nome); o resto vai pelo centro da peça. */
const groupFloorKey = g => /^wall/.test(g) ? 'office' : /^club/.test(g) ? 'disco' : /^games/.test(g) ? 'games' : /^lounge/.test(g) ? 'lounge' : /^show/.test(g) ? 'show' : null;
function flushStatics() {
  const _c = new THREE.Vector3();
  for (const b of buckets.values()) {
    /* Uma malha por andar: a vista do prédio desenha cada andar na sua altura. */
    const byFloor = new Map();
    for (const geo of b.list) {
      geo.computeBoundingBox(); geo.boundingBox.getCenter(_c);
      const fl = groupFloorKey(b.g) || floorAt(_c.x, _c.z);
      if (!byFloor.has(fl)) byFloor.set(fl, []); byFloor.get(fl).push(geo);
    }
    for (const [fl, list] of byFloor) {
      const mesh = new THREE.Mesh(mergeGeos(list), b.mat);
      mesh.castShadow = b.cast; mesh.receiveShadow = b.recv;
      mesh.matrixAutoUpdate = false; mesh.updateMatrix();
      mesh.userData.floor = fl; mesh.userData.floorFixed = true; mesh.layers.mask = 1 | (1 << (1 + FLOOR[fl].n - 40));
      GROUPS[b.g].add(mesh);
    }
    b.list.forEach(x => x.dispose());
  }
  buckets.clear();
}
/* malha avulsa (dinâmica) */
function mesh(geo, mat, parent, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, cast = true) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz);
  m.castShadow = cast; m.receiveShadow = true; (parent || GROUPS.main).add(m); return m;
}

/* colisores (caixas no plano XZ) */
const COLL = [];
function C(minX, maxX, minZ, maxZ) { COLL.push({ minX, maxX, minZ, maxZ }); }

/* luzes */
const LIGHTS = [];
function spot(x, y, z, tx, ty, tz, intensity, angle, color = 0xfff0dc, shadow = false, pen = 0.85) {
  const s = new THREE.SpotLight(color, intensity, 0, angle, pen, 2);
  s.position.set(x, y, z); s.target.position.set(tx, ty, tz);
  scene.add(s, s.target);
  if (shadow) {
    s.castShadow = true; s.shadow.mapSize.set(1024, 1024);
    s.shadow.bias = -0.0003; s.shadow.normalBias = 0.025;
    s.shadow.camera.near = 0.3; s.shadow.camera.far = 7;
  }
  LIGHTS.push(s); return s;
}
