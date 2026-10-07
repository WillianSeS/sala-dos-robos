
/* ================= arquitetura ================= */
/* sala: x -8..8, z -6..6, pé-direito 3,2 m. Fundo (z=-6) = parede de ripas com telão. */
const RW = 8, RD = 6, RH = 3.2;
const mat = {
  carpet: M({ map: TEX.carpet, roughness: 1, bumpMap: TEX.carpet, bumpScale: 1.2 }),
  wood: M({ map: TEX.wood, roughness: 0.42, bumpMap: TEX.wood, bumpScale: 0.6 }),
  slat: M({ map: TEX.slat, roughness: 0.62 }),
  felt: MC('#141414', 1),
  plasterDark: M({ color: '#3b4046', map: TEX.plaster, roughness: 0.95 }),
  plasterLight: M({ color: '#a9a49c', map: TEX.plaster, roughness: 0.93 }),
  ceiling: MC('#1b1d20', 0.95),
  base: MC('#15171a', 0.6),
  alu: MC('#b4b8bd', 0.32, 1),
  aluDark: MC('#2b2e33', 0.45, 0.8),
  steel: MC('#c9ccd0', 0.28, 1),
  black: MC('#0d0e10', 0.5),
  glass: M({ color: '#9fb8c6', roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.11, depthWrite: false }),
  ledWhite: M({ color: '#000', emissive: '#fff6ea', emissiveIntensity: 6, roughness: 1 }),
  ledWarm: M({ color: '#000', emissive: '#ffd59a', emissiveIntensity: 5, roughness: 1 }),
};

/* pisos */
const floorCarpet = mesh(G.plane, mat.carpet, GROUPS.main, 0, 0, -1.8, -Math.PI / 2, 0, 0, 16, 8.4, 1, false);
const floorWood = mesh(G.plane, mat.wood, GROUPS.main, 0, 0, 4.2, -Math.PI / 2, 0, 0, 16, 3.6, 1, false);
B(mat.alu, 0, 0.004, 2.4, 16, 0.008, 0.05, { cast: false });
/* teto */
mesh(G.plane, mat.ceiling, GROUPS.main, 0, RH, 0, Math.PI / 2, 0, 0, 16, 12, 1, false);

/* parede do fundo: feltro escuro + ripas de madeira */
mesh(G.plane, mat.felt, GROUPS.wallBack, 0, RH / 2, -RD, 0, 0, 0, 16, RH, 1, false);
for (let x = -7.96; x <= 7.96; x += 0.075) B(mat.slat, x, RH / 2, -5.982, 0.045, RH, 0.03, { group: 'wallBack', cast: false });
B(mat.base, 0, 0.05, -5.96, 16, 0.1, 0.02, { group: 'wallBack', cast: false });

/* parede esquerda: trecho de alvenaria escura + pano de vidro do piso ao teto */
mesh(G.plane, mat.plasterDark, GROUPS.wallLeft, -RW, RH / 2, -3.55, 0, Math.PI / 2, 0, 4.9, RH, 1, false);
B(mat.base, -7.99, 0.05, -3.55, 0.02, 0.1, 4.9, { group: 'wallLeft', cast: false });
const WIN_Z0 = -1.1, WIN_Z1 = 6;
for (let z = WIN_Z0; z <= WIN_Z1 + 0.01; z += (WIN_Z1 - WIN_Z0) / 5) B(mat.aluDark, -7.97, RH / 2, Math.min(z, 5.96), 0.08, RH, 0.07, { group: 'wallLeft' });
B(mat.aluDark, -7.97, 0.04, (WIN_Z0 + WIN_Z1) / 2, 0.1, 0.08, WIN_Z1 - WIN_Z0, { group: 'wallLeft', cast: false });
B(mat.aluDark, -7.97, RH - 0.05, (WIN_Z0 + WIN_Z1) / 2, 0.1, 0.1, WIN_Z1 - WIN_Z0, { group: 'wallLeft', cast: false });
B(mat.aluDark, -7.97, 1.05, (WIN_Z0 + WIN_Z1) / 2, 0.06, 0.04, WIN_Z1 - WIN_Z0, { group: 'wallLeft', cast: false });
const glassPane = mesh(G.plane, mat.glass, GROUPS.wallLeft, -7.985, RH / 2, (WIN_Z0 + WIN_Z1) / 2, 0, Math.PI / 2, 0, WIN_Z1 - WIN_Z0, RH, 1, false);
glassPane.renderOrder = 2;

/* cidade lá fora (duas camadas para dar profundidade ao andar) */
const skyFar = new THREE.Mesh(new THREE.PlaneGeometry(300, 105), new THREE.MeshBasicMaterial({ map: TEX.skyFar, fog: false }));
skyFar.position.set(-80, 6.85, 0); /* horizonte (55% da textura) na altura dos olhos */ skyFar.rotation.y = Math.PI / 2; GROUPS.main.add(skyFar);
const skyMid = new THREE.Mesh(new THREE.PlaneGeometry(130, 65), new THREE.MeshBasicMaterial({ map: TEX.skyMid, transparent: true, fog: false }));
skyMid.position.set(-34, -8, 2); skyMid.rotation.y = Math.PI / 2; GROUPS.main.add(skyMid);

