/* ================= elevador: portas, cabine e indicadores de andar ================= */
/* A cabine fica atrás do vão da parede. Materiais com brilho próprio dispensam luzes extras. */
const elevSteelTex = canvasTex(128, 256, (g, w, h) => {
  const grad = g.createLinearGradient(0, 0, w, 0); grad.addColorStop(0, '#8e979c'); grad.addColorStop(0.5, '#b9c0c4'); grad.addColorStop(1, '#8a9398');
  g.fillStyle = grad; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 2) { g.fillStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.05})`; g.fillRect(x, 0, 1, h); }
  g.fillStyle = '#6c757a'; g.fillRect(0, h * 0.5 - 1, w, 2);
});
const elevFloorTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#2b2622'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${200 + Math.random() * 55},${180 + Math.random() * 50},150,${Math.random() * 0.12})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
});
const selfLit = (tex, k) => M({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: k, roughness: 0.45, metalness: 0.1 });
const elevMat = {
  steel: selfLit(elevSteelTex, 0.55), floor: selfLit(elevFloorTex, 0.35),
  ceiling: M({ color: '#2a2c2e', emissive: '#fff4de', emissiveIntensity: 1.6, roughness: 0.9 }),
  brass: M({ color: '#b99655', emissive: '#4a3a1e', roughness: 0.3, metalness: 0.7 }),
};
function elevDisplayDraw(f, n, arrow = '') {
  const g = f.display.userData.g, w = 256, h = 96;
  g.fillStyle = '#060708'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffb347'; g.font = '700 64px ' + FONT; g.textAlign = 'center'; g.fillText(arrow + n, w / 2, 70);
  f.display.needsUpdate = true;
}
for (const f of FLOORS) {
  const { wx, dir, z } = f, at = off => wx + dir * off, out = off => wx - dir * off, ry = dir > 0 ? Math.PI / 2 : -Math.PI / 2, o = { group: f.group, cast: false };
  /* Cabine: piso, teto iluminado, fundo, laterais e corrimão. */
  B(elevMat.floor, out(CAB.depth / 2), 0.0, z, CAB.depth, 0.02, CAB.half * 2, o);
  B(elevMat.ceiling, out(CAB.depth / 2), 2.46, z, CAB.depth, 0.03, CAB.half * 2, o);
  B(elevMat.steel, out(CAB.depth + 0.02), 1.23, z, 0.04, 2.46, CAB.half * 2 + 0.08, o);
  for (const s of [-1, 1]) B(elevMat.steel, out(CAB.depth / 2), 1.23, z + s * (CAB.half + 0.02), CAB.depth, 2.46, 0.04, o);
  B(elevMat.steel, out(0.06), 2.38, z, 0.04, 0.16, CAB.half * 2, o);
  S(G.cyl, elevMat.brass, out(CAB.depth - 0.05), 0.95, z, Math.PI / 2, 0, 0, 0.02, CAB.half * 1.7, 0.02, o);
  for (const s of [-1, 1]) S(G.cyl, elevMat.brass, out(0.9), 0.95, z + s * (CAB.half - 0.05), 0, 0, Math.PI / 2, 0.02, 1.1, 0.02, o);
  /* Botoeira na lateral, perto da porta, e visor do andar acima da porta, por dentro. */
  B(mat.aluDark, out(0.35), 1.2, z - dir * (CAB.half - 0.01), 0.16, 0.42, 0.02, o);
  for (let i = 0; i < FLOORS.length; i++) S(new THREE.CircleGeometry(0.018, 14), mat.ledWarm, out(0.35), 1.06 + i * 0.09, z - dir * (CAB.half - 0.025), 0, dir < 0 ? Math.PI : 0, 0, 1, 1, 1, { ...o, recv: false });
  f.display = canvasTex(256, 96, null);
  mesh(G.plane, new THREE.MeshBasicMaterial({ map: f.display, toneMapped: false }), GROUPS[f.group], out(0.09), 2.2, z, 0, -ry, 0, 0.42, 0.16, 1, false);
  elevDisplayDraw(f, f.n);
  /* Portas de aço no lado da sala: encolhem para os batentes quando abrem. */
  f.leaves = [-1, 1].map(s => mesh(G.box, elevMat.steel, GROUPS[f.group], at(0.03), 1.15, z + s * 0.28, 0, 0, 0, 0.03, 2.3, 0.56, false));
  f.leaves.forEach((leaf, i) => { leaf.userData.side = i ? 1 : -1; });
  for (const s of [-1, 1]) B(mat.aluDark, at(0.04), 1.16, z + s * 0.62, 0.08, 2.32, 0.1, o);
  B(mat.aluDark, at(0.04), 2.32, z, 0.08, 0.06, 1.34, o);
  B(mat.steel, at(0.005), 0.006, z, 0.7, 0.012, 1.14, o);
  /* Botão de chamada ao lado da porta e indicador do andar acima dela. */
  B(mat.aluDark, at(0.02), 1.15, z + dir * -0.86, 0.03, 0.3, 0.14, o);
  for (const dy of [-0.05, 0.06]) S(new THREE.CircleGeometry(0.025, 16), mat.ledWarm, at(0.037), 1.15 + dy, z + dir * -0.86, 0, ry, 0, 1, 1, 1, { ...o, recv: false });
  const tex = canvasTex(512, 160, (g, w, h) => {
    g.fillStyle = '#0b0c0e'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d9b46a'; g.lineWidth = 4; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = '#ffb347'; g.font = '700 92px ' + FONT; g.textAlign = 'left'; g.fillText(String(f.n), 28, 112);
    g.fillStyle = '#f1e6d0'; g.font = '700 38px ' + FONT; g.fillText(f.name.toUpperCase(), 170, 78);
    g.fillStyle = '#b8a98c'; g.font = '500 26px ' + FONT; g.fillText('ELEVADOR • ' + f.sub, 170, 120);
  });
  mesh(G.plane, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), GROUPS[f.group], at(0.03), 2.62, z, 0, ry, 0, 1.3, 0.4, 1, false);
}
