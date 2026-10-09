/* Clube do 21: o visitante contra a banca (crupiê robô). Fichas de brincadeira, sem valor e sem dinheiro real. */
export interface Carta {
  valor: number; // 1 = Ás, 11..13 = J, Q, K
  naipe: '♠' | '♥' | '♦' | '♣';
}
export interface Mesa21 {
  baralho: Carta[];
  voce: Carta[];
  banca: Carta[];
  fichas: number;
  fase: 'aguardando' | 'jogando' | 'fim';
  msg: string;
  resultado: 'vitoria' | 'derrota' | 'empate' | null;
}

export const APOSTA = 10;

export function pontos(cartas: Carta[]): number {
  let total = 0;
  let ases = 0;
  for (const c of cartas) {
    total += c.valor === 1 ? 11 : Math.min(c.valor, 10);
    if (c.valor === 1) ases++;
  }
  while (total > 21 && ases-- > 0) total -= 10;
  return total;
}

export const nomeCarta = (c: Carta) => ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' } as Record<number, string>)[c.valor] ?? String(c.valor);

export function novaMesa(fichas = 100): Mesa21 {
  return { baralho: [], voce: [], banca: [], fichas, fase: 'aguardando', msg: 'Toque em Nova rodada para receber as cartas.', resultado: null };
}

function terminar(m: Mesa21, r: 'vitoria' | 'derrota' | 'empate', msg: string, natural = false) {
  if (r === 'vitoria') m.fichas += natural ? 25 : 20;
  else if (r === 'empate') m.fichas += APOSTA;
  m.fase = 'fim';
  m.resultado = r;
  m.msg = msg;
}

export function distribuir(m: Mesa21, rnd = Math.random) {
  if (m.fase === 'jogando' || m.fichas < APOSTA) return;
  m.baralho = [];
  for (const naipe of ['♠', '♥', '♦', '♣'] as const) for (let valor = 1; valor <= 13; valor++) m.baralho.push({ valor, naipe });
  for (let i = 51; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [m.baralho[i], m.baralho[j]] = [m.baralho[j], m.baralho[i]];
  }
  m.fichas -= APOSTA;
  m.voce = [m.baralho.pop()!, m.baralho.pop()!];
  m.banca = [m.baralho.pop()!, m.baralho.pop()!];
  m.fase = 'jogando';
  m.resultado = null;
  m.msg = 'Sua vez: peça carta ou pare.';
  const v = pontos(m.voce);
  const b = pontos(m.banca);
  if (v === 21 || b === 21)
    terminar(m, v === b ? 'empate' : v === 21 ? 'vitoria' : 'derrota', v === b ? 'Dois 21! Empate.' : v === 21 ? '21 de primeira! Você ganhou 25 fichas.' : 'A banca fez 21 de primeira.', v === 21);
}

export function pedir(m: Mesa21) {
  if (m.fase !== 'jogando') return;
  m.voce.push(m.baralho.pop()!);
  const v = pontos(m.voce);
  if (v > 21) terminar(m, 'derrota', 'Passou de 21! A banca venceu.');
  else if (v === 21) parar(m);
}

/** A banca compra até 17. */
export function parar(m: Mesa21) {
  if (m.fase !== 'jogando') return;
  while (pontos(m.banca) < 17) m.banca.push(m.baralho.pop()!);
  const v = pontos(m.voce);
  const b = pontos(m.banca);
  terminar(m, b > 21 || v > b ? 'vitoria' : v === b ? 'empate' : 'derrota', b > 21 ? 'A banca passou de 21. Você venceu!' : v > b ? 'Você venceu!' : v === b ? 'Empate! Suas fichas voltaram.' : 'A banca venceu. Mais uma?');
}

export function recarregar(m: Mesa21) {
  if (m.fase !== 'jogando' && m.fichas < APOSTA) {
    m.fichas = 100;
    m.msg = 'Mais 100 fichas de brincadeira (sem valor) para continuar.';
  }
}
