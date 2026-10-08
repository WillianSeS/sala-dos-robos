/* Pedidos entre a interface, os fluxos de navegação e os componentes 3D (lidos a cada passo da física). */
import * as THREE from 'three';
import type { NumeroAndar } from './andares';
import type { Elevador } from './elevador';

export interface Ponto {
  x: number;
  z: number;
  yaw: number;
}

export interface Assento extends Ponto {
  id: string;
}

export const comandosElevador = {
  abrir: false,
  fechar: false,
  escolher: undefined as NumeroAndar | undefined,
  /** Coloca a cabine num estado (entrada no prédio, atalhos do mapa). */
  forcar: null as null | { andar: number; destino: NumeroAndar | null; aberto?: boolean },
  /** Estado guardado fora do componente: sobrevive à troca de qualidade gráfica. */
  estado: null as Elevador | null,
  /** Tremor da cabine durante a viagem (0..1), usado pela câmera. */
  tremor: 0,
  /** Segundos em que o jogador conta como "a bordo" depois de um atalho (o teleporte chega no passo seguinte). */
  graca: 0,
};

export const comandosJogador = {
  /** Onde o jogador nasce quando o componente monta (null = última posição conhecida ou ponto de nascimento do andar). */
  partida: null as Ponto | null,
  /** Teleporte pedido por qualquer parte do jogo; o jogador aplica no próximo passo da física. */
  teleporte: null as Ponto | null,
  /** Ao montar o próximo andar, levar o jogador ao ponto de nascimento (modo de teste ?andar=N). */
  nascerNoSpawn: false,
  ultima: null as Ponto | null,
  sentar: null as Assento | null,
  levantar: false,
  /** Estado do jogador lido por outras partes. */
  fase: 'livre' as 'livre' | 'aproximando' | 'sentando' | 'sentado' | 'levantando',
};

/** A cortina da vista externa só abre depois do primeiro quadro da câmera da fachada. */
export const comandosVista = { externaPronta: false };

/** Pontos fixos do elevador (iguais em todos os andares). */
export const CABINE = { x0: 2.1, x1: 4.3, z0: 10.0, z1: 12.2 };
export const PONTO_CABINE: Ponto = { x: 3.2, z: 10.95, yaw: Math.PI }; // de frente para as portas (a câmera fica atrás, com espaço)
export const PONTO_PAINEL: Ponto = { x: 3.65, z: 10.75, yaw: Math.PI / 2 }; // de frente para o painel (leste)

export const dentroDaCabine = (x: number, z: number) => x > CABINE.x0 && x < CABINE.x1 && z > CABINE.z0 - 0.02 && z < CABINE.z1;

/** Corte horizontal da vista aérea: as paredes e o teto acima da altura escolhida somem (y > constante). */
export const planoCorte = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1000);
export function aplicarCorte(material: THREE.Material) {
  material.clippingPlanes = [planoCorte];
}
