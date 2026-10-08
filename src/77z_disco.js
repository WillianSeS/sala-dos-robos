/* ================= dança, reações e acesso à discoteca ================= */
const DISCO_STYLES = ['groove', 'disco', 'party'];
const DISCO_EMOJIS = ['🔥', '❤️', '😂', '🎉', '🕺'];
const DISCO = { dancing: false, style: 'groove', lights: !reduceMotion, player: null, loading: false, emojis: [], emoji: '', emojiUntil: 0, emojiId: 0, lastEmoji: -10, lastBotEmoji: 0, panelOpen: false };
const inDisco = (x, z) => Math.abs(x) < 3.8 && z > 6.4 && z < 13.7;
function danceWave(t, style, phase = 0) {
  const amount = reduceMotion ? 0.25 : 1, b = t * 4.2 + phase, s = Math.sin(b);
  return { sway: s * 0.24 * amount, bounce: Math.abs(Math.sin(b * 2)) * 0.065 * amount,
    arm: (style === 'disco' ? 1.25 + s * 0.55 : style === 'party' ? 2.3 + s * 0.25 : 0.35 + s * 0.3) * amount,
    otherArm: (style === 'party' ? 2.3 - s * 0.25 : 0.4 - s * 0.3) * amount,
    knee: Math.max(0, s) * 0.3 * amount, otherKnee: Math.max(0, -s) * 0.3 * amount };
}
function applyAvatarDance(A, t) {
  const b = danceWave(t, A.danceStyle || 'groove', A.dancePhase || 0);
  A.danceRest = A.danceBones.map(bone => bone ? bone.quaternion.clone() : null);
  const [spine, chest, la, ra, le, re, lt, rt, lk, rk] = A.danceBones;
  if (spine) spine.rotateX(b.sway);
  if (chest) chest.rotateY(b.sway * 0.6);
  if (la) la.rotateY(-b.arm); if (ra) ra.rotateY(b.otherArm);
  if (le) le.rotateZ(-0.65); if (re) re.rotateZ(-0.65);
  if (lt) lt.rotateY(b.knee * 0.4); if (rt) rt.rotateY(-b.otherKnee * 0.4);
  if (lk) lk.rotateY(-b.knee); if (rk) rk.rotateY(b.otherKnee);
  A.root.rotation.y = A.yaw + b.sway * 0.5; A.root.rotation.z = b.sway * 0.12; A.root.position.y = 0.015 + b.bounce * 0.2;
}
function goDisco() {
  if (rideTo('disco')) $('discoMsg').textContent = 'Bem-vindo! Escolha seus passos ou chame os robôs para a pista.';
}
function exitDisco() { rideTo('office'); }
async function loadDancer() {
  if (!AV.clips || DISCO.loading || DISCO.player?.isAvatar) return;
  DISCO.loading = true;
  try {
    const file = VISITOR_FILES[myLook], { g, SU } = await getVisitorModel(file);
    const old = DISCO.player;
    const A = new Avatar({ scene: SU.clone(g.scene) }, file.startsWith('Female') ? AV.clips.f : AV.clips.m, old, file);
    GROUPS.main.remove(old.root); A.root.visible = DISCO.dancing; DISCO.player = A;
  } catch (e) { /* boneco procedural continua disponível */ }
  finally { DISCO.loading = false; }
}
function publishDiscoPresence() {
  if (MP.room && inRoom) MP.room.presence(myPresence()).catch(() => { });
}
function startDance() {
  if (mode !== 'fp' || !inDisco(fp.pos.x, fp.pos.z)) return;
  const spots = [[clamp(fp.pos.x, -2.2, 2.2), clamp(fp.pos.z, 8.5, 11.8)], [0, 8.5], [-2.1, 8.5], [2.1, 8.5]];
  const free = spots.find(([x, z]) => !blocked(x, z));
  if (!free) { $('discoMsg').textContent = 'A pista está cheia aqui. Dê alguns passos e tente de novo.'; return; }
  fp.pos.set(free[0], 0, free[1]);
  if (!DISCO.player) { DISCO.player = makePerson(10 + myLook); DISCO.player.root.visible = false; }
  DISCO.dancing = true; mode = 'dance';
  DISCO.style = $('discoStyle').value;
  for (const k in keys) keys[k] = false;
  fp.vel.set(0, 0, 0); joy = null; joyEl.hidden = true; ptr.clear();
  if (document.pointerLockElement) document.exitPointerLock();
  cross.hidden = true; $('discoDance').textContent = 'Parar de dançar'; $('discoDance').setAttribute('aria-pressed', 'true');
  $('discoMsg').textContent = 'Você está dançando! Mande emojis para animar a pista.';
  loadDancer(); publishDiscoPresence();
}
function stopDance() {
  DISCO.dancing = false; if (DISCO.player) DISCO.player.root.visible = false;
  if (mode === 'dance') { mode = 'fp'; camera.position.set(fp.pos.x, EYE, fp.pos.z); camera.quaternion.copy(fpQuat(fp.yaw, fp.pitch)); cross.hidden = isTouch; }
  $('discoDance').textContent = 'Dançar'; $('discoDance').setAttribute('aria-pressed', 'false');
  $('discoMsg').textContent = 'Pausa nos passos. Você pode andar pela pista.'; publishDiscoPresence();
}
function inviteDancers(pref = null) {
  let called = 0;
  const candidates = pref ? [pref] : robots;
  for (const r of candidates) {
    const slot = Object.entries(SPOTS).find(([k, s]) => k.startsWith('dance') && !s.busy);
    if (!slot) break;
    if (r.trade || r.inPool || r.inCasino || r.talking || !['seated', 'lounge'].includes(r.mode) || r.spot?.startsWith('dance')) continue;
    const [key, s] = slot;
    if (r.mode === 'seated') { if (!goBreak(r, key)) continue; }
    else { const from = SPOTS[r.spot].node; SPOTS[r.spot].busy = null; s.busy = r.id; r.spot = key; r.path = [...route(from, s.node), [s.x, s.z]]; r.mode = 'walking'; r.back = false; }
    r.discoUntil = simT + 120; r.danceStyle = DISCO_STYLES[called % 3]; called++;
  }
  $('discoMsg').textContent = called ? called + (called === 1 ? ' robô está vindo para a pista!' : ' robôs estão vindo para a pista!') : 'Os robôs estão ocupados ou já estão na pista. Tente daqui a pouco.';
  return called;
}
const discoEmojiTextures = new Map();
function spawnDiscoEmoji(emoji, x, z, y = 1.8) {
  if (!DISCO_EMOJIS.includes(emoji)) return;
  if (DISCO.emojis.length >= 18) { const old = DISCO.emojis.shift(); CLUB.particles.remove(old.sprite); old.sprite.material.dispose(); }
  if (!discoEmojiTextures.has(emoji)) discoEmojiTextures.set(emoji, canvasTex(128, 128, (g) => { g.font = '86px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(emoji, 64, 68); }));
  const material = new THREE.SpriteMaterial({ map: discoEmojiTextures.get(emoji), transparent: true, depthWrite: false, toneMapped: false });
  const sprite = new THREE.Sprite(material); sprite.position.set(x, y, z); sprite.scale.setScalar(0.5); CLUB.particles.add(sprite);
  DISCO.emojis.push({ sprite, age: 0, y });
}
function sendDiscoEmoji(emoji) {
  const now = performance.now() / 1000;
  if (!inDisco(fp.pos.x, fp.pos.z) || !['fp', 'dance'].includes(mode) || now - DISCO.lastEmoji < 0.65 || !DISCO_EMOJIS.includes(emoji)) return;
  DISCO.lastEmoji = now; DISCO.emoji = emoji; DISCO.emojiUntil = Date.now() + 4000; DISCO.emojiId = Date.now(); publishDiscoPresence();
  const offset = mode === 'fp' ? 0.9 : 0;
  spawnDiscoEmoji(emoji, fp.pos.x - Math.sin(fp.yaw) * offset, fp.pos.z - Math.cos(fp.yaw) * offset); $('discoMsg').textContent = emoji + ' Você animou a pista!';
}
const danceCameraTarget = new THREE.Vector3();
function stepDanceCamera(dt) {
  danceCameraTarget.set(fp.pos.x, 1.0, fp.pos.z);
  const cx = clamp(fp.pos.x, -2.6, 2.6), cz = Math.max(6.8, fp.pos.z - 2.4);
  camera.position.lerp(new THREE.Vector3(cx, 2.1, cz), 1 - Math.exp(-5 * dt)); camera.lookAt(danceCameraTarget);
}
function stepDisco(dt, t) {
  CLUB.ball.rotation.y = DISCO.lights && !reduceMotion ? t * 0.25 : 0;
  for (const { mesh, hue } of CLUB.tiles) mesh.material.color.setHSL(DISCO.lights ? (hue + t * 0.025) % 1 : hue, 0.8, DISCO.lights ? 0.22 + Math.sin(t * 1.2 + hue * 6) * 0.04 : 0.14);
  CLUB.lights.forEach(l => { l.intensity = DISCO.lights ? 9 : 2; });
  CLUB.beams.forEach(m => { m.visible = DISCO.lights; });
  for (let i = DISCO.emojis.length - 1; i >= 0; i--) {
    const p = DISCO.emojis[i]; p.age += dt; p.sprite.position.y = p.y + (reduceMotion ? 0 : p.age * 0.35);
    p.sprite.material.opacity = Math.max(0, 1 - p.age / 3.5);
    if (p.age >= 3.5) { CLUB.particles.remove(p.sprite); p.sprite.material.dispose(); DISCO.emojis.splice(i, 1); }
  }
  if (DISCO.dancing && DISCO.player) {
    const A = DISCO.player; A.root.visible = true; A.root.position.set(fp.pos.x, 0, fp.pos.z); A.yaw = Math.PI; A.pose = 'dance'; A.danceStyle = DISCO.style; A.speed = 0;
    A.isAvatar ? A.update(dt, t) : animatePerson(A, dt, t); if (!A.isAvatar && AV.clips) loadDancer();
  }
  if (t - DISCO.lastBotEmoji > 5) {
    DISCO.lastBotEmoji = t;
    const dancers = robots.filter(r => r.mode === 'lounge' && r.spot?.startsWith('dance'));
    if (dancers.length && inDisco(camera.position.x, camera.position.z)) {
      const r = dancers[Math.floor(Math.random() * dancers.length)]; spawnDiscoEmoji(DISCO_EMOJIS[Math.floor(Math.random() * DISCO_EMOJIS.length)], r.P.root.position.x, r.P.root.position.z);
    }
  }
}
$('discoGo').onclick = goDisco; $('discoExit').onclick = exitDisco;
$('discoDance').onclick = () => DISCO.dancing ? stopDance() : startDance();
$('discoStyle').onchange = () => { DISCO.style = $('discoStyle').value; if (DISCO.dancing) publishDiscoPresence(); };
$('discoInvite').onclick = () => inviteDancers();
$('discoMusic').onclick = () => { if (DISCO.dancing) stopDance(); openMusic(); if (!RADIO.on && !SPOTIFY.url) { $('musicStyle').value = 'electro'; musicPlay(); } };
/* O painel da pista começa fechado e abre pelo botão 🪩 Pista. */
function setDiscoPanel(open) { DISCO.panelOpen = open; $('discoPanel').hidden = !open; $('discoPanelOpen').hidden = open; }
$('discoPanelOpen').onclick = () => setDiscoPanel(true);
$('discoPanelClose').onclick = () => setDiscoPanel(false);
$('discoLights').setAttribute('aria-pressed', String(DISCO.lights));
$('discoLights').onclick = () => { DISCO.lights = !DISCO.lights; $('discoLights').setAttribute('aria-pressed', String(DISCO.lights)); $('discoLights').textContent = DISCO.lights ? 'Luzes suaves' : 'Luzes reduzidas'; };
document.querySelectorAll('[data-emoji]').forEach(b => { b.onclick = () => sendDiscoEmoji(b.dataset.emoji); });
