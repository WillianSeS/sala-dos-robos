/* Minijogo em andamento (sinuca, dardos ou 21): enquanto um deles está aberto, o personagem fica parado e a
   câmera e a interface são do jogo. */
import { create } from 'zustand';
import type { Estilo } from './danca';

export type Minijogo = null | 'sinuca' | 'dardos' | 'vinteum';

interface EstadoJogos {
  ativo: Minijogo;
  /** Resumo para a interface (placar, mensagem, força, etc.), atualizado pelos componentes 3D. */
  hud: Record<string, string | number | boolean>;
  versao: number;
  /** Dança do jogador (null = parado). */
  danca: Estilo | null;
  setDanca: (d: Estilo | null) => void;
  abrir: (j: Minijogo) => void;
  fechar: () => void;
  atualizar: (h: Record<string, string | number | boolean>) => void;
}

export const useJogos = create<EstadoJogos>((set, get) => ({
  ativo: null,
  hud: {},
  versao: 0,
  danca: null,
  setDanca: (danca) => set({ danca }),
  abrir: (ativo) => set({ ativo, hud: {} }),
  fechar: () => set({ ativo: null, hud: {} }),
  atualizar: (h) => {
    const atual = get().hud;
    for (const k of Object.keys(h)) if (atual[k] !== h[k]) return set({ hud: { ...atual, ...h }, versao: get().versao + 1 });
  },
}));

/** Pedidos da interface para o jogo 3D (lidos a cada quadro). */
export const comandosJogo = { carregar: false, soltar: false, novaPartida: false, lancar: false };
