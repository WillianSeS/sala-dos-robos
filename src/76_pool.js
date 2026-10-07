
/* ================= sinuca jogável (física 2D sobre a mesa) ================= */
const POOL = { cx: 2.6, cz: 4.3, R: 0.0286, hx: 1.22, hz: 0.61, y: 0.8, active: false, state: 'idle', turn: 'you', score: { you: 0, bot: 0 },
  opp: null, aim: 0, power: 0, charging: false, chargeT: 0, shotPotted: 0, cueFoul: false, botT: 0, botAim: 0, botPow: 0, stroke: 0, side: 1, back: null, solo: false };
const POCKETS = [[-1.215, -0.6, 0.066], [0, -0.635, 0.058], [1.215, -0.6, 0.066], [-1.215, 0.6, 0.066], [0, 0.635, 0.058], [1.215, 0.6, 0.066]];
const BALL_COL = [null, '#f2c230', '#1d4fbf', '#d0312d', '#5b2a86', '#ef7d22', '#1f7a3a', '#7a1f2b', '#111111', '#f2c230', '#1d4fbf', '#d0312d', '#5b2a86', '#ef7d22', '#1f7a3a', '#7a1f2b'];
function ballTex(n) {
  return canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = n === 0 ? '#f4f1e8' : n >= 9 ? '#f4f1e8' : BALL_COL[n]; g.fillRect(0, 0, w, h);
    if (n >= 9) { g.fillStyle = BALL_COL[n]; g.fillRect(0, h * 0.3, w, h * 0.4); }
    if (n > 0) for (const cx of [w * 0.25, w * 0.75]) {
      g.fillStyle = '#f4f1e8'; g.beginPath(); g.ellipse(cx, h / 2, 17, 21, 0, 0, 7); g.fill();
      g.fillStyle = '#151515'; g.font = '700 24px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), cx, h / 2 + 1);
    }
    if (n === 0) { g.fillStyle = '#c0392b'; g.beginPath(); g.arc(w * 0.25, h / 2, 5, 0, 7); g.fill(); }
  });
}
const ballGeo = new THREE.SphereGeometry(POOL.R, 24, 16);
const balls = [];
for (let n = 0; n < 16; n++) {
  const m = new THREE.Mesh(ballGeo, M({ map: ballTex(n), roughness: 0.12 })); m.castShadow = true; GROUPS.main.add(m);
  balls.push({ n, m, x: 0, z: 0, vx: 0, vz: 0, on: true, sink: 0 });
}
const cueStick = new THREE.Mesh(PG.cue, cueMat); cueStick.castShadow = true; cueStick.visible = false; GROUPS.main.add(cueStick);
const aimMat = new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.03, gapSize: 0.02, transparent: true, opacity: 0.8 });
const aimLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]), aimMat); aimLine.visible = false; GROUPS.main.add(aimLine);
const objLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]), new THREE.LineBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.8 })); objLine.visible = false; GROUPS.main.add(objLine);
const ghost = new THREE.Mesh(new THREE.RingGeometry(POOL.R * 0.92, POOL.R, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, side: THREE.DoubleSide })); ghost.rotation.x = -Math.PI / 2; ghost.visible = false; GROUPS.main.add(ghost);

