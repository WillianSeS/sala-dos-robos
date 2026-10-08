/* ================= 44º andar: bar Las Vegas Night, com palco, mesas e balcão ================= */
/* Sala: x de -4 a 4, z de 14 a 22. Palco no fundo (z ≈ 20,3–21,9), balcão na frente, mesas no meio. */
const SHOW_LAYOUT = {
  stage: { x0: -2.8, x1: 2.8, z0: 20.3, z1: 21.95, y: 0.4 },
  dancers: [[-1.7, 21.05], [0, 21.25], [1.7, 21.05]],
  tables: [[-1.75, 16.4], [1.05, 16.55], [2.75, 18.45], [-0.45, 18.7]],
  bar: { x: 1.6, z: 15.35 },
  walk: [[-2.6, 15.4], [-2.7, 19.4], [0.4, 19.8], [1.9, 19.7], [3.3, 17.2], [2.4, 15.6], [-0.4, 15.4], [0.3, 17.6]],
};
SHOW_LAYOUT.seats = SHOW_LAYOUT.tables.flatMap(([tx, tz], t) => [-0.32, 0.32].map((dx, i) => ({ id: 'show' + t + i, x: tx + dx, z: tz - 0.55, eye: 1.12, yaw: Math.PI })));
const SHOWFX = { chase: [], fixtures: [], stars: null, light: null };
const showMat = {
  wall: M({ color: '#1a1020', roughness: 0.9 }), lacquer: MC('#120a12', 0.25, 0.3), gold: MC('#c9a24a', 0.28, 0.85),
  velvet: MC('#5a0f2a', 0.95), cloth: MC('#20151d', 0.8),
};
const showCarpet = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#3a0b25'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) {
    const k = ((x + y) / 32) % 3;
    g.fillStyle = ['#c9a24a', '#2b5fae', '#d9417d'][k]; g.beginPath(); g.arc(x + 16, y + 16, 7, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#7a2350'; g.lineWidth = 2; g.strokeRect(x + 3, y + 3, 26, 26);
  }
}, { repeat: [4, 4] });
for (const [key, p, n] of [
  ['showLeft', [-4, 1.6, 18], [1, 0, 0]], ['showRight', [4, 1.6, 18], [-1, 0, 0]], ['showBack', [0, 1.6, 22], [0, 0, -1]], ['showFront', [0, 1.6, 14], [0, 0, 1]],
]) { GROUPS[key] = new THREE.Group(); scene.add(GROUPS[key]); WALL_INFO[key] = { p: new THREE.Vector3(...p), n: new THREE.Vector3(...n) }; }
mesh(G.plane, M({ map: showCarpet, roughness: 1 }), GROUPS.main, 0, 0.001, 18, -Math.PI / 2, 0, 0, 8, 8, 1, false);
mesh(G.plane, MC('#0d0a10', 0.9), GROUPS.main, 0, RH, 18, Math.PI / 2, 0, 0, 8, 8, 1, false);
for (const [z, len] of wallRuns(14, 22, 'show')) B(showMat.wall, -4, 1.6, z, 0.08, RH, len, { group: 'showLeft', cast: false });
B(showMat.wall, -4, 2.75, FLOOR.show.z, 0.08, 0.9, CAB.door * 2, { group: 'showLeft', cast: false });
B(showMat.wall, 3.95, 1.6, 18, 0.04, RH, 8, { group: 'showRight', cast: false });
B(showMat.wall, 0, 1.6, 22, 8, RH, 0.08, { group: 'showBack', cast: false });
B(showMat.wall, 0, 1.6, 14.06, 8, RH, 0.04, { group: 'showFront', cast: false });
/* Rodapé dourado e faixa de luz no alto das paredes. */
for (const [x, z, w, d, group] of [[-3.94, 18, 0.02, 8, 'showLeft'], [3.92, 18, 0.02, 8, 'showRight'], [0, 21.94, 8, 0.02, 'showBack'], [0, 14.09, 8, 0.02, 'showFront']]) {
  B(showMat.gold, x, 0.06, z, w, 0.12, d, { group, cast: false });
  B(mat.ledWarm, x, 3.0, z, w, 0.03, d, { group, cast: false });
}

