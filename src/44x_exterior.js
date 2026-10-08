/* ================= o hotel visto de fora: torre, letreiro LAS VEGAS NIGHT e luzes ================= */
/* Fica a 700 m das salas: a câmera (alcance de 260 m) nunca vê as duas coisas ao mesmo tempo. */
const EXT = { o: new THREE.Vector3(0, 0, -700), group: new THREE.Group(), chase: [], neon: [], beams: [], beacon: null, w: 44, d: 26, h: 120 };
scene.add(EXT.group);
const extWindows = (lit, cols = 16, rows = 64) => canvasTex(256, 1024, (g, w, h) => {
  g.fillStyle = '#0a0d14'; g.fillRect(0, 0, w, h);
  const cw = w / cols, rh = h / rows;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const on = Math.random() < lit, warm = Math.random() < 0.7;
    g.fillStyle = on ? (warm ? `hsl(${38 + Math.random() * 10},90%,${55 + Math.random() * 20}%)` : `hsl(205,70%,${60 + Math.random() * 15}%)`) : '#141a26';
    g.fillRect(c * cw + 2, r * rh + 3, cw - 4, rh - 6);
  }
});
const extMat = {
  tower: new THREE.MeshBasicMaterial({ map: extWindows(0.55) }),
  side: new THREE.MeshBasicMaterial({ map: extWindows(0.45, 11) }),
  other: new THREE.MeshBasicMaterial({ map: extWindows(0.25), color: '#8a93a6' }),
  dark: new THREE.MeshBasicMaterial({ color: '#07090d' }), ground: new THREE.MeshBasicMaterial({ color: '#0c0d10' }),
  gold: new THREE.MeshBasicMaterial({ color: '#d4a84f' }), glass: new THREE.MeshBasicMaterial({ color: '#ffd9a0' }),
};
function extBox(material, x, y, z, w, h, d) {
  const m = new THREE.Mesh(G.box, material); m.position.set(EXT.o.x + x, y, EXT.o.z + z); m.scale.set(w, h, d); EXT.group.add(m); return m;
}
function extBulbs(points, size = 0.35) {
  const m = new THREE.InstancedMesh(new THREE.SphereGeometry(size, 8, 6), new THREE.MeshBasicMaterial({ toneMapped: false }), points.length), t = new THREE.Object3D();
  points.forEach((p, i) => { t.position.set(EXT.o.x + p[0], p[1], EXT.o.z + p[2]); t.updateMatrix(); m.setMatrixAt(i, t.matrix); m.setColorAt(i, new THREE.Color('#ffd27a')); });
  m.frustumCulled = false; EXT.group.add(m); EXT.chase.push(m); return m;
}
/* Chão, avenida e prédios vizinhos. */
{
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(520, 520), extMat.ground); ground.rotation.x = -Math.PI / 2; ground.position.copy(EXT.o); EXT.group.add(ground);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(520, 22), new THREE.MeshBasicMaterial({ color: '#16181d' })); road.rotation.x = -Math.PI / 2; road.position.set(EXT.o.x, 0.02, EXT.o.z + 40); EXT.group.add(road);
  for (let x = -250; x < 250; x += 8) { const l = new THREE.Mesh(G.plane, new THREE.MeshBasicMaterial({ color: '#c9b46a' })); l.rotation.x = -Math.PI / 2; l.position.set(EXT.o.x + x, 0.03, EXT.o.z + 40); l.scale.set(3, 0.25, 1); EXT.group.add(l); }
  const rnd2 = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  for (let i = 0; i < 26; i++) {
    const a = i / 26 * Math.PI * 2, r = 95 + rnd2() * 70, w = 14 + rnd2() * 16, h = 22 + rnd2() * 55, x = Math.cos(a) * r, z = Math.sin(a) * r * 0.8;
    if ((x * 0.43 + z * 0.9) / Math.hypot(x, z) > 0.55) continue;  /* deixa livre a frente vista pela câmera */
    extBox(extMat.other, x, h / 2, z, w, h, w * 0.8);
  }
  const stars = new THREE.BufferGeometry(), pts = [];
  for (let i = 0; i < 500; i++) { const a = rnd2() * Math.PI * 2, e = 0.15 + rnd2() * 1.2; pts.push(EXT.o.x + Math.cos(a) * 240 * Math.cos(e), 240 * Math.sin(e), EXT.o.z + Math.sin(a) * 240 * Math.cos(e)); }
  stars.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  EXT.group.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: '#cfd8ff', size: 1.2, sizeAttenuation: false })));
}
/* Torre do hotel: pódio, corpo com janelas, coroa com o letreiro. */
{
  const { w, d, h } = EXT;
  extBox(extMat.dark, 0, 7, 0, w + 20, 14, d + 14);
  extBox(extMat.glass, 0, 4, (d + 14) / 2 + 0.05, 14, 6, 0.1);
  const tower = extBox([extMat.side, extMat.side, extMat.dark, extMat.dark, extMat.tower, extMat.tower], 0, 14 + h / 2, 0, w, h, d);
  tower.material.forEach(m => { if (m.map) { m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping; } });
  extBox(extMat.dark, 0, 14 + h + 4, 0, w + 1, 8, d + 1);
  /* Marquise da entrada com lâmpadas. */
  extBox(extMat.gold, 0, 8.5, (d + 14) / 2 + 4, 22, 0.8, 8);
  const marquee = [];
  for (let i = 0; i <= 40; i++) { const x = -11 + i * 22 / 40; marquee.push([x, 8.0, (d + 14) / 2 + 8.05], [x, 9.0, (d + 14) / 2 + 8.05]); }
  extBulbs(marquee, 0.22);
  /* Faixas de neon nos cantos da torre, mudando de cor. */
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const m = extBox(new THREE.MeshBasicMaterial({ color: '#ff3fb4', toneMapped: false }), sx * (w / 2 + 0.25), 14 + h / 2, sz * (d / 2 + 0.25), 0.5, h, 0.5);
    EXT.neon.push(m);
  }
  /* Letreiro nas quatro faces da coroa. */
  const signTex = canvasTex(2048, 420, (g, tw, th) => {
    g.fillStyle = '#12020f'; g.fillRect(0, 0, tw, th);
    g.textAlign = 'center'; g.shadowColor = '#ff2e9a'; g.shadowBlur = 40; g.fillStyle = '#ffe1f2'; g.font = '700 230px ' + FONT_D; g.fillText('LAS VEGAS', tw / 2, 230);
    g.shadowColor = '#ffc24a'; g.fillStyle = '#ffd77a'; g.font = '700 150px ' + FONT; g.fillText('★ NIGHT ★', tw / 2, 385);
  });
  const signMat = new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false }), y = 14 + h + 19, sh = 26;
  for (const [ry, dist, sw] of [[0, d / 2 + 0.6, w + 10], [Math.PI, d / 2 + 0.6, w + 10], [Math.PI / 2, w / 2 + 0.6, d + 10], [-Math.PI / 2, w / 2 + 0.6, d + 10]]) {
    const m = new THREE.Mesh(G.plane, signMat); m.scale.set(sw, sh, 1); m.rotation.y = ry;
    m.position.set(EXT.o.x + Math.sin(ry) * dist, y, EXT.o.z + Math.cos(ry) * dist); EXT.group.add(m);
    const back = new THREE.Mesh(G.box, extMat.dark); back.scale.set(sw + 1, sh + 1, 0.6); back.rotation.y = ry;
    back.position.set(EXT.o.x + Math.sin(ry) * (dist - 0.35), y, EXT.o.z + Math.cos(ry) * (dist - 0.35)); EXT.group.add(back);
    const pts = [], n = Math.round(sw / 1.1);
    for (let i = 0; i <= n; i++) { const u = -sw / 2 + i * sw / n; for (const v of [-sh / 2 - 0.3, sh / 2 + 0.3]) pts.push([Math.sin(ry) * (dist + 0.3) + Math.cos(ry) * u, y + v, Math.cos(ry) * (dist + 0.3) - Math.sin(ry) * u]); }
    for (let i = 1; i < 18; i++) { const v = -sh / 2 + i * sh / 18; for (const u of [-sw / 2 - 0.3, sw / 2 + 0.3]) pts.push([Math.sin(ry) * (dist + 0.3) + Math.cos(ry) * u, y + v, Math.cos(ry) * (dist + 0.3) - Math.sin(ry) * u]); }
    extBulbs(pts);
  }
  /* Farol vermelho no topo e holofotes varrendo o céu. */
  EXT.beacon = extBox(new THREE.MeshBasicMaterial({ color: '#ff2020', toneMapped: false }), 0, 14 + h + 30, 0, 1.2, 1.2, 1.2);
  for (let i = 0; i < 4; i++) {
    const beam = new THREE.Mesh(new THREE.ConeGeometry(4, 120, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#bfe3ff', transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    beam.geometry.translate(0, -60, 0); const pivot = new THREE.Group(); pivot.position.set(EXT.o.x + (i % 2 ? 9 : -9), 14 + h + 8, EXT.o.z + (i < 2 ? 6 : -6));
    beam.rotation.x = Math.PI; pivot.add(beam); EXT.group.add(pivot); EXT.beams.push(pivot);
  }
}
/* Vistas do hotel por fora e do corte por dentro (vista aérea). */
const ORBIT_VIEWS = {
  outside: { target: new THREE.Vector3(EXT.o.x, 60, EXT.o.z), r: 215, th: 0.45, ph: 1.5, min: 120, max: 250 },
  inside: { target: new THREE.Vector3(0, -1.1, 0.6), r: 14, th: 0.78, ph: 0.92, min: 6, max: 22 },
};
const _extColor = new THREE.Color();
function stepExterior(dt, t) {
  if (!EXT.group.visible) return;
  const step = Math.floor(t * (reduceMotion ? 0.8 : 8));
  for (const m of EXT.chase) {
    for (let i = 0; i < m.count; i++) m.setColorAt(i, _extColor.set((i + step) % 4 < 2 ? '#fff1b8' : '#4a2a08'));
    m.instanceColor.needsUpdate = true;
  }
  EXT.neon.forEach((m, i) => m.material.color.setHSL((t * 0.07 + i * 0.25) % 1, 1, 0.55));
  EXT.beacon.visible = (t % 1.6) < 0.25;
  EXT.beams.forEach((p, i) => { p.rotation.z = Math.sin(t * 0.35 + i * 1.7) * 0.5; p.rotation.x = Math.cos(t * 0.27 + i) * 0.35; });
}
