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
  } catch (e) { n.failed = true; }
  n.loading = false;
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
function besidePlayer(h) {
  const p = h.P.root.position, a = Math.atan2(p.z - fp.pos.z, p.x - fp.pos.x);
  for (const da of [0, 0.6, -0.6, 1.2, -1.2, Math.PI]) {
    const x = fp.pos.x + Math.cos(a + da), z = fp.pos.z + Math.sin(a + da);
    if (inShow(x, z) && !roomBlocked(x, z, HOST_RADIUS)) return [x, z];
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
  const h = SHOW.offer; if (!h) return;
  closeOffer(60); h.state = 'dance'; h.P.pose = 'dance'; h.until = performance.now() / 1000 + 25; h.P.danceStyle = DISCO_STYLES[Math.floor(Math.random() * 3)];
  const spot = besidePlayer(h); if (spot) { h.P.root.position.x = spot[0]; h.P.root.position.z = spot[1]; }
  showSay('Vamos dançar!'); startDance();
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
  spawnDiscoEmoji('💵', d.x, d.z, 2.3); spawnDiscoEmoji('💵', d.x + 0.3, d.z, 2.0);
  serviceMessage('Você deu 10 fichas para ' + d.name + '. Fichas: ' + CASINO.balance + '.'); showSay('Obrigada! Você é demais!');
  return true;
}
function stepShow(dt, t) {
  initShow(); stepShowFx(dt, t);
  const here = inRoom && playerFloor() === 'show';
  for (const d of SHOW.dancers) {
    if (AV.clips && !d.P.isAvatar) loadShowPerson(d);
    const P = d.P; P.root.position.set(d.x, 0, d.z); P.yaw = Math.PI; P.pose = 'dance'; P.speed = 0;
    P.danceStyle = DISCO_STYLES[(Math.floor(t / 12) + SHOW.dancers.indexOf(d)) % 3]; P.dancePhase = d.phase;
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
    n.P.J.head.getWorldPosition(_showHead); _showHead.y += 0.4;
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
