/* Luzes em tempo real nas posições marcadas no Blender (vazios LUZ_*). O ambiente HDRI dá os reflexos;
   as luzes de teto fazem os focos; uma luz direcional suave, alinhada ao teto, projeta a sombra do personagem. */
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import type { Preset } from '../motor/qualidade';

let areaPronta = false;

export function Luzes({ luzes, preset }: { luzes: Record<string, THREE.Vector3>; preset: Preset }) {
  useEffect(() => {
    if (!areaPronta) {
      RectAreaLightUniformsLib.init();
      areaPronta = true;
    }
  }, []);

  const teto = useMemo(
    () =>
      Object.entries(luzes)
        .filter(([n]) => n.startsWith('LUZ_teto') || n === 'LUZ_corredor')
        .map(([n, p]) => ({ n, p })),
    [luzes],
  );
  const pendentes = useMemo(() => Object.entries(luzes).filter(([n]) => n.startsWith('LUZ_pendente')).map(([, p]) => p), [luzes]);
  const abajur = luzes.LUZ_abajur;
  const janela = luzes.LUZ_janela;

  const alvos = useMemo(() => teto.map(({ p }) => { const o = new THREE.Object3D(); o.position.set(p.x, 0, p.z); return o; }), [teto]);

  return (
    <>
      <hemisphereLight args={['#b9c4e6', '#3a2a1c', 0.32]} />
      {teto.map(({ n, p }, i) =>
        preset.luzesExtras || i % 2 === 0 ? (
          <spotLight
            key={n}
            position={[p.x, p.y, p.z]}
            target={alvos[i]}
            angle={0.95}
            penumbra={0.75}
            intensity={preset.luzesExtras ? 26 : 40}
            distance={9}
            decay={1.6}
            color="#ffe2bf"
          />
        ) : null,
      )}
      {alvos.map((o, i) => (
        <primitive key={i} object={o} />
      ))}
      {preset.luzesExtras &&
        pendentes.map((p, i) => <pointLight key={i} position={[p.x, p.y, p.z]} intensity={2.2} distance={3.2} decay={1.8} color="#ffc983" />)}
      {!preset.luzesExtras && pendentes[1] && (
        <pointLight position={[pendentes[1].x, pendentes[1].y, pendentes[1].z]} intensity={5} distance={4} decay={1.6} color="#ffc983" />
      )}
      {abajur && <pointLight position={[abajur.x, abajur.y, abajur.z]} intensity={3} distance={4} decay={1.7} color="#ffcf98" />}
      {janela && preset.luzesExtras && (
        <rectAreaLight position={[janela.x, janela.y, janela.z - 0.25]} rotation={[0, 0, 0]} width={8.6} height={2.8} intensity={1.6} color="#5d74c9" />
      )}
      <directionalLight
        position={[1.5, 9, 3.5]}
        intensity={preset.sombras ? 0.55 : 0.35}
        color="#ffe6c9"
        castShadow={preset.sombras}
        shadow-mapSize={[preset.tamanhoSombra, preset.tamanhoSombra]}
        shadow-camera-left={-6.5}
        shadow-camera-right={6.5}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-camera-near={1}
        shadow-camera-far={20}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
    </>
  );
}
