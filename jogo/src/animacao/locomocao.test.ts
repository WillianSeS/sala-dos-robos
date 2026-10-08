import { describe, expect, it } from 'vitest';
import { escalaTempo, proximoEstado } from './locomocao';

describe('máquina de estados da locomoção', () => {
  it('parado -> andando -> correndo -> parado', () => {
    expect(proximoEstado('parado', 0)).toBe('parado');
    expect(proximoEstado('parado', 1.2)).toBe('andando');
    expect(proximoEstado('andando', 3)).toBe('correndo');
    expect(proximoEstado('correndo', 0.02)).toBe('parado');
  });
  it('histerese: não pisca entre andar e correr perto do limite', () => {
    expect(proximoEstado('andando', 2.0)).toBe('andando');
    expect(proximoEstado('correndo', 2.0)).toBe('correndo');
    expect(proximoEstado('andando', 0.1)).toBe('andando');
    expect(proximoEstado('parado', 0.1)).toBe('parado');
  });
  it('a velocidade do clipe acompanha a velocidade real (pé sem deslizar)', () => {
    const nat = { walk: 1.0, run: 3.0 };
    expect(escalaTempo('andando', 1.25, nat)).toBeCloseTo(1.25);
    expect(escalaTempo('correndo', 3.0, nat)).toBeCloseTo(1);
    expect(escalaTempo('parado', 0, nat)).toBe(1);
    expect(escalaTempo('andando', 10, nat)).toBe(1.6);
  });
});
