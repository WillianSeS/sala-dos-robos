
/* ================= pessoas (esqueleto articulado procedural) ================= */
const V2 = a => a.map(p => new THREE.Vector2(p[0], p[1]));
const PG = {
  torso: new THREE.LatheGeometry(V2([[0, 0], [0.13, 0], [0.137, 0.06], [0.142, 0.16], [0.158, 0.28], [0.17, 0.38], [0.168, 0.44], [0.14, 0.49], [0.07, 0.525], [0, 0.53]]), 22),
  vest: new THREE.LatheGeometry(V2([[0.139, 0.03], [0.145, 0.1], [0.152, 0.18], [0.166, 0.29], [0.176, 0.37], [0.17, 0.42]]), 22),
  pelvis: new THREE.LatheGeometry(V2([[0, -0.1], [0.1, -0.1], [0.136, -0.06], [0.142, 0.0], [0.136, 0.08], [0, 0.08]]), 20),
  neck: new THREE.CylinderGeometry(0.046, 0.052, 0.11, 14),
  head: new THREE.SphereGeometry(0.1, 22, 16),
  hair: new THREE.SphereGeometry(0.106, 22, 10, 0, Math.PI * 2, 0, Math.PI * 0.53),
  hairLong: new THREE.CapsuleGeometry(0.082, 0.16, 6, 14),
  bun: new THREE.SphereGeometry(0.046, 14, 10),
  beard: new THREE.SphereGeometry(0.103, 24, 10, Math.PI / 2 - 1.15, 2.3, Math.PI * 0.56, Math.PI * 0.3),
  ear: new THREE.SphereGeometry(0.025, 10, 8),
  nose: new THREE.SphereGeometry(0.017, 10, 8),
  eye: new THREE.SphereGeometry(0.0115, 10, 8),
  brow: new THREE.BoxGeometry(0.036, 0.007, 0.01),
  upperArm: new THREE.CapsuleGeometry(0.043, 0.2, 4, 10),
  forearm: new THREE.CapsuleGeometry(0.037, 0.19, 4, 10),
  hand: new THREE.CapsuleGeometry(0.031, 0.045, 4, 8),
  thigh: new THREE.CapsuleGeometry(0.068, 0.31, 4, 12),
  shin: new THREE.CapsuleGeometry(0.053, 0.33, 4, 10),
  shoe: new THREE.CapsuleGeometry(0.045, 0.15, 4, 10),
  tie: new THREE.BoxGeometry(0.036, 0.3, 0.008),
  ring: new THREE.TorusGeometry(0.019, 0.0028, 6, 18),
  cup: new THREE.CylinderGeometry(0.036, 0.03, 0.095, 16),
  cue: (() => { const g = new THREE.CylinderGeometry(0.0065, 0.0145, 1.45, 10); g.rotateX(Math.PI / 2); g.translate(0, 0, 0.725); return g; })(),
};
const cueMat = MC('#c9a06a', 0.45), eyeMat = MC('#1a1410', 0.25), glassMat = MC('#1a1a1a', 0.3, 0.6);
const vestMats = new Map();
const vestMat = c => { if (!vestMats.has(c)) vestMats.set(c, M({ color: c, roughness: 0.8, side: THREE.DoubleSide })); return vestMats.get(c); };

const SKIN = ['#f1cfb2', '#e6b691', '#d29b74', '#ad7550', '#875335', '#5d3a25'];
const HAIRC = ['#16110d', '#2c1d13', '#4b301f', '#7a5332', '#b38c58', '#8e8e8e', '#0e0e0e', '#9a4527'];
const OUTFITS = [
  { shirt: '#f3f2ee', vest: '#1c1e23' }, { shirt: '#f3f2ee', tie: '#25324f' }, { shirt: '#cddff0' }, { shirt: '#3f8c5e' },
  { shirt: '#2a3039' }, { shirt: '#f3f2ee', vest: '#2a3a52' }, { shirt: '#e9e4da', tie: '#6b1f2a' }, { shirt: '#f3f2ee', vest: '#1c1e23', tie: '#1c1e23' },
  { shirt: '#d8dee6' }, { shirt: '#3a4757' },
];
const PANTS = ['#23262c', '#1b1e24', '#33383f', '#2c3442', '#4a4136'];

