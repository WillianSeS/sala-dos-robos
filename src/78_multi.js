
/* ================= várias pessoas na sala (sala ao vivo + banco de dados da página) ================= */
const MP = { room: null, db: null, sb: null, ch: null, sendDt: 0.125, vis: new Map(), seen: new Set(), log: [], unread: 0, open: false, lastSend: '', sendT: 0, peerT: 0 };
const VISITOR_FILES = ['Male_Adult_02', 'Female_Adult_02', 'Male_Adult_10', 'Female_Adult_09'];
const visitorModels = {};
let myName = '';
try { myName = localStorage.getItem('sala-nick') || ''; } catch (e) { }
const nickEl = $('nick'); if (nickEl) nickEl.value = myName;
const myLook = Math.floor(Math.random() * VISITOR_FILES.length);
function finalName() {
  const v = ((nickEl && nickEl.value) || myName || '').trim() || ('Visitante ' + (100 + Math.floor(Math.random() * 900)));
  myName = v.slice(0, 24); try { localStorage.setItem('sala-nick', myName); } catch (e) { }
  return myName;
}
async function getVisitorModel(file) {
  if (!visitorModels[file]) visitorModels[file] = (async () => {
    const [{ GLTFLoader }, SU] = await Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/utils/SkeletonUtils.js')]);
    const g = await new GLTFLoader().loadAsync('people/' + file + '.json');
    return { g, SU };
  })();
  return visitorModels[file];
}
function mkLabel(cls) { const el = document.createElement('div'); el.className = 'pl ' + cls; el.innerHTML = '<b class="nm"></b><span class="v"></span>'; labelsEl.appendChild(el); return el; }
class Visitor {
  constructor(id, p) {
    this.id = id; this.A = null; this.dead = false; this.say = ''; this.sayT = 0;
    this.x = this.tx = +p.x || 0; this.z = this.tz = +p.z || 0; this.yaw = this.tyaw = +p.yaw || 0; this.m = p.m || 'w';
    this.file = VISITOR_FILES[Math.abs(p.a | 0) % VISITOR_FILES.length];
    this.el = mkLabel('vi'); this.setName(p.n);
    this.load();
  }
  setName(n) { this.name = String(n || 'Visitante').slice(0, 24); this.el.firstChild.textContent = this.name; }
  async load() {
    if (!AV.clips || this.loading) return; this.loading = true;
    const { g, SU } = await getVisitorModel(this.file); if (this.dead) return;
    const scene = SU.clone(g.scene);
    this.A = new Avatar({ scene }, this.file.startsWith('Female') ? AV.clips.f : AV.clips.m, { root: { position: new THREE.Vector3(this.x, 0, this.z) }, yaw: this.yaw, pose: 'stand' }, this.file);
  }
  update(dt, t) {
    const d = Math.hypot(this.tx - this.x, this.tz - this.z);
    this.x = damp(this.x, this.tx, 6, dt); this.z = damp(this.z, this.tz, 6, dt); this.yaw = angDamp(this.yaw, this.tyaw, 8, dt);
    if (!this.A) { if (AV.clips && !this.loading) this.load(); return; }
    this.A.root.position.set(this.x, 0, this.z); this.A.yaw = this.yaw;
    this.A.pose = this.m === 'd' ? 'dance' : this.m === 's' ? 'sofa' : this.m === 't' ? 'cross' : 'stand';
    this.A.danceStyle = this.ds; this.A.smokingUntil = this.smokingUntil || 0;
    setPersonItem(this.A, this.item || '', this.consumeUntil || 0);
    this.A.speed = this.m === 'w' && d > 0.08 ? clamp(d * 4, 0.6, 1.8) : 0;
    this.A.update(dt, t);
    if (this.m === 's') this.A.root.position.y = this.sy || 0;
  }
  remove() { this.dead = true; this.el.remove(); if (this.A) { disposePersonItem(this.A); disposeSmokingPerson(this.A); GROUPS.main.remove(this.A.root); GROUPS.main.remove(this.A.cup); } }
}
function addChat(id, name, text, t) {
  if (!id || MP.seen.has(id)) return; MP.seen.add(id);
  MP.log.push({ id, name: String(name || 'Visitante').slice(0, 24), text: String(text || '').slice(0, 200), t: +t || Date.now() });
  MP.log.sort((a, b) => a.t - b.t); if (MP.log.length > 40) MP.log.shift();
  renderChat(); if (!MP.open) { MP.unread++; updToggle(); }
}
function renderChat() {
  const log = $('mpLog'); log.innerHTML = '';
  for (const m of MP.log.slice(-30)) { const p = document.createElement('p'); const b = document.createElement('b'); b.textContent = m.name + ': '; p.appendChild(b); p.appendChild(document.createTextNode(m.text)); log.appendChild(p); }
  log.scrollTop = 1e6;
}
function updToggle() {
  const n = MP.room ? MP.room.peers().length : 0;
  setLabel($('mpToggle'), '💬' + (MP.unread && !MP.open ? MP.unread : ''), (MP.open ? 'Fechar chat' : 'Chat da sala') + (MP.unread && !MP.open ? ' (' + MP.unread + ')' : ''));
  const hp = $('hPeople'); if (MP.room) { hp.hidden = false; hp.lastElementChild.textContent = String(Math.max(1, n)); }
}
$('mpToggle').addEventListener('click', () => { MP.open = !MP.open; $('mpBox').hidden = !MP.open; MP.unread = 0; updToggle(); if (MP.open && !isTouch) setTimeout(() => $('mpInput').focus(), 30); if (MP.open && document.pointerLockElement) document.exitPointerLock(); });
$('mpForm').addEventListener('submit', e => {
  e.preventDefault(); const i = $('mpInput'), s = i.value.trim().slice(0, 200); i.value = ''; if (!s) return;
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7), t = Date.now();
  addChat(id, myName || finalName(), s, t);
  if (MP.room) MP.room.presence({ msg: { id, t, s } }).catch(() => { });
  if (MP.db) MP.db.collection('chat').doc(id).set({ n: myName, s, t }).catch(() => { });
  if (MP.sb) MP.sb.from('chat_messages').insert({ id, name: myName || 'Visitante', body: s }).then(() => { }, () => { });
});
/* fora do claude.ai: Supabase (tempo real + banco) */
const SUPA = { url: 'https://qhedllguoknhotovycqf.supabase.co', key: 'sb_publishable_fotrkTfePY0ULUN6pJjWaA_AD7dtdN9' };
const myId = Math.random().toString(36).slice(2, 10);
async function sbInit() {
  let createClient;
  try { createClient = window.__fakeSupabase || (await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/+esm')).createClient; } catch (e) { return; }
  const sb = createClient(SUPA.url, SUPA.key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  MP.sb = sb; MP.sendDt = 0.2;
  const st = { pres: {}, pos: new Map() };
  const ch = sb.channel('sala-dos-robos', { config: { presence: { key: myId }, broadcast: { self: false } } });
  ch.on('presence', { event: 'sync' }, () => {
    st.pres = ch.presenceState();
    for (const k of [...st.pos.keys()]) if (!st.pres[k]) st.pos.delete(k);
    /* plano grátis: ~100 mensagens/s no projeto todo; quanto mais gente, menos atualizações por segundo */
    const n = Object.keys(st.pres).length; MP.sendDt = Math.max(0.2, n * n / 80);
    updToggle(); voicePrune(Object.keys(st.pres));
  });
  ch.on('broadcast', { event: 'pos' }, ({ payload }) => { if (payload && payload.id) st.pos.set(String(payload.id), payload); });
  ch.on('broadcast', { event: 'chat' }, ({ payload }) => {
    if (!payload || !payload.id) return;
    addChat(String(payload.id), payload.n, payload.s, payload.t);
    const v = MP.vis.get(payload.from); if (v) { v.say = String(payload.s || '').slice(0, 120); v.sayT = performance.now() / 1000 + 8; }
  });
  ch.on('broadcast', { event: 'rtc' }, ({ payload }) => voiceSignal(payload));
  /* posição: broadcast rápido para quem está na sala; presença (lenta) para quem chega depois */
  let me = {}, joined = false, lastTrack = 0, trackTm = 0;
  const doTrack = () => { trackTm = 0; if (!joined) return; lastTrack = Date.now(); ch.track(Object.assign({}, me)).catch(() => { }); };
  MP.room = {
    presence: async p => {
      if (p.msg) { ch.send({ type: 'broadcast', event: 'chat', payload: { id: p.msg.id, from: myId, n: myName, s: p.msg.s, t: p.msg.t } }); return; }
      me = Object.assign({}, me, p);
      if (joined && Object.keys(st.pres).length > 1) ch.send({ type: 'broadcast', event: 'pos', payload: Object.assign({ id: myId }, me) });
      if (!trackTm) trackTm = setTimeout(doTrack, Math.max(0, 4000 - (Date.now() - lastTrack)));
    },
    peers: () => {
      const out = [{ peer: myId, sameTab: true, kind: 'viewer', presence: me }];
      for (const [key, metas] of Object.entries(st.pres)) {
        if (key === myId) continue;
        const meta = (metas && metas[metas.length - 1]) || {};
        out.push({ peer: key, sameTab: false, kind: 'viewer', presence: Object.assign({}, meta, st.pos.get(key) || {}) });
      }
      return out;
    },
    onPeers: () => () => { },
  };
  MP.ch = ch;
  ch.subscribe(status => {
    joined = status === 'SUBSCRIBED';
    if (joined) { lastTrack = Date.now(); ch.track(Object.assign({}, me)).catch(() => { }); }
    updToggle();
  });
  $('mp').hidden = false;
  VOICE.ok = !!(window.RTCPeerConnection && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  try {
    const { data } = await sb.from('chat_messages').select('id,name,body,created_at').order('created_at', { ascending: false }).limit(30);
    for (const m of data || []) addChat(m.id, m.name, m.body, Date.parse(m.created_at));
  } catch (e) { }
  updToggle();
}
async function mpInit() {
  if (!window.claude || !window.claude.use) { await sbInit(); return; }
  try { MP.room = await window.claude.use('room'); } catch (e) { MP.room = null; }
  try { MP.db = await window.claude.use('db'); } catch (e) { MP.db = null; }
  if (MP.room || MP.db) $('mp').hidden = false;
  if (MP.room) MP.room.onPeers(() => updToggle(), () => { MP.room = null; for (const v of MP.vis.values()) v.remove(); MP.vis.clear(); $('hPeople').hidden = true; });
  if (MP.db) {
    try { MP.db.collection('chat').orderBy('t', 'desc').limit(30).onSnapshot(snap => { for (const d of snap.docs) { const m = d.data(); if (m) addChat(d.id, m.n, m.s, m.t); } }, () => { }); } catch (e) { }
  }
  updToggle();
}
/* minha presença: onde estou e o que estou fazendo (8x por segundo, só quando muda) */
function myPresence() {
  let x = fp.pos.x, z = fp.pos.z, yaw = ['fp', 'ride'].includes(mode) ? fp.body : fp.yaw + Math.PI, m = 'w', sy = 0;
  if ((mode === 'seat' || mode === 'music' || mode === 'menu') && seatState.s) { const s = seatState.s; x = s.x; z = s.z; yaw = s.yaw + Math.PI; m = 's'; sy = s.kind === 'desk' ? 0 : -0.03; }
  else if (mode === 'talk' || mode === 'casino') m = 't';
  else if (mode === 'pool' && POOL.back) { x = POOL.back.x; z = POOL.back.z; yaw = Math.atan2(POOL.cx - x, POOL.cz - z); }
  if (DISCO.dancing) { m = 'd'; yaw = Math.PI; }
  return { ro: RADIO.on ? 1 : 0, rs: RADIO.station, rt: RADIO.t, it: HOSP.item, ct: HOSP.consumeUntil > performance.now()/1000 ? Date.now() + Math.round((HOSP.consumeUntil - performance.now()/1000)*1000) : 0, hs: HOSP.smokingUntil > performance.now()/1000 ? HOSP.hookIndex : -1, ht: HOSP.smokingUntil > performance.now()/1000 ? Date.now() + Math.round((HOSP.smokingUntil - performance.now()/1000)*1000) : 0, ds: DISCO.style, em: Date.now() < DISCO.emojiUntil ? DISCO.emoji : '', ei: DISCO.emojiId, et: DISCO.emojiUntil, v: 1, n: myName, a: myLook, x: +x.toFixed(2), z: +z.toFixed(2), yaw: +yaw.toFixed(2), m, sy, vc: VOICE.on ? 1 : 0 };
}
function stepMulti(dt, t) {
  if (MP.room && inRoom && (t - MP.sendT > MP.sendDt)) {
    MP.sendT = t; const p = myPresence(), k = JSON.stringify(p);
    if (k !== MP.lastSend) { MP.lastSend = k; MP.room.presence(p).catch(() => { }); }
  }
  if (MP.room && t - MP.peerT > 0.1) {
    MP.peerT = t; const alive = new Set();
    for (const peer of MP.room.peers()) {
      if (peer.sameTab || peer.kind !== 'viewer') continue;
      const p = peer.presence || {}; if (p.v !== 1) continue;
      alive.add(peer.peer);
      let v = MP.vis.get(peer.peer);
      if (!v) { v = new Visitor(peer.peer, p); MP.vis.set(peer.peer, v); }
      if (p.n !== v.name) v.setName(p.n);
      v.vc = !!p.vc; v.tx = clamp(+p.x || 0, -5.6, 13.5); v.tz = clamp(+p.z || 0, -5.8, 21.7);
      /* Quem trocou de andar pelo elevador aparece direto no outro andar, sem atravessar paredes. */
      if (floorAt(v.tx, v.tz) !== floorAt(v.x, v.z)) { v.x = v.tx; v.z = v.tz; }
      v.tyaw = +p.yaw || 0; v.m = ['w', 's', 't', 'd'].includes(p.m) ? p.m : 'w'; v.sy = +p.sy || 0;
      v.item = Object.hasOwn(CONSUMABLES, p.it) ? p.it : '';
      v.consumeUntil = +p.ct > Date.now() && +p.ct < Date.now() + 5000 ? performance.now()/1000 + (+p.ct - Date.now())/1000 : 0;
      v.smokingUntil = inLounge(v.tx, v.tz) && [0, 1].includes(p.hs) && +p.ht > Date.now() && +p.ht < Date.now()+8000 ? performance.now()/1000 + (+p.ht - Date.now())/1000 : 0; v.hookIndex = p.hs;
      v.ds = DISCO_STYLES.includes(p.ds) ? p.ds : 'groove';
      if (p.rt) radioFromPeer(p);
      if (DISCO_EMOJIS.includes(p.em) && +p.ei !== v.emojiId && +p.et > Date.now() && +p.et < Date.now() + 10000) {
        v.emojiId = +p.ei; spawnDiscoEmoji(p.em, v.tx, v.tz);
      }
      const msg = p.msg;
      if (msg && typeof msg === 'object' && msg.id && !MP.seen.has(String(msg.id))) { addChat(String(msg.id), p.n, msg.s, msg.t); v.say = String(msg.s || '').slice(0, 120); v.sayT = t + 8; }
    }
    for (const [id, v] of MP.vis) if (!alive.has(id)) { v.remove(); MP.vis.delete(id); }
  }
  for (const v of MP.vis.values()) v.update(dt, t);
}
const _vh = new THREE.Vector3();
function updateVisitorLabels(t) {
  const W = innerWidth, H = innerHeight;
  for (const v of MP.vis.values()) {
    const el = v.el, sub = el.lastChild, txt = t < v.sayT ? '“' + v.say + '”' : v.speaking ? 'falando…' : v.smokingUntil > t ? '💨 no lounge' : v.consumeUntil > t && v.item ? (CONSUMABLES[v.item].kind === 'food' ? '🍽️ comendo' : '🥤 bebendo') : v.m === 'd' ? '🕺 dançando' : v.vc ? 'visitante · voz' : 'visitante';
    el.classList.toggle('talking', !!v.speaking);
    if (sub.textContent !== txt) sub.textContent = txt;
    if (!v.A || !v.A.J.head || otherFloor(v.x, v.z)) { el.style.opacity = '0'; continue; }
    v.A.J.head.getWorldPosition(_vh); _vh.y += 0.42;
    const dist = camera.position.distanceTo(_vh); _vh.project(camera);
    if (_vh.z > 1 || _vh.z < -1 || dist < 0.55) { el.style.opacity = '0'; continue; }
    el.style.opacity = '1';
    el.style.transform = `translate(${(_vh.x * 0.5 + 0.5) * W}px,${(-_vh.y * 0.5 + 0.5) * H}px) translate(-50%,-100%) scale(${clamp(4.2 / dist, 0.42, 1.25).toFixed(3)})`;
  }
}
/* ranking da sinuca no banco de dados */
async function saveRanking(res) {
  if (MP.sb && myName) {
    try {
      await MP.sb.rpc('record_pool_result', { p_name: myName, p_result: res });
      const { data } = await MP.sb.from('pool_ranking').select('name,wins').order('wins', { ascending: false }).limit(5);
      if (data && data.length) $('poolTip').textContent = 'Ranking de vitórias: ' + data.map(v => String(v.name).slice(0, 16) + ' ' + v.wins).join(' · ');
    } catch (e) { }
    return;
  }
  if (!MP.db || !myName) return;
  const slug = myName.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'visitante';
  try {
    const ref = MP.db.doc('ranking/' + slug), snap = await ref.get(), d = (snap.exists && snap.data()) || {};
    await ref.set({ n: myName, w: (d.w || 0) + (res === 'win' ? 1 : 0), l: (d.l || 0) + (res === 'loss' ? 1 : 0), e: (d.e || 0) + (res === 'draw' ? 1 : 0), t: Date.now() });
    const top = await MP.db.collection('ranking').orderBy('w', 'desc').limit(5).get();
    $('poolTip').textContent = 'Ranking de vitórias: ' + top.docs.map(x => { const v = x.data() || {}; return String(v.n || '?').slice(0, 16) + ' ' + (v.w || 0); }).join(' · ');
  } catch (e) { /* quem só visualiza não grava */ }
}
