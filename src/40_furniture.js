
/* ================= mobiliário ================= */
const mm = (m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => m.clone().multiply(mtx(x, y, z, rx, ry, rz, sx, sy, sz));
const cueMat0 = MC('#c9a06a', 0.45);
const PG_CUE = (() => { const g = new THREE.CylinderGeometry(0.0065, 0.0145, 1.45, 10); g.rotateX(Math.PI / 2); g.translate(0, 0, 0.725); return g; })();
Object.assign(mat, {
  deskTop: MC('#ecebe7', 0.38),
  deskEdge: MC('#cfcdc8', 0.4),
  frame: MC('#1e2024', 0.4, 0.6),
  fabric: MC('#2f3c37', 1),
  monitor: MC('#121316', 0.42, 0.2),
  keys: M({ map: TEX.keys, roughness: 0.6 }),
  mouse: MC('#1a1b1e', 0.35),
  pad: MC('#202226', 0.95),
  mug: MC('#efede8', 0.3),
  mugDark: MC('#24303a', 0.3),
  paper: MC('#f4f2ec', 0.9),
  tower: MC('#17181b', 0.35, 0.3),
  chairMesh: MC('#18191b', 0.85),
  chairFab: MC('#26282b', 0.95),
  chrome: MC('#d5d8dc', 0.18, 1),
  sofa: MC('#4f5862', 0.95),
  sofaDark: MC('#3f4750', 0.95),
  pillowA: MC('#b9824a', 0.95),
  pillowB: MC('#d9d3c4', 0.95),
  walnut: MC('#5a3a24', 0.5),
  oak: M({ map: TEX.slat, color: '#c09a72', roughness: 0.5 }),
  felt: MC('#1d6b49', 0.95),
  ball: MC('#f2efe6', 0.15),
  stone: MC('#d3d1cc', 0.28),
  cabinet: MC('#e7e5e0', 0.55),
  pot: MC('#8b8984', 0.9),
  soil: MC('#241a12', 1),
  stem: MC('#4b5e33', 0.8),
  leaf: M({ map: TEX.leaf, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7 }),
  rug: M({ map: TEX.rug, roughness: 1 }),
  shade: M({ color: '#efe3cf', emissive: '#ffcf8a', emissiveIntensity: 0.8, roughness: 0.9, side: THREE.DoubleSide }),
  lampGreen: MC('#1f3a2c', 0.4, 0.6),
  water: M({ color: '#7fb6e6', roughness: 0.1, transparent: true, opacity: 0.55 }),
});

/* planta pequena de mesa */
const miniLeaf = new THREE.PlaneGeometry(0.05, 0.12); miniLeaf.translate(0, 0.06, 0);
function miniPlant(x, y, z) {
  S(G.cyl, mat.pot, x, y + 0.05, z, 0, 0, 0, 0.05, 0.1, 0.05);
  S(G.cyl, mat.soil, x, y + 0.098, z, 0, 0, 0, 0.045, 0.005, 0.045, { cast: false });
  for (let k = 0; k < 9; k++) { const a = k * 2.4; SM(miniLeaf, mat.leaf, mtx(x + Math.sin(a) * 0.012, y + 0.1, z + Math.cos(a) * 0.012, -0.25 - (k % 3) * 0.22, a, 0, 1, 0.8 + (k % 4) * 0.12, 1, 'YXZ')); }
}
/* ---------- bancadas de trading: 2 fileiras x 5 posições ---------- */
const ROWS = [{ zb: -3.7 }, { zb: -0.9 }];
const COLS = [-3.2, -1.6, 0, 1.6, 3.2];
const STATIONS = [];
const SCREENS = [];
const monFrameGeo = rbox(0.57, 0.345, 0.028, 0.01, 2);
const monBackGeo = rbox(0.34, 0.22, 0.05, 0.02, 2);
const kbGeo = rbox(0.44, 0.02, 0.14, 0.006, 2);
const mouseGeo = rbox(0.06, 0.03, 0.1, 0.014, 2);
const towerGeo = rbox(0.2, 0.42, 0.44, 0.012, 2);
function makeScreenTex() { return canvasTex(512, 300, null); }
function addMonitor(cx, cy, cz, ry, kind, st) {
  const m = mtx(cx, cy, cz, 0, ry, 0);
  SM(monFrameGeo, mat.monitor, m);
  SM(monBackGeo, mat.monitor, mm(m, 0, -0.01, -0.035));
  const tex = makeScreenTex();
  const sm = M({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.35, roughness: 0.25 });
  const scr = new THREE.Mesh(G.plane, sm);
  scr.position.set(cx, cy, cz); scr.rotation.y = ry; scr.translateZ(0.0146); scr.scale.set(0.55, 0.312, 1);
  GROUPS.main.add(scr);
  SCREENS.push({ tex, kind, st });
}
ROWS.forEach((row, ri) => {
  const zb = row.zb, zc = zb + 0.4, zf = zb + 0.8;
  B(mat.deskTop, 0, 0.725, zc, 8, 0.03, 0.8);
  B(mat.deskEdge, 0, 0.725, zf + 0.002, 8, 0.03, 0.004, { cast: false });
  for (const x of [-3.97, -2.4, -0.8, 0.8, 2.4, 3.97]) {
    B(mat.frame, x, 0.355, zb + 0.12, 0.05, 0.71, 0.05); B(mat.frame, x, 0.355, zb + 0.68, 0.05, 0.71, 0.05);
    B(mat.frame, x, 0.02, zc, 0.06, 0.04, 0.78); B(mat.frame, x, 0.69, zc, 0.05, 0.04, 0.7, { cast: false });
  }
  B(mat.frame, 0, 0.66, zb + 0.16, 7.9, 0.08, 0.18, { cast: false });
  B(mat.fabric, 0, 0.93, zb + 0.02, 8, 0.38, 0.03);
  B(mat.alu, 0, 1.125, zb + 0.02, 8, 0.012, 0.036, { cast: false });
  C(-4.05, 4.05, zb - 0.03, zf + 0.03);
  COLS.forEach((sx, ci) => {
    const st = { i: ri * 5 + ci, row: ri, x: sx, zb, zf, rootZ: zf + 0.4 };
    STATIONS.push(st);
    /* braço duplo de monitor */
    B(mat.frame, sx, 0.78, zb + 0.13, 0.07, 0.08, 0.07);
    S(G.cyl, mat.frame, sx, 0.98, zb + 0.13, 0, 0, 0, 0.017, 0.42, 0.017);
    B(mat.frame, sx, 1.1, zb + 0.15, 0.62, 0.025, 0.03, { cast: false });
    addMonitor(sx - 0.295, 1.13, zb + 0.24, 0.17, 'chart', st);
    addMonitor(sx + 0.295, 1.13, zb + 0.24, -0.17, 'panel', st);
    /* teclado, mouse e mousepad */
    SM(kbGeo, mat.keys, mtx(sx - 0.04, 0.75, zf - 0.17, 0, 0, 0), { cast: false });
    B(mat.pad, sx + 0.33, 0.7415, zf - 0.19, 0.26, 0.003, 0.22, { cast: false });
    SM(mouseGeo, mat.mouse, mtx(sx + 0.33, 0.755, zf - 0.18), { cast: false });
    /* objetos variados */
    if (srand() < 0.6) { const mx = sx + srnd(-0.62, -0.42), mz = zf - srnd(0.2, 0.35), mt = srand() < 0.5 ? mat.mug : mat.mugDark; S(G.cyl, mt, mx, 0.79, mz, 0, 0, 0, 0.04, 0.095, 0.04, { cast: false }); S(new THREE.TorusGeometry(0.025, 0.007, 6, 12), mt, mx + 0.045, 0.79, mz, 0, 0, 0, 1, 1, 1, { cast: false }); }
    if (srand() < 0.55) for (let k = 0; k < 3; k++) S(G.box, mat.paper, sx + 0.5, 0.742 + k * 0.002, zf - 0.32, 0, srnd(-0.3, 0.3), 0, 0.21, 0.002, 0.297, { cast: false });
    if (srand() < 0.35) miniPlant(sx - 0.62, 0.74, zb + 0.32);
    SM(towerGeo, mat.tower, mtx(sx + 0.58, 0.215, zb + 0.32));
  });
});

/* ---------- cadeiras (dinâmicas: saem do lugar quando o trader levanta) ---------- */
const chairGeo = { seat: rbox(0.5, 0.08, 0.48, 0.035), back: rbox(0.46, 0.56, 0.06, 0.03), pad: rbox(0.07, 0.03, 0.24, 0.012) };
function makeChair() {
  const g = new THREE.Group();
  for (let k = 0; k < 5; k++) {
    const a = k * Math.PI * 2 / 5, leg = mesh(G.box, mat.chrome, g, Math.sin(a) * 0.15, 0.075, Math.cos(a) * 0.15, 0, a, 0, 0.04, 0.03, 0.3);
    mesh(G.sph, mat.black, g, Math.sin(a) * 0.29, 0.028, Math.cos(a) * 0.29, 0, 0, 0, 0.028, 0.028, 0.028, false);
    leg.castShadow = false;
  }
  mesh(G.cyl, mat.chrome, g, 0, 0.24, 0, 0, 0, 0, 0.026, 0.3, 0.026);
  mesh(G.box, mat.frame, g, 0, 0.375, 0, 0, 0, 0, 0.2, 0.05, 0.22);
  mesh(chairGeo.seat, mat.chairFab, g, 0, 0.43, 0);
  mesh(G.box, mat.frame, g, 0, 0.55, -0.24, -0.1, 0, 0, 0.05, 0.36, 0.03);
  mesh(chairGeo.back, mat.chairMesh, g, 0, 0.84, -0.27, -0.12, 0, 0);
  for (const s of [1, -1]) { mesh(G.box, mat.frame, g, s * 0.26, 0.54, -0.02, 0, 0, 0, 0.025, 0.2, 0.04); mesh(chairGeo.pad, mat.chairFab, g, s * 0.26, 0.65, 0.0); }
  GROUPS.main.add(g); return g;
}
STATIONS.forEach(st => { st.chair = makeChair(); st.chair.position.set(st.x, 0, st.rootZ - 0.06); st.chair.rotation.y = Math.PI; st.chairT = { x: st.x, z: st.rootZ - 0.06, r: Math.PI }; });

/* ---------- área de lazer ---------- */
/* sofá de 3 lugares encostado na parede da frente (olha para -z) */
SM(rbox(3.0, 0.26, 0.9, 0.04), mat.sofaDark, mtx(-5.1, 0.17, 5.45));
for (const x of [-6.1, -5.1, -4.1]) {
  SM(rbox(0.97, 0.15, 0.64, 0.06), mat.sofa, mtx(x, 0.37, 5.3));
  SM(rbox(0.97, 0.44, 0.2, 0.08), mat.sofa, mtx(x, 0.64, 5.77, 0.12));
}
for (const x of [-6.7, -3.5]) SM(rbox(0.2, 0.62, 0.9, 0.07), mat.sofaDark, mtx(x, 0.33, 5.45));
for (const [x, z] of [[-6.65, 5.08], [-3.55, 5.08], [-6.65, 5.82], [-3.55, 5.82]]) S(G.cyl, mat.walnut, x, 0.025, z, 0, 0, 0, 0.025, 0.05, 0.025);
SM(rbox(0.42, 0.4, 0.14, 0.06), mat.pillowA, mtx(-6.35, 0.6, 5.55, 0.25, 0.3, 0.12));
SM(rbox(0.42, 0.4, 0.14, 0.06), mat.pillowB, mtx(-3.85, 0.6, 5.55, 0.25, -0.35, -0.1));
C(-6.85, -3.35, 4.95, 6);
/* mesa de centro */
SM(rbox(1.2, 0.04, 0.6, 0.012), mat.walnut, mtx(-5.1, 0.4, 4.55));
for (const [dx, dz] of [[-0.54, -0.24], [0.54, -0.24], [-0.54, 0.24], [0.54, 0.24]]) B(mat.frame, -5.1 + dx, 0.19, 4.55 + dz, 0.025, 0.38, 0.025);
B(mat.paper, -5.3, 0.425, 4.5, 0.3, 0.01, 0.22, { cast: false }, 0.3);
S(G.cyl, mat.mugDark, -4.8, 0.47, 4.6, 0, 0, 0, 0.06, 0.12, 0.06);
C(-5.75, -4.45, 4.2, 4.9);
/* poltrona */
{
  const m = mtx(-2.75, 0, 4.45, 0, -Math.PI / 2 - 0.25, 0);
  SM(rbox(0.85, 0.26, 0.8, 0.04), mat.sofaDark, mm(m, 0, 0.17, 0));
  SM(rbox(0.6, 0.14, 0.58, 0.06), mat.sofa, mm(m, 0, 0.37, 0.06));
  SM(rbox(0.85, 0.5, 0.18, 0.08), mat.sofa, mm(m, 0, 0.6, -0.33, -0.12));
  for (const s of [1, -1]) SM(rbox(0.13, 0.55, 0.8, 0.06), mat.sofaDark, mm(m, s * 0.36, 0.3, 0));
  C(-3.2, -2.3, 4.0, 4.9);
}
/* tapete */
mesh(G.plane, mat.rug, GROUPS.main, -4.75, 0.006, 4.6, -Math.PI / 2, 0, 0, 4.4, 2.6, 1, false);
/* luminária de chão */
S(G.cyl, mat.frame, -2.95, 0.015, 5.45, 0, 0, 0, 0.16, 0.03, 0.16);
S(G.cyl, mat.frame, -2.95, 0.8, 5.45, 0, 0, 0, 0.012, 1.56, 0.012);
mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.3, 24, 1, true), mat.shade, GROUPS.main, -2.95, 1.66, 5.45, 0, 0, 0, 1, 1, 1, false);
C(-3.15, -2.75, 5.25, 5.65);

