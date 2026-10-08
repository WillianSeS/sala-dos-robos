import { describe, expect, it } from 'vitest';
import { boasVindas40, PESSOAS40, resultadoSimulado } from './equipe40';

describe('Fase 3: equipe do escritório', () => {
  it('tem Aurora e dez traders distintos', () => {
    expect(PESSOAS40.filter((p) => p.funcao === 'aurora')).toHaveLength(1);
    expect(PESSOAS40.filter((p) => p.funcao === 'trader')).toHaveLength(10);
    expect(new Set(PESSOAS40.map((p) => p.id)).size).toBe(11);
  });
  it('exibe resultados limitados e rotulados como simulação', () => {
    for (let i = 0; i < 10; i++) for (const t of [0, 30, 300, 3000]) {
      const v = resultadoSimulado(i, t);
      expect(Number.isFinite(v)).toBe(true);
      expect(Math.abs(v)).toBeLessThanOrEqual(43);
    }
  });
  it('recepciona pelo nome sem incluir conteúdo financeiro real', () => {
    expect(boasVindas40('  Ana  ')).toContain('Ana');
    expect(boasVindas40('')).toContain('visitante');
    expect(boasVindas40('X'.repeat(50))).not.toContain('X'.repeat(25));
  });
});
