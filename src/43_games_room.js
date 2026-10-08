/* ================= sala de jogos, separada do escritório ================= */
const gameWall = MC('#263334', 0.9);
for (const [key, p, n] of [
  ['gamesLeft', [4, 1.6, 10], [1, 0, 0]], ['gamesFront', [10, 1.6, 6], [0, 0, 1]], ['gamesRight', [12, 1.6, 10], [-1, 0, 0]], ['gamesBack', [8, 1.6, 14], [0, 0, -1]],
]) { GROUPS[key] = new THREE.Group(); scene.add(GROUPS[key]); WALL_INFO[key] = { p: new THREE.Vector3(...p), n: new THREE.Vector3(...n) }; }
mesh(G.plane, mat.wood, GROUPS.main, 8, 0, 10, -Math.PI / 2, 0, 0, 8, 8, 1, false);
B(gameWall, 12, 1.6, 10, 0.08, RH, 8, { group: 'gamesRight', cast: false });
// Passagem de 1,8 m para o lounge: os jogos continuam numa sala própria.
B(gameWall, 6.8, 1.6, 14, 5.6, RH, 0.08, { group: 'gamesBack', cast: false });
B(gameWall, 11.7, 1.6, 14, 0.6, RH, 0.08, { group: 'gamesBack', cast: false });
B(gameWall, 10.5, 2.8, 14, 1.8, 0.8, 0.08, { group: 'gamesBack', cast: false });
B(gameWall, 4.01, 1.6, 10, 0.02, RH, 8, { group: 'gamesLeft', cast: false });
B(gameWall, 10, 1.6, 6, 4, RH, 0.08, { group: 'gamesFront', cast: false });
mesh(G.plane, gameWall, GROUPS.main, 8, RH, 10, Math.PI / 2, 0, 0, 8, 8, 1, false);
clubSign('SALA DE JOGOS', 'SINUCA • CLUBE DO 21', 5.5, 2.77, 5.93, 1.9, 0.56, 'wallFront');
clubSign('ESCRITÓRIO', '← VOLTAR AO PREGÃO', 5.5, 2.77, 6.06, 1.9, 0.56, 'wallFront', 0);
clubSign('CLUBE DO 21', 'FICHAS DE BRINCADEIRA • DIVIRTA-SE', 7, 2.3, 13.92, 3.8, 1.1, 'gamesBack');
for (const x of [4.38, 6.62]) B(mat.chrome, x, 1.2, 5.94, 0.04, 2.4, 0.04, { group: 'wallFront', cast: false });
// Mesa de cartas dedicada: o café e o sofá continuam no escritório.
B(mat.walnut, 8, 0.72, 12.1, 2.5, 0.16, 1.2);
B(mat.felt, 8, 0.805, 12.1, 2.3, 0.01, 1.02, { cast: false });
for (const x of [7, 9]) for (const z of [11.7, 12.5]) B(mat.walnut, x, 0.34, z, 0.12, 0.68, 0.12);
for (const dx of [-0.18, 0, 0.18]) B(mat.paper, 8 + dx, 0.819, 11.95, 0.12, 0.008, 0.19, { cast: false });
for (let k = 0; k < 5; k++) S(G.cyl, mat.pillowA, 8.5, 0.827 + k * 0.009, 12.25, 0, 0, 0, 0.045, 0.008, 0.045);
C(6.7, 9.3, 11.45, 12.75);
B(mat.walnut, 10.6, 1.05, 6.08, 0.9, 0.06, 0.07, { group: 'gamesFront' });
B(mat.walnut, 10.6, 0.22, 6.08, 0.9, 0.05, 0.09, { group: 'gamesFront' });
for (let k = 0; k < 5; k++) S(PG_CUE, cueMat0, 10.24 + k * 0.18, 0.2, 6.12, -Math.PI / 2 - 0.03, 0, 0, 1, 1, 1, { group: 'gamesFront' });
const gamesLight = new THREE.PointLight(0xffe4b8, 6, 13, 2); gamesLight.position.set(8, 2.8, 12); scene.add(gamesLight);

linearLamp(8, 7.2, 2.5); linearLamp(8, 12.1, 2.5);
spot(8, 3.12, 12.1, 8, 0, 12.1, 24, 1.05, 0xffe0b8, false);
spot(5.5, 3.12, 7.4, 5.5, 0, 7.4, 18, 1.05, 0xffe0b8, false);
