import { describe, expect, it } from 'vitest';
import { serieSimulada } from './mercado';

describe('mercado de demonstração', () => {
  it('é determinístico e tem o tamanho pedido', () => {
    expect(serieSimulada('EURUSD', 10, 48, 2)).toEqual(serieSimulada('EURUSD', 10, 48, 2));
    expect(serieSimulada('EURUSD', 10, 48).length).toBe(48);
  });
  it('fica perto do preço de referência do par', () => {
    for (const v of serieSimulada('USDJPY', 123, 60)) expect(Math.abs(v - 149.32)).toBeLessThan(1);
  });
});
