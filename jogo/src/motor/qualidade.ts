import type { Qualidade } from '../estado/jogo';

export interface Preset {
  nome: string;
  descricao: string;
  dpr: [number, number];
  sombras: boolean;
  tamanhoSombra: number;
  luzesExtras: boolean;
  posProcessamento: 'nenhum' | 'brilho' | 'completo';
  sala: string;
  jogador: string;
  predios: number;
  distancia: number;
}

export const PRESETS: Record<Qualidade, Preset> = {
  economico: {
    nome: 'Econômico',
    descricao: 'Iluminação simplificada, sem sombras dinâmicas, texturas 1K e menos prédios ao fundo.',
    dpr: [0.75, 1],
    sombras: false,
    tamanhoSombra: 512,
    luzesExtras: false,
    posProcessamento: 'nenhum',
    sala: 'modelos/sala.glb',
    jogador: 'modelos/jogador.glb',
    predios: 90,
    distancia: 450,
  },
  equilibrado: {
    nome: 'Equilibrado',
    descricao: 'Sombras e brilho das luzes moderados; pensado para celulares intermediários.',
    dpr: [1, 1.5],
    sombras: true,
    tamanhoSombra: 1024,
    luzesExtras: true,
    posProcessamento: 'brilho',
    sala: 'modelos/sala.glb',
    jogador: 'modelos/jogador.glb',
    predios: 220,
    distancia: 900,
  },
  ultra: {
    nome: 'Ultra',
    descricao: 'Texturas 2K, sombras mais nítidas, oclusão de ambiente e brilho cinematográfico.',
    dpr: [1, 2],
    sombras: true,
    tamanhoSombra: 2048,
    luzesExtras: true,
    posProcessamento: 'completo',
    sala: 'modelos/sala_2k.glb',
    jogador: 'modelos/jogador_2k.glb',
    predios: 380,
    distancia: 1400,
  },
};