/* Lâmpadas em fila que acendem em sequência (efeito letreiro de cassino). */
function chaseBulbs(points, size = 0.035) {
  const m = new THREE.InstancedMesh(new THREE.SphereGeometry(size, 8, 6), new THREE.MeshBasicMaterial({ toneMapped: false }), points.length);
  const t = new THREE.Object3D();
  points.forEach((p, i) => { t.position.set(...p); t.updateMatrix(); m.setMatrixAt(i, t.matrix); m.setColorAt(i, new THREE.Color('#ffd27a')); });
  m.frustumCulled = false; m.userData.floor = 'show'; GROUPS.main.add(m); SHOWFX.chase.push(m); return m;
}
const showBackdrop = canvasTex(1024, 288, (g, w, h) => {
  const grad = g.createLinearGradient(0, 0, 0, h); grad.addColorStop(0, '#22052e'); grad.addColorStop(1, '#07020c');
  g.fillStyle = grad; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,${200 + Math.random() * 55},${150 + Math.random() * 100},${Math.random()})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  g.textAlign = 'center'; g.shadowColor = '#ff3fb4'; g.shadowBlur = 26;
  g.fillStyle = '#ffe7f6'; g.font = '700 108px ' + FONT_D; g.fillText('LAS VEGAS NIGHT', w / 2, 150);
  g.shadowColor = '#ffcf5a'; g.fillStyle = '#ffd884'; g.font = '700 46px ' + FONT; g.fillText('★  SHOW  ★', w / 2, 232);
});
const { stage } = SHOW_LAYOUT;
B(showMat.lacquer, 0, stage.y / 2, (stage.z0 + stage.z1) / 2, stage.x1 - stage.x0, stage.y, stage.z1 - stage.z0);
B(showMat.gold, 0, stage.y + 0.005, stage.z0 + 0.03, stage.x1 - stage.x0, 0.012, 0.06, { cast: false });
C(stage.x0, stage.x1, stage.z0, 22);
mesh(G.plane, new THREE.MeshBasicMaterial({ map: showBackdrop, toneMapped: false }), GROUPS.main, 0, 1.75, 21.93, 0, Math.PI, 0, 5.2, 1.46, 1, false);
const backdropBulbs = [];
for (let i = 0; i <= 26; i++) { const x = -2.7 + i * 5.4 / 26; backdropBulbs.push([x, 2.53, 21.9], [x, 0.97, 21.9]); }
for (let i = 1; i < 8; i++) { const y = 0.97 + i * 1.56 / 8; backdropBulbs.push([-2.7, y, 21.9], [2.7, y, 21.9]); }
chaseBulbs(backdropBulbs);
chaseBulbs(Array.from({ length: 29 }, (_, i) => [stage.x0 + 0.1 + i * (stage.x1 - stage.x0 - 0.2) / 28, stage.y - 0.08, stage.z0 - 0.015]), 0.028);
/* Treliça com refletores coloridos sobre o palco e cortinas de veludo nas laterais. */
B(mat.aluDark, 0, 2.95, 20.1, 5.6, 0.08, 0.08, { cast: false });
for (let i = 0; i < 5; i++) {
  const x = -2.2 + i * 1.1, can = mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.22, 14), new THREE.MeshBasicMaterial({ color: '#ff4fd8', toneMapped: false }), GROUPS.main, x, 2.8, 20.1, 0.5, 0, 0, 1, 1, 1, false);
  const beam = mesh(new THREE.ConeGeometry(0.55, 2.4, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#ff4fd8', transparent: true, opacity: 0.09, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }), GROUPS.main, x, 1.65, 20.8, -0.45, 0, 0, 1, 1, 1, false);
  SHOWFX.fixtures.push({ can, beam, i });
}
for (const x of [-3.3, 3.3]) { B(showMat.velvet, x, 1.6, 21.6, 1.1, RH, 0.12, { cast: false }); for (let k = 0; k < 5; k++) B(showMat.velvet, x - 0.44 + k * 0.22, 1.6, 21.5, 0.05, RH, 0.06, { cast: false }); }
SHOWFX.light = new THREE.PointLight(0xff4fd8, 5, 10, 2); SHOWFX.light.position.set(0, 2.7, 19.2); scene.add(SHOWFX.light);

/* Balcão do bar na frente, com prateleiras iluminadas e garrafas. */
SM(rbox(3.6, 1.0, 0.6, 0.04), mat.walnut, mtx(1.6, 0.5, 14.62), { cast: false });
SM(rbox(3.7, 0.06, 0.7, 0.025), showMat.gold, mtx(1.6, 1.03, 14.62), { cast: false });
chaseBulbs(Array.from({ length: 24 }, (_, i) => [-0.15 + i * 3.5 / 23, 0.95, 14.93]), 0.022);
C(-0.25, 3.45, 14.2, 15.0);
for (const y of [1.55, 2.05]) {
  B(mat.walnut, 1.6, y, 14.17, 3.4, 0.04, 0.2, { group: 'showFront', cast: false });
  B(mat.ledWarm, 1.6, y - 0.03, 14.24, 3.3, 0.01, 0.02, { group: 'showFront', cast: false });
  for (let i = 0; i < 11; i++) S(G.cyl, i % 3 ? loungeMat.glass : loungeMat.water, 0.2 + i * 0.28, y + 0.14, 14.17, 0, 0, 0, 0.04, 0.24, 0.04, { group: 'showFront', cast: false });
}

/* Mesas redondas com duas cadeiras viradas para o palco. */
for (const [tx, tz] of SHOW_LAYOUT.tables) {
  S(G.cyl, showMat.gold, tx, 0.74, tz, 0, 0, 0, 0.38, 0.03, 0.38);
  S(G.cyl, showMat.cloth, tx, 0.755, tz, 0, 0, 0, 0.36, 0.01, 0.36, { cast: false });
  S(G.cyl, mat.aluDark, tx, 0.37, tz, 0, 0, 0, 0.04, 0.72, 0.04);
  S(G.cyl, mat.aluDark, tx, 0.015, tz, 0, 0, 0, 0.22, 0.03, 0.22, { cast: false });
  S(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 10), mat.ledWarm, tx, 0.79, tz, 0, 0, 0, 1, 1, 1, { cast: false, recv: false });
  C(tx - 0.4, tx + 0.4, tz - 0.4, tz + 0.4);
  for (const dx of [-0.32, 0.32]) {
    const cx = tx + dx, cz = tz - 0.55;
    SM(rbox(0.42, 0.08, 0.42, 0.03), showMat.velvet, mtx(cx, 0.46, cz), {});
    SM(rbox(0.42, 0.5, 0.06, 0.03), showMat.velvet, mtx(cx, 0.74, cz - 0.2), {});
    for (const ex of [-0.17, 0.17]) for (const ez of [-0.17, 0.17]) S(G.cyl, showMat.gold, cx + ex, 0.21, cz + ez, 0, 0, 0, 0.015, 0.42, 0.015, { cast: false });
  }
}
/* Teto estrelado que pisca devagar. */
{
  const n = 60, m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.02, 6, 4), new THREE.MeshBasicMaterial({ toneMapped: false }), n), t = new THREE.Object3D();
  for (let i = 0; i < n; i++) { t.position.set(srnd(-3.8, 3.8), RH - 0.02, srnd(14.3, 21.7)); t.updateMatrix(); m.setMatrixAt(i, t.matrix); m.setColorAt(i, new THREE.Color('#fff1c4')); }
  m.frustumCulled = false; m.userData.floor = 'show'; GROUPS.main.add(m); SHOWFX.stars = m;
}
const _showColor = new THREE.Color();
function stepShowFx(dt, t) {
  const blink = reduceMotion ? 0.6 : 7, step = Math.floor(t * blink);
  for (const m of SHOWFX.chase) {
    for (let i = 0; i < m.count; i++) m.setColorAt(i, _showColor.set((i + step) % 3 === 0 ? '#fff4c2' : '#5a3a12'));
    m.instanceColor.needsUpdate = true;
  }
  for (const f of SHOWFX.fixtures) {
    _showColor.setHSL((t * 0.08 + f.i * 0.2) % 1, 0.9, 0.6); f.can.material.color.copy(_showColor); f.beam.material.color.copy(_showColor);
    f.beam.rotation.z = reduceMotion ? 0 : Math.sin(t * 0.7 + f.i) * 0.35;
  }
  SHOWFX.light.color.setHSL((t * 0.05) % 1, 0.8, 0.6);
  const s = SHOWFX.stars;
  for (let i = 0; i < s.count; i++) s.setColorAt(i, _showColor.setScalar(0.35 + 0.65 * Math.abs(Math.sin(t * (reduceMotion ? 0.2 : 1.3) + i * 1.7))));
  s.instanceColor.needsUpdate = true;
}
