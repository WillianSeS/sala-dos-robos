/* ================= cardápio, geladeira, comida e smoking virtual ================= */
const HOSP = { item: '', portions: 0, consumeUntil: 0, finishing: false, prop: null, rig: null, hand: null, smokeProp: null, smokingUntil: 0, hookIndex: 0, menuFrom: 'service', returnMode: 'fp', noteUntil: 0, botNext: 0, panelOpen: false };
const inLounge = (x, z) => x > 4.2 && x < 11.8 && z > 14.4 && z < 21.8;
const FRIDGE_ITEMS = ['water', 'soda', 'juice', 'beer', 'wine', 'sandwich', 'fruit'];
function publishHospitality() {
  if (MP.room && inRoom) { const p = myPresence(); MP.lastSend = JSON.stringify(p); MP.room.presence(p).catch(() => {}); }
}
function serviceMessage(msg) {
  $('serviceNote').textContent = msg; $('serviceNote').hidden = !msg; HOSP.noteUntil = performance.now() / 1000 + 8;
  $('menuMsg').textContent = msg;
}
function renderMenu() {
  const list = $('menuItems'); list.replaceChildren();
  for (const [id, item] of Object.entries(CONSUMABLES)) {
    if (HOSP.menuFrom === 'fridge' && !FRIDGE_ITEMS.includes(id)) continue;
    const b = document.createElement('button'); b.className = 'btn menu-item'; b.type = 'button'; b.dataset.item = id;
    const icon = document.createElement('span'); icon.textContent = item.emoji;
    const title = document.createElement('b'); title.textContent = item.label;
    const hint = document.createElement('small'); hint.textContent = HOSP.menuFrom === 'service' ? 'Pedir ao atendimento' : 'Pegar na mão';
    b.append(icon, title, hint);
    b.disabled = HOSP.menuFrom === 'service' && !!STAFF.order;
    b.addEventListener('click', () => {
      if (HOSP.menuFrom === 'fridge' && Math.hypot(fp.pos.x - (FRIDGE.x - 0.1), fp.pos.z - FRIDGE.z) > 2) { closeHospitality(); return; }
      if (HOSP.menuFrom === 'service') { if (!requestService(id)) return; }
      else deliverConsumable(id);
      closeHospitality();
    }); list.appendChild(b);
  }
  $('serviceCancel').hidden = !STAFF.order;
}
function openHospitality(from = 'service') {
  if (!inRoom || !['fp', 'seat', 'dance'].includes(mode)) return;
  HOSP.returnMode = mode; HOSP.menuFrom = from;
  if (from === 'fridge') FRIDGE.open = true;
  $('menuTitle').textContent = from === 'fridge' ? '🧊 Geladeira' : from === 'bar' ? (playerFloor() === 'show' ? '🍸 Balcão do Las Vegas Night' : '🍽️ Balcão do lounge') : '🍽️ Bebidas e comidas';
  $('menuHint').textContent = from === 'fridge' ? 'Pegue uma bebida ou um lanche gelado.' : from === 'bar' ? 'Sirva-se no balcão.' : 'Caio e Sofia levam seu pedido até você.';
  $('menuMsg').textContent = ''; $('fridgeClose').hidden = from !== 'fridge'; renderMenu(); leisureOpen('hospitalityMenu', 'menu');
}
function closeHospitality() {
  $('hospitalityMenu').hidden = true;
  if (mode === 'menu') { mode = HOSP.returnMode; cross.hidden = isTouch || mode !== 'fp'; }
}
function initHandRig() {
  if (HOSP.rig) return;
  HOSP.rig = new THREE.Group(); camera.add(HOSP.rig); scene.add(camera);
  const skin = MC('#cb9a7b', 0.82), sleeve = MC('#263437', 0.88);
  const hand = HOSP.hand = new THREE.Group(); HOSP.rig.add(hand);
  const palm = new THREE.Mesh(new THREE.CapsuleGeometry(0.033, 0.046, 4, 10), skin); palm.position.set(0.044, -0.03, 0.024); palm.rotation.z = -0.4; hand.add(palm);
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.044, 0.28, 4, 10), sleeve); arm.position.set(0.08, -0.2, 0.07); arm.rotation.z = -0.18; hand.add(arm);
  for (let i = 0; i < 4; i++) { const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.042, 3, 6), skin); finger.position.set(0.016 + i * 0.014, -0.01, -0.025); finger.rotation.x = 0.9; hand.add(finger); }
  hand.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = false; } });
}
function deliverConsumable(id, member = null) {
  if (!inRoom || !CONSUMABLES[id]) return false;
  if (HOSP.prop) HOSP.prop.removeFromParent();
  initHandRig(); HOSP.item = id; HOSP.portions = CONSUMABLES[id].kind === 'food' ? 3 : 4; HOSP.consumeUntil = 0; HOSP.finishing = false;
  HOSP.prop = makeConsumableProp(id); HOSP.rig.add(HOSP.prop);
  serviceMessage((member ? member.name + ' entregou: ' : 'Você pegou: ') + CONSUMABLES[id].label + '.'); publishHospitality(); return true;
}
function putAwayConsumable() {
  HOSP.item = ''; HOSP.portions = 0; HOSP.consumeUntil = 0; HOSP.finishing = false;
  if (HOSP.prop) HOSP.prop.removeFromParent(); HOSP.prop = null;
  if (DISCO.player) disposePersonItem(DISCO.player); publishHospitality();
}
function consumeHeld() {
  const t = performance.now() / 1000;
  if (!inRoom || !HOSP.item || HOSP.consumeUntil > t || HOSP.smokingUntil > t || !['fp', 'seat', 'dance'].includes(mode)) return;
  HOSP.consumeUntil = t + 2.4; HOSP.portions--; HOSP.finishing = HOSP.portions <= 0; publishHospitality();
}
function goLounge() { rideTo('lounge'); }
function exitLounge() { stopSmoking(); rideTo('games'); }
function nearestHook() {
  const x = seatState.s ? seatState.s.x : fp.pos.x, z = seatState.s ? seatState.s.z : fp.pos.z;
  let result = null;
  LOUNGE_LAYOUT.hooks.forEach((h, i) => { const d = Math.hypot(x - h.x, z - h.z); if (!result || d < result.d) result = { ...h, i, d }; });
  return result;
}
function makeSmokingMouthpiece() {
  const g = new THREE.Group(), mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.015, 0.22, 12), mat.chrome);
  mouth.rotation.x = Math.PI / 2; mouth.position.z = -0.045; g.add(mouth);
  const path = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, .065), new THREE.Vector3(.035, -.12, .14), new THREE.Vector3(.03, -.28, .26), new THREE.Vector3(-.05, -.5, .4)]);
  const hose = new THREE.Mesh(new THREE.TubeGeometry(path, 18, .014, 7, false), mat.black); g.add(hose); g.userData.ownedGeometries = [mouth.geometry, hose.geometry]; return g;
}
function startSmoking(index = null) {
  if (!inRoom || !['fp', 'seat'].includes(mode)) return;
  const h = nearestHook(); if (!h || h.d > 2.2 || !inLounge(fp.pos.x, fp.pos.z)) { serviceMessage('Chegue perto de uma mesa de narguilé no lounge.'); return; }
  if (HOSP.smokingUntil > performance.now() / 1000) { stopSmoking(); return; }
  HOSP.hookIndex = index === null ? h.i : clamp(index | 0, 0, LOUNGE_LAYOUT.hooks.length - 1);
  HOSP.smokingUntil = performance.now() / 1000 + 5.5;
  initHandRig(); if (!HOSP.smokeProp) { HOSP.smokeProp = makeSmokingMouthpiece(); HOSP.rig.add(HOSP.smokeProp); }
  publishHospitality();
}
function stopSmoking() { HOSP.smokingUntil = 0; publishHospitality(); }
function inviteLoungeRobots() {
  let count = 0;
  for (const key of ['lounge1', 'lounge2']) {
    if (SPOTS[key].busy) continue;
    const r = robots.find(r => !r.trade && !r.inPool && !r.inCasino && !r.talking && r.mode === 'seated');
    if (r && goBreak(r, key)) { r.hospitalityUntil = simT + 120; count++; }
  }
  serviceMessage(count ? 'Os robôs estão vindo descansar no lounge.' : 'Os lugares estão ocupados ou os robôs estão operando.');
}
function updateSmokingPerson(P, until, t) {
  if (!P) return; P.smokingUntil = until;
  updatePersonSmokingPose(P, t, until);
}
function disposeSmokingPerson(P) { if (P?.smokeRig) { for (const g of P.smokeRig.userData.ownedGeometries || []) g.dispose(); P.smokeRig.removeFromParent(); P.smokeRig = null; } }
function stepHospitality(dt, t) {
  if (HOSP.finishing && t > HOSP.consumeUntil) putAwayConsumable();
  if (HOSP.smokingUntil > t && (!inRoom || !inLounge(fp.pos.x, fp.pos.z) || (nearestHook()?.d ?? 99) > 2.6)) stopSmoking();
  const smoke = HOSP.smokingUntil > t, using = HOSP.consumeUntil > t;
  if (HOSP.rig) {
    const visible = inRoom && !DISCO.dancing && !VIEW.third && ['fp', 'seat', 'music', 'menu'].includes(mode);
    HOSP.rig.visible = visible && (!!HOSP.item || smoke);
    if (HOSP.prop) HOSP.prop.visible = !smoke;
    if (HOSP.smokeProp) HOSP.smokeProp.visible = smoke;
    const lift = using ? Math.sin(Math.PI * clamp((t - (HOSP.consumeUntil - 2.4)) / 2.4, 0, 1)) : smoke ? .88 : 0;
    HOSP.rig.position.set(smoke ? .20 : .22 - .16 * lift, smoke ? -.22 : -.27 + .22 * lift, smoke ? -.52 : -.48 + .23 * lift);
    HOSP.rig.rotation.set(smoke ? -.12 : -.55 * lift, -.15, -.08);
    if (HOSP.prop && CONSUMABLES[HOSP.item]?.kind === 'food') HOSP.prop.scale.setScalar(.8 + HOSP.portions * .07);
  }
  if (DISCO.player) setPersonItem(DISCO.player, HOSP.item, HOSP.consumeUntil);
  if (t > HOSP.botNext) {
    HOSP.botNext = t + 5;
    for (const r of robots) if (r.mode === 'lounge' && !r.inPool && !r.inCasino && !r.talking && ['coffee', 'sofa', 'lounge1', 'lounge2'].includes(r.spot)) {
      if (!r.P.heldItem) setPersonItem(r.P, r.spot === 'coffee' ? 'coffee' : ['water', 'juice', 'sandwich', 'soda'][r.i % 4]);
      else if (r.spot?.startsWith('lounge') && Math.random() < .4) { r.smokingUntil = t + 4; r.hookIndex = r.spot === 'lounge1' ? 0 : 1; }
      else if (!(r.smokingUntil > t)) setPersonItem(r.P, r.P.heldItem, t + 2.4);
    }
  }
  for (const r of robots) {
    if ((r.mode === 'seated' || r.inPool || r.spot?.startsWith('pool')) && r.P.heldItem) disposePersonItem(r.P);
    updateSmokingPerson(r.P, r.smokingUntil || 0, t);
  }
  for (const v of MP.vis.values()) if (v.A) updateSmokingPerson(v.A, v.smokingUntil || 0, t);
  if (t > HOSP.noteUntil) $('serviceNote').hidden = true;
  const panel = inRoom && ['fp', 'seat'].includes(mode) && inLounge(fp.pos.x, fp.pos.z);
  /* O painel do lounge começa fechado e abre pelo botão 💨. */
  $('loungePanel').hidden = !panel || !HOSP.panelOpen; $('loungePanelOpen').hidden = !panel || HOSP.panelOpen;
  $('loungeGo').hidden = !inRoom || !['fp', 'seat'].includes(mode) || inLounge(fp.pos.x, fp.pos.z);
  $('menuOpen').hidden = !inRoom || !['fp', 'seat', 'dance'].includes(mode);
  const item = CONSUMABLES[HOSP.item], label = item ? (item.kind === 'food' ? 'Comer' : 'Tomar') : '';
  const discoPanel = ! $('discoPanel').hidden;
  $('heldBar').hidden = !inRoom || !item || !['fp', 'seat', 'dance'].includes(mode) || (isTouch && ((panel && HOSP.panelOpen) || discoPanel));
  $('heldName').textContent = item ? item.emoji + ' ' + item.label : '';
  $('heldPortions').textContent = item ? HOSP.portions + (item.kind === 'food' ? ' pedaços restantes' : ' goles restantes') : '';
  for (const id of ['consumeBtn', 'discoSip', 'loungeSip']) { $(id).textContent = using ? (item?.kind === 'food' ? 'Comendo…' : 'Bebendo…') : label + (id === 'consumeBtn' && !isTouch ? ' · F' : ''); $(id).disabled = using || smoke; }
  $('discoSip').hidden = !item || !isTouch; $('loungeSip').hidden = !item || !isTouch;
  const hook = nearestHook(); $('loungeSmoke').disabled = !hook || hook.d > 2.2;
  $('loungeSmoke').textContent = smoke ? 'Parar narguilé' : 'Usar narguilé';
  if (panel) $('loungeMsg').textContent = smoke ? 'Você está usando o narguilé.' : hook && hook.d <= 2.2 ? 'Narguilé ao alcance. Peça uma bebida e curta a música.' : 'Sente no sofá ou chegue perto de uma mesa de narguilé.';
}
$('menuOpen').onclick = () => openHospitality(); $('loungeMenu').onclick = () => openHospitality();
$('menuClose').onclick = closeHospitality; $('fridgeClose').onclick = () => { FRIDGE.open = false; closeHospitality(); };
$('serviceCancel').onclick = () => { cancelService(); renderMenu(); };
$('consumeBtn').onclick = consumeHeld; $('discoSip').onclick = consumeHeld; $('loungeSip').onclick = consumeHeld;
$('putAwayBtn').onclick = putAwayConsumable;
$('loungeGo').onclick = goLounge; $('loungeExit').onclick = exitLounge;
function setLoungePanel(open) { HOSP.panelOpen = open; $('loungePanel').hidden = !open; $('loungePanelOpen').hidden = open; }
$('loungePanelOpen').onclick = () => setLoungePanel(true); $('loungePanelClose').onclick = () => setLoungePanel(false);
$('loungeSmoke').onclick = () => startSmoking(); $('loungeInvite').onclick = inviteLoungeRobots; $('loungeMusic').onclick = openMusic;
