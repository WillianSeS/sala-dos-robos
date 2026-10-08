import { describe, expect, it } from 'vitest';
import {
  anguloDe,
  aproximar,
  diferencaAngular,
  direcaoMundo,
  eixoFinal,
  eixoTeclado,
  girarPara,
  VEL_ANDAR,
  VEL_CORRER,
  velocidadeAlvo,
} from './movimento';

const teclas = (...t: string[]) => new Set(t);

describe('eixos de entrada', () => {
  it('WASD e setas viram eixos', () => {
    expect(eixoTeclado(teclas('KeyW'))).toEqual({ x: 0, y: 1 });
    expect(eixoTeclado(teclas('ArrowDown'))).toEqual({ x: 0, y: -1 });
    expect(eixoTeclado(teclas('KeyA', 'KeyD'))).toEqual({ x: 0, y: 0 });
    expect(eixoTeclado(teclas('KeyD'))).toEqual({ x: 1, y: 0 });
  });
  it('diagonal do teclado é normalizada (não anda mais rápido na diagonal)', () => {
    const e = eixoFinal(teclas('KeyW', 'KeyD'), { x: 0, y: 0 });
    expect(Math.hypot(e.x, e.y)).toBeCloseTo(1, 6);
    expect(e.forca).toBe(1);
  });
  it('joystick vence o teclado e respeita a zona morta', () => {
    expect(eixoFinal(teclas('KeyW'), { x: 0.05, y: 0.05 }).y).toBe(1);
    const j = eixoFinal(teclas('KeyW'), { x: 0.5, y: 0 });
    expect(j.x).toBeCloseTo(1);
    expect(j.forca).toBeGreaterThan(0.3);
    expect(j.forca).toBeLessThan(0.5);
  });
});

describe('direção no mundo', () => {
  it('com a câmera em yaw 0, frente é -Z e direita é +X', () => {
    const f = direcaoMundo({ x: 0, y: 1 }, 0);
    expect(f.x).toBeCloseTo(0);
    expect(f.z).toBeCloseTo(-1);
    const d = direcaoMundo({ x: 1, y: 0 }, 0);
    expect(d.x).toBeCloseTo(1);
    expect(d.z).toBeCloseTo(0);
  });
  it('gira junto com a câmera', () => {
    const f = direcaoMundo({ x: 0, y: 1 }, Math.PI / 2);
    expect(f.x).toBeCloseTo(-1);
    expect(f.z).toBeCloseTo(0);
  });
});

describe('velocidades', () => {
  it('andar e correr têm velocidades realistas', () => {
    expect(velocidadeAlvo(1, false)).toBe(VEL_ANDAR);
    expect(velocidadeAlvo(1, true)).toBe(VEL_CORRER);
    expect(velocidadeAlvo(0, true)).toBe(0);
    expect(VEL_ANDAR).toBeGreaterThan(1);
    expect(VEL_ANDAR).toBeLessThan(1.6);
    expect(VEL_CORRER).toBeGreaterThan(2.5);
  });
  it('aproximação exponencial não depende da taxa de quadros', () => {
    let a = 0;
    for (let i = 0; i < 60; i++) a = aproximar(a, 1, 8, 1 / 60);
    let b = 0;
    for (let i = 0; i < 30; i++) b = aproximar(b, 1, 8, 1 / 30);
    expect(a).toBeCloseTo(b, 6);
  });
});

describe('ângulos', () => {
  it('o personagem olha para a direção do movimento', () => {
    expect(anguloDe(0, 1)).toBeCloseTo(0);
    expect(anguloDe(0, -1)).toBeCloseTo(Math.PI);
    expect(anguloDe(1, 0)).toBeCloseTo(Math.PI / 2);
  });
  it('gira pelo menor caminho', () => {
    expect(diferencaAngular(3, -3)).toBeCloseTo(2 * Math.PI - 6);
    const g = girarPara(3.1, -3.1, 100, 1);
    expect(Math.abs(diferencaAngular(g, -3.1))).toBeLessThan(1e-6);
  });
});
