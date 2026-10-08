/* ================= Las Vegas Night: dançarinas no palco, atendentes, gorjetas e vozes ================= */
/* Personagens locais (como os robôs): cada visitante vê o próprio show. As fichas são as de brincadeira do 21. */
const SHOW = { dancers: [], hosts: [], offer: null, nextOffer: 0, voice: true, tips: 0, ready: false };
try { SHOW.voice = localStorage.getItem('sala-voz') !== '0'; } catch (e) { }
const inShow = (x, z) => x > -3.8 && x < 3.8 && z > 14.4 && z < 21.8;
const SHOW_DRINKS = ['wine', 'beer', 'juice', 'soda', 'water'];
const HOST_SPEED = 0.95, HOST_RADIUS = 0.22;
function showSay(text, floor = 'show') {
  if (!SHOW.voice || !inRoom || playerFloor() !== floor || !window.speechSynthesis) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text), voices = speechSynthesis.getVoices().filter(v => /^pt/i.test(v.lang));
    u.lang = 'pt-BR'; u.pitch = 1.15; u.rate = 1.02; u.voice = voices.find(v => /female|mulher|luciana|francisca|maria|vit[oó]ria|google/i.test(v.name)) || voices[0] || null;
    speechSynthesis.speak(u);
  } catch (e) { }
}
function showPerson(spec, file, name, role, x, z, yaw) {
  const P = makePerson(spec); P.pose = 'stand'; P.yaw = yaw; P.root.position.set(x, 0, z);
  const el = mkLabel('staff'); el.firstChild.textContent = name + ' · ' + role;
  return { P, el, file, name, role, loading: false, failed: false };
}
async function loadShowPerson(n) {
  if (!AV.clips || n.loading || n.failed || n.P.isAvatar) return;
  n.loading = true;
  try {
    const { g, SU } = await getVisitorModel(n.file), old = n.P;
    const A = new Avatar({ scene: SU.clone(g.scene) }, AV.clips.f, old, n.file);
    old.root.visible = false; A.yaw = old.yaw; A.pose = old.pose; A.danceStyle = old.danceStyle; n.P = A;
    if (n.role === 'dançarina') dressShowgirl(A, SHOW.dancers.indexOf(n));
  } catch (e) { n.failed = true; }
  n.loading = false;
}
/* ---------- figurino de showgirl: cocar de plumas, estola e saia de paetês presos aos ossos ---------- */
const featherTex = canvasTex(64, 256, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  for (let y = 8; y < h - 4; y += 2) {
    const r = Math.sin(Math.PI * y / h) * (w / 2 - 3), a = 0.35 + 0.65 * Math.sin(Math.PI * y / h);
    g.strokeStyle = `rgba(255,255,255,${a})`; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(w / 2, y); g.lineTo(w / 2 - r, y - 10); g.moveTo(w / 2, y); g.lineTo(w / 2 + r, y - 10); g.stroke();
  }
  g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, 6); g.stroke();
});
const sequinTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#7d7d7d'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 6) for (let x = (y / 6) % 2 * 3; x < w; x += 6) { const v = 120 + Math.random() * 135; g.fillStyle = `rgb(${v},${v},${v})`; g.beginPath(); g.arc(x, y, 2.6, 0, Math.PI * 2); g.fill(); }
}, { repeat: [4, 2] });
const sparkTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) { g.fillStyle = '#fff'; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
}, { repeat: [4, 2] });
const SHOWGIRL_COLORS = [
  { feather: '#ffd36b', sequin: '#d9ad55', boa: '#fff0c4' },
  { feather: '#ff5fb7', sequin: '#e0458f', boa: '#ffc1df' },
  { feather: '#eef4ff', sequin: '#b4c0d4', boa: '#dce9ff' },
];
const _boneM = new THREE.Matrix4(), _wantM = new THREE.Matrix4(), _rootInv = new THREE.Matrix4();
/* Prende um enfeite a um osso numa posição/rotação dada no espaço do avatar (compensa a escala do osso). */
function attachToBone(A, boneName, obj, offset, euler = new THREE.Euler()) {
  const bone = A.root.getObjectByName('Bip01_' + boneName); if (!bone) return null;
  A.root.updateMatrixWorld(true); _rootInv.copy(A.root.matrixWorld).invert();
  _boneM.multiplyMatrices(_rootInv, bone.matrixWorld);
  const at = new THREE.Vector3().setFromMatrixPosition(_boneM).add(offset);
  _wantM.compose(at, new THREE.Quaternion().setFromEuler(euler), obj.scale);
  _boneM.invert().multiply(_wantM).decompose(obj.position, obj.quaternion, obj.scale);
  bone.add(obj); return obj;
}
function dressShowgirl(A, i) {
  if (A.costume) return;
  const c = SHOWGIRL_COLORS[i % SHOWGIRL_COLORS.length], parts = [];
  const sequin = new THREE.MeshStandardMaterial({ color: c.sequin, map: sequinTex, metalness: 0.75, roughness: 0.28, emissive: c.sequin, emissiveMap: sparkTex, emissiveIntensity: 0.6, side: THREE.DoubleSide });
  const gold = new THREE.MeshStandardMaterial({ color: '#e2b65a', metalness: 0.9, roughness: 0.25, emissive: '#3a2a08' });
  const feather = new THREE.MeshStandardMaterial({ color: c.feather, map: featherTex, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.8, emissive: c.feather, emissiveIntensity: 0.25 });
  const boa = new THREE.MeshStandardMaterial({ color: c.boa, roughness: 1, emissive: c.boa, emissiveIntensity: 0.15 });
  /* Cocar: faixa dourada e leque de plumas atrás da cabeça. */
  const crown = new THREE.Group();
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.013, 8, 28), gold); band.rotation.x = Math.PI / 2; crown.add(band);
  for (let k = 0; k < 11; k++) {
    const a = -1.25 + k * 2.5 / 10, f = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.38), feather);
    f.position.set(Math.sin(a) * 0.12, 0.1 + Math.cos(a) * 0.08, -0.07); f.rotation.set(-0.3, 0, -a * 0.9); crown.add(f);
  }
  parts.push(attachToBone(A, 'Head', crown, new THREE.Vector3(0, 0.08, -0.01)));
  /* Estola de plumas nos ombros. */
  const stole = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.04, 10, 30), boa); stole.scale.set(1.15, 0.85, 1);
  parts.push(attachToBone(A, 'Neck', stole, new THREE.Vector3(0, -0.06, 0.0), new THREE.Euler(Math.PI / 2 - 0.25, 0, 0)));
  /* Saia de paetês e cinto dourado na cintura. */
  parts.push(attachToBone(A, 'Pelvis', new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.37, 0.36, 28, 1, true), sequin), new THREE.Vector3(0, -0.13, 0)));
  parts.push(attachToBone(A, 'Pelvis', new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.02, 8, 28), gold), new THREE.Vector3(0, 0.05, 0), new THREE.Euler(Math.PI / 2, 0, 0)));
  for (const part of parts) if (part) part.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  A.costume = { parts, sequin };
}
/* ---------- confete sobre o palco ---------- */
const CONFETTI_N = 160;
const confetti = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.04, 0.025), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), CONFETTI_N);
confetti.frustumCulled = false; confetti.userData.floor = 'show'; GROUPS.main.add(confetti);
const CONF = Array.from({ length: CONFETTI_N }, (_, i) => ({ x: 0, y: -1, z: 0, vy: 0, ph: i, spin: 1 + (i % 5) }));
{ const colors = ['#ffd36b', '#ff5fb7', '#6be3ff', '#b6ff6b', '#ffffff'], hidden = new THREE.Matrix4().makeScale(0, 0, 0); CONF.forEach((c, i) => { confetti.setColorAt(i, new THREE.Color(colors[i % colors.length])); confetti.setMatrixAt(i, hidden); }); }
function confettiBurst(n = CONFETTI_N) {
  const st = SHOW_LAYOUT.stage;
  for (let i = 0; i < n; i++) Object.assign(CONF[(SHOW.confI = ((SHOW.confI || 0) + 1) % CONFETTI_N)], { x: srnd(st.x0, st.x1), y: 2.9 + Math.random() * 0.4, z: srnd(st.z0 - 1.2, st.z1 - 0.1), vy: 0.35 + Math.random() * 0.35 });
}
const _confO = new THREE.Object3D();
function stepConfetti(dt, t) {
  for (let i = 0; i < CONFETTI_N; i++) {
    const c = CONF[i];
    if (c.y > 0) { c.y -= c.vy * dt; c.x += Math.sin(t * 2 + c.ph) * 0.15 * dt; }
    _confO.position.set(c.x, Math.max(c.y, -1), c.z); _confO.rotation.set(t * c.spin, t * 0.7 * c.spin, c.ph);
    _confO.scale.setScalar(c.y > 0 ? 1 : 0); _confO.updateMatrix(); confetti.setMatrixAt(i, _confO.matrix);
  }
  confetti.instanceMatrix.needsUpdate = true;
}
function initShow() {
  if (SHOW.ready) return; SHOW.ready = true;
  [['Female_Adult_09', 'Jade'], ['Business_Female_03', 'Lorena'], ['Female_Adult_02', 'Mel']].forEach(([file, name], i) => {
    const [x, z] = SHOW_LAYOUT.dancers[i], d = showPerson(1 + i * 2, file, name, 'dançarina', x, z, Math.PI);
    d.style = DISCO_STYLES[i % 3]; d.phase = i * 1.3; d.P.pose = 'dance'; d.P.danceStyle = d.style; d.P.dancePhase = d.phase; d.x = x; d.z = z;
    SHOW.dancers.push(d);
  });
  [['Business_Female_04', 'Bianca', [-2.6, 15.4]], ['Business_Female_01', 'Larissa', [2.4, 19.6]]].forEach(([file, name, [x, z]], i) => {
    const h = showPerson(3 + i * 2, file, name, 'atendente', x, z, 0);
    Object.assign(h, { state: 'wander', path: [], wait: 1 + i * 2, stuck: 0, until: 0 });
    SHOW.hosts.push(h);
  });
}
function hostWalk(h, dt) {
  const p = h.P.root.position; let budget = HOST_SPEED * dt, speed = 0;
  while (h.path.length && budget > 0.0001) {
    const q = h.path[0], dx = q[0] - p.x, dz = q[1] - p.z, d = Math.hypot(dx, dz);
    if (d < 0.05) { h.path.shift(); continue; }
    const step = Math.min(d, budget); let x = p.x + dx / d * step, z = p.z + dz / d * step;
    /* Encostou num móvel: desliza ao longo dele, como o visitante. */
    if (roomBlocked(x, z, HOST_RADIUS)) {
      if (!roomBlocked(x, p.z, HOST_RADIUS)) z = p.z; else if (!roomBlocked(p.x, z, HOST_RADIUS)) x = p.x; else { h.stuck += dt; break; }
    }
    h.P.yaw = angDamp(h.P.yaw, Math.atan2(dx, dz), 9, dt); p.x = x; p.z = z; budget -= step; speed = HOST_SPEED; h.stuck = 0;
  }
  if (h.stuck > 1.2) { h.path = []; h.stuck = 0; }
  return speed;
}
function hostGo(h, x, z) { const p = h.P.root.position; h.path = staffPath([p.x, p.z], [x, z]) || [[x, z]]; }
/* Ponto a 1 m do visitante, do lado de onde a atendente vem. */
function besidePlayer(h, avoidPeople = false) {
  const p = h.P.root.position, a = Math.atan2(p.z - fp.pos.z, p.x - fp.pos.x);
  for (const da of [0, 0.6, -0.6, 1.2, -1.2, Math.PI]) {
    const x = fp.pos.x + Math.cos(a + da), z = fp.pos.z + Math.sin(a + da);
    if (!inShow(x, z) || roomBlocked(x, z, HOST_RADIUS)) continue;
    if (avoidPeople && [
      ...SHOW.hosts.filter(o => o !== h).map(o => [o, 0.22]),
      ...STAFF.members.map(o => [o, 0.22]), ...robots.map(o => [o, 0.24]),
    ].some(([o, radius]) => (x - o.P.root.position.x) ** 2 + (z - o.P.root.position.z) ** 2 < (PR + radius) ** 2)) continue;
    return [x, z];
  }
  return null;
}
function openOffer(h) {
  if (SHOW.offer && SHOW.offer !== h) closeOffer();
  SHOW.offer = h; h.state = 'offer'; h.path = [];
  $('hostName').textContent = h.name + ' · atendente do Las Vegas Night';
  $('hostLine').textContent = 'Oi! Bem-vindo ao Las Vegas Night. Posso trazer uma bebida, dançar com você ou arrumar uma mesa para o show?';
  $('hostOffer').hidden = false; showSay('Oi! Bem-vindo ao Las Vegas Night. Posso trazer uma bebida, dançar com você, ou arrumar uma mesa para o show?');
}
function closeOffer(cool = 40) {
  const h = SHOW.offer; $('hostOffer').hidden = true; SHOW.offer = null;
  if (h && h.state === 'offer') { h.state = 'wander'; h.wait = 2; }
  SHOW.nextOffer = performance.now() / 1000 + (DEBUG ? 2 : cool);
}
function offerDrink() {
  const h = SHOW.offer; if (!h) return;
  closeOffer(60); h.state = 'fetch'; h.item = SHOW_DRINKS[Math.floor(Math.random() * SHOW_DRINKS.length)];
  hostGo(h, SHOW_LAYOUT.bar.x, SHOW_LAYOUT.bar.z); showSay('Já volto com a sua bebida!'); serviceMessage(h.name + ' foi buscar sua bebida no balcão.');
}
function offerDance() {
  const h = SHOW.offer; if (!h) return false;
  if (!startDance()) { $('hostLine').textContent = 'Não há espaço livre para dançar aqui. Dê alguns passos ou escolha uma mesa.'; return false; }
  closeOffer(60); h.state = 'dance'; h.P.pose = 'dance'; h.until = performance.now() / 1000 + 25; h.P.danceStyle = DISCO_STYLES[Math.floor(Math.random() * 3)];
  const spot = besidePlayer(h, true); if (spot) { h.P.root.position.x = spot[0]; h.P.root.position.z = spot[1]; }
  showSay('Vamos dançar!'); return true;
}
function offerSeat() {
  const h = SHOW.offer; if (!h) return;
  closeOffer(90);
  const seats = SEATS.filter(s => s.kind === 'show' && s.free()).sort((a, b) => Math.hypot(a.x - fp.pos.x, a.z - fp.pos.z) - Math.hypot(b.x - fp.pos.x, b.z - fp.pos.z));
  if (seats[0]) { showSay('Boa escolha! Aproveite o show.'); sitDown(seats[0]); }
}
function nearestDancer() {
  const x = seatState.s ? seatState.s.x : fp.pos.x, z = seatState.s ? seatState.s.z : fp.pos.z;
  return SHOW.dancers.reduce((a, d) => Math.hypot(d.x - x, d.z - z) < Math.hypot(a.x - x, a.z - z) ? d : a);
}
function tipDancer(d = nearestDancer()) {
  if (!inRoom || playerFloor() !== 'show') return false;
  if (CASINO.balance < 10) { serviceMessage('Sem fichas para gorjeta. Ganhe mais no Clube do 21, na sala de jogos.'); return false; }
  CASINO.balance -= 10; SHOW.tips += 10; d.cheerUntil = performance.now() / 1000 + 3;
  spawnDiscoEmoji('💵', d.x, d.z, 2.3); spawnDiscoEmoji('💵', d.x + 0.3, d.z, 2.0); confettiBurst(40);
  serviceMessage('Você deu 10 fichas para ' + d.name + '. Fichas: ' + CASINO.balance + '.'); showSay('Obrigada! Você é demais!');
  return true;
}
function stepShow(dt, t) {
  initShow(); stepShowFx(dt, t);
  const here0 = inRoom && playerFloor() === 'show';
  if (here0) {
    /* Confete quando as três giram juntas (a cada 16 tempos) e paetês cintilando. */
    const beat = t / danceBeatLen(), turn = Math.floor(beat / 16);
    if (beat % 16 >= 14 && SHOW.lastTurn !== turn) { SHOW.lastTurn = turn; confettiBurst(90); }
    stepConfetti(dt, t);
    for (const d of SHOW.dancers) if (d.P.costume) d.P.costume.sequin.emissiveIntensity = 0.35 + 0.45 * Math.abs(Math.sin(t * 5 + SHOW.dancers.indexOf(d)));
  }
  const here = inRoom && playerFloor() === 'show';
  for (const d of SHOW.dancers) {
    if (AV.clips && !d.P.isAvatar) loadShowPerson(d);
    const P = d.P; P.root.position.set(d.x, 0, d.z); P.yaw = Math.PI; P.pose = 'dance'; P.speed = 0;
    /* As três dançam juntas a fila de cancan, no mesmo tempo. */
    P.danceStyle = 'showgirl'; P.dancePhase = 0;
    P.isAvatar ? P.update(dt, t) : animatePerson(P, dt, t);
    P.root.position.y += SHOW_LAYOUT.stage.y + (d.cheerUntil > t ? Math.abs(Math.sin(t * 9)) * 0.08 : 0);
  }
  for (const h of SHOW.hosts) {
    if (AV.clips && !h.P.isAvatar) loadShowPerson(h);
    const P = h.P, p = P.root.position; let speed = 0;
    if (h.state === 'wander') {
      if (here && mode === 'fp' && !SHOW.offer && t > SHOW.nextOffer && SHOW.hosts.every(o => o.state !== 'approach') && Math.hypot(p.x - fp.pos.x, p.z - fp.pos.z) < 7) {
        h.state = 'approach'; h.path = [];
      } else if (!h.path.length && (h.wait -= dt) <= 0) {
        const w = SHOW_LAYOUT.walk[Math.floor(Math.random() * SHOW_LAYOUT.walk.length)]; hostGo(h, w[0], w[1]); h.wait = 3 + Math.random() * 4;
      }
    }
    if (h.state === 'approach') {
      if (!here || mode !== 'fp') { h.state = 'wander'; h.path = []; }
      else if (Math.hypot(p.x - fp.pos.x, p.z - fp.pos.z) < 1.4) openOffer(h);
      else if (!h.path.length || !h.goal || Math.hypot(h.goal[0] - fp.pos.x, h.goal[1] - fp.pos.z) > 0.8) {
        const spot = besidePlayer(h); h.goal = [fp.pos.x, fp.pos.z]; if (spot) hostGo(h, spot[0], spot[1]); else h.state = 'wander';
      }
    }
    if (h.state === 'offer') {
      P.yaw = angDamp(P.yaw, Math.atan2(fp.pos.x - p.x, fp.pos.z - p.z), 6, dt);
      if (!here || Math.hypot(p.x - fp.pos.x, p.z - fp.pos.z) > 3.2 || !['fp', 'seat'].includes(mode)) closeOffer();
    }
    if (h.state === 'fetch' && !h.path.length) { h.state = 'bring'; h.goal = null; }
    if (h.state === 'bring') {
      if (!here) { h.state = 'wander'; h.item = null; }
      else {
        const tx = seatState.s ? seatState.s.x : fp.pos.x, tz = seatState.s ? seatState.s.z : fp.pos.z;
        if (Math.hypot(p.x - tx, p.z - tz) < 1.5) { deliverConsumable(h.item, h); showSay('Aqui está! Aproveite o show.'); h.item = null; h.state = 'wander'; h.wait = 3; }
        else if (!h.path.length || !h.goal || Math.hypot(h.goal[0] - tx, h.goal[1] - tz) > 0.8) {
          h.goal = [tx, tz]; const s = seatState.s ? null : besidePlayer(h); hostGo(h, s ? s[0] : tx, s ? s[1] : tz - 0.9);
        }
      }
    }
    if (h.state === 'dance') {
      P.yaw = angDamp(P.yaw, Math.atan2(fp.pos.x - p.x, fp.pos.z - p.z), 6, dt);
      if (t > h.until || !here) { h.state = 'wander'; h.wait = 2; }
    }
    if (h.path.length && h.state !== 'offer' && h.state !== 'dance') speed = hostWalk(h, dt);
    P.pose = h.state === 'dance' ? 'dance' : 'stand'; P.speed = speed;
    setPersonItem(P, h.state === 'bring' && h.item ? h.item : '', 0);
    P.isAvatar ? P.update(dt, t) : animatePerson(P, dt, t);
  }
  const bar = $('showBar'); bar.hidden = !here || !['fp', 'seat'].includes(mode);
  if (!bar.hidden) { const txt = '🪙 ' + CASINO.balance + (isTouch ? '' : ' fichas'); if ($('showChips').textContent !== txt) $('showChips').textContent = txt; }
  const icon = SHOW.voice ? '🔊' : '🔇'; if ($('showVoice').firstChild.textContent !== icon) $('showVoice').firstChild.textContent = icon;
}
const _showHead = new THREE.Vector3();
function updateShowLabels(t) {
  for (const n of [...SHOW.dancers, ...SHOW.hosts, ...(WELCOME.npc ? [WELCOME.npc] : [])]) {
    const el = n.el, txt = n.cheerUntil > t ? '💵 obrigada!' : n.role === 'dançarina' ? 'no palco' : { offer: 'conversando', fetch: 'buscando bebida', bring: 'levando bebida', dance: 'dançando', approach: 'vindo até você' }[n.state] || 'pode chamar';
    if (el.lastChild.textContent !== txt) el.lastChild.textContent = txt;
    if (!n.P.J.head || otherFloor(n.P.root.position.x, n.P.root.position.z) || !inRoom) { el.style.opacity = '0'; continue; }
    n.P.J.head.getWorldPosition(_showHead); _showHead.y += 0.4; stackShift(_showHead, n.P.root.position.x, n.P.root.position.z);
    const dist = camera.position.distanceTo(_showHead); _showHead.project(camera);
    if (_showHead.z > 1 || _showHead.z < -1 || dist < 0.55) { el.style.opacity = '0'; continue; }
    el.style.opacity = '1';
    el.style.transform = `translate(${(_showHead.x * 0.5 + 0.5) * innerWidth}px,${(-_showHead.y * 0.5 + 0.5) * innerHeight}px) translate(-50%,-100%) scale(${clamp(4.2 / dist, 0.42, 1.25).toFixed(3)})`;
  }
}
$('hostDrink').onclick = offerDrink; $('hostDance').onclick = offerDance; $('hostSeat').onclick = offerSeat;
$('hostNo').onclick = () => { showSay('Tudo bem! Estou por aqui.'); closeOffer(); };
$('showTip').onclick = () => tipDancer();
$('showVoice').onclick = () => { SHOW.voice = !SHOW.voice; try { localStorage.setItem('sala-voz', SHOW.voice ? '1' : '0'); } catch (e) { } if (!SHOW.voice && window.speechSynthesis) speechSynthesis.cancel(); };
