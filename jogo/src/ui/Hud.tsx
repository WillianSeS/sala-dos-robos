/* HUD: marca, botões de câmera/configurações/ajuda, dica de interação e FPS. */
import { useEffect, useState } from 'react';
import { useJogo } from '../estado/jogo';
import { telemetria } from '../testes/telemetria';

function Fps() {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFps(telemetria.fps), 500);
    return () => clearInterval(id);
  }, []);
  return <div className="fps" data-testid="fps">{fps} FPS</div>;
}

export function Hud() {
  const modo = useJogo((s) => s.modoCamera);
  const alternarCamera = useJogo((s) => s.alternarCamera);
  const setPainel = useJogo((s) => s.setPainel);
  const dica = useJogo((s) => s.dica);
  const podeInteragir = useJogo((s) => s.podeInteragir);
  const toque = useJogo((s) => s.toque);
  const mostrarFps = useJogo((s) => s.mostrarFps);
  const [ajudaRapida, setAjudaRapida] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setAjudaRapida(false), 9000);
    return () => clearTimeout(id);
  }, []);

  return (
    <>
      <header className="marca">
        <span className="coroa" aria-hidden>♛</span>
        <div>
          <strong>SALA DOS ROBÔS</strong>
          <small>Las Vegas Night · Fase 1</small>
        </div>
      </header>
      <nav className="acoes-topo" aria-label="Ações">
        <button type="button" className="botao-vidro" data-testid="botao-camera" onClick={alternarCamera} title="Trocar câmera (V)">
          <span aria-hidden>{modo === 'terceira' ? '👁️' : '🎥'}</span>
          <span className="rotulo">{modo === 'terceira' ? 'Primeira pessoa' : 'Terceira pessoa'}</span>
          {!toque && <kbd>V</kbd>}
        </button>
        <button type="button" className="botao-vidro" data-testid="botao-ajuda" onClick={() => setPainel('ajuda')} title="Controles">
          <span aria-hidden>❔</span>
          <span className="rotulo">Controles</span>
        </button>
        <button type="button" className="botao-vidro" data-testid="botao-config" onClick={() => setPainel('configuracoes')} title="Configurações (Esc)">
          <span aria-hidden>⚙️</span>
          <span className="rotulo">Configurações</span>
          {!toque && <kbd>Esc</kbd>}
        </button>
      </nav>
      {mostrarFps && <Fps />}
      {dica && !toque && (
        <div className="dica" data-testid="dica" role="status">
          {podeInteragir && <kbd>E</kbd>} {dica}
        </div>
      )}
      {ajudaRapida && !toque && (
        <div className="ajuda-rapida" role="note">
          <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> andar · <kbd>Shift</kbd> correr · arraste o mouse para olhar · roda: zoom · <kbd>V</kbd> câmera · <kbd>E</kbd> interagir
        </div>
      )}
      {ajudaRapida && toque && (
        <div className="ajuda-rapida no-topo" role="note">
          Joystick para andar · arraste a tela para olhar · pinça para zoom
        </div>
      )}
    </>
  );
}
