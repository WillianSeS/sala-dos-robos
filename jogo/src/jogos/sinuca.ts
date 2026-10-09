/* Sinuca: física 2D das bolas sobre o feltro e regras simples (cada bola encaçapada vale 1 ponto; quem
   encaçapa joga de novo; branca na caçapa é falta). Portada do jogo antigo (src/76_pool.js), sem DOM. */
export const R = 0.0286; // raio da bola (m)
export const HX = 1.22; // meia-largura do campo
export const HZ = 0.61; // meia-profundidade do campo
export const CACAPAS: [number, number, number][] = [
  [-1.215, -0.6, 0.066], [0, -0.635, 0.058], [1.215, -0.6, 0.066],
  [-1.215, 0.6, 0.066], [0, 0.635, 0.058], [1.215, 0.6, 0.066],
];

export interface Bola {
  n: number;
  x: number; // coordenadas locais da mesa (centro = 0,0)
  z: number;
  vx: number;
  vz: number;
  em: boolean; // ainda na mesa
  afundando: number;
}

export type Vez = 'voce' | 'robo';
export interface Partida {
  bolas: Bola[];
  vez: Vez;
  placar: Record<Vez, number>;
  fase: 'mirar' | 'rolando' | 'roboPensa' | 'roboMira' | 'fim';
  encacapadasNaTacada: number;
  faltaBranca: boolean;
  solo: boolean;
  msg: string;
}

/** Gerador pseudoaleatório com semente (testes reproduzíveis). */
export function sorteador(semente = Date.now()) {
  let s = semente >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function novaPartida(solo = false, rnd = Math.random): Partida {
  const bolas: Bola[] = Array.from({ length: 16 }, (_, n) => ({ n, x: 0, z: 0, vx: 0, vz: 0, em: true, afundando: 0 }));
  const resto = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15].sort(() => rnd() - 0.5);
  let k = 0;
  for (let fila = 0; fila < 5; fila++)
    for (let j = 0; j <= fila; j++) {
      const n = fila === 2 && j === 1 ? 8 : resto[k++];
      bolas[n].x = 0.55 + fila * R * 1.75;
      bolas[n].z = (j - fila / 2) * R * 2.02;
    }
  bolas[0].x = -0.62;
  bolas[0].z = 0;
  return { bolas, vez: 'voce', placar: { voce: 0, robo: 0 }, fase: 'mirar', encacapadasNaTacada: 0, faltaBranca: false, solo, msg: solo ? 'Treino livre: encaçape as bolas.' : 'Você começa!' };
}

function encacapar(p: Partida, b: Bola) {
  b.em = false;
  b.vx = b.vz = 0;
  b.afundando = 1;
  if (b.n === 0) p.faltaBranca = true;
  else {
    p.encacapadasNaTacada++;
    p.placar[p.vez]++;
  }
}

