import { describe, expect, it } from 'vitest';
import { novoElevador, passo, TEMPO_PORTA, type Elevador, type Entradas } from './elevador';

const base: Entradas = { presenca: false, carregado: () => true };
function rodar(e: Elevador, segundos: number, ent: Partial<Entradas> = {}, dt = 1 / 30) {
  let s = e;
  for (let t = 0; t < segundos; t += dt) s = passo(s, dt, { ...base, ...ent });
  return s;
}

describe('elevador', () => {
  it('abre com o botão de chamada e fecha sozinho depois de um tempo sem ninguém', () => {
    let e = passo(novoElevador(40), 0.016, { ...base, abrir: true });
    expect(e.fase).toBe('abrindo');
    e = rodar(e, TEMPO_PORTA + 0.1);
    expect(e.fase).toBe('aberto');
    expect(e.portas).toBe(1);
    e = rodar(e, 6 + TEMPO_PORTA + 0.2);
    expect(e.fase).toBe('fechado');
    expect(e.portas).toBe(0);
  });
  it('não fecha em cima de quem está na porta (sensor)', () => {
    let e = rodar(passo(novoElevador(40), 0.016, { ...base, abrir: true }), 2);
    e = rodar(e, 10, { presenca: true });
    expect(e.fase).toBe('aberto');
  });
  it('escolher um andar fecha, viaja, conta os andares e abre no destino', () => {
    let e = rodar(passo(novoElevador(40), 0.016, { ...base, abrir: true }), 2);
    e = passo(e, 0.016, { ...base, escolher: 44 });
    expect(e.fase).toBe('fechando');
    e = rodar(e, TEMPO_PORTA + 0.05);
    expect(e.fase).toBe('viajando');
    const meio = rodar(e, 1.2);
    expect(meio.indicador).toBeGreaterThanOrEqual(40);
    expect(meio.indicador).toBeLessThanOrEqual(44);
    e = rodar(e, 8);
    expect(['abrindo', 'aberto']).toContain(e.fase);
    expect(e.andar).toBe(44);
    expect(e.indicador).toBe(44);
  });
  it('espera o ambiente do destino carregar antes de abrir', () => {
    let e = passo(novoElevador(0), 0.016, { ...base, escolher: 40 });
    e = rodar(e, 10, { carregado: () => false });
    expect(e.fase).toBe('viajando');
    e = rodar(e, 0.1);
    expect(e.fase).toBe('abrindo');
    expect(e.andar).toBe(40);
  });
  it('com destino escolhido, espera a porta ficar livre antes de fechar', () => {
    let e = rodar(passo(novoElevador(40), 0.016, { ...base, abrir: true }), 2);
    e = passo(e, 0.016, { ...base, escolher: 42, presenca: true });
    e = rodar(e, 3, { presenca: true });
    expect(['aberto', 'abrindo']).toContain(e.fase);
    expect(e.destino).toBe(42);
    e = rodar(e, TEMPO_PORTA + 0.3);
    expect(e.fase).toBe('viajando');
  });
  it('cancela a viagem se o jogador saiu da cabine', () => {
    const e = passo(novoElevador(40), 0.016, { ...base, escolher: 43, aBordo: false });
    expect(e.fase).toBe('fechado');
    expect(e.destino).toBeNull();
  });
  it('escolher o andar atual só abre as portas', () => {
    const e = passo(novoElevador(42), 0.016, { ...base, escolher: 42 });
    expect(e.fase).toBe('abrindo');
    expect(e.destino).toBeNull();
  });
});
