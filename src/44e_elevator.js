/* ================= prédio: um andar por sala, ligados por elevador ================= */
/* As salas não têm mais passagens entre si; cada uma tem a porta do elevador numa parede.
   wx: superfície interna da parede; n: sentido para dentro da sala (no eixo x). */
const FLOORS = [
  { key: 'office', n: 40, name: 'Escritório', sub: 'PREGÃO', wx: 8, dir: -1, z: -4.8, group: 'wallRight' },
  { key: 'games', n: 41, name: 'Sala de jogos', sub: 'SINUCA • 21', wx: 11.96, dir: -1, z: 8, group: 'gamesRight' },
  { key: 'disco', n: 42, name: 'Discoteca', sub: 'PISTA • DJ', wx: -3.96, dir: 1, z: 8, group: 'clubLeft' },
  { key: 'lounge', n: 43, name: 'Lounge', sub: 'COBERTURA', wx: 11.935, dir: -1, z: 16, group: 'loungeRight' },
];
for (const f of FLOORS) { f.x = f.wx + f.dir * 0.7; f.yaw = f.dir < 0 ? Math.PI / 2 : -Math.PI / 2; f.open = 0; f.openUntil = 0; }
const floorAt = (x, z) => z < 6 ? 'office' : z < 14 ? (x < 4 ? 'disco' : 'games') : 'lounge';
const FLOOR = Object.fromEntries(FLOORS.map(f => [f.key, f]));

/* Interior da cabine pintado em perspectiva: aparece quando as portas abrem. */
const elevCabTex = canvasTex(256, 512, (g, w, h) => {
  g.fillStyle = '#1d2226'; g.fillRect(0, 0, w, h);
  const ix = 52, iy = 70, iw = w - 104, ih = h - 150;
  g.fillStyle = '#9aa3a8'; g.beginPath(); g.moveTo(0, 0); g.lineTo(ix, iy); g.lineTo(ix, iy + ih); g.lineTo(0, h); g.fill();
  g.beginPath(); g.moveTo(w, 0); g.lineTo(ix + iw, iy); g.lineTo(ix + iw, iy + ih); g.lineTo(w, h); g.fill();
  g.fillStyle = '#7d878c'; g.fillRect(ix, iy, iw, ih);
  g.fillStyle = '#c4cbcf'; g.fillRect(ix + 8, iy + 8, iw - 16, ih - 16);
  g.fillStyle = '#3a3029'; g.beginPath(); g.moveTo(0, h); g.lineTo(ix, iy + ih); g.lineTo(ix + iw, iy + ih); g.lineTo(w, h); g.fill();
  g.fillStyle = '#fff6e2'; g.beginPath(); g.moveTo(0, 0); g.lineTo(ix, iy); g.lineTo(ix + iw, iy); g.lineTo(w, 0); g.fill();
  g.strokeStyle = '#d9b46a'; g.lineWidth = 6; g.beginPath(); g.moveTo(ix + 10, iy + ih * 0.55); g.lineTo(ix + iw - 10, iy + ih * 0.55); g.stroke();
});
const elevCabMat = new THREE.MeshBasicMaterial({ map: elevCabTex, toneMapped: false, color: '#c9c9c9' });
const elevDoorMat = MC('#9aa1a6', 0.38, 0.45);
for (const f of FLOORS) {
  const { wx, dir, z } = f, at = off => wx + dir * off, ry = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  mesh(G.plane, elevCabMat, GROUPS[f.group], at(0.012), 1.1, z, 0, ry, 0, 1.12, 2.2, 1, false);
  /* Folhas de aço: encolhem para os batentes quando abrem. */
  f.leaves = [-1, 1].map(s => mesh(G.box, elevDoorMat, GROUPS[f.group], at(0.03), 1.1, z + s * 0.28, 0, 0, 0, 0.03, 2.2, 0.56, false));
  f.leaves.forEach((leaf, i) => { leaf.userData.side = i ? 1 : -1; });
  for (const s of [-1, 1]) B(mat.aluDark, at(0.04), 1.16, z + s * 0.62, 0.08, 2.32, 0.1, { group: f.group, cast: false });
  B(mat.aluDark, at(0.04), 2.27, z, 0.08, 0.1, 1.34, { group: f.group, cast: false });
  B(mat.steel, at(0.005), 0.006, z, 0.7, 0.012, 1.14, { group: f.group, cast: false });
  /* Painel de chamada ao lado da porta. */
  B(mat.aluDark, at(0.02), 1.15, z + dir * -0.86, 0.03, 0.3, 0.14, { group: f.group, cast: false });
  for (const dy of [-0.05, 0.06]) S(new THREE.CircleGeometry(0.025, 16), mat.ledWarm, at(0.037), 1.15 + dy, z + dir * -0.86, 0, ry, 0, 1, 1, 1, { group: f.group, cast: false, recv: false });
  /* Indicador do andar acima da porta. */
  const tex = canvasTex(512, 160, (g, w, h) => {
    g.fillStyle = '#0b0c0e'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d9b46a'; g.lineWidth = 4; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = '#ffb347'; g.font = '700 92px ' + FONT; g.textAlign = 'left'; g.fillText(String(f.n), 28, 112);
    g.fillStyle = '#f1e6d0'; g.font = '700 38px ' + FONT; g.fillText(f.name.toUpperCase(), 170, 78);
    g.fillStyle = '#b8a98c'; g.font = '500 26px ' + FONT; g.fillText('ELEVADOR • ' + f.sub, 170, 120);
  });
  mesh(G.plane, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), GROUPS[f.group], at(0.03), 2.58, z, 0, ry, 0, 1.3, 0.4, 1, false);
}
