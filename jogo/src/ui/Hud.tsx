/* HUD: marca e andar atual, botões (menu, mapa, vistas e câmera), dica de interação, viagem do elevador,
   avisos curtos, FPS e a barra da vista externa. */
import { useProgress } from '@react-three/drei';
import { useEffect, useState } from 'react';
import { rotuloTecla } from '../controles/teclas';
import { useJogo } from '../estado/jogo';
import { INFO_ANDAR, type NumeroAndar } from '../mundo/andares';
import { vistaExterna } from '../mundo/navegacao';
import { telemetria } from '../testes/telemetria';

function Fps() {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFps(telemetria.fps), 500);
    return () => clearInterval(id);
  }, []);
  return <div className="fps" data-testid="fps">{fps} FPS</div>;
}

/** Faixa no topo durante a viagem: seta, andar no visor e destino (com o progresso se o destino ainda carrega). */
function Viagem() {
  const e = useJogo((s) => s.elevador);
  const andarPronto = useJogo((s) => s.andarPronto);
  const { progress } = useProgress();
  if (e.fase !== 'viajando' || e.destino === null) return null;
  const info = INFO_ANDAR[e.destino];
  const sobe = e.destino > e.andar;
  return (
    <div className="viagem" role="status" data-testid="viagem">
      <span className="viagem-seta" aria-hidden>{sobe ? '▲' : '▼'}</span>
      <strong>{e.indicador === 0 ? 'T' : e.indicador}</strong>
      <span>
        {sobe ? 'Subindo' : 'Descendo'} para o {e.destino}º · {info.nome}
        {andarPronto !== e.destino && progress < 100 ? ` · carregando ${Math.round(progress)}%` : ''}
      </span>
    </div>
  );
}

export function Hud() {
  const etapa = useJogo((s) => s.etapa);
  const vista = useJogo((s) => s.vista);
  const modo = useJogo((s) => s.modoCamera);
  const andar = useJogo((s) => s.andar);
  const alternarCamera = useJogo((s) => s.alternarCamera);
  const setPainel = useJogo((s) => s.setPainel);
  const setVista = useJogo((s) => s.setVista);
  const dica = useJogo((s) => s.dica);
  const aviso = useJogo((s) => s.aviso);
  const podeInteragir = useJogo((s) => s.podeInteragir);
  const toque = useJogo((s) => s.toque);
  const mostrarFps = useJogo((s) => s.mostrarFps);
  const teclas = useJogo((s) => s.teclas);
  const [ajudaRapida, setAjudaRapida] = useState(true);
  useEffect(() => {
    if (etapa !== 'jogo') return;
    setAjudaRapida(true);
    const id = setTimeout(() => setAjudaRapida(false), 10000);
    return () => clearTimeout(id);
  }, [etapa]);
  if (etapa !== 'jogo') return null;
  const info = INFO_ANDAR[andar as NumeroAndar];
  const k = (a: keyof typeof teclas) => rotuloTecla(teclas[a]);

  if (vista === 'externa') {
    return (
      <div className="barra-externa" data-testid="barra-externa">
        <span>
          Vista externa · você está no <strong style={{ color: info.cor }}>{andar}º andar</strong> · {info.nome}
        </span>
        <small>{toque ? 'Arraste para girar' : 'Arraste o mouse para girar'}</small>
        <button type="button" className="botao-ouro" data-testid="voltar-dentro" onClick={() => vistaExterna(false)}>
          Voltar para dentro
        </button>
      </div>
    );
  }

  return (
    <>
      <header className="marca">
        <span className="coroa" aria-hidden>♛</span>
        <div>
          <strong>SALA DOS ROBÔS</strong>
          <button type="button" className="andar-atual" data-testid="andar-atual" onClick={() => setPainel('mapa')} title="Abrir o mapa">
            <span className="ponto" style={{ background: info.cor }} aria-hidden />
            {andar}º · {info.nome}
          </button>
        </div>
      </header>
      <nav className="acoes-topo" aria-label="Ações">
        <button type="button" className="botao-vidro" data-testid="botao-menu" onClick={() => setPainel('menu')} title="Menu (Esc)">
          <span aria-hidden>☰</span>
          <span className="rotulo">Menu</span>
          {!toque && <kbd>Esc</kbd>}
        </button>
        <button type="button" className="botao-vidro" data-testid="botao-mapa" onClick={() => setPainel('mapa')} title={`Mapa (${k('mapa')})`}>
          <span aria-hidden>🗺️</span>
          <span className="rotulo">Mapa</span>
          {!toque && <kbd>{k('mapa')}</kbd>}
        </button>
        <button
          type="button"
          className={`botao-vidro${vista === 'aerea' ? ' ligado' : ''}`}
          data-testid="botao-aerea"
          aria-pressed={vista === 'aerea'}
          onClick={() => setVista(vista === 'aerea' ? 'normal' : 'aerea')}
          title={`Vista aérea (${k('aerea')})`}
        >
          <span aria-hidden>🛰️</span>
          <span className="rotulo">Vista aérea</span>
          {!toque && <kbd>{k('aerea')}</kbd>}
        </button>
        <button type="button" className="botao-vidro" data-testid="botao-externa" onClick={() => vistaExterna(true)} title="Vista externa do prédio">
          <span aria-hidden>🏙️</span>
          <span className="rotulo">Vista externa</span>
        </button>
        <button type="button" className="botao-vidro" data-testid="botao-camera" onClick={alternarCamera} title={`Trocar câmera (${k('camera')})`}>
          <span aria-hidden>{modo === 'terceira' ? '👁️' : '🎥'}</span>
          <span className="rotulo">{modo === 'terceira' ? 'Primeira pessoa' : 'Terceira pessoa'}</span>
          {!toque && <kbd>{k('camera')}</kbd>}
        </button>
      </nav>
      {mostrarFps && <Fps />}
      <Viagem />
      {aviso && (
        <div className="aviso" role="status" data-testid="aviso">
          {aviso}
        </div>
      )}
      {dica && !toque && (
        <div className="dica" data-testid="dica" role="status">
          {podeInteragir && <kbd>{dica === 'Sentar' || dica === 'Levantar' ? `${k('interagir')} / ${k('sentar')}` : k('interagir')}</kbd>} {dica}
        </div>
      )}
      {ajudaRapida && !toque && (
        <div className="ajuda-rapida" role="note">
          <kbd>{k('frente')}</kbd><kbd>{k('esquerda')}</kbd><kbd>{k('tras')}</kbd><kbd>{k('direita')}</kbd> andar · <kbd>{k('correr')}</kbd> correr · arraste o mouse para olhar · <kbd>{k('interagir')}</kbd> interagir · <kbd>{k('sentar')}</kbd> sentar · <kbd>{k('mapa')}</kbd> mapa · <kbd>Esc</kbd> menu
        </div>
      )}
      {ajudaRapida && toque && (
        <div className="ajuda-rapida no-topo" role="note">
          Joystick para andar · arraste a tela para olhar · pinça para zoom · toque nos botões do elevador
        </div>
      )}
    </>
  );
}
