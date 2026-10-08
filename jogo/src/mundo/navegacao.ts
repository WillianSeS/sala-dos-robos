/* Fluxos de navegação: entrada no prédio, atalhos do mapa (sempre pelo elevador), chamar o elevador pelo menu,
   vista externa e volta ao início. As transições usam a cortina (escurecimento) para esconder os cortes. */
import { useJogo } from '../estado/jogo';
import { INFO_ANDAR, type NumeroAndar } from './andares';
import { comandosElevador, comandosJogador, dentroDaCabine, PONTO_CABINE, PONTO_PAINEL } from './comandos';
import { telemetria } from '../testes/telemetria';

const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
let ocupado = false;

/** Escurece a tela, executa a troca e clareia de novo. */
async function comCortina(troca: () => void | Promise<void>, escuro = 450) {
  if (ocupado) return false;
  ocupado = true;
  const jogo = useJogo.getState();
  try {
    jogo.setCortina(true);
    await esperar(escuro);
    await troca();
    await esperar(250);
  } finally {
    useJogo.getState().setCortina(false);
    ocupado = false;
  }
  return true;
}

/** ENTRAR: a câmera voa até a porta (componente Exterior) e chama chegarAoPredio no fim. */
export function entrar(nome: string) {
  const jogo = useJogo.getState();
  jogo.setPreferencia('nome', nome);
  jogo.setPainel(null);
  jogo.setEtapa('chegando');
}

/** Depois da porta: o visitante já está na cabine, que sobe do térreo ao 40º andar e abre na recepção. */
export function chegarAoPredio() {
  return comCortina(async () => {
    const jogo = useJogo.getState();
    comandosJogador.partida = PONTO_CABINE;
    comandosJogador.teleporte = PONTO_CABINE;
    comandosElevador.estado = null;
    comandosElevador.forcar = { andar: 0, destino: 40 };
    jogo.setAndar(40);
    jogo.setVista('normal');
    jogo.setModoCamera('terceira');
    jogo.setEtapa('jogo');
    await esperar(300);
  }, 650);
}

/** Atalho para outro andar: leva o jogador à cabine, fecha as portas e viaja (o destino carrega durante a subida). */
export function irPara(n: NumeroAndar) {
  const jogo = useJogo.getState();
  if (jogo.etapa !== 'jogo') return;
  jogo.setPainel(null);
  if (jogo.vista === 'externa') jogo.setVista('normal');
  if (n === jogo.elevador.andar && n === jogo.andar) {
    jogo.avisar(`Você já está no ${n}º andar · ${INFO_ANDAR[n].nome}`);
    return;
  }
  const p = telemetria.pos;
  if (dentroDaCabine(p.x, p.z)) {
    // já está na cabine: é só apertar o botão
    comandosElevador.escolher = n;
    return;
  }
  void comCortina(() => {
    comandosJogador.teleporte = PONTO_CABINE;
    comandosElevador.forcar = { andar: useJogo.getState().elevador.andar, destino: n };
  });
}

/** Menu "Elevador": coloca o jogador na cabine, de frente para o painel, com as portas abertas. */
export function chamarElevador() {
  const jogo = useJogo.getState();
  if (jogo.etapa !== 'jogo') return;
  jogo.setPainel(null);
  if (jogo.vista === 'externa') jogo.setVista('normal');
  void comCortina(() => {
    comandosJogador.teleporte = PONTO_PAINEL;
    comandosElevador.forcar = { andar: useJogo.getState().elevador.andar, destino: null, aberto: true };
    setTimeout(() => useJogo.getState().setPainel('elevador'), 300);
  });
}

export function vistaExterna(ligar: boolean) {
  const jogo = useJogo.getState();
  if (jogo.etapa !== 'jogo') return;
  jogo.setPainel(null);
  void comCortina(() => {
    useJogo.getState().setVista(ligar ? 'externa' : 'normal');
  }, 400);
}

/** Menu "Início": volta à fachada (tela de entrada). */
export function voltarAoInicio() {
  const jogo = useJogo.getState();
  jogo.setPainel(null);
  void comCortina(() => {
    const j = useJogo.getState();
    j.setVista('normal');
    j.setEtapa('entrada');
    j.setAndarPronto(null);
    comandosJogador.partida = null;
    comandosJogador.ultima = null;
  }, 500);
}