/* mesa de sinuca (centro 8, 9.4) */
{
  const cx = 8, cz = 9.4;
  SM(rbox(2.6, 0.2, 1.4, 0.03), mat.walnut, mtx(cx, 0.66, cz));
  SM(rbox(2.72, 0.08, 0.14, 0.02), mat.walnut, mtx(cx, 0.79, cz - 0.68));
  SM(rbox(2.72, 0.08, 0.14, 0.02), mat.walnut, mtx(cx, 0.79, cz + 0.68));
  SM(rbox(0.14, 0.08, 1.5, 0.02), mat.walnut, mtx(cx - 1.29, 0.79, cz));
  SM(rbox(0.14, 0.08, 1.5, 0.02), mat.walnut, mtx(cx + 1.29, 0.79, cz));
  B(mat.felt, cx, 0.78, cz, 2.46, 0.04, 1.24);
  for (const [dx, dz] of [[-1.21, -0.6], [0, -0.62], [1.21, -0.6], [-1.21, 0.6], [0, 0.62], [1.21, 0.6]]) S(G.cyl, mat.black, cx + dx, 0.8, cz + dz, 0, 0, 0, 0.052, 0.012, 0.052, { cast: false });
  const legGeo = new THREE.LatheGeometry([[0.0, 0], [0.07, 0], [0.07, 0.03], [0.05, 0.08], [0.06, 0.2], [0.045, 0.38], [0.07, 0.5], [0.07, 0.56], [0, 0.56]].map(p => new THREE.Vector2(p[0], p[1])), 16);
  for (const dx of [-1.12, 0, 1.12]) for (const dz of [-0.56, 0.56]) SM(legGeo, mat.walnut, mtx(cx + dx, 0, cz + dz));
  /* bolas: dinâmicas, criadas no módulo da sinuca */
  C(cx - 1.37, cx + 1.37, cz - 0.77, cz + 0.77);
  /* pendentes */
  const domeGeo = new THREE.LatheGeometry([[0.02, 0], [0.09, 0.02], [0.17, 0.09], [0.2, 0.16], [0.2, 0.17], [0.02, 0.17]].map(p => new THREE.Vector2(p[0], 0.17 - p[1])), 24);
  for (const dx of [-0.75, 0, 0.75]) {
    SM(domeGeo, mat.lampGreen, mtx(cx + dx, 1.72, cz), { cast: false });
    S(new THREE.CircleGeometry(0.17, 28), mat.ledWarm, cx + dx, 1.725, cz, Math.PI / 2, 0, 0, 1, 1, 1, { cast: false, recv: false });
    S(G.cyl8, mat.black, cx + dx, 2.55, cz, 0, 0, 0, 0.004, 1.3, 0.004, { cast: false });
  }
}