function personSpec(i) {
  const fem = [1, 3, 6, 8].includes(i);
  return {
    skin: SKIN[(i * 7 + 2) % SKIN.length], hair: spick(HAIRC), outfit: OUTFITS[i % OUTFITS.length], pants: spick(PANTS),
    shoe: spick(['#141414', '#3b2416', '#1f1f22']), scale: fem ? srnd(0.92, 0.97) : srnd(0.97, 1.04),
    style: fem ? spick(['long', 'bun', 'long']) : (srand() < 0.15 ? 'bald' : 'short'),
    beard: !fem && srand() < 0.35, glasses: srand() < 0.3, ph: srand() * 10,
  };
}

const JK = ['hipsY', 'spineX', 'spineY', 'neckX', 'neckY', 'lShX', 'lShY', 'lShZ', 'lElX', 'lWrX', 'rShX', 'rShY', 'rShZ', 'rElX', 'rWrX', 'lHipX', 'lHipZ', 'lKnX', 'lAnX', 'rHipX', 'rHipZ', 'rKnX', 'rAnX'];
const HIPS_STAND = 0.964;
const SIT_LEGS = { lHipX: -1.5, rHipX: -1.5, lHipZ: 0.07, rHipZ: -0.07, lKnX: 1.45, rKnX: 1.45 };
const POSES = {
  dance: { hipsY: 'stand', lShZ: 0.6, rShZ: -0.6, lElX: -1.0, rElX: -1.0, lKnX: 0.1, rKnX: 0.1 },
  stand: { hipsY: 'stand', lShZ: 0.07, rShZ: -0.07, lElX: -0.12, rElX: -0.12 },
  sitType: Object.assign({ hipsY: 'sit', spineX: 0.12, neckX: 0.03, lShX: -0.62, rShX: -0.58, lShY: -0.28, rShY: 0.3, lShZ: 0.14, rShZ: -0.2, lElX: -0.98, rElX: -0.98 }, SIT_LEGS),
  sitRelax: Object.assign({ hipsY: 'sit', spineX: -0.16, neckX: 0.06, lShX: -0.32, rShX: -0.32, lShY: -0.35, rShY: 0.35, lShZ: 0.12, rShZ: -0.12, lElX: -0.85, rElX: -0.85 }, SIT_LEGS, { lKnX: 1.3, rKnX: 1.3, lHipX: -1.42, rHipX: -1.42 }),
  sitHead: Object.assign({ hipsY: 'sit', spineX: -0.24, neckX: -0.04, lShX: -2.65, rShX: -2.65, lShZ: 0.62, rShZ: -0.62, lElX: -2.25, rElX: -2.25 }, SIT_LEGS, { lKnX: 1.25, rKnX: 1.25, lHipX: -1.4, rHipX: -1.4 }),
  sitCheer: Object.assign({ hipsY: 'sit', spineX: -0.08, neckX: -0.18, lShX: -2.95, rShX: -2.95, lShZ: 0.32, rShZ: -0.32, lElX: -0.25, rElX: -0.25 }, SIT_LEGS),
  sitFrustr: Object.assign({ hipsY: 'sit', spineX: 0.32, neckX: 0.38, lShX: -2.2, rShX: -2.2, lShZ: 0.42, rShZ: -0.42, lElX: -2.45, rElX: -2.45 }, SIT_LEGS),
  sofa: { hipsY: 'sofa', spineX: -0.36, neckX: 0.22, lHipX: -1.3, rHipX: -1.3, lHipZ: 0.1, rHipZ: -0.1, lKnX: 1.2, rKnX: 1.2, lShX: -0.25, lShY: -0.3, lElX: -0.8, rShX: -0.32, rShY: 0.35, rShZ: -0.1, rElX: -1.55 },
  standCup: { hipsY: 'stand', lShZ: 0.07, lElX: -0.15, rShX: -0.35, rShY: 0.45, rShZ: -0.08, rElX: -1.75 },
  cross: { hipsY: 'stand', neckX: -0.05, lShX: -0.42, rShX: -0.42, lShY: -0.95, rShY: 0.95, lShZ: 0.14, rShZ: -0.14, lElX: -1.95, rElX: -1.95 },
  pocket: { hipsY: 'stand', lShX: 0.12, rShX: 0.12, lShZ: 0.13, rShZ: -0.13, lElX: -0.35, rElX: -0.35 },
  poolAim: { hipsY: 0.925, spineX: 0.95, neckX: -0.78, lShX: -2.3, lShZ: 0.08, lElX: -0.15, rShX: -0.5, rShZ: -0.22, rElX: -1.3, lHipX: -0.28, rHipX: 0.14, lKnX: 0.26, rKnX: 0.1 },
  standCue: { hipsY: 'stand', lShX: -0.1, lShZ: 0.07, lElX: -0.2, rShX: -0.28, rShZ: -0.24, rElX: -0.9 },
};

