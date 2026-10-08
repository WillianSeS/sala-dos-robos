/* ================= elevador do visitante: entrar, escolher o andar, viajar e sair ================= */
/* As portas abrem quando o visitante chega perto. Ao escolher o andar, ele entra na cabine, as portas
   fecham, o visor conta os andares e, no destino, ele sai pela porta do outro andar. */
const ELEV = { ride: null, shake: 0 };
const ELEV_STEPS = [['in', 1.0], ['close', 1.0], ['move', 2.4], ['open', 1.0], ['out', 0.9]];
function elevOpen(key, sec = 3) { const f = FLOOR[key]; if (f) f.openUntil = Math.max(f.openUntil, performance.now() / 1000 + sec); }
const cabCenter = f => [f.wx - f.dir * CAB.center, f.z];
const wrapAngle = a => Math.atan2(Math.sin(a), Math.cos(a));
function inCab(x, z) {
  return FLOORS.find(f => { const d = (x - f.wx) * -f.dir; return d > 0.05 && d < CAB.depth && Math.abs(z - f.z) < CAB.half; }) || null;
}
function playerFloor() { const s = seatState.s; return s ? floorAt(s.x, s.z) : floorAt(fp.pos.x, fp.pos.z); }
/* Etiquetas de nome só aparecem para quem está no mesmo andar (na vista aérea, todas). */
const otherFloor = (x, z) => inRoom && floorAt(x, z) !== playerFloor();
function renderElevator() {
  const list = $('elevFloors'), here = playerFloor(); list.replaceChildren();
  for (const f of [...FLOORS].reverse()) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn sm elev-floor'; b.dataset.floor = f.key;
    b.textContent = f.n + 'º andar · ' + f.name + (f.key === here ? ' · você está aqui' : '');
    b.disabled = f.key === here; b.onclick = () => rideTo(f.key); list.appendChild(b);
  }
}
function openElevator() {
  if (!inRoom || mode !== 'fp' || ELEV.ride) return;
  elevOpen(playerFloor()); renderElevator(); leisureOpen('elevator', 'elevator');
}
function closeElevator() {
  $('elevator').hidden = true;
  if (mode === 'elevator') { mode = 'fp'; cross.hidden = isTouch; }
}
function rideTo(key) {
  const b = FLOOR[key]; if (!b || !inRoom || ELEV.ride) return false;
  if (seatState.s) { standUp(() => rideTo(key)); return true; }
  if (DISCO.dancing) stopDance();
  if (mode === 'elevator') closeElevator();
  if (mode !== 'fp') return false;
  const from = playerFloor(); if (from === key) return false;
  stopSmoking(); for (const k in keys) keys[k] = false; fp.vel.set(0, 0, 0); joy = null; joyEl.hidden = true;
  ELEV.ride = { a: FLOOR[from], b, step: 0, t: 0, x0: fp.pos.x, z0: fp.pos.z, yaw0: fp.yaw, pitch0: fp.pitch };
  mode = 'ride'; cross.hidden = true; elevOpen(from, 2);
  $('elevRideText').textContent = FLOOR[from].n + ''; $('elevRideName').textContent = 'Indo para o ' + b.n + 'º · ' + b.name;
  $('elevRide').hidden = false;
  return true;
}
function cancelRide() {
  const r = ELEV.ride; ELEV.ride = null; ELEV.shake = 0; $('elevRide').hidden = true;
  if (r) for (const f of [r.a, r.b]) elevDisplayDraw(f, f.n);
  if (mode === 'ride') { mode = 'fp'; cross.hidden = isTouch; }
}
function stepRide(dt) {
  const r = ELEV.ride, [name, base] = ELEV_STEPS[r.step], dur = base * (DEBUG ? 0.15 : reduceMotion ? 0.5 : 1);
  r.t += dt; const k = Math.min(1, r.t / dur), e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
  const px = fp.pos.x, pz = fp.pos.z, { a, b } = r;
  ELEV.shake = 0;
  if (name === 'in') {
    const [cx, cz] = cabCenter(a); elevOpen(a.key, 1);
    fp.pos.x = r.x0 + (cx - r.x0) * e; fp.pos.z = r.z0 + (cz - r.z0) * e;
    fp.yaw = r.yaw0 + wrapAngle(a.yaw - r.yaw0) * e; fp.pitch = r.pitch0 * (1 - e);
  } else if (name === 'close' || name === 'move') {
    a.openUntil = 0;
    if (name === 'move') {
      const n = Math.round(a.n + (b.n - a.n) * e), arrow = b.n > a.n ? '▲' : '▼';
      if (n !== r.n) { r.n = n; elevDisplayDraw(a, n, arrow); elevDisplayDraw(b, n, arrow); $('elevRideText').textContent = arrow + ' ' + n; }
      if (!reduceMotion) ELEV.shake = Math.sin(r.t * 31) * 0.004 * Math.sin(Math.PI * k);
    }
  } else if (name === 'open') elevOpen(b.key, 3);
  else if (name === 'out') {
    const [cx, cz] = cabCenter(b); elevOpen(b.key, 2);
    fp.pos.x = cx + (b.x - cx) * e; fp.pos.z = cz + (b.z - cz) * e; fp.yaw = b.yaw;
  }
  if (dt > 0) fp.vel.set((fp.pos.x - px) / dt, 0, (fp.pos.z - pz) / dt);
  const speed = Math.hypot(fp.vel.x, fp.vel.z);
  fp.body = angDamp(fp.body, speed > 0.2 ? Math.atan2(fp.vel.x, fp.vel.z) : fp.yaw + Math.PI, 8, dt);
  if (k < 1) return;
  if (name === 'move') {
    /* Cabines iguais: o visitante continua no mesmo lugar da cabine, agora no outro andar. */
    const [cx, cz] = cabCenter(b); fp.pos.set(cx, 0, cz); fp.yaw = b.yaw; fp.body = b.yaw + Math.PI; fp.vel.set(0, 0, 0);
    elevDisplayDraw(a, a.n); elevDisplayDraw(b, b.n);
  }
  r.step++; r.t = 0;
  if (r.step >= ELEV_STEPS.length) { fp.vel.set(0, 0, 0); cancelRide(); }
}
function stepElevator(dt, t) {
  /* Sensor da porta: abre quando o visitante chega perto ou está dentro da cabine. */
  if (inRoom && mode === 'fp' && !ELEV.ride) {
    const f = FLOOR[playerFloor()], d = (fp.pos.x - f.wx) * -f.dir;
    if (d > -1.6 && d < CAB.depth && Math.abs(fp.pos.z - f.z) < 1) elevOpen(f.key, 0.8);
  }
  for (const f of FLOORS) {
    f.open = damp(f.open, f.openUntil > t ? 1 : 0, 5, dt);
    const width = 0.56 * (1 - 0.92 * f.open);
    for (const leaf of f.leaves) { leaf.scale.z = width; leaf.position.z = f.z + leaf.userData.side * (0.56 - width / 2); }
  }
  if (ELEV.ride) stepRide(dt);
}
$('elevClose').onclick = closeElevator;
