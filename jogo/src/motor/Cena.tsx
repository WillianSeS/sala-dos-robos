/* Canvas 3D: renderizador, física (Rapier), ambiente HDRI, sala, jogador, cidade e efeitos. */
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Suspense, useEffect } from 'react';
import * as THREE from 'three';
import { Cidade } from '../ambientes/Cidade';
import { Sala, useSala } from '../ambientes/Sala';
import { useJogo } from '../estado/jogo';
import { Jogador } from '../jogador/Jogador';
import { GanchosTeste } from '../testes/GanchosTeste';
import { modoGravacao, modoTeste, telemetria } from '../testes/telemetria';
import { Ambiente } from './Ambiente';
import { Efeitos } from './Efeitos';
import { PRESETS, type Preset } from './qualidade';

function Mundo({ preset }: { preset: Preset }) {
  const dados = useSala(preset);
  const cenaPronta = useJogo((s) => s.cenaPronta);
  useEffect(() => {
    cenaPronta();
  }, [dados, preset.jogador, cenaPronta]);
  return (
    <>
      <Sala dados={dados} preset={preset} />
      <Jogador partida={dados.partida} preset={preset} />
    </>
  );
}

/** Marca o jogo como carregado depois que a cena montou e desenhou alguns quadros. */
function Pronto() {
  const setCarregado = useJogo((s) => s.setCarregado);
  useEffect(() => {
    let n = 0;
    let id = 0;
    const passo = () => {
      if (++n > 3) setCarregado(true);
      else id = requestAnimationFrame(passo);
    };
    id = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(id);
  }, [setCarregado]);
  return null;
}

function Medidor() {
  const acc = { t: 0, n: 0 };
  useFrame((_, dt) => {
    telemetria.quadros++;
    telemetria.tempo += dt;
    acc.t += dt;
    acc.n++;
    if (acc.t >= 0.5) {
      telemetria.fps = Math.round(acc.n / acc.t);
      acc.t = 0;
      acc.n = 0;
    }
  });
  return null;
}

export function Cena({ onElemento }: { onElemento?: (el: HTMLDivElement | null) => void }) {
  const qualidade = useJogo((s) => s.qualidade);
  const preset = PRESETS[qualidade];
  return (
    <div ref={onElemento} className="palco">
      <Canvas
        shadows={preset.sombras ? 'percentage' : false}
        dpr={preset.dpr}
        gl={{ antialias: preset.posProcessamento === 'nenhum', powerPreference: 'high-performance' }}
        camera={{ fov: 62, near: 0.05, far: 3200, position: [0, 1.7, 5] }}
        frameloop={modoGravacao ? 'never' : 'always'}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.AgXToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <color attach="background" args={['#05060c']} />
        <Suspense fallback={null}>
          <Ambiente resolucao={preset.posProcessamento === 'completo' ? 512 : 256} intensidade={0.55} />
          <Physics timeStep="vary" interpolate={false} gravity={[0, -9.81, 0]}>
            <Mundo preset={preset} />
            {modoTeste && <GanchosTeste />}
          </Physics>
          <Cidade quantidade={preset.predios} distancia={preset.distancia} />
          <Efeitos preset={preset} />
          <Pronto />
        </Suspense>
        <Medidor />
      </Canvas>
    </div>
  );
}
