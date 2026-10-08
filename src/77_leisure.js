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
  // Convites feitos no escritório também levam o visitante à mesa de jogos.
  if (!inGames(fp.pos.x, fp.pos.z)) {
    fp.pos.set(8, 0, 10.8); fp.yaw = Math.PI; fp.pitch = -0.12;
    camera.position.set(8, EYE, 10.8); camera.quaternion.copy(fpQuat(fp.yaw, fp.pitch));
  }
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

/* Rádio da sala: ligar, desligar e trocar a estação vale para todo mundo. A batida segue o relógio
   (Date.now), então todos ouvem a mesma nota ao mesmo tempo. O estado viaja na presença (ro, rs, rt) e
   vence o mais recente. Arquivo do aparelho e Spotify tocam só para quem escolheu. */
const RADIO_STATIONS = ['lofi', 'lounge', 'electro'];
const RADIO = { on: false, station: 'lofi', t: 0, by: '' };
const MUSIC = { ctx: null, gain: null, timer: null, nodes: new Set(), audio: new Audio(), url: null, playing: false, radio: false, file: false, mute: false, next: 0, returnMode: 'fp' };
MUSIC.audio.loop = true; MUSIC.audio.volume = 0.25;
const radioBeat = st => st === 'electro' ? 260 : st === 'lounge' ? 430 : 520;
const stationName = st => $('musicStyle').querySelector('[value="' + st + '"]').textContent;
function openMusic() {
  if (!inRoom || !['fp', 'seat'].includes(mode)) return;
  MUSIC.returnMode = mode; leisureOpen('music', 'music'); document.body.classList.add('music-open');
}
function closeMusic() {
  $('music').hidden = true; document.body.classList.remove('music-open');
  if (mode === 'music') { mode = MUSIC.returnMode; cross.hidden = mode !== 'fp' || isTouch; }
  $('musicOpen').focus();
}
function musicBeat(style, k, time) {
  const notes = style === 'electro' ? [48, 55, 60, 63, 48, 58, 55, 63] : style === 'lounge' ? [60, 64, 67, 71, 62, 65, 69, 72] : [48, 60, 63, 67, 53, 60, 65, 67];
  const duration = style === 'electro' ? 0.22 : 0.65;
  const osc = MUSIC.ctx.createOscillator(), env = MUSIC.ctx.createGain();
  osc.type = style === 'electro' ? 'triangle' : 'sine'; osc.frequency.value = 440 * 2 ** ((notes[k % notes.length] - 69) / 12);
  env.gain.setValueAtTime(0, time); env.gain.linearRampToValueAtTime(0.18, time + 0.025); env.gain.exponentialRampToValueAtTime(0.001, time + duration);
  osc.connect(env); env.connect(MUSIC.gain); MUSIC.nodes.add(osc);
  osc.onended = () => { MUSIC.nodes.delete(osc); osc.disconnect(); env.disconnect(); };
  osc.start(time); osc.stop(time + duration + 0.03);
}
function radioTick() {
  if (!MUSIC.ctx || MUSIC.ctx.state !== 'running') return;
  const st = RADIO.station, step = radioBeat(st), now = Date.now();
  if (!MUSIC.next || MUSIC.next * step < now - 1000) MUSIC.next = Math.ceil(now / step);
  while (MUSIC.next * step < now + 200) {
    const when = MUSIC.ctx.currentTime + (MUSIC.next * step - now) / 1000;
    if (when >= MUSIC.ctx.currentTime) musicBeat(st, MUSIC.next, when);
    MUSIC.next++;
  }
}
function radioSound(on) {
  if (on === MUSIC.radio) return;
  MUSIC.radio = on; clearInterval(MUSIC.timer); MUSIC.timer = null; MUSIC.next = 0;
  for (const osc of MUSIC.nodes) { osc.onended = null; osc.stop(); osc.disconnect(); }
  MUSIC.nodes.clear();
  if (!on) return;
  if (!MUSIC.ctx) { MUSIC.ctx = new AudioContext(); MUSIC.gain = MUSIC.ctx.createGain(); MUSIC.gain.connect(MUSIC.ctx.destination); }
  MUSIC.gain.gain.value = +$('musicVolume').value / 100;
  MUSIC.ctx.resume().catch(() => { }); MUSIC.timer = setInterval(radioTick, 60); radioTick();
}
/* Liga o som da rádio aqui quando ela está no ar, o visitante está na sala e não silenciou. */
function stepRadio() {
  radioSound(inRoom && RADIO.on && !MUSIC.mute && !MUSIC.file);
  MUSIC.playing = MUSIC.radio || MUSIC.file;
}
function radioMessage() {
  $('musicMsg').textContent = RADIO.on ? '📻 No ar para todos: ' + stationName(RADIO.station) + (RADIO.by ? ' · por ' + RADIO.by : '') + (MUSIC.mute || MUSIC.file ? ' (silenciada para você)' : '')
    : 'Rádio desligada. Escolha uma estação e toque em Reproduzir: todos na sala vão ouvir.';
}
function setRadio(on, station = RADIO.station, by = myName, t = Date.now()) {
  RADIO.on = on; RADIO.station = station; RADIO.t = t; RADIO.by = by; MUSIC.next = 0;
  if (MUSIC.radio) { radioSound(false); stepRadio(); }
  if ($('musicStyle').value !== 'file') $('musicStyle').value = station;
  $('musicPlay').textContent = RADIO.on ? 'Recomeçar' : 'Reproduzir';
  if (by === myName && MP.room && inRoom) MP.room.presence(myPresence()).catch(() => { });
  radioMessage();
}
/* Estado recebido de outro visitante: vale o mais recente. */
function radioFromPeer(p) {
  const t = +p.rt;
  if (!RADIO_STATIONS.includes(p.rs) || !(t > RADIO.t) || t > Date.now() + 10000) return;
  setRadio(!!p.ro, p.rs, String(p.n || 'Visitante').slice(0, 24), t);
}
function stopFile() { MUSIC.file = false; MUSIC.audio.pause(); }
function musicStop() {
  stopFile(); if (RADIO.on) setRadio(false);
  stepRadio(); $('musicPlay').textContent = 'Reproduzir'; $('musicMsg').textContent = 'Música parada.';
}
async function musicPlay() {
  const style = $('musicStyle').value;
  if (style !== 'file') { stopFile(); MUSIC.mute = false; $('radioMute').checked = false; setRadio(true, style); stepRadio(); return; }
  try {
    if (!MUSIC.url) throw new Error('Escolha um arquivo de áudio.');
    MUSIC.file = true; stepRadio(); await MUSIC.audio.play(); MUSIC.playing = true;
    $('musicMsg').textContent = 'Tocando só para você: ' + $('musicFile').files[0].name + (RADIO.on ? ' (rádio silenciada para você)' : '');
    $('musicPlay').textContent = 'Recomeçar';
  } catch (e) { stopFile(); stepRadio(); $('musicMsg').textContent = 'Não consegui tocar esse áudio. Escolha outro arquivo ou uma estação da rádio.'; }
}
$('musicOpen').onclick = openMusic; $('musicClose').onclick = closeMusic;
$('musicPlay').onclick = musicPlay; $('musicStop').onclick = musicStop;
$('musicStyle').onchange = () => { const st = $('musicStyle').value; if (st !== 'file' && RADIO.on) setRadio(true, st); };
$('radioMute').onchange = () => { MUSIC.mute = $('radioMute').checked; stepRadio(); radioMessage(); };
$('musicVolume').oninput = () => { const v = +$('musicVolume').value / 100; MUSIC.audio.volume = v; if (MUSIC.gain) MUSIC.gain.gain.setTargetAtTime(v, MUSIC.ctx.currentTime, 0.03); };
$('musicFile').onchange = () => {
  const file = $('musicFile').files[0]; if (!file) return;
  stopFile(); if (MUSIC.url) URL.revokeObjectURL(MUSIC.url);
  MUSIC.url = URL.createObjectURL(file); MUSIC.audio.src = MUSIC.url;
  $('musicStyle').querySelector('[value="file"]').disabled = false; $('musicStyle').value = 'file';
  $('musicMsg').textContent = file.name + ' pronto. Toque em Reproduzir (só você ouve).';
};
/* Navegadores só liberam o som depois de um toque: retoma a rádio no primeiro toque se precisar. */
addEventListener('pointerdown', () => { if (MUSIC.ctx && MUSIC.ctx.state === 'suspended' && MUSIC.radio) MUSIC.ctx.resume().catch(() => { }); }, { passive: true });
MUSIC.audio.onerror = () => { stopFile(); stepRadio(); $('musicMsg').textContent = 'Esse arquivo não pôde ser reproduzido. Escolha outro áudio.'; };

