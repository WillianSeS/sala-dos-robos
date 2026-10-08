/* ================= lazer: clube do 21 e música local ================= */
const CASINO = { active: false, opp: null, balance: 100, deck: [], you: [], bot: [], state: 'idle', msg: '' };
function handValue(cards) {
  let total = 0, aces = 0;
  for (const c of cards) { total += c.rank === 1 ? 11 : Math.min(c.rank, 10); if (c.rank === 1) aces++; }
  while (total > 21 && aces-- > 0) total -= 10;
  return total;
}
function leisureOpen(id, nextMode) {
  if (document.pointerLockElement) document.exitPointerLock();
  for (const k in keys) keys[k] = false;
  fp.vel.set(0, 0, 0); joy = null; joyEl.hidden = true; ptr.clear();
  $(id).hidden = false; cross.hidden = true; help.hidden = true; mode = nextMode;
  $(id).querySelector('button').focus();
}
function startCasino(pref) {
  if (CASINO.active) return;
  if (mode === 'music') closeMusic();
  if (mode === 'talk') closeTalk();
  if (seatState.s) { standUp(() => startCasino(pref)); return; }
  const available = r => !r.trade && !r.inPool && !r.inCasino && !r.talking;
  const r = pref ? (available(pref) ? pref : null) : robots.find(available);
  if (!r) { $('status').textContent = 'Todos estão ocupados. Chame um robô sem operação para jogar 21.'; help.textContent = 'Todos os robôs estão ocupados. Tente novamente em instantes.'; help.hidden = false; help.style.opacity = '1'; return; }
  CASINO.active = true; CASINO.opp = r; r.inCasino = true; r.talking = true;
  CASINO.state = 'idle'; CASINO.you = []; CASINO.bot = [];
  CASINO.msg = 'Bora! Toque em Nova rodada para distribuir as cartas.';
  $('casinoOpp').textContent = 'Você contra ' + r.person;
  leisureOpen('casino', 'casino'); casinoRender();
}
function casinoRender() {
  const playing = CASINO.state === 'playing';
  const draw = (id, cards, hide) => {
    const row = $(id); row.replaceChildren();
    cards.forEach((c, i) => {
      const el = document.createElement('span'), hidden = hide && i === 1;
      el.className = 'play-card' + (hidden ? ' back' : c.suit === '♥' || c.suit === '♦' ? ' red' : '');
      el.textContent = hidden ? '?' : ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' }[c.rank] || c.rank) + c.suit;
      el.setAttribute('aria-label', hidden ? 'Carta fechada' : el.textContent); row.appendChild(el);
    });
  };
  draw('casinoYou', CASINO.you, false); draw('casinoBot', CASINO.bot, playing);
  $('casinoYouScore').textContent = 'Você · ' + handValue(CASINO.you);
  $('casinoBotScore').textContent = CASINO.opp.person.split(' ')[0] + ' · ' + (playing ? 'carta fechada' : handValue(CASINO.bot));
  $('casinoBalance').textContent = 'Suas fichas: ' + CASINO.balance;
  $('casinoMsg').textContent = CASINO.msg;
  $('casinoHit').disabled = $('casinoStand').disabled = !playing;
  $('casinoDeal').disabled = playing || CASINO.balance < 10;
  $('casinoReset').hidden = playing || CASINO.balance >= 10;
}
function casinoFinish(outcome, msg, natural = false) {
  if (CASINO.state !== 'playing') return;
  if (outcome === 'win') CASINO.balance += natural ? 25 : 20;
  else if (outcome === 'draw') CASINO.balance += 10;
  CASINO.state = 'over'; CASINO.msg = msg;
  if (outcome === 'loss') CASINO.opp.react = 'sitCheer'; else CASINO.opp.react = 'sitRelax';
  CASINO.opp.reactT = simT + 3; casinoRender();
}
function casinoDeal() {
  if (!CASINO.active || CASINO.state === 'playing' || CASINO.balance < 10) return;
  CASINO.deck = [];
  for (const suit of ['♠', '♥', '♦', '♣']) for (let rank = 1; rank <= 13; rank++) CASINO.deck.push({ rank, suit });
  for (let i = 51; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [CASINO.deck[i], CASINO.deck[j]] = [CASINO.deck[j], CASINO.deck[i]]; }
  CASINO.balance -= 10; CASINO.you = [CASINO.deck.pop(), CASINO.deck.pop()]; CASINO.bot = [CASINO.deck.pop(), CASINO.deck.pop()]; CASINO.state = 'playing';
  CASINO.msg = 'Sua vez: peça uma carta ou pare.';
  const y = handValue(CASINO.you), b = handValue(CASINO.bot);
  if (y === 21 || b === 21) casinoFinish(y === b ? 'draw' : y === 21 ? 'win' : 'loss', y === b ? 'Dois 21! Empate.' : y === 21 ? '21 de primeira! Você ganhou 25 fichas.' : 'O robô fez 21 de primeira.', y === 21);
  else casinoRender();
}
function casinoHit() {
  if (!CASINO.active || CASINO.state !== 'playing') return;
  CASINO.you.push(CASINO.deck.pop());
  if (handValue(CASINO.you) > 21) casinoFinish('loss', 'Passou de 21! O robô venceu.');
  else if (handValue(CASINO.you) === 21) casinoStand();
  else casinoRender();
}
function casinoStand() {
  if (!CASINO.active || CASINO.state !== 'playing') return;
  while (handValue(CASINO.bot) < 17) CASINO.bot.push(CASINO.deck.pop());
  const y = handValue(CASINO.you), b = handValue(CASINO.bot);
  casinoFinish(b > 21 || y > b ? 'win' : y === b ? 'draw' : 'loss', b > 21 ? 'O robô passou de 21. Você venceu!' : y > b ? 'Você venceu!' : y === b ? 'Empate! Suas fichas voltaram.' : 'O robô venceu. Vamos mais uma?');
}
function exitCasino() {
  if (!CASINO.active) return;
  // Sair durante uma rodada mantém o custo de 10 fichas já descontado.
  CASINO.active = false; CASINO.state = 'idle';
  CASINO.opp.inCasino = false; CASINO.opp.talking = false; CASINO.opp = null;
  $('casino').hidden = true; if (mode === 'casino') { mode = 'fp'; cross.hidden = isTouch; }
}
$('casinoClose').onclick = exitCasino; $('casinoDeal').onclick = casinoDeal;
$('casinoHit').onclick = casinoHit; $('casinoStand').onclick = casinoStand;
$('casinoReset').onclick = () => { if (CASINO.state !== 'playing' && CASINO.balance < 10) { CASINO.balance = 100; CASINO.msg = 'Mais 100 fichas de brincadeira para continuar!'; casinoRender(); } };

