/* Sentar e levantar com os clipes do Rocketbox. O deslocamento da raiz (Bip01) no plano sai do clipe e passa a
   mover o grupo do personagem: assim as transições (crossfade) ficam suaves, sem o corpo "escorregar". */
import * as THREE from 'three';

export interface CurvaRaiz {
  tempos: number[];
  x: number[];
  z: number[];
}

/** Copia o clipe zerando x/z da raiz e devolve a curva retirada (nas unidades do osso pai). */
export function extrairRaiz(clip: THREE.AnimationClip, osso = 'Bip01'): { clipe: THREE.AnimationClip; curva: CurvaRaiz } | null {
  const i = clip.tracks.findIndex((t) => t.name === `${osso}.position`);
  if (i < 0) return null;
  const t = clip.tracks[i];
  const v = Float32Array.from(t.values);
  const curva: CurvaRaiz = { tempos: Array.from(t.times), x: [], z: [] };
  for (let k = 0; k < t.times.length; k++) {
    curva.x.push(v[k * 3]);
    curva.z.push(v[k * 3 + 2]);
    v[k * 3] = 0;
    v[k * 3 + 2] = 0;
  }
  const clipe = clip.clone();
  clipe.tracks[i] = new THREE.VectorKeyframeTrack(t.name, Float32Array.from(t.times), v);
  return { clipe, curva };
}

/** Valor da curva no instante t (interpolação linear, presa nas pontas). */
export function amostrar(c: CurvaRaiz, t: number): { x: number; z: number } {
  const n = c.tempos.length;
  if (n === 0) return { x: 0, z: 0 };
  if (t <= c.tempos[0]) return { x: c.x[0], z: c.z[0] };
  if (t >= c.tempos[n - 1]) return { x: c.x[n - 1], z: c.z[n - 1] };
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (c.tempos[m] <= t) lo = m;
    else hi = m;
  }
  const k = (t - c.tempos[lo]) / (c.tempos[hi] - c.tempos[lo]);
  return { x: c.x[lo] + (c.x[hi] - c.x[lo]) * k, z: c.z[lo] + (c.z[hi] - c.z[lo]) * k };
}

/** Converte um deslocamento da raiz (espaço do osso pai) para o espaço do personagem e gira pelo yaw do assento. */
export function deslocamentoMundo(m: THREE.Matrix3, d: { x: number; z: number }, yaw: number) {
  const v = new THREE.Vector3(d.x, 0, d.z).applyMatrix3(m);
  const s = Math.sin(yaw);
  const c = Math.cos(yaw);
  return { x: c * v.x + s * v.z, z: -s * v.x + c * v.z };
}
