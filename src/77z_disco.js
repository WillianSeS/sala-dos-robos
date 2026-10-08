/* ================= dança, reações e acesso à discoteca ================= */
const DISCO_STYLES = ['groove', 'disco', 'party', 'showgirl'];
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
/* Coreografia por batida: cada estilo é uma sequência de passos que entram e saem suavemente.
   Eixos medidos no esqueleto do Rocketbox: braço sobe para o lado em Y (esquerdo negativo, direito positivo),
   para frente em -Z; coxa chuta para frente em +Z; joelho e cotovelo dobram em -Z; quadril balança em Y e gira em X. */
const DANCE_STYLES = ['groove', 'disco', 'party', 'showgirl'];
const ease = x => x * x * (3 - 2 * x);
function danceBeatLen() { return RADIO.on ? clamp(radioBeat(RADIO.station) * 2 / 1000, 0.42, 0.62) : 0.5; }
function dancePose(style, b, amt) {
  const p = { sway: 0, twist: 0, bend: 0, lean: 0, chest: 0, nod: 0, tilt: 0, armL: 0.12, armR: 0.12, fwdL: 0, fwdR: 0, elbL: 0.25, elbR: 0.25, kickL: 0, kickR: 0, outL: 0, outR: 0, kneeL: 0, kneeR: 0, bounce: 0, stepX: 0, turn: 0 };
  const dip = (1 + Math.cos(2 * Math.PI * b)) / 2, side = Math.sin(Math.PI * b / 2), half = Math.sin(Math.PI * b);
  if (style === 'disco') {
    /* "Dedo para o alto": braço direito aponta para cima na diagonal e depois cruza para baixo; mão esquerda na cintura. */
    const up = ease(clamp((Math.cos(Math.PI * b / 2) + 1) / 2 * 1.4 - 0.2, 0, 1));
    Object.assign(p, { armR: 0.3 + 1.9 * up, fwdR: 0.9 - 0.5 * up, elbR: 0.15, chest: 0.25 * (1 - up) - 0.1, tilt: -0.15 * up, nod: -0.12 * up,
      armL: 0.6 + 0.1 * half, elbL: 1.7, fwdL: -0.25 + 0.1 * side, sway: 0.16 * half, kneeL: 0.3 * Math.max(0, half), kneeR: 0.3 * Math.max(0, -half), kickL: 0.12 * Math.max(0, half), kickR: 0.12 * Math.max(0, -half), bounce: -0.015 * dip });
  } else if (style === 'party') {
    /* Mãos para o alto acenando, pulinhos no tempo e balanço de um lado para o outro. */
    const wave = Math.sin(2 * Math.PI * b), hop = Math.pow(Math.max(0, Math.sin(2 * Math.PI * (b + 0.25))), 2);
    Object.assign(p, { armL: 2.55 + 0.15 * wave, armR: 2.55 - 0.15 * wave, fwdL: 0.25, fwdR: 0.25, elbL: 0.35 + 0.25 * wave, elbR: 0.35 - 0.25 * wave,
      sway: 0.14 * side, lean: -0.05 * side, chest: 0.12 * half, kneeL: 0.25 * (1 - hop), kneeR: 0.25 * (1 - hop), kickL: 0.12 * (1 - hop), kickR: 0.12 * (1 - hop),
      bounce: 0.07 * hop - 0.015, turn: 0.45 * Math.sin(Math.PI * b / 8), nod: 0.1 * dip });
  } else if (style === 'showgirl') {
    /* Fila de cancan: braços abertos, chutes alternados e um giro completo a cada 16 tempos. */
    const k = b % 2, leg = Math.floor(b / 2) % 2, b16 = b % 16, spinning = b16 >= 14;
    const kick = spinning ? 0 : Math.sin(Math.PI * Math.min(1, k / 1.2)) * (k < 1.2 ? 1 : 0);
    Object.assign(p, { armL: 1.15 + 0.15 * half, armR: 1.15 - 0.15 * half, fwdL: 0.35, fwdR: 0.35, elbL: 0.45, elbR: 0.45,
      kickL: leg ? 1.25 * kick : 0.05, kickR: leg ? 0.05 : 1.25 * kick, kneeL: leg ? 0.05 : 0.12 * kick, kneeR: leg ? 0.12 * kick : 0.05,
      sway: 0.1 * half, nod: -0.1, tilt: 0.08 * half, bounce: 0.02 * dip, turn: spinning ? Math.PI * 2 * ease((b16 - 14) / 2) : 0 });
  } else {
    /* Balanço: passo para o lado e toque, joelhos marcando o tempo, braços soltos e cabeça no ritmo. */
    Object.assign(p, { stepX: 0.13 * side, sway: 0.12 * side, lean: -0.05 * side, chest: 0.16 * half, nod: 0.12 * dip,
      kneeL: 0.22 * dip + 0.05, kneeR: 0.22 * dip + 0.05, kickL: 0.1 * dip, kickR: 0.1 * dip, bounce: -0.02 * dip,
      armL: 0.25, armR: 0.25, fwdL: 0.35 * Math.max(0, half), fwdR: 0.35 * Math.max(0, -half), elbL: 0.7, elbR: 0.7 });
  }
  if (amt !== 1) for (const k in p) p[k] *= amt;
  /* Um giro parcial saltaria de volta à posição inicial ao fechar os 16 tempos. */
  if (style === 'showgirl' && amt < 1) p.turn = 0;
  return p;
}
const _danceQ = new THREE.Quaternion(), _danceUp = new THREE.Vector3(0, 1, 0);
function applyAvatarDance(A, t) {
  const [spine, chest, la, ra, le, re, lt, rt, lk, rk, pelvis, neck] = A.danceBones;
  A.danceRest = A.danceBones.map(bone => bone ? bone.quaternion.clone() : null);
  const p = dancePose(A.danceStyle || 'groove', t / danceBeatLen() + (A.dancePhase || 0) * 0.37, reduceMotion ? 0.35 : 1);
  if (pelvis) { pelvis.rotateY(p.sway); pelvis.rotateX(p.twist); }
  if (spine) { spine.rotateZ(p.bend); spine.rotateY(p.lean); }
  if (chest) chest.rotateX(p.chest);
  if (neck) { neck.rotateZ(p.nod); neck.rotateY(p.tilt); }
  if (la) { la.rotateY(-p.armL); la.rotateZ(-p.fwdL); }
  if (ra) { ra.rotateY(p.armR); ra.rotateZ(-p.fwdR); }
  if (le) le.rotateZ(-p.elbL); if (re) re.rotateZ(-p.elbR);
  if (lt) { lt.rotateZ(p.kickL); lt.rotateY(p.outL); }
  if (rt) { rt.rotateZ(p.kickR); rt.rotateY(-p.outR); }
  if (lk) lk.rotateZ(-p.kneeL); if (rk) rk.rotateZ(-p.kneeR);
  /* Passo lateral e giro no próprio lugar: mexem o modelo dentro do avatar, sem tirá-lo do lugar marcado. */
  const sc = A.root.children[0], rest = A.sceneRest;
  sc.position.set(rest.p.x + p.stepX, rest.p.y, rest.p.z); sc.quaternion.copy(rest.q).premultiply(_danceQ.setFromAxisAngle(_danceUp, p.turn));
  A.root.position.y = 0.015 + p.bounce;
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
  const show = inShow(fp.pos.x, fp.pos.z);
  if (mode !== 'fp' || (!inDisco(fp.pos.x, fp.pos.z) && !show)) return false;
  /* No show, um passo curto desvia de quem estiver cruzando o visitante; na discoteca, usa a pista. */
  const spots = show ? [[fp.pos.x, fp.pos.z], ...Array.from({ length: 8 }, (_, i) => [fp.pos.x + Math.cos(i * Math.PI / 4) * 0.65, fp.pos.z + Math.sin(i * Math.PI / 4) * 0.65])] : [[clamp(fp.pos.x, -2.2, 2.2), clamp(fp.pos.z, 8.5, 11.8)], [0, 8.5], [-2.1, 8.5], [2.1, 8.5]];
  const free = spots.find(([x, z]) => (!show || inShow(x, z)) && !blocked(x, z));
  if (!free) { $('discoMsg').textContent = 'A pista está cheia aqui. Dê alguns passos e tente de novo.'; return false; }
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
  return true;
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
  if (!DISCO_EMOJIS.includes(emoji) && emoji !== '💵') return;
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
