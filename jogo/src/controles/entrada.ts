/* Entrada do jogador: teclado, mouse e toque escrevem aqui; o laço do jogo lê e consome a cada quadro. */
import { useEffect } from 'react';
import { useJogo } from '../estado/jogo';

export const entrada = {
  teclas: new Set<string>(),
  joystick: { x: 0, y: 0 },
  olharDx: 0,
  olharDy: 0,
  zoom: 0,
  interagir: false,
};

export function consumirOlhar() {
  const r = { dx: entrada.olharDx, dy: entrada.olharDy, zoom: entrada.zoom };
  entrada.olharDx = entrada.olharDy = entrada.zoom = 0;
  return r;
}

export function consumirInteracao() {
  const v = entrada.interagir;
  entrada.interagir = false;
  return v;
}

const digitando = (e: KeyboardEvent) => {
  const alvo = e.target as HTMLElement | null;
  return !!alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.isContentEditable);
};

/** Atalhos: WASD/setas andam, Shift corre, V troca a câmera, E interage, Esc abre/fecha o menu. */
export function useTeclado() {
  useEffect(() => {
    const baixo = (e: KeyboardEvent) => {
      if (digitando(e)) return;
      const jogo = useJogo.getState();
      if (e.code === 'Escape') {
        jogo.setPainel(jogo.painel ? null : 'configuracoes');
        return;
      }
      if (jogo.painel) return;
      if (e.code === 'KeyV' && !e.repeat) jogo.alternarCamera();
      if (e.code === 'KeyE' && !e.repeat) entrada.interagir = true;
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
      entrada.teclas.add(e.code);
    };
    const cima = (e: KeyboardEvent) => entrada.teclas.delete(e.code);
    const limpar = () => entrada.teclas.clear();
    window.addEventListener('keydown', baixo);
    window.addEventListener('keyup', cima);
    window.addEventListener('blur', limpar);
    return () => {
      window.removeEventListener('keydown', baixo);
      window.removeEventListener('keyup', cima);
      window.removeEventListener('blur', limpar);
    };
  }, []);
}

/** Mouse: arrastar com o botão esquerdo ou direito gira a câmera; a roda aproxima/afasta. */
export function useMouse(alvo: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = alvo.current;
    if (!el) return;
    let arrastando = false;
    let ultimoX = 0;
    let ultimoY = 0;
    const baixo = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      arrastando = true;
      ultimoX = e.clientX;
      ultimoY = e.clientY;
      el.setPointerCapture(e.pointerId);
    };
    const mover = (e: PointerEvent) => {
      if (!arrastando || e.pointerType !== 'mouse') return;
      entrada.olharDx += e.clientX - ultimoX;
      entrada.olharDy += e.clientY - ultimoY;
      ultimoX = e.clientX;
      ultimoY = e.clientY;
    };
    const cima = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      arrastando = false;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };
    const roda = (e: WheelEvent) => {
      e.preventDefault();
      entrada.zoom += Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 120) * 0.004;
    };
    const menu = (e: Event) => e.preventDefault();
    el.addEventListener('pointerdown', baixo);
    el.addEventListener('pointermove', mover);
    el.addEventListener('pointerup', cima);
    el.addEventListener('pointercancel', cima);
    el.addEventListener('wheel', roda, { passive: false });
    el.addEventListener('contextmenu', menu);
    return () => {
      el.removeEventListener('pointerdown', baixo);
      el.removeEventListener('pointermove', mover);
      el.removeEventListener('pointerup', cima);
      el.removeEventListener('pointercancel', cima);
      el.removeEventListener('wheel', roda);
      el.removeEventListener('contextmenu', menu);
    };
  }, [alvo]);
}
