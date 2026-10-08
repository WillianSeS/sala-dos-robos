
/* ================= controles: vista aérea e primeira pessoa ================= */
let mode = 'orbit';
const portrait = () => innerWidth < innerHeight;
const orbit = { target: new THREE.Vector3(0, -1.1, 0.6), r: 14, th: 0.78, ph: 0.92, idle: 0 };
if (portrait()) { orbit.r = 19; orbit.th = 1.15; orbit.target.set(0, -1.6, 0.2); }
/* body: para onde o corpo do personagem está virado (convenção dos avatares); segue a direção em que ele anda. */
const fp = { pos: new THREE.Vector3(6.6, 0, -4.6), yaw: 1.78, pitch: -0.06, vel: new THREE.Vector3(), bob: 0, body: 1.78 + Math.PI };
const EYE = 1.62, PR = 0.28;
const keys = {};
let locked = false, tween = null, inRoom = false;
const btnView = $('btnView'), btnEnter = $('btnEnter'), help = $('help'), cross = $('cross'), joyEl = $('joy');
/* Celular: controles de jogo na tela (joystick fixo no canto, botões redondos à direita). */
const MOBILE = { run: false };
if (isTouch) document.body.classList.add('touch');
function joyHome() { joyEl.style.left = joyEl.style.top = ''; joyEl.firstElementChild.style.transform = ''; }

function orbitPose(out) {
  const o = orbit, s = Math.sin(o.ph);
  out.pos = new THREE.Vector3(o.target.x + o.r * s * Math.sin(o.th), o.target.y + o.r * Math.cos(o.ph), o.target.z + o.r * s * Math.cos(o.th));
  const m = new THREE.Matrix4().lookAt(out.pos, o.target, new THREE.Vector3(0, 1, 0));
  out.q = new THREE.Quaternion().setFromRotationMatrix(m);
  return out;
}
function fpQuat(yaw, pitch) { return new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ')); }
function setWalls(showAll) {
  skyFar.visible = skyMid.visible = showAll;
  for (const o of TRAFFIC) o.visible = showAll;
  for (const [k, info] of Object.entries(WALL_INFO)) {
    GROUPS[k].visible = showAll || _tmpV.subVectors(camera.position, info.p).dot(info.n) > 1.2;
  }
}
const _tmpV = new THREE.Vector3();
function startTween(toPos, toQ, dur, done) { if (DEBUG) dur *= 0.1; tween = { p0: camera.position.clone(), q0: camera.quaternion.clone(), p1: toPos, q1: toQ, t: 0, dur, done }; mode = 'tween'; }

function enterRoom() {
  inRoom = true; $('musicOpen').hidden = false; finalName(); $('intro').hidden = true; btnView.hidden = false; btnView.textContent = 'Vista aérea';
  fp.pos.set(6.6, 0, -4.6); fp.yaw = 1.78; fp.pitch = -0.06; fp.vel.set(0, 0, 0);
  startTween(new THREE.Vector3(fp.pos.x, EYE, fp.pos.z), fpQuat(fp.yaw, fp.pitch), reduceMotion ? 0.01 : 2.2, () => {
    mode = 'fp'; cross.hidden = isTouch;
    help.innerHTML = isTouch ? 'Joystick à esquerda anda · arraste à direita para olhar · 🏃 corre · botão verde interage'
      : '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> andar · mouse olha · <kbd>E</kbd> interage · <kbd>Shift</kbd> corre · <kbd>Esc</kbd> solta o mouse';
    help.hidden = false; help.style.opacity = '1'; setTimeout(() => { help.style.opacity = '0'; }, 7000);
  });
  if (!isTouch) lockMouse();
}
function leaveRoom() {
  if (ELEV.ride) cancelRide(); if (mode === 'elevator') closeElevator();
  if (mode === 'menu') closeHospitality(); cancelService(true); stopSmoking(); putAwayConsumable();
  if (DISCO.dancing) stopDance();
  if (CASINO.active) exitCasino(); if (mode === 'music') closeMusic(); $('musicOpen').hidden = true;
  if (mode === 'talk') closeTalk(); if (POOL.active) { POOL.active = false; $('poolHud').hidden = true; $('hud').hidden = false; $('mp').classList.remove('off'); if (lampMeshes) for (const m of lampMeshes) m.visible = true; aimLine.visible = objLine.visible = ghost.visible = cueStick.visible = false; if (POOL.opp) { POOL.opp.inPool = false; POOL.opp.t1 = simT + 3; } POOL.opp = null; }
  if (seatState.s) { if (seatState.s.st) seatState.s.st.playerSeated = false; if (SPOTS.sofa.busy === 'player') SPOTS.sofa.busy = null; seatState.s = null; }
  for (const spot of [SPOTS.lounge1, SPOTS.lounge2]) if (spot.busy === 'player') spot.busy = null;
  inRoom = false; if (document.pointerLockElement) document.exitPointerLock();
  cross.hidden = true; help.hidden = true; btnView.textContent = 'Entrar na sala';
  const o = orbitPose({}); startTween(o.pos, o.q, reduceMotion ? 0.01 : 1.8, () => { mode = 'orbit'; });
}
function lockMouse() { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (e) { } }
document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === canvas; });
btnEnter.addEventListener('click', enterRoom);
btnView.addEventListener('click', () => { inRoom ? leaveRoom() : enterRoom(); });

