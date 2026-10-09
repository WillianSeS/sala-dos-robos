import { describe, expect, it } from 'vitest';
import { pontuar } from './dardos';
import { distribuir, novaMesa, parar, pedir, pontos, recarregar } from './vinteum';
import { sorteador } from './sinuca';

describe('21', () => {
  it('ás vale 11 ou 1', () => {
    expect(pontos([{ valor: 1, naipe: '♠' }, { valor: 13, naipe: '♥' }])).toBe(21);
    expect(pontos([{ valor: 1, naipe: '♠' }, { valor: 1, naipe: '♥' }, { valor: 9, naipe: '♣' }])).toBe(21);
    expect(pontos([{ valor: 10, naipe: '♠' }, { valor: 5, naipe: '♥' }, { valor: 9, naipe: '♣' }])).toBe(24);
  });
  it('rodada completa: aposta de 10 fichas, banca compra até 17 e paga a vitória', () => {
    for (let s = 1; s < 40; s++) {
      const m = novaMesa();
      distribuir(m, sorteador(s));
      expect(m.voce).toHaveLength(2);
      if (m.fase === 'jogando') {
        parar(m);
        expect(pontos(m.banca)).toBeGreaterThanOrEqual(17);
      }
      expect(m.fase).toBe('fim');
      expect([90, 100, 110, 115]).toContain(m.fichas);
    }
  });
  it('estourar 21 é derrota; sem fichas dá para recarregar fichas de brincadeira', () => {
    const m = novaMesa(10);
    distribuir(m, sorteador(7));
    while (m.fase === 'jogando') pedir(m);
    if (m.resultado === 'derrota') {
      expect(m.fichas).toBe(0);
      recarregar(m);
      expect(m.fichas).toBe(100);
    }
  });
});

describe('dardos', () => {
  it('centro, anel, triplo e duplo', () => {
    expect(pontuar(0, 0).pontos).toBe(50);
    expect(pontuar(0, 0.06).pontos).toBe(25);
    expect(pontuar(0, 0.6)).toMatchObject({ base: 20, mult: 3, pontos: 60 });
    expect(pontuar(0, 0.97)).toMatchObject({ base: 20, mult: 2 });
    expect(pontuar(0, 1.2).pontos).toBe(0);
    expect(pontuar(0.5, 0).base).toBe(6); // à direita do 20 fica o 6
  });
});
