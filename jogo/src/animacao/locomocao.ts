/* Máquina de estados da locomoção: parado, andando e correndo, com histerese para não piscar entre estados. */

export type EstadoLocomocao = 'parado' | 'andando' | 'correndo';

export const CLIPE: Record<EstadoLocomocao, string> = { parado: 'idle', andando: 'walk', correndo: 'run' };

export const LIMIARES = {
  comecarAndar: 0.18,
  pararAndar: 0.08,
  comecarCorrer: 2.15,
  pararCorrer: 1.85,
};

export function proximoEstado(atual: EstadoLocomocao, velocidade: number): EstadoLocomocao {
  const L = LIMIARES;
  switch (atual) {
    case 'parado':
      if (velocidade > L.comecarCorrer) return 'correndo';
      return velocidade > L.comecarAndar ? 'andando' : 'parado';
    case 'andando':
      if (velocidade > L.comecarCorrer) return 'correndo';
      return velocidade < L.pararAndar ? 'parado' : 'andando';
    case 'correndo':
      if (velocidade < L.pararAndar) return 'parado';
      return velocidade < L.pararCorrer ? 'andando' : 'correndo';
  }
}

export interface Naturais {
  walk: number;
  run: number;
}

/** Velocidade do clipe = velocidade real / velocidade natural da passada: o pé de apoio não desliza. */
export function escalaTempo(estado: EstadoLocomocao, velocidade: number, nat: Naturais): number {
  if (estado === 'andando') return Math.min(1.6, Math.max(0.5, velocidade / nat.walk));
  if (estado === 'correndo') return Math.min(1.4, Math.max(0.7, velocidade / nat.run));
  return 1;
}

/** Tempo de transição entre clipes (segundos). */
export const transicao = (de: EstadoLocomocao, para: EstadoLocomocao) => (de === 'correndo' || para === 'correndo' ? 0.22 : 0.28);