/* copa: bancada, máquina de café, geladeira, bebedouro */
SM(rbox(0.62, 0.86, 2.8, 0.01), mat.cabinet, mtx(7.67, 0.45, 4.0));
SM(rbox(0.68, 0.04, 2.86, 0.008), mat.stone, mtx(7.65, 0.9, 4.0));
for (let z = 2.75; z <= 5.3; z += 0.7) B(mat.chrome, 7.355, 0.78, z, 0.02, 0.015, 0.16, { cast: false });
SM(rbox(0.42, 0.36, 0.38, 0.03), mat.steel, mtx(7.72, 1.1, 3.35));
B(mat.black, 7.52, 1.0, 3.35, 0.06, 0.12, 0.3);
B(mat.black, 7.5, 0.93, 3.35, 0.12, 0.02, 0.32, { cast: false });
SM(rbox(0.16, 0.36, 0.16, 0.02), mat.black, mtx(7.75, 1.1, 3.75));
for (let k = 0; k < 4; k++) S(G.cyl, k % 2 ? mat.mug : mat.mugDark, 7.62, 0.965, 4.25 + k * 0.11, 0, 0, 0, 0.04, 0.09, 0.04);
S(G.sph, MC('#f0f0ee', 0.4), 7.68, 0.95, 4.85, 0, 0, 0, 0.16, 0.06, 0.16);
for (let k = 0; k < 5; k++) S(G.sph, MC(['#d93a2b', '#f2a227', '#7fb23a'][k % 3], 0.5), 7.62 + Math.sin(k * 2.4) * 0.07, 1.0, 4.85 + Math.cos(k * 2.4) * 0.07, 0, 0, 0, 0.04, 0.04, 0.04);
B(mat.walnut, 7.85, 1.62, 4.0, 0.26, 0.03, 2.4, { group: 'wallRight' });
for (let k = 0; k < 6; k++) S(G.cyl, MC('#e9e4d8', 0.2, 0, { transparent: true, opacity: 0.85 }), 7.85, 1.72, 3.2 + k * 0.3, 0, 0, 0, 0.05, 0.17, 0.05, { group: 'wallRight' });
/* geladeira de verdade: caixa oca, prateleiras, bebidas e porta que abre */
const FRIDGE = { x: 7.27, z: 5.66, open: false, a: 0 };
{
  const white = MC('#eef0f0', 0.5), glassSh = M({ color: '#cfe6ee', roughness: 0.05, transparent: true, opacity: 0.35, depthWrite: false });
  B(mat.steel, 7.955, 0.925, 5.66, 0.03, 1.85, 0.62); B(mat.steel, 7.62, 0.925, 5.365, 0.7, 1.85, 0.03); B(mat.steel, 7.62, 0.925, 5.955, 0.7, 1.85, 0.03);
  B(mat.steel, 7.62, 1.835, 5.66, 0.7, 0.03, 0.62); B(mat.black, 7.62, 0.05, 5.66, 0.7, 0.1, 0.62);
  B(white, 7.935, 0.97, 5.66, 0.01, 1.72, 0.56, { cast: false }); B(white, 7.6, 0.11, 5.66, 0.64, 0.02, 0.56, { cast: false });
  B(white, 7.6, 0.97, 5.383, 0.64, 1.72, 0.01, { cast: false }); B(white, 7.6, 0.97, 5.937, 0.64, 1.72, 0.01, { cast: false }); B(white, 7.6, 1.815, 5.66, 0.64, 0.01, 0.56, { cast: false });
  for (const y of [0.5, 0.88, 1.26]) { B(glassSh, 7.62, y, 5.66, 0.6, 0.008, 0.54, { cast: false }); B(white, 7.33, y, 5.66, 0.02, 0.025, 0.55, { cast: false }); }
  B(M({ color: '#e8f3f6', roughness: 0.1, transparent: true, opacity: 0.45, depthWrite: false }), 7.6, 0.27, 5.66, 0.6, 0.3, 0.52, { cast: false });
  for (let k = 0; k < 5; k++) S(G.sph, MC(['#d93a2b', '#7fb23a', '#f2a227', '#d93a2b', '#7fb23a'][k], 0.5), 7.55 + (k % 3) * 0.1, 0.17, 5.5 + k * 0.07, 0, 0, 0, 0.04, 0.04, 0.04, { cast: false });
  B(MC('#f4f4f2', 0.6), 7.7, 0.62, 5.48, 0.07, 0.22, 0.07); B(MC('#2f6fb3', 0.6), 7.7, 0.62, 5.48, 0.071, 0.06, 0.071, { cast: false });
  B(MC('#f29a2e', 0.6), 7.7, 0.61, 5.58, 0.07, 0.2, 0.07); B(MC('#f6f1e6', 0.6), 7.6, 0.54, 5.72, 0.06, 0.07, 0.06);
  for (let k = 0; k < 6; k++) S(G.cyl, MC(k < 3 ? '#c8202a' : '#c9ced6', 0.3, 0.6), 7.55 + (k % 2) * 0.09, 0.95, 5.47 + Math.floor(k / 2) * 0.08 + (k >= 3 ? 0.2 : 0), 0, 0, 0, 0.033, 0.12, 0.033, { cast: false });
  for (let k = 0; k < 3; k++) S(G.cyl, M({ color: '#2f7d45', roughness: 0.1, transparent: true, opacity: 0.8 }), 7.75, 1.4, 5.47 + k * 0.1, 0, 0, 0, 0.035, 0.26, 0.035, { cast: false });
  S(G.cyl, MC('#1d2a1f', 0.25), 7.62, 1.43, 5.8, 0, 0, 0, 0.045, 0.32, 0.045, { cast: false });
  S(G.cyl, MC('#d9b45a', 0.3, 0.8), 7.62, 1.62, 5.8, 0, 0, 0, 0.02, 0.07, 0.02, { cast: false });
  /* porta (articulada na quina z=5.965) */
  FRIDGE.door = new THREE.Group(); FRIDGE.door.position.set(7.27, 0, 5.965); GROUPS.main.add(FRIDGE.door);
  mesh(rbox(0.05, 1.82, 0.62, 0.015), mat.steel, FRIDGE.door, -0.025, 0.93, -0.31);
  mesh(G.box, white, FRIDGE.door, 0.004, 0.93, -0.31, 0, 0, 0, 0.01, 1.7, 0.56, false);
  for (const y of [0.45, 0.85, 1.25]) {
    mesh(G.box, white, FRIDGE.door, 0.06, y, -0.31, 0, 0, 0, 0.1, 0.012, 0.5, false);
    mesh(G.box, glassSh, FRIDGE.door, 0.11, y + 0.05, -0.31, 0, 0, 0, 0.008, 0.1, 0.5, false);
    for (let k = 0; k < 3; k++) mesh(G.cyl, M({ color: ['#9cc9e8', '#e8e0c8', '#c8202a'][k], roughness: 0.15, transparent: k === 0, opacity: 0.85 }), FRIDGE.door, 0.055, y + 0.11, -0.18 - k * 0.12, 0, 0, 0, 0.03, 0.2, 0.03, false);
  }
  mesh(G.box, mat.chrome, FRIDGE.door, -0.075, 1.12, -0.56, 0, 0, 0, 0.02, 0.5, 0.03);
  for (const y of [0.9, 1.34]) mesh(G.box, mat.chrome, FRIDGE.door, -0.06, y, -0.56, 0, 0, 0, 0.03, 0.02, 0.02, false);
  FRIDGE.light = new THREE.PointLight(0xfff4e2, 0, 1.6, 2); FRIDGE.light.position.set(7.55, 1.55, 5.66); scene.add(FRIDGE.light);
}
function stepFridge(dt) {
  FRIDGE.a = damp(FRIDGE.a, FRIDGE.open ? 1.5 : 0, 5, dt);
  FRIDGE.door.rotation.y = FRIDGE.a;
  FRIDGE.light.intensity = Math.min(1, FRIDGE.a / 0.6) * 1.4;
}
C(7.25, 8, 2.55, 6);
SM(rbox(0.32, 0.92, 0.32, 0.02), MC('#e8e8e6', 0.4), mtx(7.7, 0.46, 1.9));
S(G.cyl, mat.water, 7.7, 1.15, 1.9, 0, 0, 0, 0.13, 0.46, 0.13, { cast: false });
C(7.5, 7.95, 1.72, 2.08);

