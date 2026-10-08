/* ================= elevador do visitante: painel, viagem e portas ================= */
const ELEV = { ride: null };
function elevOpen(key, sec = 3) { const f = FLOOR[key]; if (f) f.openUntil = Math.max(f.openUntil, performance.now() / 1000 + sec); }
function playerFloor() { const s = seatState.s; return s ? floorAt(s.x, s.z) : floorAt(fp.pos.x, fp.pos.z); }
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
  const f = FLOOR[key]; if (!f || !inRoom || ELEV.ride) return false;
  if (seatState.s) { standUp(() => rideTo(key)); return true; }
  if (DISCO.dancing) stopDance();
  if (mode === 'elevator') closeElevator();
  if (mode !== 'fp') return false;
  const from = playerFloor(); if (from === key) return false;
  stopSmoking(); for (const k in keys) keys[k] = false; fp.vel.set(0, 0, 0); joy = null; joyEl.hidden = true;
  ELEV.ride = { from, to: key, t: 0, dur: reduceMotion ? 0.8 : DEBUG ? 0.5 : 2.6, moved: false };
  mode = 'ride'; cross.hidden = true; elevOpen(from, 1.2);
  $('elevRideText').textContent = FLOOR[from].n + ''; $('elevRideName').textContent = 'Indo para ' + f.name;
  $('elevRide').hidden = false; $('elevRide').style.opacity = '0';
  return true;
}
function cancelRide() {
  ELEV.ride = null; $('elevRide').hidden = true;
  if (mode === 'ride') { mode = 'fp'; cross.hidden = isTouch; }
}
function stepElevator(dt, t) {
  for (const f of FLOORS) {
    f.open = damp(f.open, f.openUntil > t ? 1 : 0, 5, dt);
    const width = 0.56 * (1 - 0.92 * f.open);
    for (const leaf of f.leaves) { leaf.scale.z = width; leaf.position.z = f.z + leaf.userData.side * (0.56 - width / 2); }
  }
  const ride = ELEV.ride; if (!ride) return;
  ride.t += dt; const k = Math.min(1, ride.t / ride.dur), a = FLOOR[ride.from], b = FLOOR[ride.to];
  /* Escurece, conta os andares, chega com as portas abrindo e clareia. */
  $('elevRide').style.opacity = String(k < 0.3 ? k / 0.3 : k > 0.75 ? (1 - k) / 0.25 : 1);
  const step = clamp((k - 0.3) / 0.4, 0, 1), n = Math.round(a.n + (b.n - a.n) * step);
  $('elevRideText').textContent = (b.n > a.n ? '▲ ' : '▼ ') + n;
  if (!ride.moved && k >= 0.5) {
    ride.moved = true; fp.pos.set(b.x, 0, b.z); fp.yaw = b.yaw; fp.pitch = 0; elevOpen(b.key, 3.5);
    camera.position.set(b.x, EYE, b.z); camera.quaternion.copy(fpQuat(b.yaw, 0));
  }
  if (k >= 1) cancelRide();
}
$('elevClose').onclick = closeElevator;
