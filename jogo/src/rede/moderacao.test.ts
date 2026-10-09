import { describe, expect, it } from 'vitest';
import { criarLimite, moderar, nomeSeguro } from './moderacao';

describe('moderação do chat', () => {
  it('troca palavrões e esconde links, e-mails e telefones', () => {
    expect(moderar('que PORRA é essa')).toBe('que ***** é essa');
    expect(moderar('veja https://x.com/a agora')).toBe('veja [link removido] agora');
    expect(moderar('me chama em a@b.com')).toContain('[e-mail removido]');
    expect(moderar('liga 11 98765-4321')).toContain('[número removido]');
    expect(moderar('oi, tudo bem?')).toBe('oi, tudo bem?');
  });
  it('limita o tamanho e o nome', () => {
    expect(moderar('a'.repeat(300))).toHaveLength(200);
    expect(nomeSeguro('   ')).toBe('Visitante');
    expect(nomeSeguro('Ana Paula da Silva Souza Santos')).toHaveLength(24);
  });
  it('limita o ritmo de envio', () => {
    const pode = criarLimite();
    expect(pode(0)).toBe(true);
    expect(pode(500)).toBe(false);
    expect([1000, 2000, 3000, 4000].map(pode)).toEqual([true, true, true, true]);
    expect(pode(5000)).toBe(false);
    expect(pode(16_000)).toBe(true);
  });
});
