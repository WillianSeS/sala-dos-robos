/* ================= dardos: alvo e vitrine na sala de jogos ================= */
const DARTS_LAYOUT = { x: 11.91, y: 1.72, z: 11, radius: .5, scoreRadius: .42, stand: { x: 9.6, z: 11 } };
const DARTS_NUMBERS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const DARTS_VISUAL = { darts: new THREE.Group(), board: null, pick: null, aim: null, awards: [] };
GROUPS.gamesRight.add(DARTS_VISUAL.darts);
const dartBack = MC('#101b23', .87), dartRim = MC('#5f7280', .33, .7);
B(dartBack, 11.955, 1.72, 11, .038, 1.35, 1.25, { group: 'gamesRight', cast: false });
S(new THREE.TorusGeometry(.504, .012, 8, 80), dartRim, 11.921, 1.72, 11, 0, -Math.PI / 2, 0, 1, 1, 1, { group: 'gamesRight', cast: false });
const dartTex = canvasTex(1024, 1024, (g, w, h) => {
  const c = w / 2, r = w * .42, full = w * .5;
  g.fillStyle = '#121b20'; g.fillRect(0, 0, w, h);
  g.save(); g.translate(c, c);
  for (let i = 0; i < 20; i++) {
    const a = -Math.PI / 2 + (i - .5) * Math.PI / 10, b = a + Math.PI / 10;
    g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r, a, b); g.closePath();
    g.fillStyle = i % 2 ? '#ebe1c8' : '#18232a'; g.fill();
    for (const [inner, outer] of [[.582, .629], [.953, 1]]) {
      g.beginPath(); g.arc(0, 0, r * outer, a, b); g.arc(0, 0, r * inner, b, a, true); g.closePath();
      g.fillStyle = i % 2 ? '#236d55' : '#b13835'; g.fill();
    }
    const t = -Math.PI / 2 + i * Math.PI / 10;
    g.fillStyle = '#f5f0df'; g.font = '600 45px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(DARTS_NUMBERS[i], Math.cos(t) * full * .935, Math.sin(t) * full * .935);
  }
  g.strokeStyle = '#aeb5ac'; g.lineWidth = 1.7;
  for (const scale of [.0935, .582, .629, .953, 1]) { g.beginPath(); g.arc(0, 0, r * scale, 0, Math.PI * 2); g.stroke(); }
  for (let i = 0; i < 20; i++) {
    const a = -Math.PI / 2 + (i - .5) * Math.PI / 10;
    g.beginPath(); g.moveTo(Math.cos(a) * r * .0935, Math.sin(a) * r * .0935); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); g.stroke();
  }
  for (const [scale, color] of [[.0935, '#236d55'], [.0374, '#b13835']]) {
    g.beginPath(); g.arc(0, 0, r * scale, 0, Math.PI * 2); g.fillStyle = color; g.fill(); g.stroke();
  }
  g.restore();
});
DARTS_VISUAL.board = mesh(new THREE.CircleGeometry(.5, 80), new THREE.MeshBasicMaterial({ map: dartTex, toneMapped: false }), GROUPS.gamesRight, DARTS_LAYOUT.x, DARTS_LAYOUT.y, DARTS_LAYOUT.z, 0, -Math.PI / 2, 0, 1, 1, 1, false);
// Painel real: o Raycaster alcança também a borda para contabilizar erros.
DARTS_VISUAL.pick = mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }), GROUPS.gamesRight, DARTS_LAYOUT.x - .004, DARTS_LAYOUT.y, DARTS_LAYOUT.z, 0, -Math.PI / 2, 0, 1, 1, 1, false);
DARTS_VISUAL.aim = new THREE.Group(); GROUPS.gamesRight.add(DARTS_VISUAL.aim);
const dartAimMat = new THREE.MeshBasicMaterial({ color: '#8bfcdf', transparent: true, opacity: .95, depthTest: false, toneMapped: false });
mesh(new THREE.RingGeometry(.011, .014, 24), dartAimMat, DARTS_VISUAL.aim, 0, 0, 0, 0, -Math.PI / 2, 0, 1, 1, 1, false);
for (const [dy, dz, h, d] of [[0, -.023, .003, .012], [0, .023, .003, .012], [-.023, 0, .012, .003], [.023, 0, .012, .003]]) mesh(G.box, dartAimMat, DARTS_VISUAL.aim, 0, dy, dz, 0, 0, 0, .002, h, d, false);
DARTS_VISUAL.aim.visible = false;
clubSign('DARDOS', '9 LANÇAMENTOS • PRÊMIOS VIRTUAIS', 11.89, 2.58, 11, 1.48, .42, 'gamesRight', -Math.PI / 2);
B(M({ color: '#163d36', emissive: '#35dcb2', emissiveIntensity: .8, roughness: .8 }), 9.6, .014, 11, .028, .02, 1.25, { cast: false });
spot(10.95, 3.08, 11, 11.91, 1.72, 11, 10, .53, 0xffefd5, false);
/* Vitrine de troféus: encostada à parede, fora do caminho do lounge. */
B(mat.walnut, 11.74, .78, 12.97, .35, .10, 1.35, { group: 'gamesRight' });
B(dartBack, 11.91, 1.17, 12.97, .08, .7, 1.40, { group: 'gamesRight', cast: false });
C(11.53, 12, 12.26, 13.68);
for (const [i, color] of ['#cb8b55', '#ccdbe0', '#eec552'].entries()) {
  const z = 12.52 + i * .45, metal = M({ color, roughness: .23, metalness: .85 });
  S(G.cyl, dartBack, 11.66, .87, z, 0, 0, 0, .085, .07, .085, { group: 'gamesRight' });
  S(G.cyl, metal, 11.66, .96, z, 0, 0, 0, .023, .13, .023, { group: 'gamesRight' });
  S(new THREE.CylinderGeometry(.098, .043, .14, 24), metal, 11.66, 1.09, z, 0, 0, 0, 1, 1, 1, { group: 'gamesRight' });
  for (const dz of [-.095, .095]) S(new THREE.TorusGeometry(.049, .01, 8, 18), metal, 11.66, 1.085, z + dz, 0, Math.PI / 2, 0, 1, 1, 1, { group: 'gamesRight' });
  const glow = mesh(new THREE.CircleGeometry(.044, 20), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .2, toneMapped: false }), GROUPS.gamesRight, 11.555, .87, z, 0, -Math.PI / 2, 0, 1, 1, 1, false);
  DARTS_VISUAL.awards.push(glow);
}
clubSign('GALERIA DE PRÊMIOS', 'BRONZE 80 • PRATA 160 • OURO 240', 11.89, 1.58, 12.97, 1.8, .42, 'gamesRight', -Math.PI / 2);
