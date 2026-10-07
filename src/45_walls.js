
/* ================= itens de parede e sinalização ================= */
/* telão (parede de vídeo 3x2) */
const VW = { w: 6.8, h: 2.0, y: 1.95, z: -5.9 };
B(mat.black, 0, VW.y, VW.z - 0.04, VW.w + 0.12, VW.h + 0.12, 0.07, { group: 'wallBack' });
const wallTex = canvasTex(2048, 602, null);
const wallMat = M({ color: 0x000000, emissive: 0xffffff, emissiveMap: wallTex, emissiveIntensity: 1.25, roughness: 0.3 });
mesh(G.plane, wallMat, GROUPS.wallBack, 0, VW.y, VW.z, 0, 0, 0, VW.w, VW.h, 1, false);
/* letreiro corrido acima do telão */
B(mat.black, 0, 3.08, -5.93, 7.0, 0.17, 0.06, { group: 'wallBack', cast: false });
const tickTex = canvasTex(3072, 70, null); tickTex.wrapS = THREE.RepeatWrapping;
const tickMat = M({ color: 0x000000, emissive: 0xffffff, emissiveMap: tickTex, emissiveIntensity: 1.6, roughness: 0.4 });
mesh(G.plane, tickMat, GROUPS.wallBack, 0, 3.08, -5.899, 0, 0, 0, 6.94, 0.15, 1, false);

/* bandeira emoldurada */
B(mat.walnut, -5.7, 2.05, -5.93, 1.6, 1.16, 0.05, { group: 'wallBack' });
mesh(G.plane, M({ map: TEX.flag, roughness: 0.85 }), GROUPS.wallBack, -5.7, 2.05, -5.904, 0, 0, 0, 1.48, 1.04, 1, false);

