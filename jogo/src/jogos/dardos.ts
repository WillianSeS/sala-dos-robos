/* Dardos: alvo oficial (20 setores, duplo, triplo, anel central e centro), 9 dardos por partida e troféus
   digitais guardados no aparelho. Portado do jogo antigo (src/77d_darts.js). */
export const NUMEROS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
export const DARDOS_POR_PARTIDA = 9;

export interface Acerto {
  pontos: number;
  base: number;
  mult: number;
  rotulo: string;
  centro?: boolean;
}

/** x, y no alvo normalizado (raio 1 = borda do duplo), y para cima. */
export function pontuar(x: number, y: number): Acerto {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { pontos: 0, base: 0, mult: 0, rotulo: 'Fora do alvo' };
  const r = Math.hypot(x, y);
  if (r > 1) return { pontos: 0, base: 0, mult: 0, rotulo: 'Fora do alvo' };
  if (r < 0.0374) return { pontos: 50, base: 25, mult: 2, rotulo: 'Centro! 50 pontos', centro: true };
  if (r < 0.0935) return { pontos: 25, base: 25, mult: 1, rotulo: 'Anel central · 25 pontos' };
  const ang = (Math.atan2(x, y) + Math.PI * 2 + Math.PI / 20) % (Math.PI * 2);
  const base = NUMEROS[Math.floor(ang / (Math.PI / 10)) % 20];
  const mult = r >= 0.953 ? 2 : r >= 0.582 && r <= 0.629 ? 3 : 1;
  return { pontos: base * mult, base, mult, rotulo: `${mult === 3 ? 'Triplo ' : mult === 2 ? 'Duplo ' : ''}${base} · ${base * mult} pontos` };
}

export const TROFEUS = [
  { id: 'bronze', pontos: 80, icone: '🥉', nome: 'Troféu de bronze' },
  { id: 'prata', pontos: 160, icone: '🥈', nome: 'Troféu de prata' },
  { id: 'ouro', pontos: 240, icone: '🏆', nome: 'Troféu de ouro' },
  { id: 'centro', pontos: null, icone: '🎯', nome: 'Mestre do centro' },
] as const;

/** Mira com tremor: quanto mais tempo segurando, mais estável (até 1,2 s), depois volta a tremer. */
export function tremor(t: number, segurando: number) {
  const firmeza = segurando <= 0 ? 0 : segurando < 1.2 ? segurando / 1.2 : Math.max(0, 1 - (segurando - 1.2) / 1.5);
  const amp = 0.16 * (1 - 0.75 * firmeza);
  return { x: Math.sin(t * 2.3) * amp + Math.sin(t * 5.1) * amp * 0.35, y: Math.cos(t * 1.9) * amp + Math.sin(t * 4.3) * amp * 0.3 };
}
