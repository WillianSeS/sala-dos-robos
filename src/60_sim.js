
/* ================= mercado e robôs (simulados) ================= */
const PAIRS = {
  EURUSD: { sym: 'EURUSD', price: 1.08421, pip: 0.0001, dec: 5, vol: 0.55, usd: true },
  GBPUSD: { sym: 'GBPUSD', price: 1.27153, pip: 0.0001, dec: 5, vol: 0.7, usd: true },
  USDJPY: { sym: 'USDJPY', price: 149.318, pip: 0.01, dec: 3, vol: 0.6, usd: false },
  USDCAD: { sym: 'USDCAD', price: 1.36184, pip: 0.0001, dec: 5, vol: 0.5, usd: false },
};
const EXTRA = [{ sym: 'XAUUSD', price: 2368.4, dec: 2, vol: 0.25 }, { sym: 'US500', price: 5304.7, dec: 1, vol: 0.4 }, { sym: 'BTCUSD', price: 67120, dec: 0, vol: 9 }, { sym: 'IBOV', price: 128450, dec: 0, vol: 12 }];
const CANDLE_SEC = 5;
let simT = 0;
for (const p of Object.values(PAIRS)) {
  p.anchor = p.price; p.open = p.price * (1 + gauss() * 0.0015);
  const cs = []; let c = p.price;
  for (let i = 0; i < 60; i++) { const cl = c; let o = c, hi = c, lo = c; for (let k = 0; k < 20; k++) { o -= gauss() * p.vol * p.pip; hi = Math.max(hi, o); lo = Math.min(lo, o); } cs.unshift({ o, h: hi, l: lo, c: cl }); c = o; }
  p.candles = cs; p.cT = 0;
}
for (const e of EXTRA) e.open = e.price * (1 + gauss() * 0.004);
function stepMarket() {
  for (const p of Object.values(PAIRS)) {
    p.price += gauss() * p.vol * p.pip + (p.anchor - p.price) * 0.0015;
    const cur = p.candles[p.candles.length - 1];
    cur.c = p.price; cur.h = Math.max(cur.h, p.price); cur.l = Math.min(cur.l, p.price);
    if (simT - p.cT >= CANDLE_SEC) { p.cT = simT; p.candles.push({ o: p.price, h: p.price, l: p.price, c: p.price }); if (p.candles.length > 70) p.candles.shift(); }
  }
  for (const e of EXTRA) e.price += gauss() * e.vol;
}

const BASE = 1000.19;
let realized = 33.96, todayPnl = -2.8, gains = 2, losses = 2;
const STRATS = ['Rompimento', 'Tendência', 'Reversão', 'Scalper', 'Momentum', 'Média móvel', 'Sessão Londres', 'Volatilidade', 'Grade', 'Notícias'];
const ROBO_PAIRS = ['EURUSD', 'EURUSD', 'EURUSD', 'GBPUSD', 'GBPUSD', 'USDJPY', 'USDJPY', 'USDCAD', 'USDCAD', 'USDCAD'];
const pipValue = (sym, units) => { const p = PAIRS[sym]; return p.usd ? units * p.pip : units * p.pip / p.price; };
const fmtLots = l => l.toFixed(2).replace('.', ',');

