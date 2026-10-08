import { describe, expect, it } from 'vitest';
import { aplicarOlhar, limitarDistancia, LIMITES, posicaoOrbita } from './orbita';

describe('câmera', () => {
  it('arrastar para a direita gira a vista para a direita (yaw diminui)', () => {
    const r = aplicarOlhar(0, 0.2, 100, 0, 1, false, 'terceira');
    expect(r.yaw).toBeLessThan(0);
    expect(r.pitch).toBeCloseTo(0.2);
  });
  it('limita a inclinação e respeita o eixo invertido', () => {
    expect(aplicarOlhar(0, 0, 0, 100000, 1, false, 'terceira').pitch).toBe(LIMITES.terceira.pitchMax);
    expect(aplicarOlhar(0, 0, 0, -100000, 1, false, 'primeira').pitch).toBe(LIMITES.primeira.pitchMin);
    const normal = aplicarOlhar(0, 0, 0, 50, 1, false, 'primeira').pitch;
    const invertido = aplicarOlhar(0, 0, 0, 50, 1, true, 'primeira').pitch;
    expect(normal).toBeCloseTo(-invertido);
  });
  it('a órbita fica atrás do alvo, na distância pedida', () => {
    const p = posicaoOrbita({ x: 1, y: 1.5, z: 2 }, 0, 0, 3);
    expect(p).toEqual({ x: 1, y: 1.5, z: 5 });
    const q = posicaoOrbita({ x: 0, y: 0, z: 0 }, 0.7, 0.4, 2.5);
    expect(Math.hypot(q.x, q.y, q.z)).toBeCloseTo(2.5);
  });
  it('zoom limitado', () => {
    expect(limitarDistancia(100)).toBe(LIMITES.terceira.distMax);
    expect(limitarDistancia(0)).toBe(LIMITES.terceira.distMin);
  });
});
