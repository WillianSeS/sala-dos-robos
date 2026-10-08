/* Matemática da câmera (funções puras). yaw: giro em torno do eixo vertical; pitch: elevação (positivo = olhando para baixo). */
import type { ModoCamera } from '../estado/jogo';

export const LIMITES = {
  terceira: { pitchMin: -0.3, pitchMax: 1.2, distMin: 1.2, distMax: 6, dist: 2.8 },
  primeira: { pitchMin: -1.3, pitchMax: 1.3 },
} as const;

/** Radianos por pixel com sensibilidade 1. */
export const RAD_POR_PIXEL = 0.0042;

export function aplicarOlhar(
  yaw: number,
  pitch: number,
  dx: number,
  dy: number,
  sensibilidade: number,
  inverterY: boolean,
  modo: ModoCamera,
): { yaw: number; pitch: number } {
  const k = RAD_POR_PIXEL * sensibilidade;
  const lim = LIMITES[modo];
  const novoPitch = pitch + dy * k * (inverterY ? -1 : 1);
  return { yaw: yaw - dx * k, pitch: Math.min(lim.pitchMax, Math.max(lim.pitchMin, novoPitch)) };
}

/** Posição da câmera em órbita atrás do alvo. */
export function posicaoOrbita(alvo: { x: number; y: number; z: number }, yaw: number, pitch: number, dist: number) {
  const cp = Math.cos(pitch);
  return { x: alvo.x + Math.sin(yaw) * cp * dist, y: alvo.y + Math.sin(pitch) * dist, z: alvo.z + Math.cos(yaw) * cp * dist };
}

export const limitarDistancia = (d: number) => Math.min(LIMITES.terceira.distMax, Math.max(LIMITES.terceira.distMin, d));
