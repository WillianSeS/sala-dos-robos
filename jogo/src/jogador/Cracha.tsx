/* Crachá com o nome do visitante sobre a cabeça do avatar (some na primeira pessoa, na vista externa e quando o
   visitante desliga "Mostrar meu nome" nas configurações de privacidade). */
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useJogo } from '../estado/jogo';
import { useJogos } from '../jogos/estado';

const _v = new THREE.Vector3();

function desenhar(nome: string) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d')!;
  const fonte = '600 44px Inter, "Segoe UI", Arial, sans-serif';
  g.font = fonte;
  const largura = Math.ceil(Math.min(560, g.measureText(nome).width + 64));
  c.width = largura;
  c.height = 84;
  g.font = fonte;
  // pílula escura com borda dourada
  const r = 38;
  g.fillStyle = 'rgba(8, 9, 16, 0.72)';
  g.strokeStyle = 'rgba(232, 196, 120, 0.9)';
  g.lineWidth = 3;
  g.beginPath();
  g.roundRect(3, 3, largura - 6, 78, r);
  g.fill();
  g.stroke();
  g.fillStyle = '#fff6e6';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(nome, largura / 2, 44, largura - 40);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return { textura: t, proporcao: largura / 84 };
}

export function Cracha({ cabeca }: { cabeca: THREE.Object3D }) {
  const nome = useJogo((s) => s.nome) || 'Visitante';
  const { textura, proporcao } = useMemo(() => desenhar(nome), [nome]);
  useEffect(() => () => textura.dispose(), [textura]);
  const sprite = useRef<THREE.Sprite>(null);
  useFrame(() => {
    const sp = sprite.current;
    if (!sp) return;
    const jogo = useJogo.getState();
    sp.visible = !useJogos.getState().ativo && jogo.mostrarNome && !(jogo.modoCamera === 'primeira' && jogo.vista === 'normal') && jogo.vista !== 'externa';
    cabeca.getWorldPosition(_v);
    sp.position.set(_v.x, _v.y + 0.38, _v.z);
  });
  const altura = 0.13;
  return (
    <sprite ref={sprite} scale={[altura * proporcao, altura, 1]} renderOrder={5} userData={{ semReflexo: true }}>
      <spriteMaterial map={textura} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  );
}
