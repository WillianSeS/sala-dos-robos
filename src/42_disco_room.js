/* ================= sala anexa: discoteca ================= */
const CLUB = { tiles: [], lights: [], beams: [], ball: null, particles: new THREE.Group() };
const clubWall = MC('#171123', 0.85), clubFloor = MC('#100d1c', 0.55);
for (const [key, p, n] of [
  ['clubLeft', [-4, 1.6, 10], [1, 0, 0]], ['clubRight', [4, 1.6, 10], [-1, 0, 0]], ['clubBack', [0, 1.6, 14], [0, 0, -1]],
]) { GROUPS[key] = new THREE.Group(); scene.add(GROUPS[key]); WALL_INFO[key] = { p: new THREE.Vector3(...p), n: new THREE.Vector3(...n) }; }
mesh(G.plane, clubFloor, GROUPS.main, 0, 0, 10, -Math.PI / 2, 0, 0, 8, 8, 1, false);
mesh(G.plane, clubWall, GROUPS.main, 0, RH, 10, Math.PI / 2, 0, 0, 8, 8, 1, false);
B(clubWall, -4, 1.6, 10, 0.08, RH, 8, { group: 'clubLeft', cast: false });
B(clubWall, 4, 1.6, 10, 0.08, RH, 8, { group: 'clubRight', cast: false });
B(clubWall, 0, 1.6, 14, 8, RH, 0.08, { group: 'clubBack', cast: false });
const clubNeon = color => M({ color: '#160d22', emissive: color, emissiveIntensity: 2.2, roughness: 0.7 });
const pinkNeon = clubNeon('#fc59df'), blueNeon = clubNeon('#427aff');
for (const [x, group] of [[-3.95, 'clubLeft'], [3.95, 'clubRight']]) {
  B(x < 0 ? pinkNeon : blueNeon, x, 0.08, 10, 0.04, 0.04, 7.9, { group, cast: false });
  B(x < 0 ? pinkNeon : blueNeon, x, 2.9, 10, 0.04, 0.04, 7.9, { group, cast: false });
  for (const z of [7.3, 9.5, 11.7, 13.7]) B(x < 0 ? pinkNeon : blueNeon, x, 1.5, z, 0.04, 1.5, 0.05, { group, cast: false });
}
for (const x of [-1.12, 1.12]) B(pinkNeon, x, 1.2, 5.94, 0.04, 2.4, 0.04, { group: 'wallFront', cast: false });
function clubSign(text, subtitle, x, y, z, w, h, group = 'main', ry = Math.PI) {
  const tex = canvasTex(768, 256, (g, tw, th) => {
    g.fillStyle = '#130c20'; g.fillRect(0, 0, tw, th);
    g.strokeStyle = '#cc67f4'; g.lineWidth = 5; g.strokeRect(5, 5, tw - 10, th - 10);
    g.textAlign = 'center'; g.fillStyle = '#f1cfff'; g.font = '700 72px ' + FONT; g.fillText(text, tw / 2, 112);
    g.fillStyle = '#8eceff'; g.font = '500 32px ' + FONT; g.fillText(subtitle, tw / 2, 186);
  });
  const m = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  return mesh(G.plane, m, GROUPS[group], x, y, z, 0, ry, 0, w, h, 1, false);
}
clubSign('DISCOTECA', 'ENTRE NA PISTA →', 0, 2.77, 5.93, 1.9, 0.56, 'wallFront');
clubSign('ROBÔ DISCO', 'DANÇA • MÚSICA • BOAS VIBES', 0, 2.25, 13.92, 4.4, 1.3, 'clubBack');
clubSign('SALA DOS ROBÔS', '← VOLTAR AO PREGÃO', 0, 2.76, 6.06, 1.9, 0.56, 'wallFront', 0);
/* pista: cores mudam suavemente, sem estrobo */
B(mat.black, 0, 0.006, 9.8, 4.7, 0.012, 4.5, { cast: false });
for (let row = 0; row < 6; row++) for (let col = 0; col < 6; col++) {
  const hue = (col * 0.11 + row * 0.07) % 1;
  const material = new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(hue, 0.85, 0.26), toneMapped: false });
  const tile = mesh(G.plane, material, GROUPS.main, (col - 2.5) * 0.75, 0.015, 7.92 + row * 0.75, -Math.PI / 2, 0, 0, 0.71, 0.71, 1, false);
  CLUB.tiles.push({ mesh: tile, hue });
}
/* cabine do DJ e caixas de som */
B(mat.black, 0, 0.48, 12.85, 2.8, 0.96, 0.65, { cast: false });
B(pinkNeon, 0, 0.75, 12.51, 2.6, 0.025, 0.025, { cast: false });
for (const x of [-0.65, 0.65]) {
  S(G.cyl, mat.chrome, x, 0.983, 12.85, 0, 0, 0, 0.24, 0.018, 0.24, { cast: false });
  S(G.cyl, mat.black, x, 0.997, 12.85, 0, 0, 0, 0.15, 0.006, 0.15, { cast: false });
}
B(mat.monitor, 0, 1.13, 12.94, 0.48, 0.24, 0.04, { cast: false });
B(blueNeon, 0, 1.13, 12.91, 0.42, 0.18, 0.02, { cast: false });
for (const x of [-3, 3]) {
  B(mat.black, x, 0.8, 12.9, 0.6, 1.6, 0.55, { cast: false });
  for (const y of [0.45, 1.15]) mesh(new THREE.CircleGeometry(0.22, 20), mat.aluDark, GROUPS.main, x, y, 12.615, 0, Math.PI, 0, 1, 1, 1, false);
  C(x - 0.35, x + 0.35, 12.55, 13.25);
}
C(-1.45, 1.45, 12.45, 13.25);
/* bancos laterais para descansar */
for (const x of [-3.45, 3.45]) {
  B(mat.sofaDark, x, 0.2, 10.2, 0.55, 0.4, 2.2, { cast: false });
  B(mat.sofa, x, 0.44, 10.2, 0.6, 0.1, 2.25, { cast: false });
  C(x - 0.32, x + 0.32, 9.05, 11.35);
}
/* globo facetado e dois feixes translúcidos */
CLUB.ball = mesh(new THREE.SphereGeometry(0.31, 20, 12), M({ color: '#d8e3f8', metalness: 1, roughness: 0.12, flatShading: true }), GROUPS.main, 0, 2.62, 9.8, 0, 0, 0, 1, 1, 1, false);
S(G.cyl8, mat.chrome, 0, 3.02, 9.8, 0, 0, 0, 0.012, 0.35, 0.012, { cast: false });
for (const [x, color] of [[-2.7, 0xef48df], [2.7, 0x487dff]]) {
  const light = new THREE.PointLight(color, 9, 7, 2); light.position.set(x, 2.5, 9.8); scene.add(light); CLUB.lights.push(light);
  const cone = mesh(new THREE.ConeGeometry(0.85, 2.5, 24, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.05, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }), GROUPS.main, x, 1.6, 9.8, 0, 0, 0, 1, 1, 1, false);
  CLUB.beams.push(cone);
}
/* pequenos reflexos do globo no chão */
for (let i = 0; i < 16; i++) {
  const angle = i * 2.4, r = 2.5 + (i % 3) * 0.22;
  const reflection = mesh(new THREE.CircleGeometry(0.035, 6), new THREE.MeshBasicMaterial({ color: '#bcd9ff', transparent: true, opacity: 0.35, toneMapped: false }), GROUPS.main, Math.cos(angle) * r, 0.02, 9.8 + Math.sin(angle) * r, -Math.PI / 2, 0, 0, 1, 1, 1, false);
  CLUB.beams.push(reflection);
}
GROUPS.main.add(CLUB.particles);
