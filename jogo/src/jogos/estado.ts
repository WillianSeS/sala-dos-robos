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
  /** Item na mão do jogador e consumo em andamento (0..1). */
  naMao: string | null;
  consumo: number;
  consumindo: boolean;
  setNaMao: (id: string | null) => void;
  setConsumo: (c: number, consumindo: boolean) => void;
  /** Cardápio aberto: onde (bar, copa ou geladeira) e quem atende. */
  cardapio: null | { onde: 'bar' | 'copa' | 'geladeira'; atendente?: string };
  setCardapio: (c: EstadoJogos['cardapio']) => void;
  /** Pedido sendo preparado no bar. */
  pedido: null | { id: string; prontoEm: number };
  setPedido: (p: EstadoJogos['pedido']) => void;
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
  naMao: null,
  consumo: 0,
  consumindo: false,
  setNaMao: (naMao) => set({ naMao, consumo: 0, consumindo: false }),
  setConsumo: (consumo, consumindo) => set({ consumo, consumindo }),
  cardapio: null,
  setCardapio: (cardapio) => set({ cardapio }),
  pedido: null,
  setPedido: (pedido) => set({ pedido }),
  abrir: (ativo) => set({ ativo, hud: {} }),
  fechar: () => set({ ativo: null, hud: {} }),
  atualizar: (h) => {
    const atual = get().hud;
    for (const k of Object.keys(h)) if (atual[k] !== h[k]) return set({ hud: { ...atual, ...h }, versao: get().versao + 1 });
  },
}));

/** Pedidos da interface para o jogo 3D (lidos a cada quadro). */
export const comandosJogo = { carregar: false, soltar: false, novaPartida: false, lancar: false };
