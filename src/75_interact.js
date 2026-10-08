
/* ================= interações: sentar, geladeira, conversar, sinuca ================= */
const promptEl = $('prompt'), btnAct = $('btnAct');
let curAct = null;
const SEATS = [];
STATIONS.forEach((st, i) => SEATS.push({
  kind: 'desk', label: 'Sentar à mesa', x: st.x, z: st.zf + 0.32, eye: 1.18, yaw: 0, st,
  free: () => { const r = robots[i]; return !(r.mode === 'seated' || r.mode === 'sitting' || r.mode === 'standing' || (r.mode === 'walking' && r.back)); },
}));
[-6.1, -5.1, -4.1].forEach(x => SEATS.push({ kind: 'sofa', label: 'Sentar no sofá', x, z: 5.36, eye: 1.06, yaw: 0, free: () => !(x === -6.1 && SPOTS.sofa.busy) }));
SEATS.push({ kind: 'arm', label: 'Sentar na poltrona', x: -2.78, z: 4.45, eye: 1.08, yaw: 1.32, free: () => true });
for (const x of [-3.45, 3.45]) SEATS.push({ kind: 'club', label: 'Sentar no banco da discoteca', x, z: 10.2, eye: 1.08, yaw: x < 0 ? -Math.PI / 2 : Math.PI / 2, free: () => true });
for (const s of SHOW_LAYOUT.seats) SEATS.push({ kind: 'show', label: 'Sentar para ver o show', ...s, free: () => true });
for (const [i, s] of LOUNGE_LAYOUT.seats.entries()) SEATS.push({ kind: 'lounge', label: 'Sentar no sofá do lounge', ...s, free: () => !(i === 0 && SPOTS.lounge1.busy || i === 3 && SPOTS.lounge2.busy) });
const seatState = { s: null, from: new THREE.Vector3() };

