/* Trânsito na rua em frente ao prédio: carros instanciados (carroceria arredondada, vidros, rodas, faróis e
   lanternas acesas) circulando nas quatro faixas. */
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const FAIXAS = [
  { z: 29.75, sentido: 1 },
  { z: 33.25, sentido: 1 },
  { z: 36.75, sentido: -1 },
  { z: 40.25, sentido: -1 },
];
const LIMITE = 115;
const CORES = ['#1b1d24', '#e8e6e1', '#7a0d16', '#0e2a52', '#4a4f57', '#c9a227', '#101010', '#2d4a3a'];

interface Carro {
  faixa: number;
  x: number;
  vel: number;
  cor: THREE.Color;
}

export function Carros({ quantidade }: { quantidade: number }) {
  const carros = useMemo<Carro[]>(() => {
    const lista: Carro[] = [];
    for (let i = 0; i < quantidade; i++) {
      const faixa = i % FAIXAS.length;
      lista.push({
        faixa,
        x: -LIMITE + ((i * 61) % (LIMITE * 2)),
        vel: 9 + ((i * 37) % 7),
        cor: new THREE.Color(CORES[i % CORES.length]),
      });
    }
    return lista;
  }, [quantidade]);

  const geo = useMemo(() => {
    const corpo = new RoundedBoxGeometry(4.5, 0.78, 1.86, 3, 0.22);
    const cabine = new RoundedBoxGeometry(2.5, 0.62, 1.66, 3, 0.2);
    const roda = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 18);
    roda.rotateX(Math.PI / 2);
    const luz = new THREE.BoxGeometry(0.06, 0.12, 0.38);
    return { corpo, cabine, roda, luz };
  }, []);

  const mat = useMemo(
    () => ({
      corpo: new THREE.MeshPhysicalMaterial({ roughness: 0.32, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.08 }),
      vidro: new THREE.MeshStandardMaterial({ color: '#0a0c12', roughness: 0.05, metalness: 0.9 }),
      roda: new THREE.MeshStandardMaterial({ color: '#0b0b0c', roughness: 0.75 }),
      farol: new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff4d8').multiplyScalar(4), toneMapped: false }),
      lanterna: new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff1a1a').multiplyScalar(3), toneMapped: false }),
    }),
    [],
  );

  const refs = {
    corpo: useRef<THREE.InstancedMesh>(null),
    cabine: useRef<THREE.InstancedMesh>(null),
    roda: useRef<THREE.InstancedMesh>(null),
    farol: useRef<THREE.InstancedMesh>(null),
    lanterna: useRef<THREE.InstancedMesh>(null),
  };
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const um = useMemo(() => new THREE.Vector3(1, 1, 1), []);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const giro = useMemo(() => new THREE.Quaternion(), []);
  const eixo = useMemo(() => new THREE.Vector3(0, 0, 1), []);
  const tempo = useRef(0);
  const coresProntas = useRef(false);

  useFrame((_, dt) => {
    tempo.current += dt;
    const corpo = refs.corpo.current;
    const cabine = refs.cabine.current;
    const roda = refs.roda.current;
    const farol = refs.farol.current;
    const lanterna = refs.lanterna.current;
    if (!corpo || !cabine || !roda || !farol || !lanterna) return;
    carros.forEach((c, i) => {
      const f = FAIXAS[c.faixa];
      c.x += f.sentido * c.vel * Math.min(dt, 0.1);
      if (c.x > LIMITE) c.x = -LIMITE;
      if (c.x < -LIMITE) c.x = LIMITE;
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, f.sentido > 0 ? 0 : Math.PI);
      const s = f.sentido;
      m.compose(pos.set(c.x, 0.62, f.z), q, um);
      corpo.setMatrixAt(i, m);
      m.compose(pos.set(c.x - s * 0.25, 1.2, f.z), q, um);
      cabine.setMatrixAt(i, m);
      giro.setFromAxisAngle(eixo, -s * ((c.x / 0.34) % (Math.PI * 2)));
      for (let k = 0; k < 4; k++) {
        const dx = (k < 2 ? 1.45 : -1.45) * s;
        const dz = k % 2 === 0 ? 0.86 : -0.86;
        m.compose(pos.set(c.x + dx, 0.34, f.z + dz), giro, um);
        roda.setMatrixAt(i * 4 + k, m);
      }
      for (let k = 0; k < 2; k++) {
        const dz = k === 0 ? 0.62 : -0.62;
        m.compose(pos.set(c.x + s * 2.25, 0.72, f.z + dz), q, um);
        farol.setMatrixAt(i * 2 + k, m);
        m.compose(pos.set(c.x - s * 2.25, 0.78, f.z + dz), q, um);
        lanterna.setMatrixAt(i * 2 + k, m);
      }
      if (!coresProntas.current) corpo.setColorAt(i, c.cor);
    });
    coresProntas.current = true;
    for (const im of [corpo, cabine, roda, farol, lanterna]) im.instanceMatrix.needsUpdate = true;
    if (corpo.instanceColor) corpo.instanceColor.needsUpdate = true;
  });

  const n = carros.length;
  return (
    <group>
      <instancedMesh ref={refs.corpo} args={[geo.corpo, mat.corpo, n]} frustumCulled={false} />
      <instancedMesh ref={refs.cabine} args={[geo.cabine, mat.vidro, n]} frustumCulled={false} />
      <instancedMesh ref={refs.roda} args={[geo.roda, mat.roda, n * 4]} frustumCulled={false} />
      <instancedMesh ref={refs.farol} args={[geo.luz, mat.farol, n * 2]} frustumCulled={false} />
      <instancedMesh ref={refs.lanterna} args={[geo.luz, mat.lanterna, n * 2]} frustumCulled={false} />
    </group>
  );
}
