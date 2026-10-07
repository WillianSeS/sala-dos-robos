
/* ================= telas (monitores, telão, letreiros) ================= */
const hist = [];
(function seedHist() {
  const N = 300, target = equity(); let v = 0; const raw = [];
  for (let i = 0; i < N; i++) { v += gauss() * 1.1 + 0.05 + (i > 60 && i < 85 ? 0.9 : 0) - (i > 190 && i < 215 ? 0.8 : 0); raw.push(v); }
  for (let i = 0; i < N; i++) hist.push(BASE + raw[i] + (target - BASE - raw[N - 1]) * i / (N - 1));
})();
const UP = '#26c281', DN = '#ef5350';

function drawChartScreen(tex, r) {
  const g = tex.userData.g, w = 512, h = 300, p = PAIRS[r.pair], tr = r.trade;
  g.fillStyle = '#0a0f17'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#111925'; g.fillRect(0, 0, w, 28);
  g.textBaseline = 'middle'; g.font = '700 15px ' + FONT; g.fillStyle = '#dce6f2'; g.fillText(p.sym + ' · M1', 10, 14);
  g.font = '500 12px ' + FONT; g.fillStyle = '#7d8fa6'; g.fillText(r.person + ' · ' + r.name, 128, 14);
  const cs = p.candles.slice(-44); let mn = Infinity, mx = -Infinity;
  for (const c of cs) { mn = Math.min(mn, c.l); mx = Math.max(mx, c.h); }
  if (tr) { mn = Math.min(mn, tr.entry); mx = Math.max(mx, tr.entry); }
  const pad = (mx - mn) * 0.12 + p.pip; mn -= pad; mx += pad;
  const X0 = 8, X1 = 440, Y0 = 38, Y1 = 262, py = v => Y1 - (v - mn) / (mx - mn) * (Y1 - Y0);
  g.strokeStyle = 'rgba(120,140,170,.12)'; g.lineWidth = 1; g.font = '500 11px ' + FONT; g.fillStyle = '#6c7c92';
  for (let k = 0; k <= 4; k++) { const v = mn + (mx - mn) * k / 4, y = py(v); g.beginPath(); g.moveTo(X0, y); g.lineTo(X1, y); g.stroke(); g.fillText(v.toFixed(p.dec), X1 + 6, y); }
  const step = (X1 - X0) / cs.length;
  cs.forEach((c, i) => {
    const x = X0 + i * step + step / 2, col = c.c >= c.o ? UP : DN;
    g.strokeStyle = g.fillStyle = col; g.beginPath(); g.moveTo(x, py(c.h)); g.lineTo(x, py(c.l)); g.stroke();
    const y0 = py(Math.max(c.o, c.c)), y1 = py(Math.min(c.o, c.c)); g.fillRect(x - step * 0.32, y0, step * 0.64, Math.max(1.5, y1 - y0));
  });
  const yP = py(p.price);
  g.setLineDash([4, 4]); g.strokeStyle = '#9fb3c8'; g.beginPath(); g.moveTo(X0, yP); g.lineTo(X1, yP); g.stroke();
  if (tr) { const yE = py(tr.entry); g.strokeStyle = '#f0b429'; g.beginPath(); g.moveTo(X0, yE); g.lineTo(X1, yE); g.stroke(); }
  g.setLineDash([]);
  g.fillStyle = '#2b3a4f'; g.fillRect(X1 + 2, yP - 9, w - X1 - 4, 18); g.fillStyle = '#fff'; g.font = '700 11px ' + FONT; g.fillText(p.price.toFixed(p.dec), X1 + 6, yP);
  g.fillStyle = '#111925'; g.fillRect(0, h - 30, w, 30);
  g.font = '700 13px ' + FONT;
  if (tr) { g.fillStyle = '#f0b429'; g.fillText((tr.dir > 0 ? 'COMPRA ' : 'VENDA ') + fmtLots(tr.lots) + ' @ ' + tr.entry.toFixed(p.dec), 10, h - 15); g.fillStyle = tr.pnl >= 0 ? UP : DN; g.textAlign = 'right'; g.fillText(money(tr.pnl), w - 10, h - 15); g.textAlign = 'left'; }
  else { g.fillStyle = '#7d8fa6'; g.fillText('SEM POSIÇÃO · AGUARDANDO SINAL', 10, h - 15); }
  tex.needsUpdate = true;
}
function drawPanelScreen(tex, r) {
  const g = tex.userData.g, w = 512, h = 300, tr = r.trade;
  g.fillStyle = '#0b120f'; g.fillRect(0, 0, w, h);
  g.textBaseline = 'top'; g.font = '700 15px ' + FONT; g.fillStyle = '#dff3e6'; g.fillText(r.person.toUpperCase() + ' · ' + r.name.toUpperCase(), 14, 14);
  const st = tr ? ['EM OPERAÇÃO', '#26c281'] : r.mode === 'seated' ? ['AGUARDANDO SINAL', '#9aa7a0'] : ['EM PAUSA', '#f0b429'];
  g.font = '700 12px ' + FONT; const tw = g.measureText(st[0]).width + 18;
  g.fillStyle = st[1]; g.globalAlpha = 0.18; g.fillRect(14, 40, tw, 22); g.globalAlpha = 1; g.fillText(st[0], 23, 45);
  g.font = '700 46px ' + FONT; g.fillStyle = tr ? (tr.pnl >= 0 ? '#3ddc84' : '#ff6b6b') : '#56635c'; g.fillText(tr ? money(tr.pnl) : '+$0,00', 14, 74);
  g.font = '500 13px ' + FONT; g.fillStyle = '#9fb4a8';
  g.fillText('Par ' + r.pair + (tr ? ' · ' + (tr.dir > 0 ? 'compra ' : 'venda ') + fmtLots(tr.lots) + ' lote' : ''), 14, 132);
  g.fillText('Hoje ' + money(r.today) + ' · ' + r.ops + ' ops · ' + r.wins + ' gains', 14, 152);
  g.strokeStyle = 'rgba(160,200,180,.15)'; g.beginPath(); g.moveTo(14, 178); g.lineTo(w - 14, 178); g.stroke();
  g.font = '500 12px ' + FONT;
  r.log.slice().reverse().forEach((s, k) => { g.fillStyle = k ? '#6f8379' : '#c9dccf'; g.fillText(s, 14, 188 + k * 21); });
  tex.needsUpdate = true;
}
function drawWall() {
  const g = wallTex.userData.g, w = 2048, h = 602, eq = equity(), tot = eq - BASE, op = openPnl();
  const peak = Math.max(...hist, eq), dd = peak - eq, nOp = robots.filter(r => r.trade).length;
  const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#0b2419'); bg.addColorStop(1, '#06120d'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.textBaseline = 'top'; g.fillStyle = '#86e7b0'; g.font = '700 30px ' + FONT;
  g.fillText('PORTFÓLIO · 10 ROBÔS · CONTA SIMULADA · RENTABILIDADE AO VIVO', 44, 30);
  /* curva */
  const cx = 44, cy = 96, cw = 1230, ch = 460, mn = Math.min(...hist) - 3, mx = Math.max(...hist) + 3;
  g.font = '500 20px ' + FONT; g.strokeStyle = 'rgba(134,231,176,.12)'; g.lineWidth = 1.5; g.fillStyle = 'rgba(134,231,176,.6)';
  const stp = (mx - mn) > 60 ? 20 : 10;
  for (let v = Math.ceil((mn - BASE) / stp) * stp; v <= mx - BASE; v += stp) { const y = cy + ch - (BASE + v - mn) / (mx - mn) * ch; g.beginPath(); g.moveTo(cx + 92, y); g.lineTo(cx + cw, y); g.stroke(); g.fillText((v >= 0 ? '+$' : '-$') + Math.abs(v), cx, y - 11); }
  const pts = hist.map((v, i) => [cx + 92 + i / (hist.length - 1) * (cw - 92), cy + ch - (v - mn) / (mx - mn) * ch]);
  g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.lineTo(pts[pts.length - 1][0], cy + ch); g.lineTo(pts[0][0], cy + ch); g.closePath();
  const ag = g.createLinearGradient(0, cy, 0, cy + ch); ag.addColorStop(0, 'rgba(61,220,132,.35)'); ag.addColorStop(1, 'rgba(61,220,132,0)'); g.fillStyle = ag; g.fill();
  g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.strokeStyle = '#5dff9e'; g.lineWidth = 4; g.stroke();
  const [lx, ly] = pts[pts.length - 1]; g.fillStyle = '#5dff9e'; g.beginPath(); g.arc(lx, ly, 9, 0, 7); g.fill();
  /* números */
  const px = 1330;
  g.fillStyle = 'rgba(134,231,176,.75)'; g.font = '700 22px ' + FONT; g.fillText('LUCRO TOTAL', px, 96);
  g.fillStyle = tot >= 0 ? '#5dff9e' : '#ff7272'; g.font = '700 84px ' + FONT; g.fillText(money(tot), px, 124);
  g.fillStyle = '#cfe9da'; g.font = '500 22px ' + FONT;
  g.fillText((tot >= 0 ? '+' : '-') + Math.abs(tot / BASE * 100).toFixed(1).replace('.', ',') + '% sobre ' + money0(BASE) + ' · em aberto ' + money(op), px, 218);
  g.fillStyle = 'rgba(134,231,176,.75)'; g.font = '700 20px ' + FONT;
  g.fillText('DRAWDOWN', px, 262); g.fillText('EM OPERAÇÃO', px + 240, 262); g.fillText('HOJE', px + 470, 262);
  g.font = '700 38px ' + FONT; g.fillStyle = '#ffd166'; g.fillText(money0(dd), px, 288);
  g.fillStyle = '#e9efe9'; g.fillText(nOp + '/10', px + 240, 288);
  g.fillStyle = todayPnl >= 0 ? '#5dff9e' : '#ff7272'; g.fillText(money(todayPnl), px + 470, 288);
  g.font = '500 18px ' + FONT; g.fillStyle = '#9fc7b1'; g.fillText(gains + ' gains · ' + losses + ' losses', px + 470, 334);
  /* tabela dos robôs */
  g.font = '500 18px ' + FONT;
  robots.forEach((r, k) => {
    const y = 372 + (k % 5) * 44, x = px + (k < 5 ? 0 : 345);
    g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(x, y - 6, 330, 38);
    g.fillStyle = '#cfe9da'; g.fillText(r.short + ' ' + r.pair, x + 10, y + 3);
    const v = r.trade ? r.trade.pnl : 0; g.fillStyle = r.trade ? (v >= 0 ? '#5dff9e' : '#ff7272') : (r.mode === 'seated' ? '#7d8c84' : '#f0b429');
    g.textAlign = 'right'; g.fillText(r.trade ? money(v) : r.mode === 'seated' ? 'aguard.' : 'pausa', x + 320, y + 3); g.textAlign = 'left';
  });
  /* emendas entre as telas (3 x 2) */
  g.fillStyle = '#000'; g.fillRect(w / 3 - 3, 0, 6, h); g.fillRect(2 * w / 3 - 3, 0, 6, h); g.fillRect(0, h / 2 - 3, w, 6);
  wallTex.needsUpdate = true;
}
function drawTicker() {
  const g = tickTex.userData.g, w = 3072, h = 70;
  g.fillStyle = '#050607'; g.fillRect(0, 0, w, h); g.textBaseline = 'middle'; g.font = '700 34px ' + FONT;
  const items = [...Object.values(PAIRS).map(p => [p.sym, p.price.toFixed(p.dec), (p.price - p.open) / p.open]), ...EXTRA.map(e => [e.sym, e.price.toLocaleString('pt-BR', { minimumFractionDigits: e.dec, maximumFractionDigits: e.dec }), (e.price - e.open) / e.open])];
  let x = 20;
  while (x < w) for (const [s, v, ch] of items) {
    if (x >= w) break;
    g.fillStyle = '#e8e8e8'; g.fillText(s, x, h / 2); x += g.measureText(s + ' ').width;
    g.fillStyle = ch >= 0 ? '#3ddc84' : '#ff5a5a'; const t = v + (ch >= 0 ? ' ▲ +' : ' ▼ ') + (ch * 100).toFixed(2).replace('.', ',') + '%';
    g.fillText(t, x, h / 2); x += g.measureText(t).width + 70;
  }
  tickTex.needsUpdate = true;
}
function drawSigns() {
  for (const s of SIGNS) {
    const g = s.tex.userData.g, w = 512, h = 144, p = PAIRS[s.sym], ch = (p.price - p.open) / p.open, n = ROBO_PAIRS.filter(x => x === s.sym).length;
    g.fillStyle = '#070b09'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2bbf6b'; g.lineWidth = 5; g.strokeRect(3, 3, w - 6, h - 6);
    g.textBaseline = 'top'; g.fillStyle = '#eef4ef'; g.font = '700 58px ' + FONT; g.fillText(s.sym, 22, 16);
    g.font = '500 24px ' + FONT; g.fillStyle = '#8fd9ad'; g.fillText(n + ' robôs', 24, 96);
    g.textAlign = 'right'; g.font = '700 30px ' + FONT; g.fillStyle = '#e9efe9'; g.fillText(p.price.toFixed(p.dec), w - 22, 24);
    g.fillStyle = ch >= 0 ? '#3ddc84' : '#ff5a5a'; g.font = '700 24px ' + FONT; g.fillText((ch >= 0 ? '▲ +' : '▼ ') + (ch * 100).toFixed(2).replace('.', ',') + '%', w - 22, 96); g.textAlign = 'left';
    s.tex.needsUpdate = true;
  }
}
/* etiquetas de P/L acima das cabeças (HTML nítido) */
const _hv = new THREE.Vector3();
function updateLabels() {
  const W = innerWidth, H = innerHeight;
  for (const r of robots) {
    const tr = r.trade, flash = !tr && r.react && simT < r.reactT, v = tr ? tr.pnl : flash ? r.lastPnl : 0;
    const txt = tr || flash ? money(v) : '+$0,00', cls = tr || flash ? (v >= 0 ? 'pl g' : 'pl r') : 'pl n';
    if (txt !== r.txt) { r.elV.textContent = txt; r.txt = txt; }
    if (r.el.className !== cls) r.el.className = cls;
    r.P.J.head.getWorldPosition(_hv); _hv.y += 0.42;
    const dist = camera.position.distanceTo(_hv);
    _hv.project(camera);
    if (_hv.z > 1 || _hv.z < -1 || dist < 0.55) { r.el.style.opacity = '0'; continue; }
    const sc = clamp(4.2 / dist, 0.42, 1.25) * (r.react && simT < r.reactT ? 1.18 : 1);
    r.el.style.opacity = '1';
    r.el.style.transform = `translate(${(_hv.x * 0.5 + 0.5) * W}px,${(-_hv.y * 0.5 + 0.5) * H}px) translate(-50%,-100%) scale(${sc.toFixed(3)})`;
  }
}