/* plantas grandes */
function plant(x, z, s = 1, n = 18) {
  const potGeo = new THREE.LatheGeometry([[0, 0], [0.17, 0], [0.2, 0.05], [0.23, 0.45], [0.215, 0.46], [0, 0.46]].map(p => new THREE.Vector2(p[0], p[1])), 24);
  SM(potGeo, mat.pot, mtx(x, 0, z, 0, 0, 0, s, s, s));
  S(G.cyl, mat.soil, x, 0.44 * s, z, 0, 0, 0, 0.2 * s, 0.02, 0.2 * s, { cast: false });
  const lg = new THREE.PlaneGeometry(0.17, 0.36); lg.translate(0, 0.18, 0);
  for (let k = 0; k < 4; k++) S(G.cyl8, mat.stem, x + Math.sin(k * 1.7) * 0.05 * s, (0.45 + 0.5) * s, z + Math.cos(k * 1.7) * 0.05 * s, Math.sin(k) * 0.12, 0, Math.cos(k) * 0.12, 0.012 * s, 1.0 * s, 0.012 * s);
  for (let k = 0; k < n; k++) {
    const h = (0.62 + (k / n) * 0.85) * s, a = k * 2.4 + srand() * 0.5, rr = (0.05 + srand() * 0.06) * s;
    SM(lg, mat.leaf, mtx(x + Math.sin(a) * rr, h, z + Math.cos(a) * rr, -0.55 - srand() * 0.6, a, 0, s * (0.8 + srand() * 0.4), s * (0.8 + srand() * 0.5), 1, 'YXZ'));
  }
  C(x - 0.26 * s, x + 0.26 * s, z - 0.26 * s, z + 0.26 * s);
}
plant(-7.45, -5.45, 1.1); plant(-7.4, -1.55, 1); plant(-7.4, 5.5, 1.15); plant(7.45, -3.75, 1); plant(3.25, 5.55, 1.05); plant(-1.7, 5.55, 0.95); plant(-0.6, 2.55, 0.8, 14);
