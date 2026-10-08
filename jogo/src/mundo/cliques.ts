/* Botões 3D que podem ser apertados com um clique ou toque na tela (além da tecla E e do painel):
   o raio da câmera escolhe o botão mais próximo dele, com tolerância de ~1,5° para botões pequenos. */
import * as THREE from 'three';

export interface Clicavel {
  objeto: THREE.Object3D;
  acao: () => void;
  /** Distância máxima (m) entre o jogador e o botão. */
  alcance: number;
}

export const clicaveis = new Map<string, Clicavel>();

const _c = new THREE.Vector3();

export function escolherClicavel(raio: THREE.Ray, jogador: { x: number; z: number }): { id: string; c: Clicavel; longe: boolean } | null {
  let melhor: { id: string; c: Clicavel; longe: boolean } | null = null;
  let melhorErro = Infinity;
  for (const [id, c] of clicaveis) {
    c.objeto.getWorldPosition(_c);
    const t = _c.clone().sub(raio.origin).dot(raio.direction);
    if (t <= 0) continue;
    const erro = raio.distanceToPoint(_c) / t; // erro angular (rad)
    if (erro < 0.026 && erro < melhorErro) {
      melhorErro = erro;
      melhor = { id, c, longe: Math.hypot(_c.x - jogador.x, _c.z - jogador.z) > c.alcance };
    }
  }
  return melhor;
}