/* teclado */
addEventListener('keydown', e => {
  const typing = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
  if (e.code === 'Escape') { if (mode === 'elevator') { closeElevator(); return; } if (mode === 'menu') { closeHospitality(); return; } if (HOSP.smokingUntil > performance.now()/1000) { stopSmoking(); return; } if (mode === 'dance') stopDance(); else if (mode === 'casino') exitCasino(); else if (mode === 'music') closeMusic(); else if (mode === 'talk') closeTalk(); else if (mode === 'pool') exitPool(); else if (mode === 'seat') standUp(); if (typing) e.target.blur(); return; }
  if (typing || e.target?.tagName === 'SELECT') return;
  if (e.code === 'KeyF' && !e.repeat) { consumeHeld(); return; }
  if (e.code === 'KeyV' && !e.repeat && inRoom) { setThirdPerson(!VIEW.third); return; }
  if (mode === 'dance') { if (e.code === 'KeyE' && !e.repeat) stopDance(); return; }
  if (e.code === 'KeyE' && !e.repeat && (mode === 'fp' || mode === 'seat')) { doAct(); return; }
  if (mode === 'seat' && e.code === 'Space') { e.preventDefault(); standUp(); return; }
  if (mode === 'pool' && e.code === 'Space') { e.preventDefault(); if (!e.repeat) startCharge(); return; }
  keys[e.code] = true;
  if (mode === 'fp' && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'Enter' && mode === 'orbit' && !btnEnter.disabled && document.activeElement !== btnView) enterRoom();
});
addEventListener('keyup', e => { keys[e.code] = false; if (mode === 'pool' && e.code === 'Space') releaseCharge(); });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

