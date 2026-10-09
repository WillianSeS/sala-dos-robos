import { describe, expect, it } from 'vitest';
import { pose } from './danca';

describe('danças', () => {
  it('cada estilo mexe braços e pernas de um jeito diferente', () => {
    const b = 1.3;
    const a = pose('balanco', b);
    const d = pose('disco', b);
    const f = pose('festa', b);
    expect(f.armL).toBeGreaterThan(2); // festa: mãos para o alto
    expect(d.elbL).toBeCloseTo(1.7); // disco: mão na cintura
    expect(Math.abs(a.stepX)).toBeGreaterThan(0); // balanço: passo para o lado
  });
  it('a intensidade reduzida diminui todos os movimentos', () => {
    const cheia = pose('festa', 0.7);
    const leve = pose('festa', 0.7, 0.35);
    expect(Math.abs(leve.armL)).toBeLessThan(Math.abs(cheia.armL));
  });
});
