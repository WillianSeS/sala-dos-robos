/* Estado lido pelo HUD (FPS) e pelos testes automatizados. Os testes acessam window.__jogo quando a URL tem ?teste. */
import { useJogo } from '../estado/jogo';
import { useJogos } from '../jogos/estado';

export const telemetria = {
  pos: { x: 0, y: 0, z: 0 },
  vel: { x: 0, z: 0 },
  velocidade: 0,
  dtFisica: 0,
  noChao: true,
  locomocao: 'parado' as string,
  clipe: 'idle',
  pesos: {} as Record<string, number>,
  tempos: {} as Record<string, number>,
  escalaTempo: 1,
  yawCorpo: 0,
  fase: 'livre' as string,
  grupo: { x: 0, y: 0, z: 0 },
  camera: { modo: 'terceira' as string, yaw: 0, pitch: 0, zoom: 0, dist: 0, pos: { x: 0, y: 0, z: 0 } },
  porta: { aberta: false, angulo: 0 },
  ossos: { cabeca: { x: 0, y: 0, z: 0 }, peEsq: { x: 0, y: 0, z: 0 }, peDir: { x: 0, y: 0, z: 0 } },
  fps: 0,
  quadros: 0,
  tempo: 0,
};

/** Ações que os testes podem pedir (registradas pelos componentes). */
export const acoesTeste: {
  teleportar?: (x: number, z: number, yaw?: number) => void;
  definirCamera?: (yaw: number, pitch: number) => void;
  estatisticas?: () => Record<string, number>;
  avancar?: (quadros: number, dt: number) => void;
  irPara?: (n: number) => void;
  chamarElevador?: () => void;
  vistaExterna?: (ligar: boolean) => void;
  entrar?: (nome: string) => void;
  sentarNoMaisProximo?: () => boolean;
  apertar?: (botao: string) => void;
  projetar?: (nome: string) => { x: number; y: number; frente: boolean } | null;
} = {};

/** ?gravar: o jogo só avança quando o teste manda (quadro a quadro, para gerar vídeo fluido sem GPU). */
export const modoGravacao = typeof location !== 'undefined' && new URLSearchParams(location.search).has('gravar');

export const modoTeste = typeof location !== 'undefined' && new URLSearchParams(location.search).has('teste');

if (modoTeste && typeof window !== 'undefined') {
  (window as unknown as { __jogo: unknown }).__jogo = {
    estado: () => ({ ...JSON.parse(JSON.stringify(telemetria)), ui: pickUi() }),
    teleportar: (x: number, z: number, yaw?: number) => acoesTeste.teleportar?.(x, z, yaw),
    definirCamera: (yaw: number, pitch: number) => acoesTeste.definirCamera?.(yaw, pitch),
    estatisticas: () => acoesTeste.estatisticas?.(),
    avancar: (quadros: number, dt = 1 / 30) => acoesTeste.avancar?.(quadros, dt),
    loja: useJogo,
    jogos: useJogos,
    navegar: acoesTeste,
  };
}

function pickUi() {
  const s = useJogo.getState();
  return {
    carregado: s.carregado,
    modoCamera: s.modoCamera,
    qualidade: s.qualidade,
    dica: s.dica,
    portaAberta: s.portaAberta,
    painel: s.painel,
    toque: s.toque,
    correndoToque: s.correndoToque,
    etapa: s.etapa,
    vista: s.vista,
    andar: s.andar,
    andarPronto: s.andarPronto,
    elevador: s.elevador,
    sentado: s.sentado,
    podeSentar: s.podeSentar,
    cortina: s.cortina,
    nome: s.nome,
    aviso: s.aviso,
  };
}