/* parede direita (porta) e parede da frente */
mesh(G.plane, mat.plasterLight, GROUPS.wallRight, RW, RH / 2, 0, 0, -Math.PI / 2, 0, 12, RH, 1, false);
B(mat.base, 7.99, 0.05, 0, 0.02, 0.1, 12, { group: 'wallRight', cast: false });
mesh(G.plane, mat.plasterLight, GROUPS.wallFront, 0, RH / 2, RD, 0, Math.PI, 0, 16, RH, 1, false);
B(mat.base, 0, 0.05, 5.99, 16, 0.1, 0.02, { group: 'wallFront', cast: false });
/* porta de madeira com batente */
const doorWood = M({ map: TEX.slat, color: '#8a6a4a', roughness: 0.5 });
B(doorWood, 7.975, 1.08, -4.8, 0.04, 2.16, 0.94, { group: 'wallRight' });
B(mat.aluDark, 7.97, 2.19, -4.8, 0.07, 0.06, 1.06, { group: 'wallRight' });
B(mat.aluDark, 7.97, 1.1, -5.3, 0.07, 2.2, 0.06, { group: 'wallRight' });
B(mat.aluDark, 7.97, 1.1, -4.3, 0.07, 2.2, 0.06, { group: 'wallRight' });
S(G.cyl, mat.steel, 7.93, 1.02, -4.45, 0, 0, Math.PI / 2, 0.012, 0.09, 0.012, { group: 'wallRight' });
B(mat.steel, 7.89, 1.02, -4.5, 0.02, 0.02, 0.12, { group: 'wallRight' });
/* placa de saída */
const exitMat = M({ color: '#0b3d1f', emissive: '#19c25a', emissiveIntensity: 1.6, roughness: 0.6 });
B(exitMat, 7.96, 2.42, -4.8, 0.03, 0.14, 0.34, { group: 'wallRight', cast: false });

/* luminárias lineares suspensas (fonte visível) + cabos */
function linearLamp(x, z, len) {
  B(mat.aluDark, x, 2.86, z, len, 0.05, 0.09, { cast: false });
  S(G.plane, mat.ledWhite, x, 2.834, z, Math.PI / 2, 0, 0, len - 0.02, 0.06, 1, { cast: false, recv: false });
  for (const dx of [-len / 2 + 0.15, len / 2 - 0.15]) S(G.cyl8, mat.steel, x + dx, 3.03, z, 0, 0, 0, 0.003, 0.34, 0.003, { cast: false });
}
for (const z of [-4.75, -3.25, -0.45, 1.5]) for (const x of [-2.75, 0, 2.75]) linearLamp(x, z, 2.5);
/* spots embutidos na área de lazer */
for (const [x, z] of [[-6.4, 3.4], [-4, 3.4], [-6.4, 5.2], [-4, 5.2], [6.6, 3.2], [6.6, 4.8], [5.6, -2.5], [5.6, 0.5], [-5.6, -2.5], [-5.6, 0.5]]) {
  S(G.cyl, mat.black, x, RH - 0.01, z, 0, 0, 0, 0.07, 0.02, 0.07, { cast: false });
  S(new THREE.CircleGeometry(0.05, 20), mat.ledWarm, x, RH - 0.021, z, Math.PI / 2, 0, 0, 1, 1, 1, { cast: false, recv: false });
}
/* duto de ar aparente */
S(G.cyl, mat.alu, 7.25, 2.92, 0, Math.PI / 2, 0, 0, 0.2, 11.6, 0.2, { cast: false, group: 'wallRight' });
for (let z = -5; z <= 5; z += 2.5) S(G.cyl, mat.aluDark, 7.25, 2.92, z, Math.PI / 2, 0, 0, 0.215, 0.05, 0.215, { cast: false, group: 'wallRight' });

/* ================= iluminação ================= */
const hemi = new THREE.HemisphereLight(0xbfd2ff, 0x2b2118, 0.5); scene.add(hemi);
const deskSpots = HIGH
  ? [[-2.3, -3.1], [2.3, -3.1], [-2.3, -0.3], [2.3, -0.3]]
  : [[0, -3.1], [0, -0.3]];
deskSpots.forEach(([x, z]) => spot(x, 3.12, z, x, 0, z, HIGH ? 42 : 70, HIGH ? 1.0 : 1.2, 0xfff3e2, true));
spot(0, 3.12, -4.9, 0, 0, -4.6, 22, 1.05, 0xfff3e2, false);
spot(-5.2, 3.12, 4.5, -5.2, 0, 4.5, 22, 1.0, 0xffd6a0, false);             /* sofá */
spot(6.6, 3.12, 4.0, 6.9, 0, 4.0, 20, 0.95, 0xffe0b8, false);              /* café */
const poolSpot = spot(2.6, 1.95, 4.3, 2.6, 0, 4.3, 12, 1.0, 0xffd29a, HIGH); /* sinuca */
const lampLight = new THREE.PointLight(0xffc27a, 3, 6, 2); lampLight.position.set(-2.95, 1.62, 5.45); scene.add(lampLight);

/* colisores das paredes são tratados pelos limites da sala no controle */
