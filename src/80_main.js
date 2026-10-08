
/* ================= render, pós-processamento e laço principal ================= */
let composer = null, bloom = null;
async function setupPost() {
  if (!HIGH) return;
  try {
    const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
      import('three/addons/postprocessing/EffectComposer.js'), import('three/addons/postprocessing/RenderPass.js'),
      import('three/addons/postprocessing/UnrealBloomPass.js'), import('three/addons/postprocessing/OutputPass.js')]);
    const rt = new THREE.WebGLRenderTarget(innerWidth * pixelRatio, innerHeight * pixelRatio, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, rt);
    composer.setPixelRatio(pixelRatio); composer.setSize(innerWidth, innerHeight);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.32, 0.55, 0.92);
    composer.addPass(bloom); composer.addPass(new OutputPass());
  } catch (e) { composer = null; console.warn('Sem pós-processamento:', e && e.message); }
}
function resize() {
  const w = innerWidth, h = innerHeight;
  camera.aspect = w / h; camera.fov = w < h ? 80 : 66; camera.updateProjectionMatrix();
  renderer.setPixelRatio(pixelRatio); renderer.setSize(w, h, false);
  if (composer) { composer.setPixelRatio(pixelRatio); composer.setSize(w, h); }
}
addEventListener('resize', resize);

/* reflexos e luz ambiente vindos da própria sala (captura em cubo) */
let envCapture = null;
function captureEnv() {
  // A captura é um efeito opcional: uma falha de GPU não pode travar o jogo.
  const beforePos = scene.position.clone();
  const beforeSky = [skyFar.visible, skyMid.visible];
  const wallKeys = Object.keys(WALL_INFO);
  const beforeWalls = wallKeys.map(k => GROUPS[k].visible);
  let pm = null;
  try {
    pm = new THREE.PMREMGenerator(renderer);
    wallKeys.forEach(k => { GROUPS[k].visible = true; });
    skyFar.visible = skyMid.visible = false;
    scene.position.set(0, -1.6, -1.5); scene.updateMatrixWorld(true);
    const next = pm.fromScene(scene, 0.04, 0.1, 40);
    const previous = envCapture;
    envCapture = next;
    scene.environment = next.texture;
    if (previous) previous.dispose();
    for (const m of MATS) m.envMapIntensity = m.roughness < 0.5 ? 0.9 : 0.6;
  } catch (e) {
    console.warn('Reflexos indisponíveis, seguindo sem o efeito:', e && e.message);
  } finally {
    scene.position.copy(beforePos); scene.updateMatrixWorld(true);
    skyFar.visible = beforeSky[0]; skyMid.visible = beforeSky[1];
    wallKeys.forEach((k, i) => { GROUPS[k].visible = beforeWalls[i]; });
    if (pm) pm.dispose();
  }
}
canvas.addEventListener('webglcontextrestored', () => {
  if (envCapture) { envCapture.dispose(); envCapture = null; }
  scene.environment = null;
  envDone = false; // o renderizador foi restaurado; recriar os reflexos na próxima imagem
});

/* primeiro desenho de todas as telas */
SCREENS.forEach(s => { const r = robots[s.st.i]; s.kind === 'chart' ? drawChartScreen(s.tex, r) : drawPanelScreen(s.tex, r); });
drawWall(); drawTicker(); drawSigns(); updateClocks();