/* relógios mundiais */
const CLOCKS = [];
const clockCities = [['São Paulo', 'America/Sao_Paulo'], ['Nova York', 'America/New_York'], ['Londres', 'Europe/London'], ['Tóquio', 'Asia/Tokyo']];
const clockFace = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#f3f1ec'; g.beginPath(); g.arc(w / 2, h / 2, w / 2, 0, 7); g.fill();
  g.fillStyle = '#1b1b1b';
  for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, big = i % 5 === 0, r1 = 112, r0 = big ? 94 : 104; g.save(); g.translate(w / 2, h / 2); g.rotate(a); g.fillRect(-(big ? 3 : 1), -r1, big ? 6 : 2, r1 - r0); g.restore(); }
});
const handMat = MC('#151515', 0.5), secMat = MC('#d23b2b', 0.5);
clockCities.forEach(([city, tz], i) => {
  const x = 4.45 + i * 0.9, y = 2.32, z = -5.93;
  S(G.cyl, mat.black, x, y, z, Math.PI / 2, 0, 0, 0.2, 0.05, 0.2, { group: 'wallBack' });
  mesh(new THREE.CircleGeometry(0.18, 40), M({ map: clockFace, roughness: 0.5 }), GROUPS.wallBack, x, y, z + 0.026, 0, 0, 0, 1, 1, 1, false);
  const mk = (len, wid, m, zz) => { const p = new THREE.Group(); p.position.set(x, y, z + zz); GROUPS.wallBack.add(p); const hm = new THREE.Mesh(G.box, m); hm.scale.set(wid, len, 0.004); hm.position.y = len / 2 - 0.02; p.add(hm); return p; };
  const plate = canvasTex(256, 48, (g, w, h) => { g.fillStyle = '#101214'; g.fillRect(0, 0, w, h); g.fillStyle = '#e7ece8'; g.font = '700 24px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(city.toUpperCase(), w / 2, h / 2 + 1); });
  mesh(G.plane, M({ color: 0x000000, emissive: 0xffffff, emissiveMap: plate, emissiveIntensity: 0.9 }), GROUPS.wallBack, x, y - 0.3, z + 0.01, 0, 0, 0, 0.5, 0.094, 1, false);
  CLOCKS.push({ tz, h: mk(0.1, 0.014, handMat, 0.03), m: mk(0.15, 0.009, handMat, 0.034), s: mk(0.165, 0.004, secMat, 0.038) });
});
function updateClocks() {
  const now = new Date();
  for (const c of CLOCKS) {
    let hh = 0, mi = 0, se = 0;
    try { const p = new Intl.DateTimeFormat('en-GB', { timeZone: c.tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(now); for (const q of p) { if (q.type === 'hour') hh = +q.value; if (q.type === 'minute') mi = +q.value; if (q.type === 'second') se = +q.value; } } catch (e) { hh = now.getHours(); mi = now.getMinutes(); se = now.getSeconds(); }
    c.h.rotation.z = -((hh % 12) + mi / 60) / 12 * Math.PI * 2;
    c.m.rotation.z = -(mi + se / 60) / 60 * Math.PI * 2;
    c.s.rotation.z = -se / 60 * Math.PI * 2;
  }
}

/* letreiro da marca (luz de fundo) na parede esquerda */
mesh(G.plane, M({ color: 0x000000, map: TEX.brand, emissive: 0xffffff, emissiveMap: TEX.brand, emissiveIntensity: 1.5, transparent: true, depthWrite: false }), GROUPS.wallLeft, -7.975, 2.2, -3.55, 0, Math.PI / 2, 0, 3.6, 0.617, 1, false);

/* quadros */
B(mat.black, 7.975, 1.65, -1.8, 0.03, 0.86, 1.36, { group: 'wallRight' });
mesh(G.plane, M({ map: TEX.art, roughness: 0.8 }), GROUPS.wallRight, 7.958, 1.65, -1.8, 0, -Math.PI / 2, 0, 1.28, 0.8, 1, false);
const art2 = canvasTex(720, 400, (g, w, h) => {
  const grd = g.createLinearGradient(0, 0, w, h); grd.addColorStop(0, '#1c3b34'); grd.addColorStop(1, '#0d1714'); g.fillStyle = grd; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#c9a36a'; g.lineWidth = 3; g.beginPath(); let y = h * 0.75; g.moveTo(30, y);
  for (let x = 30; x < w - 30; x += 12) { y = clamp(y + (Math.random() - 0.58) * 26, 50, h - 40); g.lineTo(x, y); } g.stroke();
  g.fillStyle = '#e9e1d2'; g.font = 'italic 600 30px ' + FONT_D; g.fillText('Juros compostos', 34, 58);
});
B(mat.walnut, -5.1, 1.78, 5.975, 1.86, 1.06, 0.03, { group: 'wallFront' });
mesh(G.plane, M({ map: art2, roughness: 0.8 }), GROUPS.wallFront, -5.1, 1.78, 5.958, 0, Math.PI, 0, 1.78, 0.99, 1, false);

/* placas suspensas por par de moedas */
const SIGNS = [];
function hangSign(sym, x, z) {
  const tex = canvasTex(512, 144, null);
  B(mat.black, x, 2.36, z, 1.24, 0.34, 0.05, { cast: false });
  const smat = M({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.2, roughness: 0.4 });
  mesh(G.plane, smat, GROUPS.main, x, 2.36, z + 0.026, 0, 0, 0, 1.2, 0.3, 1, false);
  mesh(G.plane, smat, GROUPS.main, x, 2.36, z - 0.026, 0, Math.PI, 0, 1.2, 0.3, 1, false);
  for (const dx of [-0.5, 0.5]) S(G.cyl8, mat.steel, x + dx, 2.86, z, 0, 0, 0, 0.003, 0.67, 0.003, { cast: false });
  SIGNS.push({ sym, tex });
}
hangSign('EURUSD', -1.6, -3.3); hangSign('GBPUSD', 2.4, -3.3); hangSign('USDJPY', -2.4, -0.5); hangSign('USDCAD', 1.6, -0.5);

flushStatics();
