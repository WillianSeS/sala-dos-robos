/* Máquina de estados do elevador (pura, testada no Vitest).
   aberto -> fechando -> fechado -> (viajando -> chegando) -> abrindo -> aberto
   O destino só abre as portas quando o ambiente do andar já carregou. */
import type { NumeroAndar } from './andares';

export type FaseElevador = 'fechado' | 'abrindo' | 'aberto' | 'fechando' | 'viajando';

export interface Elevador {
  fase: FaseElevador;
  andar: number; // andar onde a cabine está (0 = térreo, durante a entrada)
  destino: NumeroAndar | null;
  t: number; // tempo na fase atual (s)
  portas: number; // abertura das portas: 0 fechada, 1 aberta
  indicador: number; // número mostrado nos visores
  ocioso: number; // tempo aberto sem ninguém na porta
}

export const TEMPO_PORTA = 1.1;
export const ESPERA_ABERTA = 5;

export const duracaoViagem = (de: number, para: number) => Math.min(6, 1.6 + 0.45 * Math.abs(para - de) ** 0.6 * 2);

export function novoElevador(andar: number): Elevador {
  return { fase: 'fechado', andar, destino: null, t: 0, portas: 0, indicador: andar, ocioso: 0 };
}

export interface Entradas {
  abrir?: boolean; // botão de chamada, botão "abrir" ou sensor da porta
  fechar?: boolean;
  escolher?: NumeroAndar; // botão de andar no painel
  presenca: boolean; // alguém na porta (não fecha em cima da pessoa)
  aBordo?: boolean; // o jogador está dentro da cabine (sem ele, a viagem é cancelada)
  carregado: (n: NumeroAndar) => boolean; // o ambiente do andar já está na cena?
}

export function passo(e: Elevador, dt: number, ent: Entradas): Elevador {
  const s = { ...e, t: e.t + dt };
  if (ent.escolher !== undefined && s.fase !== 'viajando') {
    if (ent.escolher === s.andar) {
      if (s.fase !== 'aberto') return { ...s, fase: 'abrindo', t: 0, destino: null };
    } else {
      s.destino = ent.escolher;
      if (s.fase === 'aberto' || s.fase === 'abrindo') return { ...s, fase: 'fechando', t: 0 };
    }
  }
  switch (s.fase) {
    case 'fechado':
      if (s.destino !== null && ent.aBordo === false) return { ...s, destino: null };
      if (s.destino !== null) return { ...s, fase: 'viajando', t: 0 };
      if (ent.abrir) return { ...s, fase: 'abrindo', t: 0 };
      return s;
    case 'abrindo':
      s.portas = Math.min(1, s.portas + dt / TEMPO_PORTA);
      if (s.portas >= 1) return { ...s, fase: 'aberto', t: 0, ocioso: 0 };
      return s;
    case 'aberto':
      s.ocioso = ent.presenca ? 0 : s.ocioso + dt;
      // com alguém na porta, nada fecha (nem o botão, nem a viagem pedida): espera a passagem ficar livre
      if (!ent.presenca && (ent.fechar || s.destino !== null || s.ocioso > ESPERA_ABERTA)) return { ...s, fase: 'fechando', t: 0 };
      return s;
    case 'fechando':
      if (ent.abrir) return { ...s, fase: 'abrindo', t: 0, destino: null };
      if (ent.presenca) return { ...s, fase: 'abrindo', t: 0 }; // sensor da porta: reabre e mantém o destino
      s.portas = Math.max(0, s.portas - dt / TEMPO_PORTA);
      if (s.portas <= 0) return { ...s, fase: 'fechado', t: 0 };
      return s;
    case 'viajando': {
      const dest = s.destino as NumeroAndar;
      const total = duracaoViagem(s.andar, dest);
      const k = Math.min(1, s.t / total);
      // o visor conta os andares durante a viagem
      s.indicador = Math.round(s.andar + (dest - s.andar) * (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2));
      if (k >= 1 && ent.carregado(dest)) return { ...s, fase: 'abrindo', t: 0, andar: dest, indicador: dest, destino: null };
      return s;
    }
  }
}

/** Direção da viagem para a seta dos visores. */
export const seta = (e: Elevador) => (e.fase !== 'viajando' || e.destino === null ? '' : e.destino > e.andar ? '▲' : '▼');
