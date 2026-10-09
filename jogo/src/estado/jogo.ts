import { create } from 'zustand';
import { useJogos } from '../jogos/estado';
import { TECLAS_PADRAO, type MapaTeclas } from '../controles/teclas';
import type { NumeroAndar } from '../mundo/andares';
import type { FaseElevador } from '../mundo/elevador';

export type ModoCamera = 'terceira' | 'primeira';
export type Qualidade = 'economico' | 'equilibrado' | 'ultra';
export type Painel = null | 'menu' | 'configuracoes' | 'ajuda' | 'mapa' | 'elevador' | 'musica' | 'cardapio' | 'conversar' | 'amigos';
/** entrada: fachada com o nome do visitante · chegando: câmera voando até a porta · jogo: dentro do prédio */
export type Etapa = 'entrada' | 'chegando' | 'jogo';
export type Vista = 'normal' | 'aerea' | 'externa';

export interface Preferencias {
  qualidade: Qualidade;
  sensibilidade: number;
  inverterY: boolean;
  mostrarFps: boolean;
  nome: string;
  /** Privacidade: mostrar o nome sobre o avatar. */
  mostrarNome: boolean;
  teclas: MapaTeclas;
}

export interface ElevadorUi {
  fase: FaseElevador;
  andar: number;
  indicador: number;
  destino: NumeroAndar | null;
}

const CHAVE = 'sala-dos-robos:preferencias';

/** Celular ou computador: começa no Equilibrado. O Ultra fica como escolha do jogador. */
function preferenciasIniciais(): Preferencias {
  const padrao: Preferencias = { qualidade: 'equilibrado', sensibilidade: 1, inverterY: false, mostrarFps: false, nome: '', mostrarNome: true, teclas: TECLAS_PADRAO };
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? 'null') as Partial<Preferencias> | null;
    return { ...padrao, ...(salvo ?? {}), teclas: { ...TECLAS_PADRAO, ...(salvo?.teclas ?? {}) } };
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
  etapa: Etapa;
  vista: Vista;
  andar: NumeroAndar;
  andarPronto: NumeroAndar | null;
  elevador: ElevadorUi;
  cortina: boolean;
  aviso: string | null;
  modoCamera: ModoCamera;
  painel: Painel;
  toque: boolean;
  correndoToque: boolean;
  dica: string | null;
  podeInteragir: boolean;
  podeSentar: boolean;
  sentado: boolean;
  portaAberta: boolean;
  versaoCena: number;
  pontoReflexo: [number, number, number];
  cenaPronta: (ponto?: [number, number, number]) => void;
  setCarregado: (v: boolean) => void;
  setEtapa: (e: Etapa) => void;
  setVista: (v: Vista) => void;
  setAndar: (n: NumeroAndar) => void;
  setAndarPronto: (n: NumeroAndar | null) => void;
  setElevador: (e: ElevadorUi) => void;
  setCortina: (v: boolean) => void;
  avisar: (texto: string | null) => void;
  alternarCamera: () => void;
  setModoCamera: (m: ModoCamera) => void;
  setPainel: (p: Painel) => void;
  setToque: (v: boolean) => void;
  alternarCorridaToque: () => void;
  setDica: (texto: string | null, podeInteragir: boolean) => void;
  setPodeSentar: (v: boolean) => void;
  setSentado: (v: boolean) => void;
  setPortaAberta: (v: boolean) => void;
  setPreferencia: <K extends keyof Preferencias>(k: K, v: Preferencias[K]) => void;
}

let avisoTimer: ReturnType<typeof setTimeout> | undefined;

export const useJogo = create<EstadoJogo>((set, get) => ({
  ...preferenciasIniciais(),
  carregado: false,
  etapa: 'entrada',
  vista: 'normal',
  andar: 40,
  andarPronto: null,
  elevador: { fase: 'fechado', andar: 40, indicador: 40, destino: null },
  cortina: false,
  aviso: null,
  modoCamera: 'terceira',
  painel: null,
  toque: false,
  correndoToque: false,
  dica: null,
  podeInteragir: false,
  podeSentar: false,
  sentado: false,
  portaAberta: false,
  versaoCena: 0,
  pontoReflexo: [0, 1.55, 0],
  cenaPronta: (ponto) => set({ versaoCena: get().versaoCena + 1, ...(ponto ? { pontoReflexo: ponto } : {}) }),
  setCarregado: (carregado) => set({ carregado }),
  setEtapa: (etapa) => set({ etapa }),
  setVista: (vista) => set({ vista }),
  setAndar: (andar) => set({ andar }),
  setAndarPronto: (andarPronto) => set({ andarPronto }),
  setElevador: (elevador) => {
    const a = get().elevador;
    if (a.fase !== elevador.fase || a.andar !== elevador.andar || a.indicador !== elevador.indicador || a.destino !== elevador.destino) set({ elevador });
  },
  setCortina: (cortina) => set({ cortina }),
  avisar: (aviso) => {
    clearTimeout(avisoTimer);
    set({ aviso });
    if (aviso) avisoTimer = setTimeout(() => set({ aviso: null }), 3500);
  },
  alternarCamera: () => set({ modoCamera: get().modoCamera === 'terceira' ? 'primeira' : 'terceira', vista: get().vista === 'aerea' ? 'normal' : get().vista }),
  setModoCamera: (modoCamera) => set({ modoCamera }),
  setPainel: (painel) => set({ painel }),
  setToque: (toque) => set({ toque }),
  alternarCorridaToque: () => set({ correndoToque: !get().correndoToque }),
  setDica: (dica, podeInteragir) => {
    if (get().dica !== dica || get().podeInteragir !== podeInteragir) set({ dica, podeInteragir });
  },
  setPodeSentar: (podeSentar) => {
    if (get().podeSentar !== podeSentar) set({ podeSentar });
  },
  setSentado: (sentado) => set({ sentado }),
  setPortaAberta: (portaAberta) => set({ portaAberta }),
  setPreferencia: (k, v) => {
    set({ [k]: v } as Partial<EstadoJogo>);
    const { qualidade, sensibilidade, inverterY, mostrarFps, nome, mostrarNome, teclas } = get();
    salvar({ qualidade, sensibilidade, inverterY, mostrarFps, nome, mostrarNome, teclas });
  },
}));

/** O jogador pode andar e olhar? (nenhum painel aberto, dentro do prédio, sem transição em curso) */
export function controleLivre() {
  const s = useJogo.getState();
  return !s.painel && s.etapa === 'jogo' && s.vista !== 'externa' && !s.cortina && !useJogos.getState().ativo;
}
