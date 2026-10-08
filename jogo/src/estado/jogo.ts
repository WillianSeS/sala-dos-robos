import { create } from 'zustand';

export type ModoCamera = 'terceira' | 'primeira';
export type Qualidade = 'economico' | 'equilibrado' | 'ultra';
export type Painel = null | 'configuracoes' | 'ajuda';

export interface Preferencias {
  qualidade: Qualidade;
  sensibilidade: number;
  inverterY: boolean;
  mostrarFps: boolean;
}

const CHAVE = 'sala-dos-robos:preferencias';

/** Celular ou tablet: começa no Equilibrado; computador também. O Ultra fica como escolha do jogador. */
function preferenciasIniciais(): Preferencias {
  const padrao: Preferencias = { qualidade: 'equilibrado', sensibilidade: 1, inverterY: false, mostrarFps: false };
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? 'null') as Partial<Preferencias> | null;
    return { ...padrao, ...(salvo ?? {}) };
  } catch {
    return padrao;
  }
}

function salvar(p: Preferencias) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(p));
  } catch {
    /* navegação privada: as preferências valem só nesta sessão */
  }
}

interface EstadoJogo extends Preferencias {
  carregado: boolean;
  modoCamera: ModoCamera;
  painel: Painel;
  toque: boolean;
  correndoToque: boolean;
  dica: string | null;
  podeInteragir: boolean;
  portaAberta: boolean;
  versaoCena: number;
  cenaPronta: () => void;
  setCarregado: (v: boolean) => void;
  alternarCamera: () => void;
  setModoCamera: (m: ModoCamera) => void;
  setPainel: (p: Painel) => void;
  setToque: (v: boolean) => void;
  alternarCorridaToque: () => void;
  setDica: (texto: string | null, podeInteragir: boolean) => void;
  setPortaAberta: (v: boolean) => void;
  setPreferencia: <K extends keyof Preferencias>(k: K, v: Preferencias[K]) => void;
}

export const useJogo = create<EstadoJogo>((set, get) => ({
  ...preferenciasIniciais(),
  carregado: false,
  modoCamera: 'terceira',
  painel: null,
  toque: false,
  correndoToque: false,
  dica: null,
  podeInteragir: false,
  portaAberta: false,
  versaoCena: 0,
  cenaPronta: () => set({ versaoCena: get().versaoCena + 1 }),
  setCarregado: (carregado) => set({ carregado }),
  alternarCamera: () => set({ modoCamera: get().modoCamera === 'terceira' ? 'primeira' : 'terceira' }),
  setModoCamera: (modoCamera) => set({ modoCamera }),
  setPainel: (painel) => set({ painel }),
  setToque: (toque) => set({ toque }),
  alternarCorridaToque: () => set({ correndoToque: !get().correndoToque }),
  setDica: (dica, podeInteragir) => {
    if (get().dica !== dica || get().podeInteragir !== podeInteragir) set({ dica, podeInteragir });
  },
  setPortaAberta: (portaAberta) => set({ portaAberta }),
  setPreferencia: (k, v) => {
    set({ [k]: v } as Partial<EstadoJogo>);
    const { qualidade, sensibilidade, inverterY, mostrarFps } = get();
    salvar({ qualidade, sensibilidade, inverterY, mostrarFps });
  },
}));