function findAct() {
  const px = fp.pos.x, pz = fp.pos.z, fx = -Math.sin(fp.yaw), fz = -Math.cos(fp.yaw);
  let best = null, bs = Infinity;
  const consider = (x, z, range, minDot, label, run) => {
    const dx = x - px, dz = z - pz, d = Math.hypot(dx, dz); if (d > range) return;
    const dot = d < 0.3 ? 1 : (dx * fx + dz * fz) / d; if (dot < minDot) return;
    const sc = d * (1.7 - dot); if (sc < bs) { bs = sc; best = { label, run }; }
  };
  const elev = FLOOR[floorAt(px, pz)];
  if (inCab(px, pz)) consider(px, pz, 1, -1, 'Escolher o andar', openElevator);
  else consider(elev.x, elev.z, 1.7, 0.3, 'Usar o elevador', openElevator);
  if (floorAt(px, pz) === 'office') consider(WELCOME.x, WELCOME.z, 2.2, 0.5, 'Falar com a Aurora', greetGuest);
  if (inShow(px, pz)) {
    for (const h of SHOW.hosts) if (['wander', 'approach'].includes(h.state)) consider(h.P.root.position.x, h.P.root.position.z, 2.1, 0.6, 'Falar com a atendente ' + h.name, () => openOffer(h));
    const st = SHOW_LAYOUT.stage;
    if (pz > st.z0 - 1.6 && px > st.x0 && px < st.x1) { const d = nearestDancer(); consider(d.x, st.z0, 2, 0.2, 'Dar gorjeta para ' + d.name + ' (10 fichas)', () => tipDancer(d)); }
    consider(SHOW_LAYOUT.bar.x, SHOW_LAYOUT.bar.z, 1.8, 0.4, 'Pedir um drinque no balcão', () => openHospitality('bar'));
  }
  if (inLounge(px, pz)) {
    for (const [i, h] of LOUNGE_LAYOUT.hooks.entries()) consider(h.x, h.z, 2.2, .3, 'Usar narguilé', () => startSmoking(i));
    consider(5.1, 20.5, 2, .35, 'Pegar bebidas e petiscos no balcão', () => openHospitality('bar'));
  }
  for (const member of STAFF.members) consider(member.P.root.position.x, member.P.root.position.z, 2.1, .65, 'Pedir ao ' + member.role + ' ' + member.name, () => openHospitality());
  if (inDisco(px, pz) && Math.abs(px) < 2.5 && pz < 12.2) consider(px, pz, 1, -1, 'Dançar na discoteca', startDance);
  consider(8, 12.1, 1.8, 0.35, 'Jogar 21 com os robôs', () => startCasino(null));
  for (const r of robots) consider(r.P.root.position.x, r.P.root.position.z, 2.1, 0.75, 'Conversar com ' + r.person, () => openTalk(r));
  const ex = Math.max(Math.abs(px - POOL.cx) - 1.37, 0), ez = Math.max(Math.abs(pz - POOL.cz) - 0.77, 0);
  if (Math.hypot(ex, ez) < 1.1) consider(POOL.cx, POOL.cz, 4, 0.3, 'Jogar sinuca', () => startPool(null));
  consider(FRIDGE.x - 0.1, FRIDGE.z, 1.8, 0.5, 'Pegar bebida ou comida na geladeira', () => openHospitality('fridge'));
  for (const s of SEATS) if (s.free()) consider(s.x, s.z, 1.35, 0.4, s.label, () => sitDown(s));
  return best;
}
function sitDown(s) {
  seatState.s = s; seatState.from.copy(fp.pos);
  if (s.st) s.st.playerSeated = true;
  if (s.kind === 'lounge') { const spot = s.id === 'loungeSideA' ? SPOTS.lounge1 : s.id === 'loungeBackB' ? SPOTS.lounge2 : null; if (spot) spot.busy = 'player'; }
  if (s.kind === 'sofa' && s.x === -6.1) SPOTS.sofa.busy = 'player';
  fp.yaw = s.yaw; fp.pitch = -0.08; fp.vel.set(0, 0, 0);
  startTween(new THREE.Vector3(s.x, s.eye, s.z), fpQuat(fp.yaw, fp.pitch), reduceMotion ? 0.01 : 0.7, () => { mode = 'seat'; });
}
function standUp(after) {
  const s = seatState.s; if (!s) return;
  const fx = -Math.sin(s.yaw), fz = -Math.cos(s.yaw);
  const pref = s.kind === 'desk' ? [[0, 0.7], [0.55, 0.7], [-0.55, 0.7], [0, 1.0]]
    : [[fx * 0.75, fz * 0.75], [fx * 1.05, fz * 1.05], [0.75, 0], [-0.75, 0], [fx * 0.75 + 0.5, fz * 0.75], [fx * 0.75 - 0.5, fz * 0.75]];
  let spot = null;
  for (const [dx, dz] of pref) if (!blocked(s.x + dx, s.z + dz)) { spot = [s.x + dx, s.z + dz]; break; }
  if (!spot) spot = [seatState.from.x, seatState.from.z];
  if (s.st) s.st.playerSeated = false;
  if (SPOTS.sofa.busy === 'player') SPOTS.sofa.busy = null;
  for (const spot of [SPOTS.lounge1, SPOTS.lounge2]) if (spot.busy === 'player') spot.busy = null;
  seatState.s = null; fp.pos.set(spot[0], 0, spot[1]);
  startTween(new THREE.Vector3(spot[0], EYE, spot[1]), fpQuat(fp.yaw, fp.pitch), reduceMotion ? 0.01 : 0.6, () => { mode = 'fp'; if (after) after(); });
}
function stepSeat() {
  const s = seatState.s; if (!s) return;
  camera.position.set(s.x, s.eye, s.z);
  camera.quaternion.copy(fpQuat(fp.yaw, fp.pitch));
}
const shortLabel = l => isTouch ? l.replace('Conversar com ', 'Falar com ').replace(' a geladeira', '') : l;
function updateActUI() {
  const club = inRoom && (mode === 'fp' || mode === 'dance') && inDisco(fp.pos.x, fp.pos.z);
  $('discoPanel').hidden = !club || !DISCO.panelOpen;
  $('discoPanelOpen').hidden = !club || DISCO.panelOpen;
  $('viewToggle').hidden = !inRoom;
  $('btnOutside').hidden = inRoom || mode !== 'orbit';
  /* Celular: joystick fixo e botão de correr aparecem enquanto o visitante anda. */
  const walking = isTouch && inRoom && mode === 'fp';
  if (isTouch && !joy) joyEl.hidden = !walking;
  $('mRun').hidden = !walking;
  $('gamesGo').hidden = !inRoom || !['fp', 'seat'].includes(mode) || inGames(fp.pos.x, fp.pos.z);
  $('gamesBack').hidden = !inRoom || !['fp', 'seat'].includes(mode) || playerFloor() === 'office';
  $('discoGo').hidden = !inRoom || !['fp', 'seat'].includes(mode) || inDisco(fp.pos.x, fp.pos.z);
  $('musicOpen').hidden = !inRoom || !['fp', 'seat', 'music'].includes(mode);
  let label = null;
  if (mode === 'fp') { curAct = findAct(); label = curAct && curAct.label; }
  else if (mode === 'dance') { curAct = { label: 'Parar de dançar', run: stopDance }; label = 'Parar de dançar'; }
  else if (mode === 'seat') { curAct = { label: 'Levantar', run: () => standUp() }; label = 'Levantar'; }
  else curAct = null;
  if (label && isTouch) {
    btnAct.hidden = false; promptEl.hidden = true; const t = shortLabel(label); if (btnAct.textContent !== t) btnAct.textContent = t;
  } else if (label) {
    promptEl.hidden = false; btnAct.hidden = true; const sp = promptEl.lastElementChild; if (sp.textContent !== label) sp.textContent = label;
  } else { promptEl.hidden = true; btnAct.hidden = true; }
}
function doAct() { if (curAct) curAct.run(); }
btnAct.addEventListener('click', doAct);