/* ponteiro: mouse e toque */
const ptr = new Map(); let joy = null, pinch = null;
canvas.addEventListener('pointerdown', e => {
  canvas.focus({ preventScroll: true });
  if (mode === 'pool') { poolPointer('down', e); ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); return; }
  if (mode === 'seat' && e.pointerType === 'mouse' && !locked) lockMouse();
  if (mode === 'fp' && e.pointerType === 'mouse' && !locked) lockMouse();
  if (mode === 'fp' && e.pointerType === 'touch' && !joy && e.clientX < innerWidth * 0.45 && e.clientY > innerHeight * 0.35) {
    /* Toque perto do joystick fixo usa o centro dele; longe, o joystick vai até o dedo. */
    const r = joyEl.hidden ? null : joyEl.getBoundingClientRect(), cx = r ? r.left + r.width / 2 : 0, cy = r ? r.top + r.height / 2 : 0;
    const home = r && Math.hypot(e.clientX - cx, e.clientY - cy) < 110;
    joy = { id: e.pointerId, x0: home ? cx : e.clientX, y0: home ? cy : e.clientY, dx: 0, dy: 0 };
    joyEl.hidden = false; joyEl.firstElementChild.style.transform = '';
    if (!home) { joyEl.style.left = e.clientX + 'px'; joyEl.style.top = e.clientY + 'px'; }
  } else ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), r: orbit.r, z: VIEW.zoom }; }
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { }
});
canvas.addEventListener('pointermove', e => {
  if (mode === 'pool') { if (e.pointerType === 'mouse' || ptr.has(e.pointerId)) poolPointer('move', e); return; }
  if (joy && e.pointerId === joy.id) {
    let dx = e.clientX - joy.x0, dy = e.clientY - joy.y0; const d = Math.hypot(dx, dy), m = 46;
    if (d > m) { dx *= m / d; dy *= m / d; }
    joy.dx = dx / m; joy.dy = dy / m; joyEl.firstElementChild.style.transform = `translate(${dx}px,${dy}px)`; return;
  }
  if ((mode === 'fp' || mode === 'seat') && locked) { fp.yaw -= e.movementX * 0.0022; fp.pitch = clamp(fp.pitch - e.movementY * 0.0022, -1.3, 1.3); return; }
  const p = ptr.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (ptr.size === 2 && pinch && mode === 'orbit') { const [a, b] = [...ptr.values()]; orbit.r = clamp(pinch.r * pinch.d / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), 6, 22); return; }
  if (ptr.size === 2 && pinch && VIEW.third && inRoom) { const [a, b] = [...ptr.values()]; VIEW.zoom = clamp(pinch.z * pinch.d / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), 1.4, 4.5); return; }
  if (mode === 'fp' || mode === 'seat') { const k = e.pointerType === 'touch' ? 0.006 : 0.004; fp.yaw -= dx * k; fp.pitch = clamp(fp.pitch - dy * k, -1.3, 1.3); }
  else if (mode === 'orbit') { orbit.th -= dx * 0.005; orbit.ph = clamp(orbit.ph - dy * 0.004, 0.3, 1.38); orbit.idle = 0; }
});
const ptrUp = e => { if (mode === 'pool' && e.type === 'pointerup') poolPointer('up', e); if (joy && e.pointerId === joy.id) { joy = null; joyHome(); joyEl.hidden = !isTouch || mode !== 'fp'; } ptr.delete(e.pointerId); if (ptr.size < 2) pinch = null; };
canvas.addEventListener('pointerup', ptrUp); canvas.addEventListener('pointercancel', ptrUp);
canvas.addEventListener('wheel', e => {
  if (mode === 'orbit') { e.preventDefault(); orbit.r = clamp(orbit.r * Math.exp(e.deltaY * 0.001), 6, 22); orbit.idle = 0; }
  else if (VIEW.third && inRoom) { e.preventDefault(); VIEW.zoom = clamp(VIEW.zoom * Math.exp(e.deltaY * 0.001), 1.4, 4.5); }
}, { passive: false });

