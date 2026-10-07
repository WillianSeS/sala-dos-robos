
/* ================= texturas procedurais ================= */
/* espera as fontes (textos desenhados em canvas) por no máximo 2,5 s */
try {
  await Promise.race([
    Promise.all(['700 40px "Chivo Mono"', '500 40px "Chivo Mono"', '600 40px Fraunces', 'italic 600 40px Fraunces'].map(f => document.fonts.load(f))),
    new Promise(r => setTimeout(r, 2500)),
  ]);
} catch (e) { /* segue com as fontes de reserva */ }
function noiseFill(g, w, h, base, amp, tileFn) {
  const img = g.getImageData(0, 0, w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, n = (Math.random() - 0.5) * amp, f = tileFn ? tileFn(x, y) : 1;
    d[i] = clamp((base[0] + n) * f, 0, 255); d[i + 1] = clamp((base[1] + n) * f, 0, 255); d[i + 2] = clamp((base[2] + n) * f, 0, 255); d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}
/* carpete em placas 50 cm (textura = 2 m) */
const TEX = {};
TEX.carpet = canvasTex(512, 512, (g, w, h) => {
  noiseFill(g, w, h, [44, 47, 52], 30, (x, y) => (((x >> 7) + (y >> 7)) % 2 ? 1 : 0.9));
  g.globalAlpha = 0.06; g.strokeStyle = '#000';
  for (let i = 0; i < 900; i++) { const x = Math.random() * w, y = Math.random() * h, vert = (((x >> 7) + (y >> 7)) % 2) === 0; g.beginPath(); g.moveTo(x, y); vert ? g.lineTo(x, y + 6) : g.lineTo(x + 6, y); g.stroke(); }
  g.globalAlpha = 1; g.fillStyle = 'rgba(0,0,0,.45)';
  for (let i = 0; i <= 4; i++) { g.fillRect(i * 128 - 1, 0, 2, h); g.fillRect(0, i * 128 - 1, w, 2); }
}, { repeat: [8, 4.2] });
/* assoalho de madeira (textura = 2 m, tábuas de 20 cm) */
TEX.wood = canvasTex(1024, 1024, (g, w, h) => {
  const ph = 102.4, tones = ['#6b4429', '#74492c', '#7d5233', '#5f3c24', '#835838', '#704a2f'];
  for (let r = 0; r < 10; r++) {
    let x = -Math.random() * 400;
    while (x < w) {
      const len = 300 + Math.random() * 420, y = r * ph;
      g.fillStyle = tones[(Math.random() * tones.length) | 0]; g.fillRect(x, y, len, ph);
      for (let k = 0; k < 26; k++) {
        g.strokeStyle = Math.random() < 0.5 ? 'rgba(30,15,5,.22)' : 'rgba(255,220,170,.07)';
        g.lineWidth = Math.random() * 1.6 + 0.4; g.beginPath();
        const yy = y + Math.random() * ph, a = Math.random() * 3, f = 0.004 + Math.random() * 0.01;
        for (let xx = x; xx <= x + len; xx += 12) g.lineTo(xx, yy + Math.sin(xx * f + k) * a);
        g.stroke();
      }
      if (Math.random() < 0.25) { g.fillStyle = 'rgba(40,20,8,.35)'; g.beginPath(); g.ellipse(x + Math.random() * len, y + ph / 2, 9, 5, 0, 0, 7); g.fill(); }
      g.fillStyle = 'rgba(15,8,3,.7)'; g.fillRect(x, y, 2, ph);
      x += len;
    }
    g.fillStyle = 'rgba(15,8,3,.75)'; g.fillRect(0, r * ph, w, 2);
  }
}, { repeat: [8, 1.8] });
/* ripas de madeira da parede do fundo */
TEX.slat = canvasTex(128, 1024, (g, w, h) => {
  g.fillStyle = '#b3814c'; g.fillRect(0, 0, w, h);
  for (let k = 0; k < 60; k++) {
    g.strokeStyle = Math.random() < 0.55 ? 'rgba(90,50,20,.25)' : 'rgba(255,225,180,.12)';
    g.lineWidth = Math.random() * 2 + 0.4; g.beginPath();
    const x0 = Math.random() * w, a = 2 + Math.random() * 4;
    for (let y = 0; y <= h; y += 16) g.lineTo(x0 + Math.sin(y * 0.01 + k) * a, y);
    g.stroke();
  }
});
/* reboco com leve variação */
TEX.plaster = canvasTex(256, 256, (g, w, h) => { noiseFill(g, w, h, [236, 236, 236], 14); }, { repeat: [5, 2] });
/* folha (com transparência) */
TEX.leaf = canvasTex(128, 256, (g, w, h) => {
  const grd = g.createLinearGradient(0, 0, w, 0); grd.addColorStop(0, '#2e5f33'); grd.addColorStop(0.5, '#4f8f50'); grd.addColorStop(1, '#2b5a30');
  g.fillStyle = grd; g.beginPath(); g.moveTo(w / 2, h - 4);
  g.bezierCurveTo(-10, h * 0.7, 6, h * 0.18, w / 2, 4); g.bezierCurveTo(w - 6, h * 0.18, w + 10, h * 0.7, w / 2, h - 4); g.fill();
  g.strokeStyle = 'rgba(200,235,190,.45)'; g.lineWidth = 2; g.beginPath(); g.moveTo(w / 2, h - 6); g.lineTo(w / 2, 10); g.stroke();
  g.lineWidth = 1; g.strokeStyle = 'rgba(200,235,190,.22)';
  for (let y = 40; y < h - 20; y += 22) { g.beginPath(); g.moveTo(w / 2, y + 14); g.lineTo(w * 0.18, y); g.moveTo(w / 2, y + 14); g.lineTo(w * 0.82, y); g.stroke(); }
});
/* teclado */
TEX.keys = canvasTex(256, 96, (g, w, h) => {
  g.fillStyle = '#16181b'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#2a2d32';
  for (let r = 0; r < 5; r++) for (let c = 0; c < 15; c++) g.fillRect(6 + c * 16.4, 6 + r * 17, 14, 14);
  g.fillRect(60, 6 + 5 * 17 - 2, 120, 8);
});
/* tapete da sala de estar */
TEX.rug = canvasTex(512, 512, (g, w, h) => {
  noiseFill(g, w, h, [96, 92, 84], 26);
  g.strokeStyle = 'rgba(30,28,25,.55)'; g.lineWidth = 10; g.strokeRect(24, 24, w - 48, h - 48);
  g.lineWidth = 3; g.strokeRect(46, 46, w - 92, h - 92);
});
/* bandeira do Brasil */
TEX.flag = canvasTex(700, 490, (g, w, h) => {
  g.fillStyle = '#009c3b'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffdf00'; g.beginPath(); g.moveTo(w / 2, 40); g.lineTo(w - 58, h / 2); g.lineTo(w / 2, h - 40); g.lineTo(58, h / 2); g.closePath(); g.fill();
  g.fillStyle = '#002776'; g.beginPath(); g.arc(w / 2, h / 2, 118, 0, 7); g.fill();
  g.save(); g.beginPath(); g.arc(w / 2, h / 2, 118, 0, 7); g.clip();
  g.strokeStyle = '#fff'; g.lineWidth = 22; g.beginPath(); g.arc(w / 2 - 40, h / 2 + 330, 360, Math.PI * 1.32, Math.PI * 1.78); g.stroke();
  g.fillStyle = '#fff'; for (let i = 0; i < 26; i++) { g.beginPath(); g.arc(w / 2 + (Math.random() - 0.5) * 190, h / 2 + 10 + Math.random() * 90, 2 + Math.random() * 2.5, 0, 7); g.fill(); }
  g.restore();
  g.fillStyle = 'rgba(0,0,0,.06)'; for (let x = 0; x < w; x += 70) g.fillRect(x, 0, 30, h);
});
/* letreiro da marca (fundo transparente) */
TEX.brand = canvasTex(1400, 240, (g, w, h) => {
  g.textBaseline = 'middle'; g.font = '600 150px ' + FONT_D; g.fillStyle = '#eef4ef';
  g.fillText('Sala dos', 20, h / 2 + 6); const m = g.measureText('Sala dos ').width;
  g.font = 'italic 600 150px ' + FONT_D; g.fillStyle = '#45ec8f'; g.fillText('Robôs', 20 + m, h / 2 + 6);
});
/* quadro abstrato (gráfico de velas em arte) */
TEX.art = canvasTex(640, 400, (g, w, h) => {
  g.fillStyle = '#e9e4da'; g.fillRect(0, 0, w, h);
  let y = h * 0.6;
  for (let i = 0; i < 34; i++) {
    const x = 30 + i * 17.5, o = y, c = y + (Math.random() - 0.52) * 46, hi = Math.min(o, c) - Math.random() * 20, lo = Math.max(o, c) + Math.random() * 20;
    g.strokeStyle = g.fillStyle = c < o ? '#1f6b4a' : '#b23a2e'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(x + 5, hi); g.lineTo(x + 5, lo); g.stroke(); g.fillRect(x, Math.min(o, c), 10, Math.max(3, Math.abs(c - o))); y = clamp(c, 60, h - 60);
  }
  g.fillStyle = '#1b1b1b'; g.font = '600 22px ' + FONT_D; g.fillText('Paciência paga.', 30, h - 26);
});
/* sombra de contato */
TEX.blob = canvasTex(128, 128, (g, w, h) => {
  const grd = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
  grd.addColorStop(0, 'rgba(0,0,0,.55)'); grd.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = grd; g.fillRect(0, 0, w, h);
});
/* ===== Nova York à noite (desenho procedural com os prédios mais conhecidos) ===== */
const rgba = (r, g2, b, a) => `rgba(${r | 0},${g2 | 0},${b | 0},${a})`;
function nycWindows(g, x, y, w, h, o = {}) {
  const fx = o.fx || 7, fy = o.fy || 11, lit = o.lit ?? 0.42, warm = o.warm ?? 0.65, cw = o.cw || fx * 0.55, chh = o.ch || fy * 0.5;
  for (let yy = y + 4; yy < y + h - 2; yy += fy) {
    const full = Math.random() < 0.1, tone = Math.random() < warm;
    for (let xx = x + 3; xx < x + w - cw - 1; xx += fx) {
      if (Math.random() < (full ? 0.9 : lit)) {
        const wv = full ? tone : Math.random() < warm, a = 0.5 + Math.random() * 0.5;
        g.fillStyle = wv ? rgba(255, 200 + Math.random() * 40, 125 + Math.random() * 55, a) : rgba(185 + Math.random() * 45, 212 + Math.random() * 33, 255, a);
        g.fillRect(xx, yy, cw, chh);
      }
    }
  }
}
function nycBlock(g, x, top, w, bottom, o = {}) {
  const grd = g.createLinearGradient(0, top, 0, bottom); grd.addColorStop(0, o.c1 || '#161b29'); grd.addColorStop(1, o.c2 || '#0b0e16');
  g.fillStyle = grd; g.fillRect(x, top, w, bottom - top);
  nycWindows(g, x, top, w, bottom - top, o);
  g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(x, top, 2, bottom - top);
}
function glow(g, x, y, r, c, a) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${c},${a})`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
function redLight(g, x, y) { glow(g, x, y, 9, '255,60,50', 0.7); g.fillStyle = '#ff5a4d'; g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); }
function waterTower(g, x, y, s = 1) {
  g.strokeStyle = '#2b2119'; g.lineWidth = 1.4 * s; g.beginPath();
  g.moveTo(x - 6 * s, y); g.lineTo(x - 4 * s, y - 9 * s); g.moveTo(x + 6 * s, y); g.lineTo(x + 4 * s, y - 9 * s); g.moveTo(x, y); g.lineTo(x, y - 9 * s); g.stroke();
  g.fillStyle = '#3b2d21'; g.fillRect(x - 7 * s, y - 21 * s, 14 * s, 12 * s);
  g.beginPath(); g.moveTo(x - 8.5 * s, y - 21 * s); g.lineTo(x, y - 29 * s); g.lineTo(x + 8.5 * s, y - 21 * s); g.closePath(); g.fill();
  g.fillStyle = 'rgba(15,10,6,.7)'; for (let k = 0; k < 3; k++) g.fillRect(x - 7 * s, y - 19 * s + k * 4 * s, 14 * s, 0.9 * s);
}
function empireState(g, cx, H) {
  const sec = [[118, 640, H], [88, 500, 640], [62, 372, 500], [44, 352, 372], [32, 336, 352], [22, 322, 336]];
  for (const [hw, top, bot] of sec) {
    nycBlock(g, cx - hw, top, hw * 2, bot, { c1: '#1c1f2b', c2: '#12141c', fx: 6, fy: 9, lit: 0.5, warm: 0.88 });
    g.fillStyle = 'rgba(210,200,180,.09)'; for (let x = cx - hw + 4; x < cx + hw - 2; x += 6) g.fillRect(x, top, 1.3, bot - top);
  }
  glow(g, cx, 338, 85, '120,170,255', 0.42);
  const lt = g.createLinearGradient(0, 322, 0, 372); lt.addColorStop(0, '#f2f7ff'); lt.addColorStop(1, '#5b8fe8');
  g.globalAlpha = 0.85; g.fillStyle = lt; g.fillRect(cx - 44, 352, 88, 20); g.fillRect(cx - 32, 336, 64, 16); g.fillRect(cx - 22, 322, 44, 14); g.globalAlpha = 1;
  g.fillStyle = '#cdd9ee'; g.beginPath(); g.moveTo(cx - 9, 322); g.lineTo(cx + 9, 322); g.lineTo(cx + 2.6, 282); g.lineTo(cx - 2.6, 282); g.closePath(); g.fill();
  g.fillRect(cx - 1, 246, 2, 36); redLight(g, cx, 246);
}
function chrysler(g, cx, H) {
  nycBlock(g, cx - 48, 430, 96, H, { c1: '#1a1d28', c2: '#10121a', fx: 6, fy: 9, lit: 0.45, warm: 0.8 });
  nycBlock(g, cx - 36, 392, 72, 430, { c1: '#1b1e2a', fx: 6, fy: 9, lit: 0.5, warm: 0.8 });
  glow(g, cx, 360, 70, '255,240,205', 0.28);
  for (let k = 0; k < 6; k++) {
    const r = 34 - k * 5.3, yb = 392 - k * 11;
    g.fillStyle = '#7e8696'; g.beginPath(); g.arc(cx, yb, r, Math.PI, 0); g.closePath(); g.fill();
    g.fillStyle = '#fff4d2';
    for (let a = 0; a < 7; a++) { const an = Math.PI + (a + 0.5) / 7 * Math.PI, rx = cx + Math.cos(an) * (r - 6), ry = yb + Math.sin(an) * (r - 6); g.beginPath(); g.moveTo(rx, ry - 4); g.lineTo(rx - 2.3, ry + 2); g.lineTo(rx + 2.3, ry + 2); g.closePath(); g.fill(); }
  }
  g.fillStyle = '#d9dee8'; g.beginPath(); g.moveTo(cx - 3, 330); g.lineTo(cx + 3, 330); g.lineTo(cx, 290); g.closePath(); g.fill();
}
function park432(g, cx, H) {
  const hw = 22, top = 318; g.fillStyle = '#4f4d4a'; g.fillRect(cx - hw, top, hw * 2, H - top);
  for (let y = top + 3; y < H; y += 9) for (let x = cx - hw + 3; x < cx + hw - 6; x += 9) { g.fillStyle = Math.random() < 0.5 ? rgba(255, 205 + Math.random() * 35, 150, 0.95) : '#15171d'; g.fillRect(x, y, 6, 6); }
  redLight(g, cx - hw + 3, top); redLight(g, cx + hw - 3, top);
}
function genericTower(g, x, top, w, H, o = {}) {
  const glass = Math.random() < 0.35;
  nycBlock(g, x, top, w, H, glass ? { c1: '#1a2638', c2: '#0d1420', fx: 5, fy: 7, lit: 0.38, warm: 0.25, cw: 3.5, ch: 2.2, ...o } : { fx: 6 + Math.random() * 3, fy: 9 + Math.random() * 3, lit: 0.3 + Math.random() * 0.25, warm: 0.7, ...o });
  if (Math.random() < 0.25) { g.fillStyle = '#1c2130'; g.fillRect(x + w * 0.2, top - 14, w * 0.6, 14); }
  if (Math.random() < 0.3) { g.fillStyle = '#8b93a3'; g.fillRect(x + w / 2 - 1, top - 34, 2, 34); redLight(g, x + w / 2, top - 34); }
}
/* camada distante: céu, rio com reflexos, ponte e o centro financeiro (One World Trade Center) */
TEX.skyFar = canvasTex(2048, 1024, (g, w, h) => {
  const hz = Math.round(h * 0.55);
  const sky = g.createLinearGradient(0, 0, 0, hz);
  sky.addColorStop(0, '#03050b'); sky.addColorStop(0.5, '#0b1226'); sky.addColorStop(0.84, '#1d1b37'); sky.addColorStop(1, '#4d3548');
  g.fillStyle = sky; g.fillRect(0, 0, w, hz);
  glow(g, w * 0.5, hz, 700, '255,150,90', 0.12);
  for (let x = 0; x < w;) {
    const bw = 10 + Math.random() * 34, bh = 6 + Math.random() * Math.random() * 46;
    g.fillStyle = '#0b0d16'; g.fillRect(x, hz - bh, bw, bh + 2); nycWindows(g, x, hz - bh, bw, bh, { fx: 4, fy: 5, cw: 1.6, ch: 1.6, lit: 0.25 });
    x += bw + Math.random() * 4;
  }
  /* centro financeiro */
  const dc = w * 0.505;
  for (let k = 0; k < 16; k++) { const bw = 14 + Math.random() * 26, bh = 30 + Math.random() * 70, x = dc - 190 + Math.random() * 380; g.fillStyle = '#0e1220'; g.fillRect(x, hz - bh, bw, bh); nycWindows(g, x, hz - bh, bw, bh, { fx: 4, fy: 5, cw: 2, ch: 1.8, lit: 0.4, warm: 0.5 }); }
  const ot = hz - 118; g.beginPath(); g.moveTo(dc - 24, hz); g.lineTo(dc + 24, hz); g.lineTo(dc + 12, ot); g.lineTo(dc - 12, ot); g.closePath();
  const og = g.createLinearGradient(dc - 24, 0, dc + 24, 0); og.addColorStop(0, '#1d2b45'); og.addColorStop(0.5, '#33496f'); og.addColorStop(0.5, '#172338'); og.addColorStop(1, '#0f1829'); g.fillStyle = og; g.fill();
  for (let y = ot + 4; y < hz; y += 4) if (Math.random() < 0.4) { g.fillStyle = rgba(200, 225, 255, 0.3 + Math.random() * 0.5); g.fillRect(dc - 10 - (y - ot) / 118 * 12 + Math.random() * 6, y, 6 + Math.random() * 12, 1.2); }
  g.fillStyle = '#c9d4e6'; g.fillRect(dc - 1, ot - 52, 2, 52); glow(g, dc, ot - 52, 14, '255,255,255', 0.9);
  /* rio com reflexos */
  const rv = g.createLinearGradient(0, hz, 0, hz + 70); rv.addColorStop(0, '#0c0f1c'); rv.addColorStop(1, '#05070d'); g.fillStyle = rv; g.fillRect(0, hz, w, 70);
  for (let i = 0; i < 900; i++) { const x = Math.random() * w, l = 4 + Math.random() * 30; g.fillStyle = Math.random() < 0.75 ? rgba(255, 200, 130, Math.random() * 0.35) : rgba(180, 210, 255, Math.random() * 0.3); g.fillRect(x, hz + 2 + Math.random() * 60, 1 + Math.random() * 2, l * 0.25); }
  /* ponte suspensa iluminada */
  const bx0 = w * 0.36, bx1 = w * 0.44, by = hz + 14;
  g.fillStyle = '#2a2a33'; g.fillRect(bx0 - 6, by - 34, 9, 40); g.fillRect(bx1 - 3, by - 34, 9, 40);
  g.strokeStyle = 'rgba(255,230,180,.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(bx0 - 120, by); g.lineTo(bx1 + 120, by); g.stroke();
  for (let i = 0; i <= 60; i++) { const t = i / 60, x = bx0 + (bx1 - bx0) * t, y = by - 32 + Math.sin(t * Math.PI) * 26; g.fillStyle = 'rgba(255,240,200,.95)'; g.fillRect(x, y, 1.6, 1.6); }
  for (const [a, b2] of [[bx0 - 120, bx0], [bx1, bx1 + 120]]) for (let i = 0; i <= 24; i++) { const t = i / 24, x = a + (b2 - a) * t, y = a < bx0 ? by - 32 * t * t : by - 32 * (1 - t) * (1 - t); g.fillStyle = 'rgba(255,240,200,.9)'; g.fillRect(x, y, 1.5, 1.5); }
  /* cidade lá embaixo */
  const gl2 = g.createLinearGradient(0, hz + 70, 0, h); gl2.addColorStop(0, '#120f18'); gl2.addColorStop(1, '#07060a'); g.fillStyle = gl2; g.fillRect(0, hz + 70, w, h - hz - 70);
  for (let i = 0; i < 6000; i++) {
    const t = Math.pow(Math.random(), 1.6), y = hz + 72 + t * (h - hz - 74), s = 0.6 + t * 2.4;
    g.fillStyle = Math.random() < 0.78 ? rgba(255, 185 + Math.random() * 55, 115, 0.35 + Math.random() * 0.6) : rgba(200, 225, 255, 0.3 + Math.random() * 0.5);
    g.fillRect(Math.random() * w, y, s, s * 0.8);
  }
});
/* camada próxima: Manhattan com Empire State, Chrysler e torres ao redor (fundo transparente) */
TEX.skyMid = canvasTex(2048, 1024, (g, w, h) => {
  for (let x = -20; x < w;) { const bw = 60 + Math.random() * 120; genericTower(g, x, 340 + Math.random() * 190, bw, h, { c1: '#1a2131', c2: '#0e121c' }); x += bw + 6 + Math.random() * 40; }
  chrysler(g, w * 0.42, h);
  empireState(g, w * 0.5, h);
  park432(g, w * 0.575, h);
  for (let x = -30; x < w;) {
    const bw = 70 + Math.random() * 150, top = 500 + Math.random() * 260;
    if (Math.abs(x + bw / 2 - w * 0.5) < 150 && top < 650) { x += 40; continue; }
    genericTower(g, x, top, bw, h, { c1: '#141824', c2: '#090b12' });
    if (Math.random() < 0.6) waterTower(g, x + bw * (0.25 + Math.random() * 0.5), top, 1 + Math.random() * 0.5);
    x += bw + 4 + Math.random() * 30;
  }
  const st = g.createLinearGradient(0, h - 120, 0, h); st.addColorStop(0, 'rgba(255,170,90,0)'); st.addColorStop(1, 'rgba(255,170,90,.35)'); g.fillStyle = st; g.fillRect(0, h - 120, w, 120);
});