function rack() {
  const R = POOL.R, rest = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15].sort(() => Math.random() - 0.5);
  const order = []; let k = 0;
  for (let row = 0; row < 5; row++) for (let j = 0; j <= row; j++) order.push(row === 2 && j === 1 ? 8 : rest[k++]);
  k = 0;
  for (let row = 0; row < 5; row++) for (let j = 0; j <= row; j++) { const b = balls[order[k++]]; b.x = POOL.cx + 0.55 + row * R * 1.75; b.z = POOL.cz + (j - row / 2) * R * 2.02; }
  balls[0].x = POOL.cx - 0.62; balls[0].z = POOL.cz;
  for (const b of balls) { b.vx = b.vz = 0; b.on = true; b.sink = 0; b.m.visible = true; b.m.quaternion.setFromEuler(new THREE.Euler(rnd(0, 6), rnd(0, 6), rnd(0, 6))); }
  syncBalls(0);
}
const _ax = new THREE.Vector3(), _dq = new THREE.Quaternion();
function syncBalls(dt) {
  for (const b of balls) {
    if (b.on) {
      b.m.position.set(b.x, POOL.y + POOL.R, b.z);
      const sp = Math.hypot(b.vx, b.vz);
      if (sp > 1e-4 && dt > 0) { _ax.set(b.vz, 0, -b.vx).normalize(); _dq.setFromAxisAngle(_ax, sp * dt / POOL.R); b.m.quaternion.premultiply(_dq); }
    } else if (b.sink > 0) { b.sink = Math.max(0, b.sink - dt * 3); b.m.position.y = POOL.y + POOL.R - (1 - b.sink) * 0.07; if (b.sink === 0) b.m.visible = false; }
  }
}
function pot(b) {
  b.on = false; b.vx = b.vz = 0; b.sink = 1;
  if (b.n === 0) POOL.cueFoul = true; else { POOL.shotPotted++; POOL.score[POOL.turn]++; }
}
function stepBalls(dt) {
  const R = POOL.R, sub = 10, h = dt / sub, mx = POOL.hx - R, mz = POOL.hz - R;
  for (let s = 0; s < sub; s++) {
    for (const b of balls) {
      if (!b.on) continue;
      b.x += b.vx * h; b.z += b.vz * h;
      const sp = Math.hypot(b.vx, b.vz);
      if (sp > 0) { const dec = Math.min(sp, (0.2 + sp * 0.1) * h); b.vx -= b.vx / sp * dec; b.vz -= b.vz / sp * dec; }
      const lx = b.x - POOL.cx, lz = b.z - POOL.cz;
      let fell = false, mouth = false;
      for (const [px, pz, pr] of POCKETS) { const d = Math.hypot(lx - px, lz - pz); if (d < pr) { fell = true; break; } if (d < 0.12) mouth = true; }
      if (fell) { pot(b); continue; }
      if (!mouth) {
        if (lx < -mx) { b.x = POOL.cx - mx; b.vx = Math.abs(b.vx) * 0.78; } else if (lx > mx) { b.x = POOL.cx + mx; b.vx = -Math.abs(b.vx) * 0.78; }
        if (lz < -mz) { b.z = POOL.cz - mz; b.vz = Math.abs(b.vz) * 0.78; } else if (lz > mz) { b.z = POOL.cz + mz; b.vz = -Math.abs(b.vz) * 0.78; }
      } else if (Math.abs(lx) > POOL.hx + 0.05 || Math.abs(lz) > POOL.hz + 0.05) pot(b);
    }
    for (let i = 0; i < 16; i++) {
      const a = balls[i]; if (!a.on) continue;
      for (let j = i + 1; j < 16; j++) {
        const c = balls[j]; if (!c.on) continue;
        const dx = c.x - a.x, dz = c.z - a.z, d2 = dx * dx + dz * dz;
        if (d2 >= 4 * R * R || d2 === 0) continue;
        const d = Math.sqrt(d2), nx = dx / d, nz = dz / d, ov = 2 * R - d;
        a.x -= nx * ov / 2; a.z -= nz * ov / 2; c.x += nx * ov / 2; c.z += nz * ov / 2;
        const rv = (c.vx - a.vx) * nx + (c.vz - a.vz) * nz; if (rv >= 0) continue;
        const J = -(1 + 0.95) * rv / 2;
        a.vx -= J * nx; a.vz -= J * nz; c.vx += J * nx; c.vz += J * nz;
      }
    }
  }
  let moving = false;
  for (const b of balls) { if (!b.on) continue; if (Math.hypot(b.vx, b.vz) < 0.01) b.vx = b.vz = 0; else moving = true; }
  return moving;
}
/* mira: até onde a branca vai e que bola ela acerta primeiro */
function traceAim(a) {
  const c = balls[0], dx = Math.cos(a), dz = Math.sin(a), R2 = 2 * POOL.R;
  let tMin = Infinity, hit = null;
  for (const b of balls) {
    if (!b.on || b.n === 0) continue;
    const ox = b.x - c.x, oz = b.z - c.z, t = ox * dx + oz * dz; if (t <= 0) continue;
    const perp2 = ox * ox + oz * oz - t * t; if (perp2 > R2 * R2) continue;
    const th = t - Math.sqrt(R2 * R2 - perp2); if (th < tMin) { tMin = th; hit = b; }
  }
  const mx = POOL.hx - POOL.R, mz = POOL.hz - POOL.R;
  const tx = dx > 0 ? (POOL.cx + mx - c.x) / dx : dx < 0 ? (POOL.cx - mx - c.x) / dx : Infinity;
  const tz = dz > 0 ? (POOL.cz + mz - c.z) / dz : dz < 0 ? (POOL.cz - mz - c.z) / dz : Infinity;
  const tWall = Math.min(tx, tz);
  if (tWall < tMin) { tMin = tWall; hit = null; }
  return { t: tMin, hit, gx: c.x + dx * tMin, gz: c.z + dz * tMin };
}
function segClear(x0, z0, x1, z1, skip) {
  const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz) || 1e-6, ux = dx / L, uz = dz / L, R2 = 2 * POOL.R;
  for (const b of balls) {
    if (!b.on || skip.includes(b)) continue;
    const ox = b.x - x0, oz = b.z - z0, t = ox * ux + oz * uz; if (t < 0 || t > L) continue;
    if (ox * ox + oz * oz - t * t < R2 * R2 * 0.95) return false;
  }
  return true;
}
function botPlan() {
  const c = balls[0], R = POOL.R; let best = null;
  for (const b of balls) {
    if (!b.on || b.n === 0) continue;
    for (const [px, pz] of POCKETS) {
      const PX = POOL.cx + px, PZ = POOL.cz + pz, dx = PX - b.x, dz = PZ - b.z, d = Math.hypot(dx, dz), ux = dx / d, uz = dz / d;
      const gx = b.x - ux * 2 * R, gz = b.z - uz * 2 * R, cx = gx - c.x, cz = gz - c.z, cd = Math.hypot(cx, cz);
      const cut = Math.acos(clamp((cx * ux + cz * uz) / cd, -1, 1)); if (cut > 1.15) continue;
      if (!segClear(c.x, c.z, gx, gz, [c, b]) || !segClear(b.x, b.z, PX, PZ, [b])) continue;
      const sc = cut * 1.6 + d * 0.7 + cd * 0.3;
      if (!best || sc < best.sc) best = { sc, a: Math.atan2(cz, cx), pw: clamp(0.28 + (cd + d) * 0.2 + cut * 0.15, 0.3, 0.85) };
    }
  }
  if (!best) { let near = null, nd = Infinity; for (const b of balls) if (b.on && b.n) { const d = Math.hypot(b.x - c.x, b.z - c.z); if (d < nd) { nd = d; near = b; } } best = { a: near ? Math.atan2(near.z - c.z, near.x - c.x) : 0, pw: 0.55 }; }
  POOL.botAim = best.a + gauss() * 0.02; POOL.botPow = best.pw;
}
function shoot(a, power) {
  const c = balls[0], sp = 0.35 + power * 3.9;
  c.vx = Math.cos(a) * sp; c.vz = Math.sin(a) * sp;
  POOL.state = 'moving'; POOL.shotPotted = 0; POOL.cueFoul = false; POOL.stroke = 0.12; POOL.power = 0; POOL.charging = false;
}
function placeCue() {
  const c = balls[0]; c.on = true; c.sink = 0; c.m.visible = true; c.vx = c.vz = 0;
  for (let k = 0; k < 40; k++) { c.x = POOL.cx - 0.62 + (k % 5) * 0.06; c.z = POOL.cz + (Math.floor(k / 5) - 2) * 0.07; if (balls.every(b => b === c || !b.on || Math.hypot(b.x - c.x, b.z - c.z) > 2.1 * POOL.R)) break; }
}
const oppName = () => POOL.opp ? POOL.opp.person.split(' ')[0] : 'Ninguém';
function poolHUD() {
  const you = POOL.turn === 'you' ? ' class="on"' : '', bot = POOL.turn === 'bot' ? ' class="on"' : '';
  $('poolScore').innerHTML = POOL.solo ? `<span class="on">Treino livre</span> · ${POOL.score.you} bolas` : `<span${you}>Você ${POOL.score.you}</span> × <span${bot}>${POOL.score.bot} ${oppName()}</span>`;
}
function poolMsg(t) { $('poolMsg').textContent = t; }
function onRest() {
  const who = POOL.turn, other = who === 'you' ? 'bot' : 'you', name = who === 'you' ? 'Você' : oppName();
  if (POOL.cueFoul) { placeCue(); poolMsg(name + ' encaçapou a branca. Falta!'); if (!POOL.solo) POOL.turn = other; }
  else if (POOL.shotPotted > 0) poolMsg(name + (POOL.shotPotted > 1 ? ' encaçapou ' + POOL.shotPotted + ' bolas' : ' encaçapou uma bola') + '. Joga de novo.');
  else { poolMsg(POOL.solo ? 'Nenhuma bola caiu.' : who === 'you' ? 'Errou. Vez de ' + oppName() + '.' : oppName() + ' errou. Sua vez.'); if (!POOL.solo) POOL.turn = other; }
  if (balls.every(b => b.n === 0 || !b.on)) {
    POOL.state = 'over';
    const y = POOL.score.you, o = POOL.score.bot;
    poolMsg(POOL.solo ? 'Mesa limpa! Toque em Jogar de novo.' : y > o ? 'Você venceu ' + y + ' a ' + o + '!' : y < o ? oppName() + ' venceu ' + o + ' a ' + y + '.' : 'Empate em ' + y + '!');
    $('poolShoot').textContent = 'Jogar de novo';
    if (!POOL.solo) saveRanking(y > o ? 'win' : y < o ? 'loss' : 'draw');
  } else {
    POOL.state = POOL.turn === 'you' ? 'aim' : 'botWait'; POOL.botT = performance.now() / 1000 + 1.3;
  }
  poolHUD();
}
/* escolher adversário: quem está na sinuca, ou alguém sem operação aberta */
function pickOpponent(pref) {
  if (pref && !pref.trade) return pref;
  let r = robots.find(x => x.spot === 'poolShoot' || x.spot === 'poolWait');
  if (r) return r;
  r = robots.find(x => x.mode === 'seated' && !x.trade) || robots.find(x => x.mode === 'lounge' && !x.trade);
  return r || null;
}
function callToPool(r) {
  if (r.spot === 'poolShoot' || r.spot === 'poolWait') { r.t1 = simT + 999; return; }
  if (r.mode === 'seated') { if (SPOTS.poolWait.busy && SPOTS.poolWait.busy !== r.id) { const o = robots.find(x => x.id === SPOTS.poolWait.busy); if (o) { o.t1 = simT; } } if (!goBreak(r, SPOTS.poolWait.busy ? 'poolShoot' : 'poolWait')) goBreak(r); }
  else if (r.mode === 'lounge') { const from = SPOTS[r.spot].node; SPOTS[r.spot].busy = null; const k = SPOTS.poolWait.busy ? 'poolShoot' : 'poolWait'; SPOTS[k].busy = r.id; r.spot = k; r.path = [...route(from, SPOTS[k].node), [SPOTS[k].x, SPOTS[k].z]]; r.mode = 'walking'; r.back = false; }
  r.t1 = simT + 999;
}
function startPool(pref) {
  if (seatState.s) { standUp(() => startPool(pref)); return; }
  const r = pickOpponent(pref);
  POOL.opp = r; POOL.solo = !r; if (r) { r.inPool = true; callToPool(r); }
  POOL.back = fp.pos.clone(); POOL.side = fp.pos.z >= POOL.cz ? 1 : -1;
  rack(); POOL.score = { you: 0, bot: 0 }; POOL.turn = 'you'; POOL.state = 'aim'; POOL.active = true;
  POOL.aim = 0; $('poolShoot').textContent = isTouch ? 'Segure para tacar' : 'Segure o clique para tacar';
  poolMsg(r ? 'Você contra ' + r.person + '. Você começa!' : 'Todos estão operando agora. Treino livre!');
  $('poolTip').textContent = isTouch ? 'Arraste o dedo na mesa para mirar; segure o botão e solte para tacar.' : 'Mire com o mouse; segure o clique (ou Espaço) e solte para tacar. Esc sai.';
  poolHUD(); $('poolHud').hidden = false; $('hud').hidden = true; $('mp').classList.add('off'); btnView.hidden = true; cross.hidden = true; help.hidden = true;
  if (document.pointerLockElement) document.exitPointerLock();
  mode = 'pool';
}
function exitPool() {
  POOL.active = false; POOL.state = 'idle'; $('poolHud').hidden = true; $('hud').hidden = false; $('mp').classList.remove('off'); btnView.hidden = false; if (lampMeshes) for (const m of lampMeshes) m.visible = true; aimLine.visible = objLine.visible = ghost.visible = cueStick.visible = false;
  if (POOL.opp) { POOL.opp.inPool = false; POOL.opp.t1 = simT + rnd(3, 8); }
  POOL.opp = null;
  const b = POOL.back || new THREE.Vector3(POOL.cx, 0, POOL.cz + 1.3 * POOL.side);
  fp.pos.copy(b); fp.yaw = Math.atan2(-(POOL.cx - b.x), -(POOL.cz - b.z)); fp.pitch = -0.2;
  startTween(new THREE.Vector3(b.x, EYE, b.z), fpQuat(fp.yaw, fp.pitch), reduceMotion ? 0.01 : 0.8, () => { mode = 'fp'; cross.hidden = isTouch; });
}
/* câmera da sinuca: vista 3/4 do lado do jogador (de lado na tela em pé) */
const _pc = new THREE.Vector3(), _pt = new THREE.Vector3(POOL.cx, 0.72, POOL.cz);
let lampMeshes = null;
function stepPoolCam(dt) {
  const port = innerWidth < innerHeight;
  if (!lampMeshes) lampMeshes = GROUPS.main.children.filter(m => m.material === mat.lampGreen);
  for (const m of lampMeshes) m.visible = !(port && POOL.active);
  if (port) { const oppX = POOL.opp ? POOL.opp.P.root.position.x : POOL.cx - 1; const end = oppX < POOL.cx ? 1 : -1; _pc.set(POOL.cx + 2.3 * end, 2.35, POOL.cz); }
  else _pc.set(POOL.cx, 2.3, POOL.cz + 1.95 * POOL.side);
  camera.position.lerp(_pc, 1 - Math.exp(-6 * dt));
  camera.lookAt(_pt);
}
const _ray = new THREE.Raycaster(), _ndc = new THREE.Vector2(), _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(POOL.y + POOL.R)), _hit = new THREE.Vector3();
function aimAt(clientX, clientY) {
  _ndc.set(clientX / innerWidth * 2 - 1, -(clientY / innerHeight) * 2 + 1); _ray.setFromCamera(_ndc, camera);
  if (_ray.ray.intersectPlane(_plane, _hit)) { const c = balls[0]; if (Math.hypot(_hit.x - c.x, _hit.z - c.z) > 0.02) POOL.aim = Math.atan2(_hit.z - c.z, _hit.x - c.x); }
}
function poolPointer(type, e) {
  if (!POOL.active) return;
  if (type === 'move' || type === 'down') { if (POOL.state === 'aim' && !POOL.charging) aimAt(e.clientX, e.clientY); }
  if (e.pointerType === 'mouse' && e.button === 0) {
    if (type === 'down') startCharge(); else if (type === 'up') releaseCharge();
  }
}
function startCharge() { if (POOL.state === 'over') { startPool(POOL.opp); return; } if (POOL.state !== 'aim') return; POOL.charging = true; POOL.chargeT = 0; }
function releaseCharge() { if (!POOL.charging || POOL.state !== 'aim') { POOL.charging = false; return; } POOL.charging = false; if (POOL.power > 0.03) shoot(POOL.aim, POOL.power); }
const shootBtn = $('poolShoot');
shootBtn.addEventListener('pointerdown', e => { e.preventDefault(); startCharge(); });
shootBtn.addEventListener('pointerup', e => { e.preventDefault(); releaseCharge(); });
shootBtn.addEventListener('pointerleave', () => { if (POOL.charging) releaseCharge(); });
$('poolExit').addEventListener('click', exitPool);
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3();
function stepPool(dt) {
  if (!POOL.active) { syncBalls(dt); return; }
  if (POOL.state === 'moving') { if (!stepBalls(dt)) onRest(); }
  if (POOL.charging) { POOL.chargeT += dt; POOL.power = 0.5 - 0.5 * Math.cos(POOL.chargeT * Math.PI / 1.1); }
  if (keys.ArrowLeft || keys.KeyA) POOL.aim -= dt * 0.6; if (keys.ArrowRight || keys.KeyD) POOL.aim += dt * 0.6;
  /* vez do robô */
  const now = performance.now() / 1000;
  if (POOL.state === 'botWait' && now > POOL.botT) { botPlan(); POOL.state = 'botAim'; POOL.botT = now + 1.1; POOL.aim = POOL.botAim; }
  if (POOL.state === 'botAim') { POOL.power = Math.min(POOL.botPow, (1.1 - (POOL.botT - now)) / 1.1 * POOL.botPow); if (now > POOL.botT) shoot(POOL.botAim, POOL.botPow); }
  syncBalls(dt);
  $('poolPow').style.width = Math.round(POOL.power * 100) + '%';
  /* taco e linha de mira */
  const c = balls[0], aiming = (POOL.state === 'aim' || POOL.state === 'botAim') && c.on;
  cueStick.visible = aiming || POOL.stroke > 0;
  if (POOL.stroke > 0) POOL.stroke -= dt;
  if (cueStick.visible) {
    const dx = Math.cos(POOL.aim), dz = Math.sin(POOL.aim), pull = POOL.stroke > 0 ? -0.02 : 0.03 + POOL.power * 0.25;
    _v1.set(c.x - dx * (POOL.R + pull), POOL.y + POOL.R * 1.1, c.z - dz * (POOL.R + pull));
    _v2.set(_v1.x - dx * 1.45, _v1.y + 0.16, _v1.z - dz * 1.45);
    cueStick.position.copy(_v2); cueStick.lookAt(_v1);
  }
  const showAim = POOL.state === 'aim' && c.on;
  aimLine.visible = ghost.visible = showAim; objLine.visible = false;
  if (showAim) {
    const tr = traceAim(POOL.aim), y = POOL.y + POOL.R;
    aimLine.geometry.setFromPoints([_v1.set(c.x, y, c.z), _v2.set(tr.gx, y, tr.gz)]); aimLine.computeLineDistances();
    ghost.position.set(tr.gx, POOL.y + 0.003, tr.gz);
    if (tr.hit) { const nx = tr.hit.x - tr.gx, nz = tr.hit.z - tr.gz, l = Math.hypot(nx, nz) || 1; objLine.visible = true; objLine.geometry.setFromPoints([_v1.set(tr.hit.x, y, tr.hit.z), _v2.set(tr.hit.x + nx / l * 0.3, y, tr.hit.z + nz / l * 0.3)]); }
  }
}
rack();