const hTot = $('hTot'), hOp = $('hOp');
let last = performance.now(), acc = 0, scrI = 0, scrT = 0, wallT = 0, slowT = 0, histT = 0, hudT = 1, frames = 0, ftAcc = 0, envDone = false, frameN = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000); last = now; const t = now / 1000;
  /* simulação em passos fixos de 0,25 s */
  acc += dt;
  while (acc >= 0.25) { acc -= 0.25; simT += 0.25; stepMarket(); stepRobots(0.25); }
  moveRobots(dt);
  for (const r of robots) { r.P.smokingUntil = r.smokingUntil || 0; r.P.isAvatar ? r.P.update(dt, t) : animatePerson(r.P, dt, t); }
  /* câmera */
  if (mode === 'darts') stepDartsCamera(dt);
  else if (mode === 'dance' || (mode === 'menu' && HOSP.returnMode === 'dance')) stepDanceCamera(dt);
  else if (['menu', 'casino', 'music', 'elevator', 'ride'].includes(mode)) { if (VIEW.third) stepThirdCam(dt); else { camera.position.set(seatState.s ? seatState.s.x : fp.pos.x, seatState.s ? seatState.s.eye : EYE, seatState.s ? seatState.s.z : fp.pos.z); camera.quaternion.copy(fpQuat(fp.yaw, fp.pitch)); } if (mode === 'ride') camera.position.y += ELEV.shake; }
  else if (mode === 'fp') { stepFP(dt); if (VIEW.third) stepThirdCam(dt); } else if (mode === 'tween') stepTween(dt); else if (mode === 'seat') { stepSeat(); if (VIEW.third) stepThirdCam(dt); } else if (mode === 'talk') stepTalk(dt); else if (mode === 'pool') stepPoolCam(dt); else stepOrbit(dt);
  const entranceVisible=!$('intro').hidden;
  document.body.classList.toggle('at-entrance',entranceVisible);
  if(entranceVisible&&mode==='orbit'&&orbit.view==='outside') {
    const tag=innerWidth+'x'+innerHeight;
    if(EXT.entranceViewport!==tag) { EXT.entranceViewport=tag; camera.setViewOffset(innerWidth,innerHeight,portrait()?0:innerWidth*.22,innerHeight*(portrait()?.23:-.08),innerWidth,innerHeight); }
  }
  setWalls(['darts', 'menu', 'dance', 'casino', 'music', 'elevator', 'ride', 'fp', 'seat', 'talk', 'pool'].includes(mode) || (mode === 'tween' && inRoom && tween && tween.t > 0.55));
  stepDarts(dt,t); stepElevator(dt, t); stepRadio(); stepExterior(dt, t); stepShow(dt, t); stepWelcome(dt, t); stepPartyFx(dt, t); stepDisco(dt, t); stepHospitality(dt, t); stepPlayerBody(dt, t); stepLoungeVisual(dt, t); stepStaff(dt, t); stepFridge(dt); stepPool(dt); stepTraffic(dt); stepMulti(dt, t); stepVoice(dt, t); updateActUI();
  /* telas: um monitor a cada 70 ms; telão e placas a cada 1 s */
  scrT += dt; if (scrT > 0.07) { scrT = 0; const s = SCREENS[scrI++ % SCREENS.length], r = robots[s.st.i]; s.kind === 'chart' ? drawChartScreen(s.tex, r) : drawPanelScreen(s.tex, r); }
  wallT += dt; if (wallT > 1) { wallT = 0; drawWall(); drawSigns(); updateClocks(); }
  slowT += dt; if (slowT > 4) { slowT = 0; drawTicker(); }
  histT += dt; if (histT > 2) { histT = 0; hist.push(equity()); if (hist.length > 300) hist.shift(); }
  tickTex.offset.x = (tickTex.offset.x + dt * 0.035) % 1;
  hudT += dt; if (hudT > 0.5) { hudT = 0; const tot = equity() - BASE; hTot.textContent = money(tot); hTot.className = tot >= 0 ? 'g' : 'r'; hOp.textContent = robots.filter(r => r.trade).length + '/10'; }
  /* render (sombras recalculadas em quadros alternados) */
  if (frameN % 2 === 0) renderer.shadowMap.needsUpdate = true;
  STACK.on = stackActive();
  if (STACK.on) renderStacked(); else if (composer) composer.render(); else renderer.render(scene, camera);
  updateLabels(); updateVisitorLabels(t); updateStaffLabels(t); updateShowLabels(t); updateStackLabels();
  frameN++;
  if (!envDone && frameN >= 3) { envDone = true; captureEnv(); }
  /* qualidade adaptativa: se ficar lento, reduz a resolução */
  ftAcc += dt; frames++;
  if (ftAcc > 2.5) { const fps = frames / ftAcc; ftAcc = 0; frames = 0; if (fps < 26 && pixelRatio > 0.75 && frameN > 200) { pixelRatio = Math.max(0.75, pixelRatio - 0.2); resize(); } }
}

