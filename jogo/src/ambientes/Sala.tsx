/* Sala da Fase 1: GLB modelado no Blender (ferramentas/blender/sala_fase1.py), colisores, luzes e porta. */
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { useMemo } from 'react';
import * as THREE from 'three';
import { useModelo } from '../motor/carregar';
import type { Preset } from '../motor/qualidade';
import type { Partida } from '../jogador/Jogador';
import { Porta } from './Porta';
import { Luzes } from './Luzes';

export interface DadosSala {
  cena: THREE.Object3D;
  colisores: { pos: [number, number, number]; rot: [number, number, number]; meia: [number, number, number] }[];
  luzes: Record<string, THREE.Vector3>;
  partida: Partida;
  porta: THREE.Object3D | null;
  tela: THREE.Mesh | null;
}

const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();

export function useSala(preset: Preset): DadosSala {
  const { scene } = useModelo(preset.sala);
  return useMemo(() => {
    // cópia: o GLB fica em cache e pode ser reaproveitado ao trocar a qualidade
    const raiz = scene.clone(true);
    raiz.updateMatrixWorld(true);
    const colisores: DadosSala['colisores'] = [];
    const luzes: DadosSala['luzes'] = {};
    let partida: Partida = { pos: new THREE.Vector3(0, 0, 2.5), yaw: Math.PI };
    let porta: THREE.Object3D | null = null;
    let tela: THREE.Mesh | null = null;
    const remover: THREE.Object3D[] = [];
    raiz.traverse((o) => {
      if (o.name.startsWith('COL_')) {
        o.matrixWorld.decompose(_p, _q, _s);
        _e.setFromQuaternion(_q, 'YXZ');
        colisores.push({ pos: [_p.x, _p.y, _p.z], rot: [_e.x, _e.y, _e.z], meia: [Math.abs(_s.x), Math.abs(_s.y), Math.abs(_s.z)] });
        remover.push(o);
      } else if (o.name.startsWith('LUZ_')) {
        luzes[o.name] = o.getWorldPosition(new THREE.Vector3());
      } else if (o.name === 'SPAWN_jogador') {
        o.matrixWorld.decompose(_p, _q, _s);
        partida = { pos: _p.clone(), yaw: _e.setFromQuaternion(_q, 'YXZ').y };
      } else if (o.name === 'PORTA_folha') {
        porta = o;
      }
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.receiveShadow = true;
      m.castShadow = !o.name.startsWith('VIDRO') && !o.name.includes('teto');
      const mat = m.material as THREE.MeshStandardMaterial;
      if (o.name.startsWith('VIDRO')) {
        mat.envMapIntensity = 1.4;
        mat.depthWrite = false;
        m.castShadow = false;
        m.renderOrder = 2;
      } else if (o.name.startsWith('TELA')) {
        tela = m;
        mat.toneMapped = false;
      } else if (mat?.isMeshStandardMaterial) {
        mat.envMapIntensity = 0.75;
        // veludo: o brilho rasante (sheen) exportado pelo Blender fica forte demais no three.js
        const fis = mat as THREE.MeshPhysicalMaterial;
        if (mat.name === 'veludo' && fis.isMeshPhysicalMaterial) {
          fis.sheen = 0.6;
          fis.sheenColor.set('#1d2a5c');
          fis.sheenRoughness = 0.75;
          fis.envMapIntensity = 0.35;
        }
      }
    });
    for (const o of remover) o.removeFromParent();
    if (porta) (porta as THREE.Object3D).removeFromParent();
    return { cena: raiz, colisores, luzes, partida, porta, tela };
  }, [scene]);
}

export function Sala({ dados, preset }: { dados: DadosSala; preset: Preset }) {
  return (
    <>
      <primitive object={dados.cena} />
      <RigidBody type="fixed" colliders={false}>
        {dados.colisores.map((c, i) => (
          <CuboidCollider key={i} args={c.meia} position={c.pos} rotation={c.rot} />
        ))}
      </RigidBody>
      {dados.porta && <Porta objeto={dados.porta} />}
      <Luzes luzes={dados.luzes} preset={preset} />
    </>
  );
}
