
/* ================= controles: vista aérea e primeira pessoa ================= */
let mode = 'orbit';
const portrait = () => innerWidth < innerHeight;
const orbit = { target: new THREE.Vector3(0, -1.1, 0.6), r: 14, th: 0.78, ph: 0.92, idle: 0 };
if (portrait()) { orbit.r = 19; orbit.th = 1.15; orbit.target.set(0, -1.6, 0.2); }
const fp = { pos: new THREE.Vector3(6.6, 0, -4.6), yaw: 1.78, pitch: -0.06, vel: new THREE.Vector3(), bob: 0 };
const EYE = 1.62, PR = 0.28;
const keys = {};
let locked = false, tween = null, inRoom = false;
const btnView = $('btnView'), btnEnter = $('btnEnter'), help = $('help'), cross = $('cross'), joyEl = $('joy');

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
    help.innerHTML = isTouch ? 'Joystick à esquerda para andar · arraste o dedo para olhar · botão à direita interage'
      : '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> andar · mouse olha · <kbd>E</kbd> interage · <kbd>Shift</kbd> corre · <kbd>Esc</kbd> solta o mouse';
    help.hidden = false; help.style.opacity = '1'; setTimeout(() => { help.style.opacity = '0'; }, 7000);
  });
  if (!isTouch) lockMouse();
}
function leaveRoom() {
  if (CASINO.active) exitCasino(); if (mode === 'music') closeMusic(); $('musicOpen').hidden = true;
  if (mode === 'talk') closeTalk(); if (POOL.active) { POOL.active = false; $('poolHud').hidden = true; $('hud').hidden = false; $('mp').classList.remove('off'); if (lampMeshes) for (const m of lampMeshes) m.visible = true; aimLine.visible = objLine.visible = ghost.visible = cueStick.visible = false; if (POOL.opp) { POOL.opp.inPool = false; POOL.opp.t1 = simT + 3; } POOL.opp = null; }
  if (seatState.s) { if (seatState.s.st) seatState.s.st.playerSeated = false; if (SPOTS.sofa.busy === 'player') SPOTS.sofa.busy = null; seatState.s = null; }
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
  if (e.code === 'Escape') { if (mode === 'casino') exitCasino(); else if (mode === 'music') closeMusic(); else if (mode === 'talk') closeTalk(); else if (mode === 'pool') exitPool(); else if (mode === 'seat') standUp(); if (typing) e.target.blur(); return; }
  if (typing) return;
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
    joy = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0 };
    joyEl.hidden = false; joyEl.style.left = e.clientX + 'px'; joyEl.style.top = e.clientY + 'px'; joyEl.firstElementChild.style.transform = '';
  } else ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), r: orbit.r }; }
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
  if (mode === 'fp' || mode === 'seat') { const k = e.pointerType === 'touch' ? 0.006 : 0.004; fp.yaw -= dx * k; fp.pitch = clamp(fp.pitch - dy * k, -1.3, 1.3); }
  else if (mode === 'orbit') { orbit.th -= dx * 0.005; orbit.ph = clamp(orbit.ph - dy * 0.004, 0.3, 1.38); orbit.idle = 0; }
});
const ptrUp = e => { if (mode === 'pool' && e.type === 'pointerup') poolPointer('up', e); if (joy && e.pointerId === joy.id) { joy = null; joyEl.hidden = true; } ptr.delete(e.pointerId); if (ptr.size < 2) pinch = null; };
canvas.addEventListener('pointerup', ptrUp); canvas.addEventListener('pointercancel', ptrUp);
canvas.addEventListener('wheel', e => { if (mode === 'orbit') { e.preventDefault(); orbit.r = clamp(orbit.r * Math.exp(e.deltaY * 0.001), 6, 22); orbit.idle = 0; } }, { passive: false });

/* colisão do visitante com móveis e pessoas */
function blocked(x, z) {
  if (x < -RW + PR || x > RW - PR || z < -RD + PR || z > RD - PR) return true;
  for (const c of COLL) if (x > c.minX - PR && x < c.maxX + PR && z > c.minZ - PR && z < c.maxZ + PR) return true;
  for (const r of robots) { const p = r.P.root.position; if ((x - p.x) ** 2 + (z - p.z) ** 2 < (PR + 0.24) ** 2) return true; }
  return false;
}
function stepFP(dt) {
  let f = 0, s = 0;
  if (keys.KeyW || keys.ArrowUp) f += 1; if (keys.KeyS || keys.ArrowDown) f -= 1;
  if (keys.KeyD || keys.ArrowRight) s += 1; if (keys.KeyA || keys.ArrowLeft) s -= 1;
  if (joy) { f -= joy.dy; s += joy.dx; }
  const run = keys.ShiftLeft || keys.ShiftRight, sp = run ? 3.2 : 1.6, len = Math.hypot(f, s);
  if (len > 1) { f /= len; s /= len; }
  const sy = Math.sin(fp.yaw), cy = Math.cos(fp.yaw);
  const tx = (-sy * f + cy * s) * sp, tz = (-cy * f - sy * s) * sp;
  fp.vel.x = damp(fp.vel.x, tx, 10, dt); fp.vel.z = damp(fp.vel.z, tz, 10, dt);
  const nx = fp.pos.x + fp.vel.x * dt, nz = fp.pos.z + fp.vel.z * dt;
  if (!blocked(nx, fp.pos.z)) fp.pos.x = nx; else fp.vel.x = 0;
  if (!blocked(fp.pos.x, nz)) fp.pos.z = nz; else fp.vel.z = 0;
  const v = Math.hypot(fp.vel.x, fp.vel.z);
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