const labelsEl = $('labels');
const robots = STATIONS.map((st, i) => {
  const r = { i, id: 'R' + String(i + 1).padStart(2, '0'), name: STRATS[i], pair: ROBO_PAIRS[i], st, P: makePerson(i), mode: 'seated', trade: null, wait: rnd(3, 18), today: 0, ops: 0, wins: 0, log: [], path: [], spot: null, t1: 0, afterBreak: false, react: null, reactT: 0, relax: srand() < 0.4 ? 'sitHead' : 'sitRelax', spd: rnd(1.05, 1.3) };
  r.person = PERSON_NAMES[i]; r.short = shortName(r.person);
  r.el = document.createElement('div'); r.el.className = 'pl n'; r.el.innerHTML = '<b class="nm"></b><span class="v">+$0,00</span>'; r.el.firstChild.textContent = r.person; r.elV = r.el.lastChild; labelsEl.appendChild(r.el); r.txt = '';
  r.P.root.position.set(st.x, 0, st.rootZ); r.P.yaw = Math.PI;
  return r;
});
function logPush(r, s) { r.log.push(s); if (r.log.length > 5) r.log.shift(); }
function openTrade(r, off = 0) {
  const p = PAIRS[r.pair], dir = Math.random() < 0.5 ? 1 : -1, lots = [0.03, 0.04, 0.05, 0.06][(Math.random() * 4) | 0];
  r.trade = { dir, lots, units: lots * 100000, entry: p.price - dir * off * p.pip, t0: simT, maxDur: rnd(25, 110), tp: rnd(9, 15), sl: rnd(7, 12), pips: 0, pnl: 0 };
  logPush(r, (dir > 0 ? 'COMPRA ' : 'VENDA ') + fmtLots(lots) + ' @ ' + p.price.toFixed(p.dec));
}
function closeTrade(r) {
  const tr = r.trade; r.lastPnl = tr.pnl; realized += tr.pnl; todayPnl += tr.pnl; r.today += tr.pnl; r.ops++;
  if (tr.pnl >= 0) { gains++; r.wins++; r.react = 'sitCheer'; } else { losses++; r.react = 'sitFrustr'; if (r.P.isAvatar) r.P.frKind = Math.random() < 0.5 ? 'frustr' : 'touchFace'; }
  r.reactT = simT + (r.P.isAvatar ? 3.4 : 2.3);
  logPush(r, 'FECHOU ' + money(tr.pnl) + ' (' + (tr.pips >= 0 ? '+' : '') + tr.pips.toFixed(1).replace('.', ',') + ' pips)');
  r.trade = null; r.wait = rnd(6, 28);
}
function updTrade(r) {
  const p = PAIRS[r.pair], tr = r.trade;
  tr.pips = (p.price - tr.entry) * tr.dir / p.pip; tr.pnl = tr.pips * pipValue(r.pair, tr.units);
  if (tr.pips >= tr.tp || tr.pips <= -tr.sl || simT - tr.t0 > tr.maxDur) closeTrade(r);
}
const openPnl = () => robots.reduce((s, r) => s + (r.trade ? r.trade.pnl : 0), 0);
const equity = () => BASE + realized + openPnl();

