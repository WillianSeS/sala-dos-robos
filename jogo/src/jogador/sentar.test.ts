import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { amostrar, deslocamentoMundo, extrairRaiz } from './sentar';

describe('raiz dos clipes de sentar', () => {
  const clip = new THREE.AnimationClip('sitDown', 2, [
    new THREE.VectorKeyframeTrack('Bip01.position', [0, 1, 2], [0, 90, 46.1, 0, 70, 20, 0, 50, 0]),
    new THREE.QuaternionKeyframeTrack('Bip01.quaternion', [0, 2], [0, 0, 0, 1, 0, 0, 0, 1]),
  ]);
  it('tira x/z da raiz do clipe e guarda a curva, mantendo a altura', () => {
    const r = extrairRaiz(clip)!;
    const v = r.clipe.tracks[0].values;
    expect([v[0], v[1], v[2], v[7], v[8]]).toEqual([0, 90, 0, 50, 0]);
    expect(r.curva.z[0]).toBeCloseTo(46.1, 4);
    expect(r.curva.z.slice(1)).toEqual([20, 0]);
    expect(clip.tracks[0].values[2]).toBeCloseTo(46.1); // o original não muda
  });
  it('amostra a curva com interpolação e prende nas pontas', () => {
    const { curva } = extrairRaiz(clip)!;
    expect(amostrar(curva, -1).z).toBeCloseTo(46.1);
    expect(amostrar(curva, 0.5).z).toBeCloseTo(33.05);
    expect(amostrar(curva, 9).z).toBe(0);
  });
  it('converte cm do osso para metros e gira pelo yaw do assento', () => {
    const m = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeScale(0.01, 0.01, 0.01));
    const frente = deslocamentoMundo(m, { x: 0, z: 46.1 }, 0);
    expect(frente.z).toBeCloseTo(0.461);
    const leste = deslocamentoMundo(m, { x: 0, z: 46.1 }, Math.PI / 2);
    expect(leste.x).toBeCloseTo(0.461);
    expect(leste.z).toBeCloseTo(0);
  });
});
