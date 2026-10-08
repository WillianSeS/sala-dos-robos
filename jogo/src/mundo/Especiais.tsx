/* Efeitos próprios de cada andar: pista de LED e globo espelhado com fachos coloridos na discoteca (42)
   e luzes de palco no Las Vegas Night (44). */
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Preset } from '../motor/qualidade';
import type { NumeroAndar } from './andares';
import type { DadosAndar } from './Andar';
import { aplicarCorte } from './comandos';

const CORES_DISCO = ['#ff3fd2', '#38d9ff', '#ffd23f', '#8a5cff'];

/** Pista de LED: 12 × 10 placas que mudam de cor em ondas (canvas redesenhado 12 vezes por segundo). */
function usePistaLed(pista: THREE.Mesh | null) {
  const { canvas, textura } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 320;
    const textura = new THREE.CanvasTexture(canvas);
    textura.colorSpace = THREE.SRGBColorSpace;
    textura.anisotropy = 8;
    return { canvas, textura };
  }, []);

  useEffect(() => {
    if (!pista) return;
    const original = pista.material as THREE.MeshStandardMaterial;
    const m = original.clone();
    m.map = textura;
    m.emissiveMap = textura;
    m.emissive.set('#ffffff');
    m.emissiveIntensity = 1.25;
    m.roughness = 0.18;
    m.toneMapped = false;
    aplicarCorte(m);
    pista.material = m;
    return () => {
      pista.material = original;
      m.dispose();
    };
  }, [pista, textura]);

  const t = useRef({ tempo: 0, ultimo: -1 });
  useFrame((_, dt) => {
    const s = t.current;
    s.tempo += dt;
    if (s.tempo - s.ultimo < 1 / 12) return;
    s.ultimo = s.tempo;
    const g = canvas.getContext('2d');
    if (!g) return;
    const nx = 12;
    const nz = 10;
    const w = canvas.width / nx;
    const h = canvas.height / nz;
    g.fillStyle = '#050307';
    g.fillRect(0, 0, canvas.width, canvas.height);
    const fase = Math.floor(s.tempo / 8) % 3; // troca o desenho a cada 8 s
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < nz; j++) {
        const cx = i - nx / 2 + 0.5;
        const cz = j - nz / 2 + 0.5;
        let v: number;
        let corIdx: number;
        if (fase === 0) {
          v = 0.5 + 0.5 * Math.sin(Math.hypot(cx, cz) * 0.9 - s.tempo * 4);
          corIdx = Math.floor(Math.hypot(cx, cz) / 2 + s.tempo * 0.5) % CORES_DISCO.length;
        } else if (fase === 1) {
          v = 0.5 + 0.5 * Math.sin(cx * 0.8 + s.tempo * 3.2) * Math.cos(cz * 0.7 - s.tempo * 2.1);
          corIdx = (i + j + Math.floor(s.tempo * 2)) % CORES_DISCO.length;
        } else {
          v = (i + j + Math.floor(s.tempo * 4)) % 4 === 0 ? 1 : 0.12;
          corIdx = (Math.floor(s.tempo * 1.5) + (i % 2)) % CORES_DISCO.length;
        }
        g.globalAlpha = 0.18 + 0.82 * v;
        g.fillStyle = CORES_DISCO[corIdx];
        g.fillRect(i * w + 3, j * h + 3, w - 6, h - 6);
      }
    }
    g.globalAlpha = 1;
    textura.needsUpdate = true;
  });
}

function Discoteca({ dados, preset }: { dados: DadosAndar; preset: Preset }) {
  usePistaLed(dados.pista);
  const quantos = preset.luzesExtras ? 4 : 2;
  const centro = useMemo(() => dados.globo?.getWorldPosition(new THREE.Vector3()) ?? new THREE.Vector3(0, 3, -2.6), [dados.globo]);
  const alvos = useMemo(() => Array.from({ length: quantos }, () => new THREE.Object3D()), [quantos]);
  const tempo = useRef(0);
  useFrame((_, dt) => {
    tempo.current += dt;
    if (dados.globo) dados.globo.rotation.y += dt * 0.55;
    alvos.forEach((o, i) => {
      const a = tempo.current * (0.55 + i * 0.12) + (i * Math.PI * 2) / quantos;
      o.position.set(centro.x + Math.cos(a) * 2.6, 0, centro.z + Math.sin(a * 1.3) * 2.1);
      o.updateMatrixWorld();
    });
  });
  return (
    <>
      {alvos.map((o, i) => (
        <group key={i}>
          <primitive object={o} />
          <spotLight
            position={[centro.x, centro.y - 0.25, centro.z]}
            target={o}
            angle={0.2}
            penumbra={0.45}
            intensity={55}
            distance={9}
            decay={1.2}
            color={CORES_DISCO[i % CORES_DISCO.length]}
          />
        </group>
      ))}
    </>
  );
}

function Palco({ dados, preset }: { dados: DadosAndar; preset: Preset }) {
  const focos = useMemo(() => {
    const lista = Object.entries(dados.luzes)
      .filter(([n]) => n.startsWith('LUZ_palco'))
      .map(([n, p]) => {
        const alvo = new THREE.Object3D();
        alvo.position.set(p.x * 0.6, 0.6, -6.9);
        return { n, p, alvo };
      });
    return preset.luzesExtras ? lista : lista.filter((_, i) => i === Math.floor(lista.length / 2));
  }, [dados.luzes, preset.luzesExtras]);
  const luzes = useRef<(THREE.SpotLight | null)[]>([]);
  const tempo = useRef(0);
  useFrame((_, dt) => {
    tempo.current += dt;
    // respiração lenta da luz de palco
    luzes.current.forEach((l, i) => {
      if (l) l.intensity = 42 + 8 * Math.sin(tempo.current * 0.9 + i * 1.7);
    });
  });
  return (
    <>
      {focos.map((f, i) => (
        <group key={f.n}>
          <primitive object={f.alvo} />
          <spotLight
            ref={(l) => {
              luzes.current[i] = l;
            }}
            position={[f.p.x, f.p.y, f.p.z]}
            target={f.alvo}
            angle={0.5}
            penumbra={0.6}
            intensity={45}
            distance={9}
            decay={1.3}
            color="#ffe0bd"
          />
        </group>
      ))}
    </>
  );
}

export function Especiais({ n, dados, preset }: { n: NumeroAndar; dados: DadosAndar; preset: Preset }) {
  if (n === 42) return <Discoteca dados={dados} preset={preset} />;
  if (n === 44) return <Palco dados={dados} preset={preset} />;
  return null;
}