/* ---------- caminhos (grafo de corredores) ---------- */
const NODES = { A_L: [-5, -1.6], A_R: [5, -1.6], B_L: [-5, 1.5], B_R: [5, 1.5], F_L: [-5, -4.75], F2: [-0.9, -4.75], F_R: [5, -4.75], L3: [-5, 3.1], R3: [5.1, 3.1], sofaA: [-6.1, 3.7], poolW: [0.45, 3.15], poolE: [4.6, 3.15], coffeeA: [6.55, 3.15], winA: [-6.6, 0.95] };
COLS.forEach((x, i) => { NODES['A' + i] = [x, -1.6]; NODES['B' + i] = [x, 1.5]; });
const EDGES = [['A_L', 'A0'], ['A0', 'A1'], ['A1', 'A2'], ['A2', 'A3'], ['A3', 'A4'], ['A4', 'A_R'], ['B_L', 'B0'], ['B0', 'B1'], ['B1', 'B2'], ['B2', 'B3'], ['B3', 'B4'], ['B4', 'B_R'], ['A_L', 'F_L'], ['A_R', 'F_R'], ['F_L', 'F2'], ['F2', 'F_R'], ['A_L', 'B_L'], ['A_R', 'B_R'], ['B_L', 'L3'], ['B_R', 'R3'], ['L3', 'sofaA'], ['L3', 'poolW'], ['poolW', 'poolE'], ['poolE', 'R3'], ['R3', 'coffeeA'], ['B_L', 'winA']];
const ADJ = {}; for (const [a, b] of EDGES) { const d = Math.hypot(NODES[a][0] - NODES[b][0], NODES[a][1] - NODES[b][1]); (ADJ[a] = ADJ[a] || []).push([b, d]); (ADJ[b] = ADJ[b] || []).push([a, d]); }
function route(from, to) {
  const dist = { [from]: 0 }, prev = {}, todo = new Set(Object.keys(NODES));
  while (todo.size) {
    let u = null; for (const n of todo) if (dist[n] !== undefined && (u === null || dist[n] < dist[u])) u = n;
    if (u === null || u === to) break; todo.delete(u);
    for (const [v, d] of ADJ[u] || []) if (dist[u] + d < (dist[v] ?? Infinity)) { dist[v] = dist[u] + d; prev[v] = u; }
  }
  const out = []; for (let n = to; n; n = prev[n]) { out.unshift(NODES[n]); if (n === from) break; }
  return out;
}
const SPOTS = {
  sofa: { x: -6.1, z: 5.37, yaw: Math.PI, pose: 'sofa', node: 'sofaA', w: 1 },
  poolShoot: { x: 0.82, z: 4.32, yaw: Math.PI / 2, pose: 'poolAim', node: 'poolW', w: 1.4 },
  poolWait: { x: 4.5, z: 4.95, yaw: -Math.PI / 2 - 0.35, pose: 'standCue', node: 'poolE', w: 1 },
  coffee: { x: 7.0, z: 3.95, yaw: Math.PI / 2, pose: 'standCup', node: 'coffeeA', w: 1.4 },
  window: { x: -7.35, z: 0.95, yaw: -Math.PI / 2, pose: 'pocket', node: 'winA', w: 0.8 },
  watch: { x: -0.9, z: -4.72, yaw: Math.PI, pose: 'cross', node: 'F2', w: 0.8 },
};
const seatNode = r => (r.st.row === 0 ? 'A' : 'B') + COLS.indexOf(r.st.x);
function goBreak(r, spotKey) {
  const free = Object.entries(SPOTS).filter(([k, s]) => !s.busy);
  if (!free.length) return false;
  let key = spotKey; if (!key) { let tot = free.reduce((a, [, s]) => a + s.w, 0), x = Math.random() * tot; for (const [k, s] of free) { x -= s.w; if (x <= 0) { key = k; break; } } key = key || free[0][0]; }
  const s = SPOTS[key]; s.busy = r.id; r.spot = key;
  r.mode = 'standing'; r.t1 = simT + 0.8;
  r.path = [NODES[seatNode(r)], ...route(seatNode(r), s.node).slice(1), [s.x, s.z]];
  return true;
}
function goBack(r) {
  const s = SPOTS[r.spot];
  r.path = [...route(s.node, seatNode(r)), [r.st.x, r.st.rootZ]];
  r.mode = 'walking'; r.back = true;
}
/* estado inicial: 6 operando, 2 esperando na mesa, 2 na área de lazer */
robots.forEach((r, i) => {
  if ([0, 2, 3, 5, 7, 9].includes(i)) openTrade(r, rnd(-6, 6));
  if (i === 4 || i === 8) {
    const key = i === 4 ? 'poolShoot' : 'coffee', s = SPOTS[key]; s.busy = r.id; r.spot = key;
    r.mode = 'lounge'; r.t1 = simT + rnd(15, 30); r.P.root.position.set(s.x, 0, s.z); r.P.yaw = s.yaw; r.P.pose = s.pose;
  }
});
function stepRobots(dt) {
  const away = robots.filter(r => r.mode !== 'seated').length;
  for (const r of robots) {
    if (r.inCasino) continue;
    if (r.mode === 'seated') {
      if (r.trade) updTrade(r);
      else if ((r.wait -= dt) <= 0) {
        if (!r.afterBreak && away < 3 && Math.random() < 0.45 && goBreak(r)) { /* vai dar uma pausa */ }
        else { openTrade(r); r.afterBreak = false; }
      }
    } else if (r.mode === 'standing' && simT >= r.t1) { r.mode = 'walking'; r.back = false; }
    else if (r.mode === 'lounge' && simT >= r.t1) { if (r.inPool || r.talking || r.st.playerSeated) r.t1 = simT + 6; else goBack(r); }
    else if (r.mode === 'sitting' && simT >= r.t1) { r.mode = 'seated'; r.wait = rnd(2, 5); r.afterBreak = true; }
  }
}
function moveRobots(dt) {
  for (const r of robots) {
    const P = r.P, pos = P.root.position;
    let speed = 0;
    const standingTalk = r.talking && r.mode !== 'seated' && r.mode !== 'sitting';
    if (r.mode === 'walking' && r.path.length && !standingTalk) {
      const [tx, tz] = r.path[0], dx = tx - pos.x, dz = tz - pos.z, d = Math.hypot(dx, dz);
      if (d < 0.06) { r.path.shift(); }
      else { const s = Math.min(d, r.spd * dt); pos.x += dx / d * s; pos.z += dz / d * s; speed = r.spd; P.yaw = angDamp(P.yaw, Math.atan2(dx, dz), 9, dt); }
      if (!r.path.length) {
        if (r.back) { r.mode = 'sitting'; r.t1 = simT + 0.9; SPOTS[r.spot].busy = null; r.spot = null; }
        else { r.mode = 'lounge'; r.t1 = simT + (r.inPool ? 999 : rnd(18, 40)); }
      }
    }
    P.speed = speed;
    /* pose e posição fina por modo */
    const seatZ = P.isAvatar ? r.st.zf + 0.24 : r.st.rootZ;
    const cheering = P.isAvatar && r.react === 'sitCheer' && simT < r.reactT;
    if (r.mode === 'seated' || r.mode === 'sitting') {
      pos.x = damp(pos.x, r.st.x, 6, dt); pos.z = damp(pos.z, seatZ + (cheering ? 0.16 : 0), 6, dt); P.yaw = angDamp(P.yaw, Math.PI, 8, dt);
      P.pose = r.mode === 'sitting' ? 'sitRelax' : (r.react && simT < r.reactT) ? r.react : r.trade ? 'sitType' : r.relax;
    } else if (r.mode === 'standing') { pos.z = damp(pos.z, seatZ + 0.25, 5, dt); P.pose = 'stand'; }
    else if (r.mode === 'walking') P.pose = 'stand';
    else if (r.mode === 'lounge') { const s = SPOTS[r.spot]; pos.x = damp(pos.x, s.x, 5, dt); pos.z = damp(pos.z, s.z, 5, dt); P.yaw = angDamp(P.yaw, s.yaw, 6, dt); P.pose = s.pose; }
    if (standingTalk) { P.yaw = angDamp(P.yaw, Math.atan2(camera.position.x - pos.x, camera.position.z - pos.z), 6, dt); P.pose = 'cross'; }
    /* cadeira acompanha */
    const ch = r.st.chair, sat = (r.mode === 'seated' || r.mode === 'sitting') && !cheering, pl = r.st.playerSeated;
    const cx = sat || pl ? r.st.x : r.st.x + 0.42, cz = pl ? r.st.zf + 0.3 : sat ? (P.isAvatar ? seatZ + 0.02 : r.st.rootZ - 0.06) : seatZ + 0.3, cr = sat || pl ? Math.PI : Math.PI - 0.6;
    ch.position.x = damp(ch.position.x, cx, 4, dt); ch.position.z = damp(ch.position.z, cz, 4, dt); ch.rotation.y = angDamp(ch.rotation.y, cr, 4, dt);
  }
}
