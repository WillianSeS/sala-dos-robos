import { describe, expect, it } from 'vitest';
import { aoParar, novaPartida, passoFisica, planoRobo, sorteador, tacar, tracarMira } from './sinuca';

const rodarAteParar = (p: ReturnType<typeof novaPartida>) => {
  for (let i = 0; i < 2000 && passoFisica(p, 1 / 60); i++);
};

describe('sinuca', () => {
  it('arma o triângulo com 15 bolas e a branca atrás', () => {
    const p = novaPartida(false, sorteador(1));
    expect(p.bolas.filter((b) => b.em)).toHaveLength(16);
    expect(p.bolas[0].x).toBeLessThan(0);
    expect(p.bolas.slice(1).every((b) => b.x > 0.5)).toBe(true);
  });
  it('a tacada espalha as bolas, que param sozinhas (atrito)', () => {
    const p = novaPartida(false, sorteador(2));
    tacar(p, 0, 1);
    rodarAteParar(p);
    expect(p.bolas.every((b) => !b.em || (b.vx === 0 && b.vz === 0))).toBe(true);
    expect(p.bolas[0].x).not.toBeCloseTo(-0.62, 2);
  });
  it('bola na boca da caçapa cai e conta ponto para quem tacou', () => {
    const p = novaPartida(false, sorteador(3));
    for (const b of p.bolas) if (b.n > 1) b.em = false;
    p.bolas[1].x = 1.0; p.bolas[1].z = -0.48; // perto da caçapa do canto
    p.bolas[0].x = 0.6; p.bolas[0].z = -0.08;
    const mira = Math.atan2(-0.48 - -0.08 + 0.02, 1.0 - 0.6 - 0.04);
    tacar(p, mira, 0.6);
    rodarAteParar(p);
    aoParar(p, 'Orion');
    expect(p.bolas[1].em).toBe(false);
    expect(p.placar.voce).toBe(1);
    expect(p.fase).toBe('fim'); // mesa limpa
  });
  it('a mira encontra a primeira bola no caminho', () => {
    const p = novaPartida(false, sorteador(4));
    const m = tracarMira(p, 0);
    expect(m.alvo).not.toBeNull();
    expect(m.gx).toBeGreaterThan(0.4);
  });
  it('o robô sempre devolve uma jogada válida', () => {
    const p = novaPartida(false, sorteador(5));
    const j = planoRobo(p, sorteador(6));
    expect(Number.isFinite(j.angulo)).toBe(true);
    expect(j.forca).toBeGreaterThan(0.2);
  });
});