/* Spotify: o visitante cola o link de uma playlist, álbum, artista ou música e ouve pelo player oficial.
   O player fica num canto da tela e continua tocando com o painel fechado. */
const SPOTIFY = { url: '' };
function spotifyEmbedUrl(text) {
  const m = String(text || '').trim().match(/^(?:https?:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?|spotify:)(playlist|album|track|artist|episode|show)[/:]([A-Za-z0-9]{22})(?:[/?#].*)?$/);
  return m ? 'https://open.spotify.com/embed/' + m[1] + '/' + m[2] + '?utm_source=generator' : '';
}
function spotifyLoad() {
  const text = $('spotifyUrl').value, url = spotifyEmbedUrl(text);
  if (!url) { $('musicMsg').textContent = 'Cole um link do Spotify, como https://open.spotify.com/playlist/…'; return false; }
  stopFile(); MUSIC.mute = true; $('radioMute').checked = true; stepRadio();
  let frame = $('spotifyBox').querySelector('iframe');
  if (!frame) {
    frame = document.createElement('iframe'); frame.title = 'Player do Spotify'; frame.loading = 'lazy';
    frame.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    $('spotifyBox').appendChild(frame);
  }
  if (frame.src !== url) frame.src = url;
  SPOTIFY.url = url; $('spotifyDock').hidden = false; $('spotifyDock').classList.remove('min'); $('spotifyMin').textContent = 'Minimizar';
  try { localStorage.setItem('sala-spotify', text.trim()); } catch (e) { }
  $('musicMsg').textContent = 'Spotify conectado só para você (a rádio da sala ficou silenciada para você). Toque no play do player. Entre na sua conta do Spotify neste navegador para ouvir as músicas inteiras.';
  return true;
}
function spotifyClose() {
  $('spotifyBox').replaceChildren(); SPOTIFY.url = ''; $('spotifyDock').hidden = true;
}
try { $('spotifyUrl').value = localStorage.getItem('sala-spotify') || ''; } catch (e) { }
$('spotifyLoad').onclick = spotifyLoad; $('spotifyClose').onclick = spotifyClose;
$('spotifyMin').onclick = () => { const min = $('spotifyDock').classList.toggle('min'); $('spotifyMin').textContent = min ? 'Mostrar' : 'Minimizar'; };
$('spotifyUrl').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); spotifyLoad(); } });
