import { describe, expect, it } from 'vitest';
import { validarNome } from './nome';

describe('nome do visitante', () => {
  it('aceita nomes comuns, com acento, e limpa os espaços', () => {
    expect(validarNome('  Ana   Júlia ')).toEqual({ ok: true, nome: 'Ana Júlia' });
    expect(validarNome('João_2')).toEqual({ ok: true, nome: 'João_2' });
    expect(validarNome('Cunha').ok).toBe(true);
    expect(validarNome('Computador').ok).toBe(true);
  });
  it('recusa nomes curtos, longos, só números ou com símbolos', () => {
    expect(validarNome('a').ok).toBe(false);
    expect(validarNome('x'.repeat(21)).ok).toBe(false);
    expect(validarNome('12345').ok).toBe(false);
    expect(validarNome('<script>').ok).toBe(false);
  });
  it('recusa palavrões, inclusive disfarçados', () => {
    expect(validarNome('P0rra').ok).toBe(false);
    expect(validarNome('fdp').ok).toBe(false);
    expect(validarNome('Mr Fuck').ok).toBe(false);
    expect(validarNome('c a r a l h o').ok).toBe(false);
  });
  it('não deixa o visitante se passar por personagem ou pela equipe', () => {
    expect(validarNome('Aurora').ok).toBe(false);
    expect(validarNome('ícaro').ok).toBe(false);
    expect(validarNome('Admin').ok).toBe(false);
  });
});
