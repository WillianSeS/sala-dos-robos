/* Danças por batida, aplicadas nos ossos do esqueleto Rocketbox (Biped) por cima da animação de base.
   Portadas do jogo antigo (src/77z_disco.js): balanço, disco, festa e cancan (showgirl). */
import * as THREE from 'three';

export type Estilo = 'balanco' | 'disco' | 'festa' | 'cancan';
export const ESTILOS: { id: Estilo; nome: string; icone: string }[] = [
  { id: 'balanco', nome: 'Balanço', icone: '🕺' },
  { id: 'disco', nome: 'Disco', icone: '🪩' },
  { id: 'festa', nome: 'Festa', icone: '🙌' },
];

export interface Pose {
  sway: number; twist: number; bend: number; lean: number; chest: number; nod: number; tilt: number;
  armL: number; armR: number; fwdL: number; fwdR: number; elbL: number; elbR: number;
  kickL: number; kickR: number; outL: number; outR: number; kneeL: number; kneeR: number;
  bounce: number; stepX: number; turn: number;
}

const suave = (x: number) => x * x * (3 - 2 * x);
const limitar = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

/** b = tempo em batidas. */
export function pose(estilo: Estilo, b: number, intensidade = 1): Pose {
  const p: Pose = { sway: 0, twist: 0, bend: 0, lean: 0, chest: 0, nod: 0, tilt: 0, armL: 0.12, armR: 0.12, fwdL: 0, fwdR: 0, elbL: 0.25, elbR: 0.25, kickL: 0, kickR: 0, outL: 0, outR: 0, kneeL: 0, kneeR: 0, bounce: 0, stepX: 0, turn: 0 };
  const dip = (1 + Math.cos(2 * Math.PI * b)) / 2;
  const lado = Math.sin((Math.PI * b) / 2);
  const meio = Math.sin(Math.PI * b);
  if (estilo === 'disco') {
    const up = suave(limitar(((Math.cos((Math.PI * b) / 2) + 1) / 2) * 1.4 - 0.2, 0, 1));
    Object.assign(p, { armR: 0.3 + 1.9 * up, fwdR: 0.9 - 0.5 * up, elbR: 0.15, chest: 0.25 * (1 - up) - 0.1, tilt: -0.15 * up, nod: -0.12 * up, armL: 0.6 + 0.1 * meio, elbL: 1.7, fwdL: -0.25 + 0.1 * lado, sway: 0.16 * meio, kneeL: 0.3 * Math.max(0, meio), kneeR: 0.3 * Math.max(0, -meio), kickL: 0.12 * Math.max(0, meio), kickR: 0.12 * Math.max(0, -meio), bounce: -0.015 * dip });
  } else if (estilo === 'festa') {
    const onda = Math.sin(2 * Math.PI * b);
    const pulo = Math.pow(Math.max(0, Math.sin(2 * Math.PI * (b + 0.25))), 2);
    Object.assign(p, { armL: 2.55 + 0.15 * onda, armR: 2.55 - 0.15 * onda, fwdL: 0.25, fwdR: 0.25, elbL: 0.35 + 0.25 * onda, elbR: 0.35 - 0.25 * onda, sway: 0.14 * lado, lean: -0.05 * lado, chest: 0.12 * meio, kneeL: 0.25 * (1 - pulo), kneeR: 0.25 * (1 - pulo), kickL: 0.12 * (1 - pulo), kickR: 0.12 * (1 - pulo), bounce: 0.07 * pulo - 0.015, turn: 0.45 * Math.sin((Math.PI * b) / 8), nod: 0.1 * dip });
  } else if (estilo === 'cancan') {
    const k = b % 2;
    const perna = Math.floor(b / 2) % 2;
    const b16 = b % 16;
    const girando = b16 >= 14;
    const chute = girando ? 0 : Math.sin(Math.PI * Math.min(1, k / 1.2)) * (k < 1.2 ? 1 : 0);
    Object.assign(p, { armL: 1.15 + 0.15 * meio, armR: 1.15 - 0.15 * meio, fwdL: 0.35, fwdR: 0.35, elbL: 0.45, elbR: 0.45, kickL: perna ? 1.25 * chute : 0.05, kickR: perna ? 0.05 : 1.25 * chute, kneeL: perna ? 0.05 : 0.12 * chute, kneeR: perna ? 0.12 * chute : 0.05, sway: 0.1 * meio, nod: -0.1, tilt: 0.08 * meio, bounce: 0.02 * dip, turn: girando ? Math.PI * 2 * suave((b16 - 14) / 2) : 0 });
  } else {
    Object.assign(p, { stepX: 0.13 * lado, sway: 0.12 * lado, lean: -0.05 * lado, chest: 0.16 * meio, nod: 0.12 * dip, kneeL: 0.22 * dip + 0.05, kneeR: 0.22 * dip + 0.05, kickL: 0.1 * dip, kickR: 0.1 * dip, bounce: -0.02 * dip, armL: 0.25, armR: 0.25, fwdL: 0.35 * Math.max(0, meio), fwdR: 0.35 * Math.max(0, -meio), elbL: 0.7, elbR: 0.7 });
  }
  if (intensidade !== 1) for (const k of Object.keys(p) as (keyof Pose)[]) p[k] *= intensidade;
  return p;
}

