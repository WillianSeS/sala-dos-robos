/* Toque na tela (fora do joystick e dos botões): um dedo gira a câmera, dois dedos aproximam/afastam. */
import { useEffect } from 'react';
import { useJogo } from '../estado/jogo';
import { entrada } from './entrada';

export function detectarToque() {
  return typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window);
}

export function useToqueOlhar(alvo: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = alvo.current;
    if (!el) return;
    const dedos = new Map<number, { x: number; y: number }>();
    let distAnterior = 0;
    const baixo = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      useJogo.getState().setToque(true);
      dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
      el.setPointerCapture(e.pointerId);
      if (dedos.size === 2) {
        const [a, b] = [...dedos.values()];
        distAnterior = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };
    const mover = (e: PointerEvent) => {
      const d = dedos.get(e.pointerId);
      if (!d) return;
      if (dedos.size === 1) {
        entrada.olharDx += e.clientX - d.x;
        entrada.olharDy += e.clientY - d.y;
      }
      d.x = e.clientX;
      d.y = e.clientY;
      if (dedos.size === 2) {
        const [a, b] = [...dedos.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        entrada.zoom -= (dist - distAnterior) * 0.012;
        distAnterior = dist;
      }
    };
    const cima = (e: PointerEvent) => {
      dedos.delete(e.pointerId);
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    };
    el.addEventListener('pointerdown', baixo);
    el.addEventListener('pointermove', mover);
    el.addEventListener('pointerup', cima);
    el.addEventListener('pointercancel', cima);
    return () => {
      el.removeEventListener('pointerdown', baixo);
      el.removeEventListener('pointermove', mover);
      el.removeEventListener('pointerup', cima);
      el.removeEventListener('pointercancel', cima);
    };
  }, [alvo]);
}
