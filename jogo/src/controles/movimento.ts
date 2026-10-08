/* Regras de movimento do jogador (funções puras, testadas no Vitest). */

/** Velocidades em m/s. A caminhada e a corrida casam com a passada dos clipes (velocidade natural medida na conversão). */
export const VEL_ANDAR = 1.25;
export const VEL_CORRER = 3.0;
export const ZONA_MORTA = 0.12;

export interface Eixo {
  x: number; // direita
  y: number; // frente
}

const FRENTE = ['KeyW', 'ArrowUp'];
const TRAS = ['KeyS', 'ArrowDown'];
const ESQUERDA = ['KeyA', 'ArrowLeft'];
const DIREITA = ['KeyD', 'ArrowRight'];
const CORRER = ['ShiftLeft', 'ShiftRight'];

const algum = (teclas: ReadonlySet<string>, lista: string[]) => lista.some((t) => teclas.has(t));

export function eixoTeclado(teclas: ReadonlySet<string>): Eixo {
  return {
    x: (algum(teclas, DIREITA) ? 1 : 0) - (algum(teclas, ESQUERDA) ? 1 : 0),
    y: (algum(teclas, FRENTE) ? 1 : 0) - (algum(teclas, TRAS) ? 1 : 0),
  };
}

export const corridaTeclado = (teclas: ReadonlySet<string>) => algum(teclas, CORRER);

/** Junta teclado e joystick. O joystick vence quando está fora da zona morta; a diagonal do teclado é normalizada. */
export function eixoFinal(teclas: ReadonlySet<string>, joystick: Eixo): Eixo & { forca: number } {
  const mj = Math.hypot(joystick.x, joystick.y);
  if (mj > ZONA_MORTA) {
    const forca = Math.min(1, (mj - ZONA_MORTA) / (1 - ZONA_MORTA));
    return { x: joystick.x / mj, y: joystick.y / mj, forca };
  }
  const t = eixoTeclado(teclas);
  const mt = Math.hypot(t.x, t.y);
  return mt > 0 ? { x: t.x / mt, y: t.y / mt, forca: 1 } : { x: 0, y: 0, forca: 0 };
}

/** Direção no mundo (x, z) a partir do eixo e da câmera: frente = (-sen yaw, -cos yaw), direita = (cos yaw, -sen yaw). */
export function direcaoMundo(eixo: Eixo, yawCamera: number): { x: number; z: number } {
  const s = Math.sin(yawCamera);
  const c = Math.cos(yawCamera);
  return { x: -s * eixo.y + c * eixo.x, z: -c * eixo.y - s * eixo.x };
}

export function velocidadeAlvo(forca: number, correr: boolean): number {
  if (forca <= 0) return 0;
  return correr ? VEL_CORRER * Math.max(forca, 0.75) : VEL_ANDAR * Math.max(forca, 0.35);
}

/** Aproximação exponencial independente da taxa de quadros. */
export const aproximar = (atual: number, alvo: number, taxa: number, dt: number) => alvo + (atual - alvo) * Math.exp(-taxa * dt);

/** Ângulo para o personagem olhar na direção do movimento (ele olha para +Z com yaw 0). */
export const anguloDe = (dx: number, dz: number) => Math.atan2(dx, dz);

export function diferencaAngular(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Gira pelo menor caminho, de forma suave. */
export const girarPara = (atual: number, alvo: number, taxa: number, dt: number) =>
  atual + diferencaAngular(atual, alvo) * (1 - Math.exp(-taxa * dt));