function makePerson(i) {
  const spec = personSpec(i);
  const P = { spec, root: new THREE.Group(), J: {}, cur: {}, pose: 'sitType', walkW: 0, walkPh: spec.ph, speed: 0, yaw: Math.PI, look: 0, lookT: 0, react: null, reactT: 0 };
  JK.forEach(k => P.cur[k] = 0);
  const J = P.J, o = spec.outfit;
  const mSkin = MC(spec.skin, 0.55), mShirt = MC(o.shirt, 0.86), mPants = MC(spec.pants, 0.8), mShoe = MC(spec.shoe, 0.42), mHair = MC(spec.hair, 0.62);
  const grp = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const SMALL = [PG.ear, PG.eye, PG.brow, PG.nose, PG.ring, PG.tie, PG.cup, PG.cue, PG.bun];
  const add = (parent, geo, m, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => mesh(geo, m, parent, x, y, z, rx, ry, rz, sx, sy, sz, !SMALL.includes(geo));
  J.hips = grp(P.root, 0, HIPS_STAND, 0);
  add(J.hips, PG.pelvis, mPants, 0, 0, 0, 1, 1, 0.72);
  J.spine = grp(J.hips, 0, 0.06, 0);
  add(J.spine, PG.torso, mShirt, 0, 0, 0, 1, 1, 0.62);
  if (o.vest) add(J.spine, PG.vest, vestMat(o.vest), 0, 0, 0, 1, 1, 0.66);
  if (o.tie) add(J.spine, PG.tie, MC(o.tie, 0.55), 0, 0.31, 0.104, 1, 1, 1, -0.06, 0, 0);
  J.neck = grp(J.spine, 0, 0.5, 0);
  add(J.neck, PG.neck, mSkin, 0, 0.04, 0);
  J.head = grp(J.neck, 0, 0.09, 0);
  add(J.head, PG.head, mSkin, 0, 0.1, 0, 0.9, 1.08, 1.0);
  for (const s of [1, -1]) {
    add(J.head, PG.ear, mSkin, s * 0.091, 0.095, -0.004, 0.45, 1, 0.75);
    add(J.head, PG.eye, eyeMat, s * 0.033, 0.112, 0.088);
    add(J.head, PG.brow, mHair, s * 0.034, 0.134, 0.092, 1, 1, 1, 0, 0, s * -0.08);
    if (spec.glasses) add(J.head, PG.ring, glassMat, s * 0.034, 0.112, 0.1);
  }
  add(J.head, PG.nose, mSkin, 0, 0.088, 0.1, 0.8, 1.1, 1.3);
  if (spec.style !== 'bald') add(J.head, PG.hair, mHair, 0, 0.108, -0.008, 0.93, 1.04, 1.04, -0.38, 0, 0);
  if (spec.style === 'long') add(J.head, PG.hairLong, mHair, 0, 0.02, -0.055, 1.12, 1, 0.75);
  if (spec.style === 'bun') add(J.head, PG.bun, mHair, 0, 0.19, -0.085);
  if (spec.beard) add(J.head, PG.beard, mHair, 0, 0.1, 0.004, 0.91, 1.09, 1.02);
  for (const side of [1, -1]) {
    const s = side > 0 ? 'l' : 'r';
    J[s + 'Sh'] = grp(J.spine, 0.2 * side, 0.445, 0);
    add(J[s + 'Sh'], PG.upperArm, mShirt, 0, -0.142, 0);
    J[s + 'El'] = grp(J[s + 'Sh'], 0, -0.275, 0);
    add(J[s + 'El'], PG.forearm, mShirt, 0, -0.13, 0);
    J[s + 'Wr'] = grp(J[s + 'El'], 0, -0.255, 0);
    add(J[s + 'Wr'], PG.hand, mSkin, 0, -0.05, 0, 0.62, 1, 1);
    J[s + 'Hip'] = grp(J.hips, 0.088 * side, -0.03, 0);
    add(J[s + 'Hip'], PG.thigh, mPants, 0, -0.223, 0);
    J[s + 'Kn'] = grp(J[s + 'Hip'], 0, -0.44, 0);
    add(J[s + 'Kn'], PG.shin, mPants, 0, -0.215, 0);
    J[s + 'An'] = grp(J[s + 'Kn'], 0, -0.43, 0);
    add(J[s + 'An'], PG.shoe, mShoe, 0, -0.032, 0.05, 1, 1, 0.72, Math.PI / 2, 0, 0);
  }
  P.cup = add(J.rWr, PG.cup, mat.mug, 0, -0.095, 0.05); P.cup.visible = false;
  P.cue = add(P.root, PG.cue, cueMat, 0, 0, 0); P.cue.visible = false; P.cue.rotation.order = 'YXZ';
  P.root.scale.setScalar(spec.scale);
  P.sitH = 0.452 / spec.scale + 0.098;
  P.sofaH = 0.44 / spec.scale + 0.098;
  GROUPS.main.add(P.root);
  return P;
}

const _q1 = new THREE.Quaternion();
const _cueAim = { p: new THREE.Vector3(-0.12, 0.98, -0.3), d: new THREE.Vector3(0.12, -0.15, 1.35).normalize() };
function animatePerson(P, dt, t) {
  restorePersonItemPose(P);
  const tgt = POSES[P.pose] || POSES.stand, c = P.cur, sp = P.spec.ph;
  const lam = P.pose.startsWith('sit') || P.pose === 'sofa' ? 5 : 7;
  for (const k of JK) {
    let v = tgt[k] ?? 0;
    if (k === 'hipsY') v = v === 'stand' || v === 0 ? HIPS_STAND : v === 'sit' ? P.sitH : v === 'sofa' ? P.sofaH : v;
    c[k] = damp(c[k], v, lam, dt);
  }
  const f = Object.assign({}, c);
  const m = reduceMotion ? 0.3 : 1;
  /* respiração */
  f.spineX += Math.sin(t * 1.7 + sp) * 0.012 * m;
  /* micro-ações por pose */
  if (P.pose === 'dance') {
    const b = danceWave(t, P.danceStyle || 'groove', sp);
    f.hipsY -= b.bounce; f.spineY += b.sway; f.lShX -= b.arm; f.rShX -= b.otherArm;
    f.lShZ += b.sway; f.rShZ += b.sway; f.lKnX += b.knee; f.rKnX += b.otherKnee;
  } else if (P.pose === 'sitType') {
    f.lElX += Math.sin(t * 13 + sp) * 0.05 * m; f.rElX += Math.sin(t * 11.3 + sp * 2) * 0.05 * m;
    f.lWrX += Math.sin(t * 17 + sp) * 0.08 * m; f.rWrX += Math.sin(t * 15 + sp) * 0.08 * m;
    if (t > P.lookT) { P.look = (Math.random() < 0.5 ? -1 : 1) * rnd(0.18, 0.32); P.lookT = t + rnd(1.5, 5); }
    f.neckY += P.look;
  } else if (P.pose === 'sitRelax' || P.pose === 'sitHead') {
    f.neckY += Math.sin(t * 0.35 + sp) * 0.35 * m;
  } else if (P.pose === 'sitCheer') {
    const b = Math.sin(t * 11) * 0.22 * m; f.lShX += b; f.rShX += b; f.spineY = Math.sin(t * 5) * 0.08 * m;
  } else if (P.pose === 'sitFrustr') {
    f.neckY += Math.sin(t * 3) * 0.12 * m;
  } else if (P.pose === 'poolAim') {
    const s = Math.max(0, Math.sin(t * 1.4 + sp)) ** 3; f.rElX += -0.35 + s * 0.7 * m;
  } else if (P.pose === 'cross' || P.pose === 'pocket' || P.pose === 'standCup') {
    f.neckY += Math.sin(t * 0.25 + sp) * 0.25 * m;
  }
  /* caminhada sobreposta */
  P.walkW = damp(P.walkW, P.speed > 0.05 ? 1 : 0, 8, dt);
  if (P.walkW > 0.01) {
    P.walkPh += dt * P.speed / 1.35 * Math.PI * 2;
    const w = P.walkW, s = Math.sin(P.walkPh), co = Math.cos(P.walkPh);
    const mix = (k, v) => { f[k] = f[k] * (1 - w) + v * w; };
    mix('lHipX', -0.42 * s); mix('rHipX', 0.42 * s);
    mix('lKnX', 0.12 + 0.7 * Math.max(0, Math.cos(P.walkPh + 0.6))); mix('rKnX', 0.12 + 0.7 * Math.max(0, -Math.cos(P.walkPh + 0.6)));
    mix('lAnX', -0.15 * Math.max(0, co)); mix('rAnX', -0.15 * Math.max(0, -co));
    mix('lShX', 0.34 * s); mix('rShX', -0.34 * s); mix('lElX', -0.25); mix('rElX', -0.25);
    mix('lShZ', 0.07); mix('rShZ', -0.07); mix('lShY', 0); mix('rShY', 0);
    mix('spineX', 0.04); mix('spineY', 0.06 * s); mix('neckX', 0);
    f.hipsY = f.hipsY * (1 - w) + (HIPS_STAND - 0.012 + 0.018 * Math.abs(Math.cos(P.walkPh))) * w;
  }
  const J = P.J;
  J.hips.position.y = f.hipsY;
  J.spine.rotation.set(f.spineX, f.spineY, 0);
  J.neck.rotation.set(f.neckX, f.neckY, 0);
  J.lSh.rotation.set(f.lShX, f.lShY, f.lShZ); J.rSh.rotation.set(f.rShX, f.rShY, f.rShZ);
  J.lEl.rotation.x = f.lElX; J.rEl.rotation.x = f.rElX; J.lWr.rotation.x = f.lWrX; J.rWr.rotation.x = f.rWrX;
  J.lHip.rotation.set(f.lHipX, 0, f.lHipZ); J.rHip.rotation.set(f.rHipX, 0, f.rHipZ);
  J.lKn.rotation.x = f.lKnX; J.rKn.rotation.x = f.rKnX; J.lAn.rotation.x = f.lAnX; J.rAn.rotation.x = f.rAnX;
  /* adereços */
  P.cup.visible = !P.heldItem && (P.pose === 'standCup' || P.pose === 'sofa');
  P.cue.visible = P.pose === 'poolAim' || P.pose === 'standCue';
  if (P.cue.visible) {
    if (P.pose === 'poolAim') {
      const s = Math.max(0, Math.sin(t * 1.4 + sp)) ** 3 * (reduceMotion ? 0 : 1);
      P.cue.position.copy(_cueAim.p).addScaledVector(_cueAim.d, -0.1 + s * 0.16);
      P.cue.rotation.set(Math.asin(0.15 / 1.366), Math.atan2(0.12, 1.35), 0);
    } else { P.cue.position.set(-0.29, 0.04, 0.14); P.cue.rotation.set(-Math.PI / 2 + 0.05, 0, 0); }
  }
  P.root.rotation.y = P.yaw;
  P.root.updateMatrixWorld(true);
  if (P.cup.visible) { P.cup.parent.getWorldQuaternion(_q1); P.cup.quaternion.copy(_q1.invert()).multiply(P.root.quaternion); P.cup.updateMatrixWorld(true); }
  updatePersonItem(P, t);
  updatePersonSmokingPose(P, t);
}
