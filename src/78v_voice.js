
/* ================= chat de voz ao vivo (só no site): WebRTC direto entre quem entrou na voz, som em 3D ================= */
const VOICE = { ok: false, on: false, busy: false, stream: null, ctx: null, sink: null, an: null, peers: new Map(), retry: new Map(), buf: new Uint8Array(512), checkT: 0, lvlT: 0, hold: 0, live: false };
const RTC_CFG = { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }] };
const vcBtn = $('vcToggle');
function rtcSend(to, d) { if (MP.ch) MP.ch.send({ type: 'broadcast', event: 'rtc', payload: Object.assign({ to, from: myId }, d) }); }
/* manda a descrição já com os caminhos de rede (sem troca de candidatos um a um) */
function iceDone(pc) {
  return new Promise(res => {
    if (pc.iceGatheringState === 'complete') return res();
    const end = () => { clearTimeout(tm); pc.removeEventListener('icegatheringstatechange', chk); res(); };
    const chk = () => { if (pc.iceGatheringState === 'complete') end(); };
    const tm = setTimeout(end, 2500); pc.addEventListener('icegatheringstatechange', chk);
  });
}
function newPeer(id) {
  dropPeer(id);
  const pc = new RTCPeerConnection(RTC_CFG), P = { id, pc, t0: performance.now() / 1000, el: null, src: null, pan: null, an: null, hold: 0 };
  VOICE.peers.set(id, P);
  for (const tr of VOICE.stream.getAudioTracks()) pc.addTrack(tr, VOICE.stream);
  pc.ontrack = e => attachAudio(P, e.streams[0] || new MediaStream([e.track]));
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'connected') P.ok = true;
    if (pc.connectionState === 'failed' && VOICE.peers.get(id) === P) { dropPeer(id); VOICE.retry.set(id, performance.now() / 1000 + 10); }
  };
  return P;
}
function dropPeer(id) {
  const P = VOICE.peers.get(id); if (!P) return;
  VOICE.peers.delete(id);
  try { P.pc.close(); } catch (e) { }
  if (P.el) P.el.srcObject = null;
  try { if (P.src) P.src.disconnect(); if (P.pan) P.pan.disconnect(); } catch (e) { }
  const v = MP.vis.get(id); if (v) v.speaking = false;
}
function voicePrune(keys) { const k = new Set(keys); for (const id of [...VOICE.peers.keys()]) if (!k.has(id)) dropPeer(id); }
function attachAudio(P, stream) {
  if (P.src || !VOICE.ctx) return;
  const ctx = VOICE.ctx;
  /* o Chrome só entrega o áudio da chamada ao WebAudio se houver um elemento de áudio tocando (mudo) */
  P.el = new Audio(); P.el.muted = true; P.el.srcObject = stream; P.el.play().catch(() => { });
  P.src = ctx.createMediaStreamSource(stream);
  const pan = ctx.createPanner(); pan.panningModel = 'HRTF'; pan.distanceModel = 'inverse'; pan.refDistance = 2.5; pan.rolloffFactor = 0.5; pan.maxDistance = 80;
  P.pan = pan; P.an = ctx.createAnalyser(); P.an.fftSize = 512;
  P.src.connect(pan); pan.connect(ctx.destination); P.src.connect(P.an); P.an.connect(VOICE.sink);
}
async function callPeer(id) {
  const P = newPeer(id), pc = P.pc;
  try {
    await pc.setLocalDescription(await pc.createOffer());
    await iceDone(pc);
    if (VOICE.peers.get(id) === P) rtcSend(id, { k: 'offer', sdp: pc.localDescription.sdp });
  } catch (e) { if (VOICE.peers.get(id) === P) dropPeer(id); }
}
async function voiceSignal(m) {
  if (!m || m.to !== myId || !m.from || m.from === myId) return;
  if (m.k === 'bye') { dropPeer(m.from); VOICE.retry.set(m.from, performance.now() / 1000 + 8); return; }
  if (!VOICE.on) { if (m.k === 'offer') rtcSend(m.from, { k: 'bye' }); return; }
  if (m.k === 'offer') {
    const P = newPeer(m.from), pc = P.pc;
    try {
      await pc.setRemoteDescription({ type: 'offer', sdp: String(m.sdp) });
      await pc.setLocalDescription(await pc.createAnswer());
      await iceDone(pc);
      if (VOICE.peers.get(m.from) === P) rtcSend(m.from, { k: 'answer', sdp: pc.localDescription.sdp });
    } catch (e) { if (VOICE.peers.get(m.from) === P) dropPeer(m.from); }
  } else if (m.k === 'answer') {
    const P = VOICE.peers.get(m.from);
    if (P && P.pc.signalingState === 'have-local-offer') { try { await P.pc.setRemoteDescription({ type: 'answer', sdp: String(m.sdp) }); } catch (e) { dropPeer(m.from); } }
  }
}
function vcUI(msg) {
  vcBtn.textContent = msg || (VOICE.busy ? 'Ligando microfone…' : VOICE.on ? 'Sair da voz' : 'Entrar na voz');
  vcBtn.classList.toggle('on', VOICE.on); vcBtn.setAttribute('aria-pressed', VOICE.on ? 'true' : 'false');
  if (msg) setTimeout(() => vcUI(), 4500);
}
async function voiceJoin() {
  if (VOICE.on || VOICE.busy) return;
  VOICE.busy = true; vcUI();
  try {
    if (!VOICE.ctx) { const AC = window.AudioContext || window.webkitAudioContext; VOICE.ctx = new AC(); VOICE.sink = VOICE.ctx.createGain(); VOICE.sink.gain.value = 0; VOICE.sink.connect(VOICE.ctx.destination); }
    if (VOICE.ctx.state !== 'running') VOICE.ctx.resume().catch(() => { });
    VOICE.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
    VOICE.an = VOICE.ctx.createAnalyser(); VOICE.an.fftSize = 512;
    VOICE.ctx.createMediaStreamSource(VOICE.stream).connect(VOICE.an); VOICE.an.connect(VOICE.sink);
    VOICE.on = true; VOICE.checkT = 0; VOICE.retry.clear();
    VOICE.busy = false; vcUI();
  } catch (e) {
    VOICE.busy = false;
    vcUI(e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? 'Microfone bloqueado' : 'Sem microfone');
  }
}
function voiceLeave() {
  if (!VOICE.on) return;
  for (const id of [...VOICE.peers.keys()]) { rtcSend(id, { k: 'bye' }); dropPeer(id); }
  if (VOICE.stream) for (const tr of VOICE.stream.getTracks()) tr.stop();
  VOICE.stream = null; VOICE.an = null; VOICE.on = false; VOICE.live = false; vcBtn.classList.remove('speaking');
  for (const v of MP.vis.values()) v.speaking = false;
  vcUI();
}
vcBtn.addEventListener('click', () => { if (document.pointerLockElement) document.exitPointerLock(); VOICE.on ? voiceLeave() : voiceJoin(); });
function audioLevel(an) { const b = VOICE.buf; an.getByteTimeDomainData(b); let s = 0; for (let i = 0; i < b.length; i++) { const x = (b[i] - 128) / 128; s += x * x; } return Math.sqrt(s / b.length); }
function setAudioPos(n, x, y, z) { if (n.positionX) { n.positionX.value = x; n.positionY.value = y; n.positionZ.value = z; } else n.setPosition(x, y, z); }
const _vp = new THREE.Vector3(), _vd = new THREE.Vector3();
function stepVoice(dt, t) {
  if (VOICE.ok) { const show = inRoom || VOICE.on; if (vcBtn.hidden === show) vcBtn.hidden = !show; }
  if (!VOICE.on) return;
  /* quem escuta é a câmera; cada voz sai da cabeça do avatar de quem fala */
  const L = VOICE.ctx.listener; camera.getWorldDirection(_vd);
  setAudioPos(L, camera.position.x, camera.position.y, camera.position.z);
  if (L.forwardX) { L.forwardX.value = _vd.x; L.forwardY.value = _vd.y; L.forwardZ.value = _vd.z; L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0; } else L.setOrientation(_vd.x, _vd.y, _vd.z, 0, 1, 0);
  for (const P of VOICE.peers.values()) {
    if (!P.pan) continue;
    const v = MP.vis.get(P.id); if (!v) continue;
    if (v.A && v.A.J.head) v.A.J.head.getWorldPosition(_vp); else _vp.set(v.x, 1.6, v.z);
    setAudioPos(P.pan, _vp.x, _vp.y, _vp.z);
  }
  /* quem está falando agora (nível do som) */
  if (t - VOICE.lvlT > 0.1) {
    VOICE.lvlT = t;
    for (const P of VOICE.peers.values()) {
      if (!P.an) continue;
      if (audioLevel(P.an) > 0.01) P.hold = t + 0.35;
      const v = MP.vis.get(P.id); if (v) v.speaking = t < P.hold;
    }
    if (VOICE.an) { if (audioLevel(VOICE.an) > 0.01) VOICE.hold = t + 0.35; const live = t < VOICE.hold; if (live !== VOICE.live) { VOICE.live = live; vcBtn.classList.toggle('speaking', live); } }
  }
  /* liga para quem também entrou na voz (quem tem o código menor chama) */
  if (t - VOICE.checkT > 1) {
    VOICE.checkT = t;
    for (const v of MP.vis.values()) {
      const P = VOICE.peers.get(v.id);
      if (!v.vc) { if (P && t - P.t0 > 6) dropPeer(v.id); continue; }
      if (myId > v.id) continue;
      if (!P) { if (t > (VOICE.retry.get(v.id) || 0)) callPeer(v.id); }
      else if (!P.ok && t - P.t0 > 15) { dropPeer(v.id); VOICE.retry.set(v.id, t + 10); }
    }
    for (const [id, P] of [...VOICE.peers]) if (!MP.vis.has(id) && t - P.t0 > 6) dropPeer(id);
  }
}
mpInit();
