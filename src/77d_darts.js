/* ================= jogo de dardos: mira, voo e conquistas locais ================= */
const DARTS_PRIZES = [
  { id: 'bronze', at: 80, icon: '🥉', name: 'Troféu de bronze' },
  { id: 'silver', at: 160, icon: '🥈', name: 'Troféu de prata' },
  { id: 'gold', at: 240, icon: '🏆', name: 'Troféu de ouro' },
  { id: 'bull', at: null, icon: '🎯', name: 'Mestre do centro' },
];
const DARTS_STORE = 'sala-dos-robos:darts:v1';
const DARTS = { active: false, phase: 'idle', throws: 0, total: 9, score: 0, hits: [], best: 0, awards: [], newAwards: [], aim: { x: 0, y: 0 }, actual: { x: 0, y: 0 }, flight: null, back: null, msg: '', swayT: 0 };
try {
  const saved = JSON.parse(localStorage.getItem(DARTS_STORE) || 'null');
  if (saved && saved.v === 1) {
    DARTS.best = Number.isInteger(saved.best) ? clamp(saved.best, 0, 540) : 0;
    if (Array.isArray(saved.awards)) DARTS.awards = [...new Set(saved.awards.filter(id => DARTS_PRIZES.some(p => p.id === id)))];
  }
} catch (_) { /* Navegadores com armazenamento bloqueado continuam jogando. */ }
const dartsStyle = document.createElement('style');
dartsStyle.textContent = `
#dartsHud{position:fixed;inset:0;z-index:5;pointer-events:none;font-family:var(--mono);color:#edf8f4}
.darts-top{position:absolute;top:calc(14px + env(safe-area-inset-top,0px));left:16px;right:16px;max-width:590px;margin:auto;padding:13px 16px;border:1px solid #8df4d740;border-radius:14px;background:#09171ded;display:flex;align-items:center;justify-content:space-between;gap:12px;box-shadow:0 16px 45px #0005}
.darts-top b{font-size:16px;letter-spacing:.035em}.darts-top small{display:block;margin-top:5px;font-size:11px;color:#9bb9b9}.darts-counter{text-align:right;font-size:11px;color:#b5d4cb}.darts-counter strong{display:block;color:#8bfcdf;font-size:24px}
.darts-bottom{pointer-events:auto;position:absolute;bottom:calc(14px + env(safe-area-inset-bottom,0px));left:12px;right:12px;margin:auto;max-width:590px;padding:12px 16px;border:1px solid #8df4d738;border-radius:16px;background:#09171df2;box-shadow:0 16px 45px #0005}
.darts-bottom p{margin:0 0 8px;font-size:12px;line-height:1.5;color:#cee6dd}.darts-actions{display:flex;align-items:center;gap:8px}.darts-actions .btn{min-height:42px;flex:1}.darts-actions .btn:first-child{border-color:#66e2b3;background:#205744}.darts-actions .btn:disabled{opacity:.45;cursor:default}.darts-prizes{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 9px;font-size:10px;color:#a4bab7}.darts-prizes span{border:1px solid #789b9b35;padding:5px 7px;border-radius:7px}.darts-prizes .earned{color:#f6d78b;border-color:#ddb85980;background:#8f6a2425}.darts-history{display:flex;gap:5px;align-items:center;font-size:10px;color:#b2c9c1;margin-bottom:8px}.darts-history span{min-width:23px;padding:3px;border-radius:5px;text-align:center;background:#ffffff0b}.darts-history .last{color:#8bfcdf;background:#43bd9330}#dartsProgress{display:block;width:100%;height:4px;accent-color:#6bebc4;margin:0 0 9px}
@media(max-width:600px){.darts-top{padding:11px 12px}.darts-top b{font-size:14px}.darts-counter strong{font-size:21px}.darts-bottom{padding:10px 12px}.darts-bottom p{font-size:11px}.darts-prizes{gap:4px}.darts-prizes span{padding:4px 5px;font-size:9px}.darts-actions .btn{font-size:11px;padding:9px 8px}}
@media(max-height:500px){.darts-top{left:12px;right:auto;width:210px;padding:9px 11px;top:12px}.darts-top small{display:none}.darts-top b{font-size:13px}.darts-counter strong{font-size:19px}.darts-bottom{max-width:560px;padding:9px 12px;bottom:8px}.darts-prizes,.darts-history,#dartsProgress{display:none}.darts-bottom p{font-size:11px;margin-bottom:5px}.darts-actions .btn{min-height:34px}}
`;
document.head.appendChild(dartsStyle);
const dartsHud = document.createElement('section'); dartsHud.id = 'dartsHud'; dartsHud.hidden = true; dartsHud.setAttribute('aria-label', 'Jogo de dardos');
dartsHud.innerHTML = `<div class="darts-top"><div><b>🎯 DARDOS DO CLUBE</b><small id="dartsRound"></small></div><div class="darts-counter"><strong id="dartsScore">0</strong>pontos</div></div><div class="darts-bottom"><p id="dartsMsg" aria-live="polite"></p><div class="darts-history" id="dartsHistory" aria-label="Pontuação de cada dardo"></div><progress id="dartsProgress" max="240" value="0" aria-label="Progresso até o troféu de ouro"></progress><div id="dartsPrizes" class="darts-prizes" aria-label="Sua coleção de prêmios digitais"></div><div class="darts-actions"><button id="dartsThrow" class="btn">Lançar dardo</button><button id="dartsAgain" class="btn" hidden>Jogar novamente</button><button id="dartsExit" class="btn sm">Sair dos dardos</button></div></div>`;
document.body.appendChild(dartsHud);
const dartsGo = document.createElement('button'); dartsGo.id = 'dartsGo'; dartsGo.className = 'btn sm'; dartsGo.hidden = true; dartsGo.textContent = '🎯 Dardos';
setLabel(dartsGo,'🎯','Dardos'); document.querySelector('.disco-shortcuts').appendChild(dartsGo); dartsGo.onclick = startDarts;
$('dartsThrow').onclick = () => throwDart(); $('dartsAgain').onclick = resetDarts; $('dartsExit').onclick = exitDarts;
const dartRay = new THREE.Raycaster(), dartNdc = new THREE.Vector2();
const dartAimPoint = new THREE.Vector3(), dartTipForward = new THREE.Vector3(0, 0, 1);
const dartGeo = { tip: new THREE.ConeGeometry(.004, .035, 8), shaft: new THREE.CylinderGeometry(.003, .003, .14, 8), barrel: new THREE.CylinderGeometry(.008, .006, .06, 12), fin: new THREE.BoxGeometry(.038, .002, .048) };
const dartSteel = M({ color: '#d9e4e6', metalness: .82, roughness: .26 });
const dartColors = ['#74ecd3', '#ffcc68', '#ef8ab9'].map(color => M({ color, roughness: .55, metalness: .2 }));
function dartScore(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { points: 0, base: 0, multiplier: 0, label: 'Fora do alvo' };
  const r = Math.hypot(x, y);
  if (r > 1) return { points: 0, base: 0, multiplier: 0, label: 'Fora do alvo' };
  if (r < .0374) return { points: 50, base: 25, multiplier: 2, label: 'Centro! 50 pontos', bull: true };
  if (r < .0935) return { points: 25, base: 25, multiplier: 1, label: 'Anel central · 25 pontos' };
  const angle = (Math.atan2(x, y) + Math.PI * 2 + Math.PI / 20) % (Math.PI * 2);
  const base = DARTS_NUMBERS[Math.floor(angle / (Math.PI / 10)) % 20];
  const multiplier = r >= .953 ? 2 : r >= .582 && r <= .629 ? 3 : 1;
  return { points: base * multiplier, base, multiplier, label: (multiplier === 3 ? 'Triplo ' : multiplier === 2 ? 'Duplo ' : '') + base + ' · ' + base * multiplier + ' pontos' };
}
function createThrownDart() {
  const dart = new THREE.Group(), color = dartColors[Math.floor(DARTS.throws / 3) % 3];
  mesh(dartGeo.tip, dartSteel, dart, 0, 0, -.0175, Math.PI / 2, 0, 0, 1, 1, 1, false);
  mesh(dartGeo.barrel, color, dart, 0, 0, -.062, Math.PI / 2, 0, 0, 1, 1, 1, false);
  mesh(dartGeo.shaft, dartSteel, dart, 0, 0, -.144, Math.PI / 2, 0, 0, 1, 1, 1, false);
  for (const angle of [0, Math.PI / 2]) mesh(dartGeo.fin, color, dart, 0, 0, -.21, 0, 0, angle, 1, 1, 1, false);
  DARTS_VISUAL.darts.add(dart); return dart;
}
function dartsPrizeView() {
  $('dartsPrizes').replaceChildren();
  for (const [i, prize] of DARTS_PRIZES.entries()) {
    const earned = DARTS.awards.includes(prize.id), el = document.createElement('span');
    el.className = earned ? 'earned' : ''; el.textContent = prize.icon + ' ' + (prize.at === null ? 'Centro 50' : prize.at + ' pts') + (earned ? ' ✓' : '');
    el.title = prize.name + (earned ? ' conquistado' : ' — conclua a partida para ganhar');
    $('dartsPrizes').appendChild(el);
    if (i < 3) DARTS_VISUAL.awards[i].material.opacity = earned ? .95 : .2;
  }
}
dartsPrizeView();
function dartsRender() {
  const done = DARTS.phase === 'done', flight = DARTS.phase === 'flight';
  $('dartsScore').textContent = DARTS.score;
  $('dartsRound').textContent = (done ? 'Partida concluída' : 'Rodada ' + Math.min(3, Math.floor(DARTS.throws / 3) + 1) + '/3 · ' + DARTS.throws + '/9 dardos') + ' · recorde ' + DARTS.best;
  $('dartsMsg').textContent = DARTS.msg;
  $('dartsThrow').hidden = done; $('dartsThrow').disabled = flight; $('dartsAgain').hidden = !done;
  $('dartsProgress').value = Math.min(240, DARTS.score);
  $('dartsHistory').replaceChildren();
  for (let i = 0; i < 9; i++) {
    const el = document.createElement('span'); el.textContent = DARTS.hits[i] ? DARTS.hits[i].points : '·';
    el.className = i === DARTS.hits.length - 1 ? 'last' : ''; el.title = 'Dardo ' + (i + 1) + (DARTS.hits[i] ? ': ' + DARTS.hits[i].label : ''); $('dartsHistory').appendChild(el);
  }
  dartsPrizeView();
}
function resetDarts() {
  if (!DARTS.active || !['idle', 'done'].includes(DARTS.phase)) return;
  DARTS_VISUAL.darts.clear(); DARTS.phase = 'aim'; DARTS.throws = DARTS.score = 0; DARTS.hits = []; DARTS.newAwards = []; DARTS.flight = null;
  DARTS.aim.x = DARTS.aim.y = 0; DARTS.swayT = 0;
  DARTS.msg = isTouch ? 'Toque no alvo para mirar. Depois toque em Lançar dardo.' : 'Mova a mira e clique no alvo, ou use Espaço para lançar. 9 dardos valem prêmios digitais!';
  DARTS_VISUAL.aim.visible = true; dartsRender();
}
function startDarts() {
  if (!inRoom || DARTS.active || !['fp', 'seat'].includes(mode) || playerFloor()!=='games') return;
  if (seatState.s) { standUp(startDarts); return; }
  closeWelcome(); stopSmoking();
  DARTS.back = { pos: fp.pos.clone(), yaw: fp.yaw, pitch: fp.pitch, hudHidden: $('hud').hidden, mpOff: $('mp').classList.contains('off') };
  if (document.pointerLockElement) document.exitPointerLock();
  for (const k in keys) keys[k] = false; ptr.clear(); joy = pinch = null; joyEl.hidden = true; fp.vel.set(0, 0, 0);
  fp.pos.set(DARTS_LAYOUT.stand.x, 0, DARTS_LAYOUT.stand.z); fp.yaw = -Math.PI / 2; fp.pitch = 0;
  DARTS.active = true; DARTS.phase = 'idle'; mode = 'darts';
  cross.hidden = help.hidden = true; $('hud').hidden = true; $('mp').classList.add('off'); dartsHud.hidden = false;
  resetDarts(); stepDarts(0); stepDartsCamera(0); $('dartsThrow').focus({ preventScroll: true });
}
function exitDarts() {
  if (!DARTS.active) return;
  DARTS.active = false; DARTS.phase = 'idle'; DARTS.flight = null; DARTS_VISUAL.aim.visible = false; dartsHud.hidden = true;
  // Uma rodada interrompida não concede conquistas nem muda o recorde.
  DARTS_VISUAL.darts.clear();
  const back = DARTS.back;
  if (back) {
    const p = back.pos;
    if (!roomBlocked(p.x, p.z)) fp.pos.copy(p); else fp.pos.set(DARTS_LAYOUT.stand.x,0,DARTS_LAYOUT.stand.z);
    fp.yaw = back.yaw; fp.pitch = back.pitch; $('hud').hidden = back.hudHidden; $('mp').classList.toggle('off', back.mpOff);
  }
  fp.vel.set(0, 0, 0); DARTS.back = null;
  camera.fov = portrait() ? 80 : 66; camera.updateProjectionMatrix();
  if (mode === 'darts') { mode = 'fp'; cross.hidden = isTouch; camera.position.set(fp.pos.x, EYE, fp.pos.z); camera.quaternion.copy(fpQuat(fp.yaw, fp.pitch)); }
  for (const k in keys) keys[k] = false;
}
function stepDartsCamera() {
  if (!DARTS.active) return;
  const diameter = Math.max(115, Math.min(innerWidth - 55, innerHeight - (innerHeight < 500 ? 180 : 310), 380));
  const desiredFov = clamp(2 * Math.atan(innerHeight * DARTS_LAYOUT.radius / ((DARTS_LAYOUT.x - DARTS_LAYOUT.stand.x) * diameter)) * 180 / Math.PI, 34, 85);
  if (Math.abs(camera.fov - desiredFov) > .05) { camera.fov = desiredFov; camera.updateProjectionMatrix(); }
  camera.position.set(DARTS_LAYOUT.stand.x, DARTS_LAYOUT.y + .04, DARTS_LAYOUT.stand.z);
  camera.lookAt(DARTS_LAYOUT.x, DARTS_LAYOUT.y - .035, DARTS_LAYOUT.z);
}
function setDartsAim(e) {
  if (!DARTS.active || DARTS.phase !== 'aim') return false;
  const rect = canvas.getBoundingClientRect();
  dartNdc.set((e.clientX - rect.left) / rect.width * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
  camera.updateMatrixWorld(); DARTS_VISUAL.pick.updateWorldMatrix(true, false); dartRay.setFromCamera(dartNdc, camera);
  const hit = dartRay.intersectObject(DARTS_VISUAL.pick, false)[0]; if (!hit) return false;
  const local = DARTS_VISUAL.pick.worldToLocal(hit.point.clone());
  DARTS.aim.x = clamp(local.x / DARTS_LAYOUT.scoreRadius, -1.3, 1.3); DARTS.aim.y = clamp(local.y / DARTS_LAYOUT.scoreRadius, -1.3, 1.3);
  return true;
}
function dartsPointer(type, e) {
  if (!DARTS.active) return;
  if (type === 'move' || type === 'down') {
    const aimed = setDartsAim(e);
    if (type === 'down' && aimed && e.pointerType !== 'touch' && e.button === 0) throwDart();
  }
}
function throwDart(x, y) {
  if (!DARTS.active || DARTS.phase !== 'aim' || DARTS.throws >= DARTS.total) return false;
  const precise = Number.isFinite(x) && Number.isFinite(y);
  const nx = precise ? clamp(x, -1.3, 1.3) : DARTS.aim.x + (reduceMotion ? 0 : Math.sin(DARTS.swayT * 2.1) * .036);
  const ny = precise ? clamp(y, -1.3, 1.3) : DARTS.aim.y + (reduceMotion ? 0 : Math.cos(DARTS.swayT * 1.7) * .027);
  const result = { ...dartScore(nx, ny), x: nx, y: ny };
  const start = new THREE.Vector3(DARTS_LAYOUT.stand.x + .17, DARTS_LAYOUT.y - .19, DARTS_LAYOUT.stand.z + .12);
  const end = new THREE.Vector3(DARTS_LAYOUT.x + (result.points ? .004 : .028), DARTS_LAYOUT.y + ny * DARTS_LAYOUT.scoreRadius, DARTS_LAYOUT.z + nx * DARTS_LAYOUT.scoreRadius);
  const object = createThrownDart(); object.position.copy(start);
  DARTS.flight = { object, start, end, elapsed: 0, duration: reduceMotion ? .18 : .5, result };
  DARTS.phase = 'flight'; DARTS_VISUAL.aim.visible = false; DARTS.msg = 'Dardo a caminho…'; dartsRender(); return true;
}
function finishDarts() {
  DARTS.phase = 'done'; DARTS.best = Math.max(DARTS.best, DARTS.score);
  const unlocked = DARTS_PRIZES.filter(p => p.at === null ? DARTS.hits.some(h => h.bull) : DARTS.score >= p.at);
  DARTS.newAwards = unlocked.filter(p => !DARTS.awards.includes(p.id)).map(p => p.id);
  DARTS.awards = [...new Set([...DARTS.awards, ...unlocked.map(p => p.id)])];
  try { localStorage.setItem(DARTS_STORE, JSON.stringify({ v: 1, best: DARTS.best, awards: DARTS.awards })); } catch (_) { }
  const names = unlocked.map(p => p.icon + ' ' + p.name).join(' · ');
  DARTS.msg = 'Partida concluída: ' + DARTS.score + ' pontos. ' + (names ? 'Seus prêmios digitais: ' + names + '.' : 'Mais uma? Com 80 pontos você conquista bronze!');
}
function stepDarts(dt) {
  if (!DARTS.active) return;
  DARTS.swayT += dt;
  if (DARTS.phase === 'aim') {
    DARTS.actual.x = DARTS.aim.x + (reduceMotion ? 0 : Math.sin(DARTS.swayT * 2.1) * .036);
    DARTS.actual.y = DARTS.aim.y + (reduceMotion ? 0 : Math.cos(DARTS.swayT * 1.7) * .027);
    DARTS_VISUAL.aim.position.set(DARTS_LAYOUT.x - .026, DARTS_LAYOUT.y + DARTS.actual.y * DARTS_LAYOUT.scoreRadius, DARTS_LAYOUT.z + DARTS.actual.x * DARTS_LAYOUT.scoreRadius);
    return;
  }
  if (DARTS.phase !== 'flight' || !DARTS.flight) return;
  const f = DARTS.flight; f.elapsed += dt; const u = Math.min(1, f.elapsed / f.duration);
  f.object.position.lerpVectors(f.start, f.end, u); f.object.position.y += Math.sin(u * Math.PI) * .13;
  dartAimPoint.subVectors(f.end, f.start); dartAimPoint.y += Math.cos(u * Math.PI) * .13 * Math.PI;
  f.object.quaternion.setFromUnitVectors(dartTipForward, dartAimPoint.normalize());
  if (u < 1) return;
  f.object.position.copy(f.end); DARTS.hits.push(f.result); DARTS.score += f.result.points; DARTS.throws++;
  DARTS.flight = null;
  if (DARTS.throws >= DARTS.total) finishDarts();
  else {
    DARTS.phase = 'aim'; DARTS_VISUAL.aim.visible = true;
    DARTS.msg = f.result.label + '. ' + (DARTS.throws % 3 === 0 ? 'Próxima rodada! ' : '') + (DARTS.total - DARTS.throws) + ' dardos restantes.';
  }
  dartsRender();
}
