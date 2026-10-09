/* Mercado de demonstração: séries determinísticas e fictícias (nenhum dado real, nenhuma corretora). */
export const PARES = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCAD'];
const BASE: Record<string, number> = { EURUSD: 1.0842, GBPUSD: 1.2715, USDJPY: 149.32, USDCAD: 1.3621, CARTEIRA: 100 };

/** n pontos terminando no instante t (s); a mesma entrada dá sempre a mesma série. */
export function serieSimulada(par: string, t: number, n: number, semente = 0): number[] {
  const base = BASE[par] ?? 1;
  const escala = par === 'CARTEIRA' ? 4 : base * 0.0018;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = t * 0.5 - (n - 1 - i) * 0.5 + semente * 17.3;
    const v = Math.sin(x * 0.31) * 0.6 + Math.sin(x * 0.097 + 1.3) * 1.1 + Math.sin(x * 1.7) * 0.15;
    out.push(base + v * escala + (par === 'CARTEIRA' ? x * 0.02 : 0));
  }
  return out;
}