/** Avança a física; devolve true se ainda há bola rolando. */
export function passoFisica(p: Partida, dt: number): boolean {
  const sub = 10;
  const h = dt / sub;
  const mx = HX - R;
  const mz = HZ - R;
  for (let s = 0; s < sub; s++) {
    for (const b of p.bolas) {
      if (!b.em) continue;
      b.x += b.vx * h;
      b.z += b.vz * h;
      const v = Math.hypot(b.vx, b.vz);
      if (v > 0) {
        const dec = Math.min(v, (0.2 + v * 0.1) * h);
        b.vx -= (b.vx / v) * dec;
        b.vz -= (b.vz / v) * dec;
      }
      let caiu = false;
      let boca = false;
      for (const [px, pz, pr] of CACAPAS) {
        const d = Math.hypot(b.x - px, b.z - pz);
        if (d < pr) {
          caiu = true;
          break;
        }
        if (d < 0.12) boca = true;
      }
      if (caiu) {
        encacapar(p, b);
        continue;
      }
      if (!boca) {
        if (b.x < -mx) { b.x = -mx; b.vx = Math.abs(b.vx) * 0.78; } else if (b.x > mx) { b.x = mx; b.vx = -Math.abs(b.vx) * 0.78; }
        if (b.z < -mz) { b.z = -mz; b.vz = Math.abs(b.vz) * 0.78; } else if (b.z > mz) { b.z = mz; b.vz = -Math.abs(b.vz) * 0.78; }
      } else if (Math.abs(b.x) > HX + 0.05 || Math.abs(b.z) > HZ + 0.05) encacapar(p, b);
    }
    for (let i = 0; i < 16; i++) {
      const a = p.bolas[i];
      if (!a.em) continue;
      for (let j = i + 1; j < 16; j++) {
        const c = p.bolas[j];
        if (!c.em) continue;
        const dx = c.x - a.x;
        const dz = c.z - a.z;
        const d2 = dx * dx + dz * dz;
        if (d2 >= 4 * R * R || d2 === 0) continue;
        const d = Math.sqrt(d2);
        const nx = dx / d;
        const nz = dz / d;
        const ov = 2 * R - d;
        a.x -= (nx * ov) / 2; a.z -= (nz * ov) / 2; c.x += (nx * ov) / 2; c.z += (nz * ov) / 2;
        const rv = (c.vx - a.vx) * nx + (c.vz - a.vz) * nz;
        if (rv >= 0) continue;
        const J = (-(1 + 0.95) * rv) / 2;
        a.vx -= J * nx; a.vz -= J * nz; c.vx += J * nx; c.vz += J * nz;
      }
    }
  }
  let rolando = false;
  for (const b of p.bolas) {
    if (!b.em) continue;
    if (Math.hypot(b.vx, b.vz) < 0.01) b.vx = b.vz = 0;
    else rolando = true;
  }
  return rolando;
}

export function tacar(p: Partida, angulo: number, forca: number) {
  const c = p.bolas[0];
  const v = 0.35 + Math.max(0, Math.min(1, forca)) * 3.9;
  c.vx = Math.cos(angulo) * v;
  c.vz = Math.sin(angulo) * v;
  p.fase = 'rolando';
  p.encacapadasNaTacada = 0;
  p.faltaBranca = false;
}

function reporBranca(p: Partida) {
  const c = p.bolas[0];
  c.em = true; c.afundando = 0; c.vx = c.vz = 0;
  for (let k = 0; k < 40; k++) {
    c.x = -0.62 + (k % 5) * 0.06;
    c.z = (Math.floor(k / 5) - 2) * 0.07;
    if (p.bolas.every((b) => b === c || !b.em || Math.hypot(b.x - c.x, b.z - c.z) > 2.1 * R)) break;
  }
}

/** Quando tudo para: falta, joga de novo ou passa a vez; fim quando a mesa fica limpa. */
export function aoParar(p: Partida, nomeRobo: string) {
  const outro: Vez = p.vez === 'voce' ? 'robo' : 'voce';
  const nome = p.vez === 'voce' ? 'Você' : nomeRobo;
  if (p.faltaBranca) {
    reporBranca(p);
    p.msg = `${nome} encaçapou a branca. Falta!`;
    if (!p.solo) p.vez = outro;
  } else if (p.encacapadasNaTacada > 0) {
    p.msg = `${nome} encaçapou ${p.encacapadasNaTacada > 1 ? p.encacapadasNaTacada + ' bolas' : 'uma bola'}. Joga de novo.`;
  } else {
    p.msg = p.solo ? 'Nenhuma bola caiu.' : p.vez === 'voce' ? `Errou. Vez de ${nomeRobo}.` : `${nomeRobo} errou. Sua vez.`;
    if (!p.solo) p.vez = outro;
  }
  if (p.bolas.every((b) => b.n === 0 || !b.em)) {
    p.fase = 'fim';
    const { voce, robo } = p.placar;
    p.msg = p.solo ? 'Mesa limpa!' : voce > robo ? `Você venceu ${voce} a ${robo}!` : voce < robo ? `${nomeRobo} venceu ${robo} a ${voce}.` : `Empate em ${voce}!`;
  } else p.fase = p.vez === 'voce' ? 'mirar' : 'roboPensa';
}

