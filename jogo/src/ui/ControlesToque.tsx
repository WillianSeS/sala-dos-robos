/* Controles de celular: joystick virtual (esquerda) e botões de interagir, sentar, correr e câmera (direita). */
import { useRef, useState } from 'react';
import { entrada } from '../controles/entrada';
import { useJogo } from '../estado/jogo';

const RAIO = 52;

function Joystick() {
  const base = useRef<HTMLDivElement>(null);
  const [pino, setPino] = useState({ x: 0, y: 0, ativo: false });
  const centro = useRef({ x: 0, y: 0, id: -1 });

  const atualizar = (cx: number, cy: number) => {
    let dx = cx - centro.current.x;
    let dy = cy - centro.current.y;
    const d = Math.hypot(dx, dy);
    if (d > RAIO) {
      dx = (dx / d) * RAIO;
      dy = (dy / d) * RAIO;
    }
    entrada.joystick.x = dx / RAIO;
    entrada.joystick.y = -dy / RAIO;
    setPino({ x: dx, y: dy, ativo: true });
  };
  const soltar = () => {
    centro.current.id = -1;
    entrada.joystick.x = entrada.joystick.y = 0;
    setPino({ x: 0, y: 0, ativo: false });
  };

  return (
    <div
      ref={base}
      className={`joystick${pino.ativo ? ' ativo' : ''}`}
      data-testid="joystick"
      onPointerDown={(e) => {
        e.stopPropagation();
        const r = base.current!.getBoundingClientRect();
        centro.current = { x: r.left + r.width / 2, y: r.top + r.height / 2, id: e.pointerId };
        base.current!.setPointerCapture(e.pointerId);
        useJogo.getState().setToque(true);
        atualizar(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (e.pointerId === centro.current.id) atualizar(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        if (e.pointerId === centro.current.id) soltar();
      }}
      onPointerCancel={soltar}
    >
      <div className="joystick-pino" style={{ transform: `translate(${pino.x}px, ${pino.y}px)` }} />
    </div>
  );
}

export function ControlesToque() {
  const toque = useJogo((s) => s.toque);
  const correndo = useJogo((s) => s.correndoToque);
  const alternarCorrida = useJogo((s) => s.alternarCorridaToque);
  const modo = useJogo((s) => s.modoCamera);
  const alternarCamera = useJogo((s) => s.alternarCamera);
  const podeInteragir = useJogo((s) => s.podeInteragir);
  const podeSentar = useJogo((s) => s.podeSentar);
  const sentado = useJogo((s) => s.sentado);
  const dica = useJogo((s) => s.dica);
  const painel = useJogo((s) => s.painel);
  const etapa = useJogo((s) => s.etapa);
  const vista = useJogo((s) => s.vista);
  if (!toque || painel || etapa !== 'jogo' || vista === 'externa') return null;
  const parar = (e: React.PointerEvent) => e.stopPropagation();
  return (
    <div className="controles-toque">
      <Joystick />
      <div className="botoes-toque">
        <button
          type="button"
          className={`botao-redondo interagir${podeInteragir ? ' pronto' : ''}`}
          data-testid="botao-interagir"
          disabled={!podeInteragir}
          aria-label={dica ?? 'Interagir'}
          onPointerDown={parar}
          onClick={() => {
            entrada.interagir = true;
          }}
        >
          <span aria-hidden>✋</span>
          <small>{dica && dica !== 'Sentar' && dica !== 'Levantar' ? dica : 'Interagir'}</small>
        </button>
        <button
          type="button"
          className={`botao-redondo${sentado ? ' ativo' : ''}${podeSentar ? ' pronto' : ''}`}
          data-testid="botao-sentar"
          disabled={!podeSentar}
          aria-label={sentado ? 'Levantar' : 'Sentar'}
          onPointerDown={parar}
          onClick={() => {
            entrada.sentar = true;
          }}
        >
          <span aria-hidden>🪑</span>
          <small>{sentado ? 'Levantar' : 'Sentar'}</small>
        </button>
        <button
          type="button"
          className={`botao-redondo${correndo ? ' ativo' : ''}`}
          data-testid="botao-correr"
          aria-pressed={correndo}
          aria-label="Correr"
          onPointerDown={parar}
          onClick={alternarCorrida}
        >
          <span aria-hidden>🏃</span>
          <small>{correndo ? 'Correndo' : 'Correr'}</small>
        </button>
        <button
          type="button"
          className="botao-redondo"
          data-testid="botao-camera-toque"
          aria-label="Trocar câmera"
          onPointerDown={parar}
          onClick={alternarCamera}
        >
          <span aria-hidden>{modo === 'terceira' ? '👁️' : '🎥'}</span>
          <small>{modo === 'terceira' ? '1ª pessoa' : '3ª pessoa'}</small>
        </button>
      </div>
    </div>
  );
}