const NOMES = ['Spine', 'Spine1', 'L_UpperArm', 'R_UpperArm', 'L_Forearm', 'R_Forearm', 'L_Thigh', 'R_Thigh', 'L_Calf', 'R_Calf', 'Pelvis', 'Neck'];
export type Ossos = (THREE.Object3D | undefined)[];
export const ossosDeDanca = (raiz: THREE.Object3D): Ossos => NOMES.map((n) => raiz.getObjectByName('Bip01_' + n));

/** Guarda a pose dos ossos de dança; restaurar antes do mixer evita que giros se acumulem nos ossos que o
    clipe de base não anima (o mixer só reescreve os ossos que têm trilha). */
export function guardarPose(ossos: Ossos, guarda: (THREE.Quaternion | null)[]) {
  ossos.forEach((o, i) => {
    if (!o) return;
    if (!guarda[i]) guarda[i] = new THREE.Quaternion();
    guarda[i]!.copy(o.quaternion);
  });
}
export function restaurarPose(ossos: Ossos, guarda: (THREE.Quaternion | null)[]) {
  ossos.forEach((o, i) => {
    if (o && guarda[i]) o.quaternion.copy(guarda[i]!);
  });
}

/** Aplica a pose sobre a animação atual (chamar logo depois de mixer.update). Devolve o passo lateral, o pulo e o giro. */
export function aplicarDanca(ossos: Ossos, p: Pose) {
  const [spine, chest, la, ra, le, re, lt, rt, lk, rk, pelvis, neck] = ossos;
  if (pelvis) { pelvis.rotateY(p.sway); pelvis.rotateX(p.twist); }
  if (spine) { spine.rotateZ(p.bend); spine.rotateY(p.lean); }
  if (chest) chest.rotateX(p.chest);
  if (neck) { neck.rotateZ(p.nod); neck.rotateY(p.tilt); }
  if (la) { la.rotateY(-p.armL); la.rotateZ(-p.fwdL); }
  if (ra) { ra.rotateY(p.armR); ra.rotateZ(-p.fwdR); }
  if (le) le.rotateZ(-p.elbL);
  if (re) re.rotateZ(-p.elbR);
  if (lt) { lt.rotateZ(p.kickL); lt.rotateY(p.outL); }
  if (rt) { rt.rotateZ(p.kickR); rt.rotateY(-p.outR); }
  if (lk) lk.rotateZ(-p.kneeL);
  if (rk) rk.rotateZ(-p.kneeR);
  return { passo: p.stepX, pulo: p.bounce, giro: p.turn };
}

/** Duração de uma batida (s): 120 bpm. */
export const BATIDA = 0.5;