/* colisão do visitante com móveis e pessoas */
/* Cabine do elevador: livre por dentro; o vão da porta só passa com as portas abertas. */
function elevatorSpace(x, z, radius) {
  for (const f of FLOORS) {
    const d = (x - f.wx) * -f.dir, side = Math.abs(z - f.z);
    if (d >= 0.08 + radius && d <= CAB.depth - radius && side <= CAB.half - radius) return true;
    if (d > -0.6 && d < 0.09 + radius && side <= 0.55 - radius && f.open > 0.8) return true;
  }
  return false;
}
function wallBlocked(x, z, radius = PR) {
  if (elevatorSpace(x, z, radius)) return false;
  if (z <= RD - radius) {
    if (x < -RW + radius || x > RW - radius || z < -RD + radius) return true;
  } else {
    const disco = x >= -4 + radius && x <= 4 - radius;
    const annex = x >= 4 + radius && x <= 12 - radius;
    /* Andares separados: sem passagens; só o elevador liga as salas. */
    if ((!disco && !annex) || (disco && z > 14 - radius) || (annex && z > 22 - radius)) return true;
    if (z < RD + radius) return true;
    if (annex && z > 14 - radius && z < 14 + radius) return true;
  }
  return false;
}
function roomBlocked(x, z, radius = PR) {
  if (wallBlocked(x, z, radius)) return true;
  for (const c of COLL) if (x > c.minX - radius && x < c.maxX + radius && z > c.minZ - radius && z < c.maxZ + radius) return true;
  return false;
}
function blocked(x, z) {
  if (roomBlocked(x, z)) return true;
  for (const r of robots) { const p = r.P.root.position; if ((x - p.x) ** 2 + (z - p.z) ** 2 < (PR + 0.24) ** 2) return true; }
  for (const m of STAFF.members) { const p = m.P.root.position; if ((x - p.x) ** 2 + (z - p.z) ** 2 < (PR + 0.22) ** 2) return true; }
  return false;
}
function stepFP(dt) {
  let f = 0, s = 0;
  if (keys.KeyW || keys.ArrowUp) f += 1; if (keys.KeyS || keys.ArrowDown) f -= 1;
  if (keys.KeyD || keys.ArrowRight) s += 1; if (keys.KeyA || keys.ArrowLeft) s -= 1;
  if (joy) { f -= joy.dy; s += joy.dx; }
  /* Joystick empurrado até o fim corre, como o Shift no teclado. */
  const run = keys.ShiftLeft || keys.ShiftRight || MOBILE.run || (joy && Math.hypot(joy.dx, joy.dy) > 0.92), sp = run ? 3.2 : 1.6, len = Math.hypot(f, s);
  if (len > 1) { f /= len; s /= len; }
  const sy = Math.sin(fp.yaw), cy = Math.cos(fp.yaw);
  const tx = (-sy * f + cy * s) * sp, tz = (-cy * f - sy * s) * sp;
  fp.vel.x = damp(fp.vel.x, tx, 10, dt); fp.vel.z = damp(fp.vel.z, tz, 10, dt);
  const nx = fp.pos.x + fp.vel.x * dt, nz = fp.pos.z + fp.vel.z * dt;
  if (!blocked(nx, fp.pos.z)) fp.pos.x = nx; else fp.vel.x = 0;
  if (!blocked(fp.pos.x, nz)) fp.pos.z = nz; else fp.vel.z = 0;
  const v = Math.hypot(fp.vel.x, fp.vel.z);
  /* O corpo vira para onde anda; parado em primeira pessoa, volta a olhar para frente. */
  if (v > 0.25) fp.body = angDamp(fp.body, Math.atan2(fp.vel.x, fp.vel.z), 10, dt);
  else if (!VIEW.third) fp.body = angDamp(fp.body, fp.yaw + Math.PI, 6, dt);
  fp.bob += v * dt * 5.2;
  const bob = reduceMotion ? 0 : Math.sin(fp.bob) * 0.022 * Math.min(1, v / 1.6);
  camera.position.set(fp.pos.x, EYE + bob, fp.pos.z);
  camera.quaternion.copy(fpQuat(fp.yaw, fp.pitch));
}
function stepOrbit(dt) {
  orbit.idle += dt;
  if (orbit.idle > 3 && !reduceMotion) orbit.th += dt * 0.045;
  const o = orbitPose({}); camera.position.copy(o.pos); camera.quaternion.copy(o.q);
}
function stepTween(dt) {
  const tw = tween; tw.t += dt / tw.dur; const k = tw.t >= 1 ? 1 : tw.t < 0.5 ? 4 * tw.t ** 3 : 1 - (-2 * tw.t + 2) ** 3 / 2;
  camera.position.lerpVectors(tw.p0, tw.p1, k); camera.quaternion.slerpQuaternions(tw.q0, tw.q1, k);
  if (tw.t >= 1) { tween = null; tw.done(); }
}