// A recepção aproxima a fachada IA + Club; a vista completa do hotel continua disponível.
orbit.target.copy(EXT.entryTarget); orbit.r=80; orbit.th=.28; orbit.ph=1.48;
document.body.classList.add('at-entrance');
initStaff();
await setupPost();
resize();
requestAnimationFrame(frame);
window.__salaOK = true;
const hLoad = $('hLoad');
loadAvatars((n, tot) => { const p = Math.round(n / tot * 100) + '%'; hLoad.lastElementChild.textContent = p; $('status').textContent = 'Carregando pessoas realistas… ' + p; })
  .then(() => { hLoad.hidden = true; $('status').textContent = isTouch ? 'Pronto. Use o joystick para andar.' : 'Pronto. W A S D para andar.'; })
  .catch(e => { console.warn('Pessoas realistas indisponíveis:', e && e.message); hLoad.hidden = true; });
btnEnter.disabled = false; $('status').textContent = isTouch ? 'Dica: use o joystick para andar.' : 'Dica: W A S D para andar.';
if (DEBUG) window.__sala = { captureEnv, STACK, stackActive, assignLayers, renderStacked, dressShowgirl, confettiBurst, dancePose, DARTS, DARTS_LAYOUT, DARTS_VISUAL, dartScore, startDarts, exitDarts, throwDart, stepDarts, dartsPointer, WELCOME, greetGuest, closeWelcome, welcomeDrink, PARTY, partyBurst, EXT, ORBIT_VIEWS, setOrbitView, SHOW, SHOW_LAYOUT, inShow, openOffer, closeOffer, offerDrink, offerDance, offerSeat, tipDancer, nearestDancer, stepShow, MOBILE, RADIO, setRadio, CAB, inCab, elevatorSpace, cabCenter, FLOORS, FLOOR, floorAt, ELEV, rideTo, openElevator, closeElevator, playerFloor, NODES, route, wallBlocked, VIEW, setThirdPerson, SPOTIFY, spotifyEmbedUrl, spotifyLoad, spotifyClose, staffPath, HOSP, STAFF, CONSUMABLES, LOUNGE_LAYOUT, LOUNGE_VISUAL, roomBlocked, goLounge, exitLounge, inLounge, openHospitality, closeHospitality, deliverConsumable, consumeHeld, putAwayConsumable, startSmoking, stopSmoking, inviteLoungeRobots, requestService, cancelService, stepStaff, stepHospitality, makeConsumableProp, setPersonItem, updatePersonItem, disposePersonItem, inGames, goGames, exitGames, findAct, DISCO, goDisco, exitDisco, startDance, stopDance, inviteDancers, sendDiscoEmoji, blocked, myPresence, CASINO, startCasino, exitCasino, casinoDeal, casinoHit, casinoStand, handValue, MUSIC, openMusic, closeMusic, THREE, scene, camera, renderer, AV, closeTrade, openTrade, POOL, balls, stepBalls, onRest, FRIDGE, SEATS, sitDown, standUp, startPool, exitPool, shoot, openTalk, closeTalk, ask, MP, cars, doAct, VOICE, voiceJoin, voiceLeave, saveRanking, get myId() { return myId; }, get act() { return curAct && curAct.label; }, robots, fp, orbit, SPOTS, goBreak, enterRoom, leaveRoom, fast(sec) { for (let i = 0; i < sec * 4; i++) { simT += 0.25; stepMarket(); stepRobots(0.25); moveRobots(0.25); } return robots.map(r => [r.id, r.mode, r.spot, +r.P.root.position.x.toFixed(2), +r.P.root.position.z.toFixed(2), r.trade ? 1 : 0]); }, stats() { return { realized, todayPnl, gains, losses, simT }; }, setFP(x, z, yaw, pitch = 0) { camera.clearViewOffset(); document.body.classList.remove('at-entrance'); inRoom = true; $('intro').hidden = true; mode = 'fp'; fp.pos.set(x, 0, z); fp.yaw = yaw; fp.pitch = pitch; }, get mode() { return mode; } };
