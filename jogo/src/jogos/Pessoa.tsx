/* Personagem não jogável (Rocketbox, MIT) com os clipes de captura de movimento do jogo antigo
   (people/anim_m.json e anim_f.json) e crachá com o nome. Usado por crupiê, garçons, DJ e artistas. */
import { useFrame } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { clone as clonarComEsqueleto } from 'three/addons/utils/SkeletonUtils.js';
import { useModelo } from '../motor/carregar';
import { Protecao } from '../motor/Protecao';

export interface PropsPessoa {
  modelo: string;
  lugar: { x: number; z: number; yaw: number; y?: number };
  nome?: string;
  /** Nome do clipe a tocar agora (chamado a cada quadro). */
  clipe: (t: number) => string;
  /** Movimento opcional do corpo (deslocamento e giro), chamado a cada quadro. */
  mover?: (t: number, g: THREE.Group) => void;
  altura?: number;
}

function cracha(nome: string) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const g = c.getContext('2d')!;
  g.fillStyle = 'rgba(10,12,22,0.8)';
  g.beginPath();
  g.roundRect(4, 4, 504, 88, 40);
  g.fill();
  g.strokeStyle = 'rgba(160,190,230,0.7)';
  g.lineWidth = 3;
  g.stroke();
  g.fillStyle = '#eef3ff';
  g.font = '600 38px Arial';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(nome, 256, 50, 480);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Corpo({ modelo, lugar, nome, clipe, mover, altura = 2.05 }: PropsPessoa) {
  const { scene } = useModelo('people/' + modelo + '.json');
  const anim = useModelo('people/anim_' + (modelo.includes('Female') ? 'f' : 'm') + '.json');
  const rig = useMemo(() => {
    const c = clonarComEsqueleto(scene);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.frustumCulled = false;
      for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
        const s = mat as THREE.MeshStandardMaterial;
        s.envMapIntensity = 0.6;
        if (s.alphaTest > 0) s.alphaToCoverage = true;
      }
    });
    const mixer = new THREE.AnimationMixer(c);
    const acoes: Record<string, THREE.AnimationAction> = {};
    for (const a of anim.animations) acoes[a.name] = mixer.clipAction(a);
    return { c, mixer, acoes, atual: null as THREE.AnimationAction | null };
  }, [scene, anim.animations]);
  const etiqueta = useMemo(() => (nome ? cracha(nome) : null), [nome]);
  useEffect(() => () => etiqueta?.dispose(), [etiqueta]);
  const grupo = useRef<THREE.Group>(null);
  const tempo = useRef(Math.random() * 10);
  useFrame((_, dt) => {
    tempo.current += Math.min(dt, 0.1);
    const nomeClipe = clipe(tempo.current);
    const a = rig.acoes[nomeClipe] ?? rig.acoes.idle;
    if (a && a !== rig.atual) {
      rig.atual?.fadeOut(0.45);
      a.reset();
      a.time = Math.random() * a.getClip().duration;
      a.setEffectiveWeight(1).fadeIn(0.45).play();
      rig.atual = a;
    }
    rig.mixer.update(Math.min(dt, 0.1));
    if (mover && grupo.current) mover(tempo.current, grupo.current);
  });
  return (
    <group ref={grupo} position={[lugar.x, lugar.y ?? 0, lugar.z]} rotation={[0, lugar.yaw, 0]} userData={{ semReflexo: true }}>
      <primitive object={rig.c} />
      {etiqueta && (
        <sprite position={[0, altura, 0]} scale={[0.95, 0.18, 1]}>
          <spriteMaterial map={etiqueta} transparent depthWrite={false} toneMapped={false} />
        </sprite>
      )}
    </group>
  );
}

export function Pessoa(props: PropsPessoa) {
  return (
    <Protecao nome={props.nome ?? props.modelo}>
      <Suspense fallback={null}>
        <Corpo {...props} />
      </Suspense>
    </Protecao>
  );
}
