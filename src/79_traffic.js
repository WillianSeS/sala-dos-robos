
/* ================= trânsito lá embaixo: avenida vista pela janela ================= */
const STREET_Y = -58, ROAD_X = -19, ROAD_W = 22;
const roadTex = canvasTex(512, 2048, (g, w, h) => {
  g.fillStyle = '#141517'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  g.fillStyle = '#34353a'; g.fillRect(0, 0, 44, h); g.fillRect(w - 44, 0, 44, h);
  g.fillStyle = '#55565a'; g.fillRect(42, 0, 4, h); g.fillRect(w - 46, 0, 4, h);
  g.fillStyle = '#d9a72b'; g.fillRect(w / 2 - 5, 0, 3, h); g.fillRect(w / 2 + 2, 0, 3, h);
  g.fillStyle = 'rgba(230,230,230,.75)';
  for (const x of [w * 0.32, w * 0.68]) for (let y = 0; y < h; y += 120) g.fillRect(x - 1.5, y, 3, 60);
  for (let y = 300; y < h; y += 1024) for (let x = 50; x < w - 50; x += 22) g.fillRect(x, y, 12, 70);
  for (let y = 128; y < h; y += 256) for (const x of [44, w - 44]) {
    const gr = g.createRadialGradient(x, y, 4, x, y, 150); gr.addColorStop(0, 'rgba(255,170,80,.28)'); gr.addColorStop(1, 'rgba(255,170,80,0)');
    g.fillStyle = gr; g.fillRect(x - 150, y - 150, 300, 300);
  }
});
roadTex.wrapT = THREE.RepeatWrapping; roadTex.repeat.set(1, 300 / (ROAD_W * 4));
const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, 300), new THREE.MeshBasicMaterial({ map: roadTex }));
road.rotation.x = -Math.PI / 2; road.position.set(ROAD_X, STREET_Y, 0); GROUPS.main.add(road);
/* térreo dos prédios do outro lado da avenida (fecha a vista entre a rua e a camada de prédios) */
const baseTex = canvasTex(2048, 300, (g, w, h) => {
  g.fillStyle = '#0d0f15'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w;) {
    const bw = 80 + Math.random() * 160;
    g.fillStyle = Math.random() < 0.5 ? '#14161f' : '#191510'; g.fillRect(x, 0, bw - 3, h);
    nycWindows(g, x, 0, bw - 3, h * 0.62, { fx: 8, fy: 12, lit: 0.4, warm: 0.75 });
    const sh = h * 0.22, glow = Math.random() < 0.7;
    g.fillStyle = glow ? rgba(255, 210 + Math.random() * 30, 150, 0.9) : '#22242c'; g.fillRect(x + 6, h - sh - 6, bw - 15, sh);
    if (glow) { g.fillStyle = rgba(30, 20, 10, 0.6); for (let k = x + 14; k < x + bw - 12; k += 22) g.fillRect(k, h - sh - 6, 3, sh); }
    x += bw;
  }
});
const base = new THREE.Mesh(new THREE.PlaneGeometry(130, -40.5 - STREET_Y), new THREE.MeshBasicMaterial({ map: baseTex }));
base.position.set(-33.95, (STREET_Y - 40.5) / 2, 2); base.rotation.y = Math.PI / 2; GROUPS.main.add(base);
/* postes */
const poleG = new THREE.CylinderGeometry(0.09, 0.12, 8, 6), lampG = new THREE.BoxGeometry(0.5, 0.18, 1.2);
const poles = new THREE.InstancedMesh(poleG, new THREE.MeshBasicMaterial({ color: '#2a2b30' }), 24);
const lamps = new THREE.InstancedMesh(lampG, new THREE.MeshBasicMaterial({ color: '#ffd9a0' }), 24);
{
  const m = new THREE.Matrix4(); let i = 0;
  for (let k = 0; k < 12; k++) for (const sx of [-1, 1]) {
    const x = ROAD_X + sx * (ROAD_W / 2 - 1.2), z = -140 + k * 25 + (sx > 0 ? 12 : 0);
    m.makeTranslation(x, STREET_Y + 4, z); poles.setMatrixAt(i, m);
    m.makeTranslation(x - sx * 0.6, STREET_Y + 8, z); lamps.setMatrixAt(i, m); i++;
  }
}
GROUPS.main.add(poles, lamps);
/* carros: carroceria, cabine, faróis e lanternas (táxis amarelos incluídos) */
const N_CARS = 36;
const carBody = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, 0.7, 4.4), new THREE.MeshBasicMaterial({ color: 0xffffff }), N_CARS);
const carTop = new THREE.InstancedMesh(new THREE.BoxGeometry(1.55, 0.55, 2.2), new THREE.MeshBasicMaterial({ color: 0xffffff }), N_CARS);
const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.35, 0.16, 0.1), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.9, 2.6) }), N_CARS * 2);
const tails = new THREE.InstancedMesh(new THREE.BoxGeometry(0.35, 0.14, 0.1), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.15, 0.1) }), N_CARS * 2);
const LANES = [[ROAD_X - 6.6, 1], [ROAD_X - 3.2, 1], [ROAD_X + 3.2, -1], [ROAD_X + 6.6, -1]];
const cars = [];
for (let i = 0; i < N_CARS; i++) {
  const lane = LANES[i % 4], taxi = Math.random() < 0.3;
  cars.push({ x: lane[0], dir: lane[1], z: -150 + Math.floor(i / 4) * (300 / (N_CARS / 4)) + rnd(-6, 6), v: rnd(8, 14) });
  const c = new THREE.Color(taxi ? '#c99b1c' : spick(['#1b1d22', '#2a2d34', '#3b3f47', '#5a1d1d', '#1d2a44', '#b8bcc4', '#6d6f73']));
  carBody.setColorAt(i, c); carTop.setColorAt(i, c.clone().multiplyScalar(0.7));
}
GROUPS.main.add(carBody, carTop, heads, tails);
const _cm = new THREE.Matrix4(), _cq = new THREE.Quaternion(), _cs = new THREE.Vector3(1, 1, 1), _cp = new THREE.Vector3();
function stepTraffic(dt) {
  const k = reduceMotion ? 0.3 : 1;
  for (let i = 0; i < N_CARS; i++) {
    const c = cars[i]; c.z += c.dir * c.v * dt * k;
    if (c.z > 150) c.z -= 300; if (c.z < -150) c.z += 300;
    _cq.setFromAxisAngle(_cs.set(0, 1, 0), c.dir > 0 ? 0 : Math.PI); _cs.set(1, 1, 1);
    _cm.compose(_cp.set(c.x, STREET_Y + 0.55, c.z), _cq, _cs); carBody.setMatrixAt(i, _cm);
    _cm.compose(_cp.set(c.x, STREET_Y + 1.15, c.z - c.dir * 0.3), _cq, _cs); carTop.setMatrixAt(i, _cm);
    for (let s = 0; s < 2; s++) {
      const ox = (s ? 0.62 : -0.62);
      _cm.compose(_cp.set(c.x + ox, STREET_Y + 0.6, c.z + c.dir * 2.22), _cq, _cs); heads.setMatrixAt(i * 2 + s, _cm);
      _cm.compose(_cp.set(c.x + ox, STREET_Y + 0.65, c.z - c.dir * 2.22), _cq, _cs); tails.setMatrixAt(i * 2 + s, _cm);
    }
  }
  carBody.instanceMatrix.needsUpdate = carTop.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = tails.instanceMatrix.needsUpdate = true;
}
stepTraffic(0);
const TRAFFIC = [road, base, poles, lamps, carBody, carTop, heads, tails];