const MUSIC = { ctx: null, gain: null, timer: null, nodes: new Set(), audio: new Audio(), url: null, playing: false, returnMode: 'fp', beat: 0, request: 0 };
MUSIC.audio.loop = true; MUSIC.audio.volume = 0.25;
function openMusic() {
  if (!inRoom || !['fp', 'seat'].includes(mode)) return;
  MUSIC.returnMode = mode; leisureOpen('music', 'music');
}
function closeMusic() {
  $('music').hidden = true;
  if (mode === 'music') { mode = MUSIC.returnMode; cross.hidden = mode !== 'fp' || isTouch; }
  $('musicOpen').focus();
}
function musicStop() {
  MUSIC.request++; MUSIC.playing = false; clearInterval(MUSIC.timer); MUSIC.timer = null;
  for (const osc of MUSIC.nodes) { osc.onended = null; osc.stop(); osc.disconnect(); }
  MUSIC.nodes.clear(); MUSIC.audio.pause();
  $('musicPlay').textContent = 'Reproduzir'; $('musicMsg').textContent = 'Música parada.';
}
function musicBeat() {
  if (!MUSIC.playing || !MUSIC.ctx || MUSIC.ctx.state !== 'running') return;
  const style = $('musicStyle').value;
  const notes = style === 'electro' ? [48, 55, 60, 63, 48, 58, 55, 63] : style === 'lounge' ? [60, 64, 67, 71, 62, 65, 69, 72] : [48, 60, 63, 67, 53, 60, 65, 67];
  const time = MUSIC.ctx.currentTime, duration = style === 'electro' ? 0.22 : 0.65;
  const osc = MUSIC.ctx.createOscillator(), env = MUSIC.ctx.createGain();
  osc.type = style === 'electro' ? 'triangle' : 'sine'; osc.frequency.value = 440 * 2 ** ((notes[MUSIC.beat++ % notes.length] - 69) / 12);
  env.gain.setValueAtTime(0, time); env.gain.linearRampToValueAtTime(0.18, time + 0.025); env.gain.exponentialRampToValueAtTime(0.001, time + duration);
  osc.connect(env); env.connect(MUSIC.gain); MUSIC.nodes.add(osc);
  osc.onended = () => { MUSIC.nodes.delete(osc); osc.disconnect(); env.disconnect(); };
  osc.start(time); osc.stop(time + duration + 0.03);
}
async function musicPlay() {
  musicStop();
  const style = $('musicStyle').value, request = MUSIC.request;
  try {
    if (style === 'file') { if (!MUSIC.url) throw new Error('Escolha um arquivo de áudio.'); await MUSIC.audio.play(); if (request !== MUSIC.request) { if (!MUSIC.playing) MUSIC.audio.pause(); return; } MUSIC.playing = true; }
    else {
      if (!MUSIC.ctx) { MUSIC.ctx = new AudioContext(); MUSIC.gain = MUSIC.ctx.createGain(); MUSIC.gain.connect(MUSIC.ctx.destination); }
      await MUSIC.ctx.resume(); if (request !== MUSIC.request) return; MUSIC.gain.gain.value = +$('musicVolume').value / 100;
      MUSIC.playing = true; MUSIC.beat = 0; musicBeat(); MUSIC.timer = setInterval(musicBeat, style === 'electro' ? 260 : style === 'lounge' ? 430 : 520);
    }
    $('musicMsg').textContent = 'Tocando: ' + (style === 'file' ? $('musicFile').files[0].name : $('musicStyle').selectedOptions[0].textContent);
    $('musicPlay').textContent = 'Recomeçar';
  } catch (e) { if (request !== MUSIC.request) return; musicStop(); $('musicMsg').textContent = 'Não consegui tocar esse áudio. Escolha outro arquivo ou um estilo da sala.'; }
}
$('musicOpen').onclick = openMusic; $('musicClose').onclick = closeMusic;
$('musicPlay').onclick = musicPlay; $('musicStop').onclick = musicStop;
$('musicStyle').onchange = () => { if (MUSIC.playing) musicPlay(); };
$('musicVolume').oninput = () => { const v = +$('musicVolume').value / 100; MUSIC.audio.volume = v; if (MUSIC.gain) MUSIC.gain.gain.setTargetAtTime(v, MUSIC.ctx.currentTime, 0.03); };
$('musicFile').onchange = () => {
  const file = $('musicFile').files[0]; if (!file) return;
  musicStop(); if (MUSIC.url) URL.revokeObjectURL(MUSIC.url);
  MUSIC.url = URL.createObjectURL(file); MUSIC.audio.src = MUSIC.url;
  $('musicStyle').querySelector('[value="file"]').disabled = false; $('musicStyle').value = 'file';
  $('musicMsg').textContent = file.name + ' pronto. Toque em Reproduzir.';
};
MUSIC.audio.onerror = () => { musicStop(); $('musicMsg').textContent = 'Esse arquivo não pôde ser reproduzido. Escolha outro áudio.'; };