/** Até onde a branca vai na mira e qual bola ela toca primeiro. */
export function tracarMira(p: Partida, a: number) {
  const c = p.bolas[0];
  const dx = Math.cos(a);
  const dz = Math.sin(a);
  const R2 = 2 * R;
  let tMin = Infinity;
  let alvo: Bola | null = null;
  for (const b of p.bolas) {
    if (!b.em || b.n === 0) continue;
    const ox = b.x - c.x;
    const oz = b.z - c.z;
    const t = ox * dx + oz * dz;
    if (t <= 0) continue;
    const perp2 = ox * ox + oz * oz - t * t;
    if (perp2 > R2 * R2) continue;
    const th = t - Math.sqrt(R2 * R2 - perp2);
    if (th < tMin) { tMin = th; alvo = b; }
  }
  const mx = HX - R;
  const mz = HZ - R;
  const tx = dx > 0 ? (mx - c.x) / dx : dx < 0 ? (-mx - c.x) / dx : Infinity;
  const tz = dz > 0 ? (mz - c.z) / dz : dz < 0 ? (-mz - c.z) / dz : Infinity;
  const tParede = Math.min(tx, tz);
  if (tParede < tMin) { tMin = tParede; alvo = null; }
  return { t: tMin, alvo, gx: c.x + dx * tMin, gz: c.z + dz * tMin };
}

function caminhoLivre(p: Partida, x0: number, z0: number, x1: number, z1: number, pular: Bola[]) {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const L = Math.hypot(dx, dz) || 1e-6;
  const ux = dx / L;
  const uz = dz / L;
  const R2 = 2 * R;
  for (const b of p.bolas) {
    if (!b.em || pular.includes(b)) continue;
    const ox = b.x - x0;
    const oz = b.z - z0;
    const t = ox * ux + oz * uz;
    if (t < 0 || t > L) continue;
    if (ox * ox + oz * oz - t * t < R2 * R2 * 0.95) return false;
  }
  return true;
}

/** Jogada do robô: a bola mais fácil para uma caçapa livre, com um pouco de imprecisão. */
export function planoRobo(p: Partida, rnd = Math.random): { angulo: number; forca: number } {
  const c = p.bolas[0];
  let melhor: { nota: number; angulo: number; forca: number } | null = null;
  for (const b of p.bolas) {
    if (!b.em || b.n === 0) continue;
    for (const [px, pz] of CACAPAS) {
      const dx = px - b.x;
      const dz = pz - b.z;
      const d = Math.hypot(dx, dz);
      const ux = dx / d;
      const uz = dz / d;
      const gx = b.x - ux * 2 * R;
      const gz = b.z - uz * 2 * R;
      const cx = gx - c.x;
      const cz = gz - c.z;
      const cd = Math.hypot(cx, cz);
      const corte = Math.acos(Math.max(-1, Math.min(1, (cx * ux + cz * uz) / cd)));
      if (corte > 1.15) continue;
      if (!caminhoLivre(p, c.x, c.z, gx, gz, [c, b]) || !caminhoLivre(p, b.x, b.z, px, pz, [b])) continue;
      const nota = corte * 1.6 + d * 0.7 + cd * 0.3;
      if (!melhor || nota < melhor.nota) melhor = { nota, angulo: Math.atan2(cz, cx), forca: Math.max(0.3, Math.min(0.85, 0.28 + (cd + d) * 0.2 + corte * 0.15)) };
    }
  }
  if (!melhor) {
    let perto: Bola | null = null;
    let pd = Infinity;
    for (const b of p.bolas) if (b.em && b.n) { const d = Math.hypot(b.x - c.x, b.z - c.z); if (d < pd) { pd = d; perto = b; } }
    melhor = { nota: 0, angulo: perto ? Math.atan2(perto.z - c.z, perto.x - c.x) : 0, forca: 0.55 };
  }
  const erro = (rnd() + rnd() + rnd() - 1.5) * 0.03;
  return { angulo: melhor.angulo + erro, forca: melhor.forca };
}
