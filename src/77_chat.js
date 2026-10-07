
/* ================= conversar com os traders ================= */
const talk = { r: null, ctl: null, busy: false };
let sampleFn = null;
(async () => { try { if (window.claude && window.claude.use) sampleFn = await window.claude.use('sample'); } catch (e) { sampleFn = null; } })();
const STRAT_TXT = {
  'Rompimento': 'Espero o preço romper a máxima ou a mínima recente e entro a favor, com stop curto.',
  'Tendência': 'Sigo a tendência: só compro quando as médias apontam pra cima e vendo quando apontam pra baixo.',
  'Reversão': 'Gosto de pegar exageros: quando o preço estica demais, aposto na volta pra média.',
  'Scalper': 'Sou scalper: entro e saio rápido, buscando poucos pips várias vezes.',
  'Momentum': 'Entro quando o movimento ganha força e velocidade a favor.',
  'Média móvel': 'Opero cruzamento de médias móveis, simples e disciplinado.',
  'Sessão Londres': 'Meu forte é a abertura de Londres, quando o volume do dia começa.',
  'Volatilidade': 'Leio a volatilidade: quando o mercado acorda, ajusto o tamanho e entro.',
  'Grade': 'Trabalho em grade: posições escalonadas em níveis de preço definidos.',
  'Notícias': 'Fico de olho no calendário econômico e opero a reação às notícias.',
};
function statusLine(r) {
  const p = PAIRS[r.pair], tr = r.trade;
  if (tr) return `Tô ${tr.dir > 0 ? 'comprado' : 'vendido'} em ${r.pair} com ${fmtLots(tr.lots)} lote: ${money(tr.pnl)} agora (${(tr.pips >= 0 ? '+' : '') + tr.pips.toFixed(1).replace('.', ',')} pips).`;
  if (r.mode === 'seated') return `Sem posição. Esperando o sinal no ${r.pair}, que está em ${p.price.toFixed(p.dec)}.`;
  return `Tô de pausa. Quando o ${r.pair} der sinal eu volto pra mesa.`;
}
function scripted(r, q) {
  if (q === 'status') return statusLine(r);
  if (q === 'strategy') return (STRAT_TXT[r.name] || 'Tenho meu método.') + ` Opero ${r.pair}.`;
  if (q === 'today') return r.ops ? `Hoje fiz ${r.ops} ${r.ops > 1 ? 'operações' : 'operação'}, ${r.wins} no lucro, resultado ${money(r.today)}.` : 'Hoje ainda não fechei nenhuma operação.';
  if (q === 'pool') return r.trade ? 'Agora não dá, tô posicionado. Me chama depois que eu fechar essa.' : 'Bora! Te espero na mesa de sinuca.';
  if (q === 'room') { const tot = equity() - BASE, n = robots.filter(x => x.trade).length; return `A sala está ${money(tot)} no total, com ${n} de 10 robôs operando agora.`; }
  return 'Até mais!';
}
const CHIPS = [['status', 'Como está a operação?'], ['strategy', 'Qual sua estratégia?'], ['today', 'Quanto fez hoje?'], ['room', 'Como está a sala?'], ['pool', 'Bora jogar sinuca?']];
function addMsg(cls, text) { const p = document.createElement('p'); p.className = cls; p.textContent = text; const log = $('talkLog'); log.appendChild(p); log.scrollTop = 1e6; return p; }
function greet(r) { const h = r.trade ? (r.trade.pnl >= 0 ? 'Opa! Dia bom até agora.' : 'E aí. Essa operação está me dando trabalho.') : 'Fala! Tô esperando o próximo sinal.'; return h + ' Sou ' + r.person.split(' ')[0] + ', robô de ' + r.name + '.'; }
function openTalk(r) {
  if (seatState.s) { standUp(() => openTalk(r)); return; }
  talk.r = r; r.talking = true; r.chat = r.chat || [];
  if (document.pointerLockElement) document.exitPointerLock();
  $('talkName').textContent = r.person; $('talkRole').textContent = `Robô de ${r.name} · ${r.pair}`;
  $('talkLog').innerHTML = '';
  for (const m of r.chat.slice(-6)) addMsg(m.role === 'user' ? 'you' : 'bot', m.content);
  if (!r.chat.length) addMsg('bot', greet(r));
  const chips = $('talkChips'); chips.innerHTML = '';
  for (const [k, t] of CHIPS) { const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.onclick = () => ask(k, t); chips.appendChild(b); }
  $('talkForm').hidden = !sampleFn; $('talk').hidden = false; cross.hidden = true; mode = 'talk';
  if (!isTouch && sampleFn) setTimeout(() => $('talkInput').focus(), 50);
}
function ask(k, label) {
  const r = talk.r; if (!r) return;
  addMsg('you', label); const ans = scripted(r, k); addMsg('bot', ans);
  r.chat.push({ role: 'user', content: label }, { role: 'assistant', content: ans });
  if (k === 'pool' && !r.trade) setTimeout(() => { if (talk.r === r) { closeTalk(); startPool(r); } }, 900);
}
function rules(r) {
  const p = PAIRS[r.pair], tr = r.trade, tot = equity() - BASE, nOp = robots.filter(x => x.trade).length;
  return [
    `Você é ${r.person}, um dos 10 robôs de trading da "Sala dos Robôs", uma sala de trading em 3D em Nova York onde cada robô aparece como um trader de terno. Um visitante entrou na sala e está conversando com você.`,
    'Jeito de falar: trader confiante e bem-humorado, português do Brasil informal, frases curtas. Responda em no máximo 3 frases, sem listas e sem emojis.',
    `Seu perfil: estratégia "${r.name}" (${STRAT_TXT[r.name] || ''}), opera ${r.pair}.`,
    `Agora: ${statusLine(r)}`,
    `Hoje: ${money(r.today)} em ${r.ops} operações (${r.wins} com lucro). Últimos registros: ${r.log.slice(-3).join(' | ') || 'nenhum'}.`,
    `Mercado: ${r.pair} a ${p.price.toFixed(p.dec)}. A sala toda está ${money(tot)}, com ${nOp} de 10 robôs operando.`,
    `Regras: tudo aqui é simulação com dados fictícios. Nunca dê recomendação de investimento real nem prometa lucro; se pedirem, diga que é só uma simulação. Se o visitante chamar para jogar sinuca, diga se topa: você ${tr ? 'NÃO pode agora, está com operação aberta' : 'topa, está sem operação'}.`,
  ].join('\n');
}
async function sendText(text) {
  const r = talk.r; if (!r || !sampleFn || talk.busy) return;
  text = text.trim().slice(0, 300); if (!text) return;
  addMsg('you', text); r.chat.push({ role: 'user', content: text });
  const bubble = addMsg('bot', '…'); talk.busy = true; talk.ctl = new AbortController();
  try {
    const turns = [{ role: 'user', content: rules(r) }, ...r.chat.slice(-10)];
    const { text: out } = await sampleFn(turns, { cache: false, modelTier: 'quick', signal: talk.ctl.signal, onText: ({ text: t }) => { bubble.textContent = t; $('talkLog').scrollTop = 1e6; } });
    bubble.textContent = out; r.chat.push({ role: 'assistant', content: out });
    if (/sinuca|bilhar|snooker/i.test(text) && !r.trade) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Ir para a sinuca com ' + r.person.split(' ')[0];
      b.onclick = () => { closeTalk(); startPool(r); }; $('talkChips').prepend(b);
    }
  } catch (e) {
    const code = e && e.code;
    r.chat.pop();
    if (code === 'cancelled') bubble.textContent = (e && e.text) || '…';
    else if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(code)) { bubble.className = 'note'; bubble.textContent = 'A conversa livre não está liberada nesta visualização. Use as perguntas prontas.'; sampleFn = null; $('talkForm').hidden = true; }
    else if (code === 'rate_limited') { bubble.className = 'note'; bubble.textContent = 'Ele está ocupado agora. Tente de novo daqui a pouco.'; }
    else { bubble.className = 'note'; bubble.textContent = (e && e.text) || 'Não consegui responder agora. Tente de novo.'; }
  } finally { talk.busy = false; talk.ctl = null; }
}
$('talkForm').addEventListener('submit', e => { e.preventDefault(); const i = $('talkInput'); const v = i.value; i.value = ''; sendText(v); });
$('talkClose').addEventListener('click', () => closeTalk());
function closeTalk() {
  if (talk.ctl) talk.ctl.abort();
  if (talk.r) talk.r.talking = false;
  talk.r = null; $('talk').hidden = true;
  if (mode === 'talk') { mode = 'fp'; cross.hidden = isTouch; }
}
const _th = new THREE.Vector3();
function stepTalk(dt) {
  const r = talk.r; if (!r) return;
  r.P.J.head.getWorldPosition(_th);
  const dx = _th.x - fp.pos.x, dz = _th.z - fp.pos.z, dy = _th.y + 0.05 - EYE;
  fp.yaw = angDamp(fp.yaw, Math.atan2(-dx, -dz), 4, dt); fp.pitch = damp(fp.pitch, Math.atan2(dy, Math.hypot(dx, dz)), 4, dt);
  camera.position.set(fp.pos.x, EYE, fp.pos.z); camera.quaternion.copy(fpQuat(fp.yaw, fp.pitch));
}
