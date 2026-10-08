/* ================= lounge separado: bebidas, petiscos e smoking virtual ================= */
const LOUNGE_LAYOUT = {
  hooks: [
    { index: 0, x: 6.5, z: 18, use: { x: 6.5, z: 16.65 }, yaw: Math.PI },
    { index: 1, x: 9, z: 20, use: { x: 9, z: 18.65 }, yaw: Math.PI },
  ],
  seats: [
    { id: 'loungeSideA', type: 'sofa', name: 'Sofá do lounge', x: 4.95, z: 17.5, eye: 1.08, yaw: -Math.PI / 2 },
    { id: 'loungeSideB', type: 'sofa', name: 'Sofá do lounge', x: 4.95, z: 18.5, eye: 1.08, yaw: -Math.PI / 2 },
    { id: 'loungeBackA', type: 'sofa', name: 'Sofá do lounge', x: 8.35, z: 21.3, eye: 1.08, yaw: 0 },
    { id: 'loungeBackB', type: 'sofa', name: 'Sofá do lounge', x: 9.4, z: 21.3, eye: 1.08, yaw: 0 },
  ],
  entry: { x: 11.26, z: 16 }, hub: { x: 10.5, z: 17 },
};
const LOUNGE_VISUAL = { smoke: [], embers: [] };
const loungeMat = {
  wall: M({ color: '#253039', map: TEX.plaster, roughness: 0.94 }),
  leather: MC('#293c45', 0.78), leatherSide: MC('#1a2b34', 0.86),
  brass: MC('#b99655', 0.3, 0.78), bronze: MC('#786343', 0.43, 0.7),
  marble: MC('#e1d7c4', 0.38), glass: M({ color: '#83abb3', roughness: 0.15, metalness: 0.05, transparent: true, opacity: 0.48, depthWrite: false }),
  water: M({ color: '#4c9199', roughness: 0.2, transparent: true, opacity: 0.7, depthWrite: false }),
  clay: MC('#764d38', 0.92), hose: MC('#29212a', 0.76), rug: MC('#805b46', 1),
  warm: M({ color: '#4a3321', emissive: '#f3bf72', emissiveIntensity: 1.8, roughness: 0.65 }),
  olive: MC('#779448', 0.62), pastry: MC('#d8a05f', 0.96), cream: MC('#f2e4c9', 0.9),
};
for (const [key, p, n] of [
  ['loungeLeft', [4, 1.6, 18], [1, 0, 0]], ['loungeRight', [12, 1.6, 18], [-1, 0, 0]], ['loungeBack', [8, 1.6, 22], [0, 0, -1]],
]) { GROUPS[key] = new THREE.Group(); scene.add(GROUPS[key]); WALL_INFO[key] = { p: new THREE.Vector3(...p), n: new THREE.Vector3(...n) }; }
mesh(G.plane, mat.wood, GROUPS.main, 8, 0, 18, -Math.PI / 2, 0, 0, 8, 8, 1, false);
mesh(G.plane, mat.ceiling, GROUPS.main, 8, RH, 18, Math.PI / 2, 0, 0, 8, 8, 1, false);
B(loungeMat.wall, 4, 1.6, 18, 0.08, RH, 8, { group: 'loungeLeft', cast: false });
B(loungeMat.wall, 12, 1.6, 18, 0.08, RH, 8, { group: 'loungeRight', cast: false });
B(loungeMat.wall, 8, 1.6, 22, 8, RH, 0.08, { group: 'loungeBack', cast: false });
// Painéis de madeira, rodapés e filetes de latão deixam o ambiente acolhedor.
for (const [x, group] of [[4.045, 'loungeLeft'], [11.955, 'loungeRight']]) {
  B(mat.walnut, x, 0.46, 18, 0.04, 0.86, 7.9, { group, cast: false });
  B(loungeMat.brass, x, 0.91, 18, 0.05, 0.025, 7.9, { group, cast: false });
  B(mat.base, x, 0.055, 18, 0.06, 0.11, 7.9, { group, cast: false });
  B(loungeMat.warm, x, 2.98, 18, 0.035, 0.02, 7.8, { group, cast: false });
}
B(mat.walnut, 8, 0.46, 21.95, 7.9, 0.86, 0.04, { group: 'loungeBack', cast: false });
B(loungeMat.brass, 8, 0.91, 21.945, 7.9, 0.025, 0.05, { group: 'loungeBack', cast: false });
B(mat.base, 8, 0.055, 21.945, 7.9, 0.11, 0.06, { group: 'loungeBack', cast: false });
clubSign('ROBOT LOUNGE', 'PAUSA • MÚSICA • BOA COMPANHIA', 8, 2.33, 21.92, 4.4, 0.95, 'loungeBack');
// Dois cantos de descanso; o corredor x=10,5 leva ao elevador.
function loungeSofa(x, z, yaw, w) {
  const m = mtx(x, 0, z, 0, yaw, 0);
  const part = (geo, material, px, py, pz) => SM(geo, material, m.clone().multiply(mtx(px, py, pz)), { cast: false });
  part(rbox(w, 0.28, 0.8, 0.05), loungeMat.leatherSide, 0, 0.2, 0);
  part(rbox(w - 0.2, 0.17, 0.68, 0.05), loungeMat.leather, 0, 0.42, -0.035);
  part(rbox(w - 0.22, 0.58, 0.18, 0.04), loungeMat.leather, 0, 0.65, 0.31);
  for (const s of [-1, 1]) {
    part(rbox(0.14, 0.6, 0.81, 0.05), loungeMat.leatherSide, s * (w / 2 - 0.07), 0.35, 0);
  }
  // Os pés de metal e a costura estão incorporados à malha estática.
  for (const px of [-w / 2 + 0.17, w / 2 - 0.17]) for (const pz of [-0.27, 0.27])
    SM(G.cyl, loungeMat.brass, m.clone().multiply(mtx(px, 0.055, pz, 0, 0, 0, 0.018, 0.11, 0.018)), { cast: false });
  for (const px of [-0.5, 0.5]) part(rbox(0.34, 0.33, 0.13, 0.04), mat.pillowA, px, 0.69, 0.18);
}
loungeSofa(4.95, 18, -Math.PI / 2, 2.55);
C(4.51, 5.39, 16.65, 19.35);
loungeSofa(8.78, 21.3, 0, 2.6);
C(7.42, 10.14, 20.85, 21.75);
// Tapetes texturizados ficam abaixo das mesas, sem degraus ou bloqueios.
for (const [x, z, w, d] of [[6.18, 18, 3.55, 3.5], [8.85, 20.2, 3.1, 3.15]]) {
  B(loungeMat.rug, x, 0.004, z, w, 0.008, d, { cast: false });
  B(mat.pillowA, x, 0.009, z - d / 2 + 0.08, w - 0.12, 0.004, 0.025, { cast: false });
  B(mat.pillowA, x, 0.009, z + d / 2 - 0.08, w - 0.12, 0.004, 0.025, { cast: false });
}
const hookGlassGeo = new THREE.LatheGeometry([
  new THREE.Vector2(0.08, 0), new THREE.Vector2(0.135, 0.025), new THREE.Vector2(0.16, 0.09),
  new THREE.Vector2(0.155, 0.18), new THREE.Vector2(0.115, 0.25), new THREE.Vector2(0.055, 0.29), new THREE.Vector2(0.045, 0.34),
], 24);
const hookBowlGeo = new THREE.LatheGeometry([
  new THREE.Vector2(0.033, 0), new THREE.Vector2(0.035, 0.045), new THREE.Vector2(0.085, 0.08),
  new THREE.Vector2(0.095, 0.14), new THREE.Vector2(0.075, 0.14), new THREE.Vector2(0.061, 0.09),
], 24);
for (const hook of LOUNGE_LAYOUT.hooks) {
  const { x, z } = hook;
  SM(rbox(1.35, 0.085, 1.05, 0.06), loungeMat.marble, mtx(x, 0.52, z), { cast: false });
  SM(rbox(1.4, 0.07, 1.1, 0.05), mat.walnut, mtx(x, 0.455, z), { cast: false });
  for (const dx of [-0.52, 0.52]) for (const dz of [-0.36, 0.36]) S(G.cyl, loungeMat.bronze, x + dx, 0.22, z + dz, 0, 0, 0, 0.026, 0.44, 0.026, { cast: false });
  C(x - 0.73, x + 0.73, z - 0.58, z + 0.58);
  // Vaso de vidro, água, haste de metal, prato, tigela e mangueira flexível.
  const hx = x - 0.17, hz = z;
  S(hookGlassGeo, loungeMat.glass, hx, 0.566, hz, 0, 0, 0, 1, 1, 1, { cast: false });
  S(G.cyl, loungeMat.water, hx, 0.643, hz, 0, 0, 0, 0.127, 0.12, 0.127, { cast: false });
  S(G.cyl, loungeMat.brass, hx, 0.945, hz, 0, 0, 0, 0.025, 0.3, 0.025, { cast: false });
  for (const y of [0.894, 0.957, 1.02, 1.064]) S(G.cyl, loungeMat.brass, hx, y, hz, 0, 0, 0, 0.04, 0.022, 0.04, { cast: false });
  S(G.cyl, loungeMat.bronze, hx, 1.077, hz, 0, 0, 0, 0.135, 0.018, 0.135, { cast: false });
  S(hookBowlGeo, loungeMat.clay, hx, 1.095, hz, 0, 0, 0, 1, 1, 1, { cast: false });
  S(G.cyl, mat.aluDark, hx, 1.231, hz, 0, 0, 0, 0.078, 0.009, 0.078, { cast: false });
  const ember = mesh(rbox(0.033, 0.018, 0.032, 0.004), M({ color: '#352a26', emissive: '#e37939', emissiveIntensity: 0.05, roughness: 0.98 }), GROUPS.main, hx + 0.025, 1.247, hz, 0.08, 0.4, 0, 1, 1, 1, false);
  LOUNGE_VISUAL.embers.push(ember);
  const hosePoints = [
    [hx + 0.015, 0.882, hz + 0.018], [x + 0.12, 0.86, z + 0.07], [x + 0.49, 0.59, z + 0.25],
    [x + 0.51, 0.58, z + 0.46], [x + 0.23, 0.582, z + 0.45], [x + 0.16, 0.64, z + 0.35],
  ].map(v => new THREE.Vector3(...v));
  SM(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hosePoints), 36, 0.014, 8, false), loungeMat.hose, mtx(), { cast: false });
  const nozzleStart = hosePoints[hosePoints.length - 1], nozzleEnd = new THREE.Vector3(x + 0.16, 0.74, z + 0.26);
  const nozzleDir = nozzleEnd.clone().sub(nozzleStart), nozzleMid = nozzleStart.clone().add(nozzleEnd).multiplyScalar(0.5);
  const nozzleM = new THREE.Matrix4().compose(nozzleMid, new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), nozzleDir.clone().normalize()), new THREE.Vector3(0.011, nozzleDir.length(), 0.011));
  SM(G.cyl, loungeMat.brass, nozzleM, { cast: false });
  // Petiscos em pequenas tigelas, um copo e um guardanapo na mesa.
  S(G.cyl, loungeMat.cream, x + 0.36, 0.59, z - 0.26, 0, 0, 0, 0.1, 0.055, 0.1, { cast: false });
  for (let i = 0; i < 6; i++) S(G.sph, loungeMat.olive, x + 0.36 + Math.cos(i * 2.4) * 0.056, 0.625, z - 0.26 + Math.sin(i * 2.4) * 0.056, 0, 0, 0, 0.025, 0.022, 0.025, { cast: false });
  B(mat.paper, x + 0.42, 0.568, z + 0.02, 0.16, 0.004, 0.18, { cast: false }, 0.18);
}
// Pequeno bar com frutas, louça e bebidas cenográficas no fundo à esquerda.
SM(rbox(1.65, 0.88, 0.64, 0.035), mat.walnut, mtx(5.1, 0.44, 20.5), { cast: false });
SM(rbox(1.73, 0.065, 0.72, 0.025), loungeMat.marble, mtx(5.1, 0.908, 20.5), { cast: false });
B(loungeMat.brass, 5.1, 0.82, 20.865, 1.5, 0.035, 0.025, { cast: false });
C(4.22, 6, 20.08, 20.92);
for (const y of [1.38, 1.96]) {
  B(mat.walnut, 4.23, y, 20.47, 0.38, 0.055, 1.68, { group: 'loungeLeft', cast: false });
  B(loungeMat.warm, 4.37, y - 0.045, 20.47, 0.025, 0.012, 1.55, { group: 'loungeLeft', cast: false });
  for (const [i, dz] of [-0.5, 0, 0.5].entries()) {
    S(G.cyl, i % 2 ? loungeMat.water : loungeMat.glass, 4.23, y + 0.125, 20.47 + dz, 0, 0, 0, 0.045, 0.21, 0.045, { group: 'loungeLeft', cast: false });
    S(G.cyl, loungeMat.brass, 4.23, y + 0.266, 20.47 + dz, 0, 0, 0, 0.02, 0.07, 0.02, { group: 'loungeLeft', cast: false });
  }
}
for (const dx of [-0.48, -0.2, 0.06]) S(G.cyl, loungeMat.cream, 5.1 + dx, 0.966, 20.4, 0, 0, 0, 0.051, 0.09, 0.051, { cast: false });
S(G.cyl, loungeMat.brass, 5.55, 0.968, 20.5, 0, 0, 0, 0.17, 0.046, 0.17, { cast: false });
for (let i = 0; i < 4; i++) S(G.sph, i % 2 ? loungeMat.olive : loungeMat.pastry, 5.55 + Math.cos(i * 2.4) * 0.09, 1.017, 20.5 + Math.sin(i * 2.4) * 0.08, 0, 0, 0, 0.05, 0.048, 0.05, { cast: false });
// Caixas discretas de música e abajures: sem novas sombras dinâmicas.
for (const [x, z, group] of [[4.12, 15.6, 'loungeLeft'], [11.88, 20.6, 'loungeRight']]) {
  B(mat.black, x, 2.35, z, 0.16, 0.34, 0.23, { group, cast: false });
  B(loungeMat.brass, x, 2.18, z, 0.18, 0.018, 0.25, { group, cast: false });
}
for (const [x, z] of [[6.5, 18], [9, 20], [10.5, 15.5]]) {
  S(G.cyl, loungeMat.brass, x, 2.75, z, 0, 0, 0, 0.035, 0.68, 0.035, { cast: false });
  S(new THREE.CylinderGeometry(0.1, 0.28, 0.18, 24, 1, true), loungeMat.brass, x, 2.4, z, 0, 0, 0, 1, 1, 1, { cast: false });
  S(G.cyl, loungeMat.warm, x, 2.31, z, 0, 0, 0, 0.245, 0.018, 0.245, { cast: false, recv: false });
  spot(x, 2.3, z, x, 0.45, z, 12, 1.13, 0xffcb8e, false);
}
const loungeLight = new THREE.PointLight(0xffd9ad, 5.5, 11, 2); loungeLight.position.set(8, 2.78, 18.4); scene.add(loungeLight);
// Sprites leves: apenas uma pequena nuvem enquanto a ação virtual estiver ativa.
const loungeSmokeTexture = canvasTex(64, 64, (g, w, h) => {
  const gradient = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  gradient.addColorStop(0, 'rgba(238,233,228,0.8)'); gradient.addColorStop(0.35, 'rgba(221,219,216,0.35)'); gradient.addColorStop(1, 'rgba(210,208,206,0)');
  g.fillStyle = gradient; g.fillRect(0, 0, w, h);
});
for (const hook of LOUNGE_LAYOUT.hooks) {
  const group = new THREE.Group(); group.visible = false; GROUPS.main.add(group);
  const puffs = [];
  for (let i = 0; i < 10; i++) {
    const puff = new THREE.Sprite(new THREE.SpriteMaterial({ map: loungeSmokeTexture, color: 0xd8d6d4, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    puff.position.set(hook.x - 0.17, 1.28, hook.z); puff.scale.set(0.11, 0.11, 1);
    group.add(puff); puffs.push(puff);
  }
  LOUNGE_VISUAL.smoke.push({ group, puffs, x: hook.x - 0.17, z: hook.z, fade: 0 });
}
function stepLoungeVisual(dt, t) {
  const hosp = typeof HOSP !== 'undefined' ? HOSP : null;
  const now = performance.now() / 1000;
  const selected = hosp ? (hosp.hookIndex ?? hosp.hook?.index ?? 0) : -1;
  for (const [index, smoke] of LOUNGE_VISUAL.smoke.entries()) {
    const ownActive = !!hosp && hosp.smokingUntil > now && selected === index;
    const robotActive = typeof robots !== 'undefined' && robots.some(r => r.smokingUntil > now && r.hookIndex === index);
    const visitorActive = typeof MP !== 'undefined' && [...MP.vis.values()].some(v => v.smokingUntil > now && v.hookIndex === index);
    const active = ownActive || robotActive || visitorActive;
    smoke.fade = damp(smoke.fade, active ? 1 : 0, active ? 7 : 3.8, dt);
    smoke.group.visible = smoke.fade > 0.015;
    LOUNGE_VISUAL.embers[index].material.emissiveIntensity = 0.05 + smoke.fade * 0.7;
    if (!smoke.group.visible) continue;
    for (let i = 0; i < smoke.puffs.length; i++) {
      const phase = (t * (reduceMotion ? 0.22 : 0.38) + i / smoke.puffs.length) % 1;
      const size = 0.11 + phase * 0.46;
      const puff = smoke.puffs[i];
      puff.position.set(smoke.x + Math.sin(t * 0.6 + i * 1.9) * phase * 0.16, 1.28 + phase * 0.83, smoke.z + Math.cos(t * 0.42 + i * 1.4) * phase * 0.13);
      puff.scale.set(size, size * 0.9, 1);
      puff.material.opacity = Math.sin(phase * Math.PI) * 0.18 * smoke.fade;
      puff.material.rotation = Math.sin(t * 0.22 + i) * 0.35;
    }
  }
}
