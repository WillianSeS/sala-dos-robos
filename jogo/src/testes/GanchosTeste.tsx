/* Ganchos para os testes automatizados (só com ?teste): estatísticas da cena e avanço quadro a quadro. */
import { useThree } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import { useEffect } from 'react';
import type * as THREE from 'three';
import { acoesTeste } from './telemetria';

export function GanchosTeste() {
  const { scene, gl, advance } = useThree();
  const { world } = useRapier();
  useEffect(() => {
    let tempo = 0;
    acoesTeste.estatisticas = () => {
      let malhas = 0;
      let triangulos = 0;
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && m.visible) {
          malhas++;
          const g = m.geometry;
          triangulos += (g.index ? g.index.count : g.attributes.position.count) / 3;
        }
      });
      return { malhas, triangulos: Math.round(triangulos), colisores: world.colliders.len(), chamadas: gl.info.render.calls };
    };
    acoesTeste.avancar = (quadros, dt) => {
      for (let i = 0; i < quadros; i++) {
        tempo += dt;
        advance(tempo);
      }
    };
    return () => {
      acoesTeste.estatisticas = undefined;
      acoesTeste.avancar = undefined;
    };
  }, [scene, gl, advance, world]);
  return null;
}
