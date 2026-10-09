/* Canvas 3D: renderizador, física (Rapier), ambiente HDRI, fachada (entrada e vista externa), andar atual,
   elevador, jogador, cidade e efeitos. Cada andar carrega no seu próprio Suspense: a cabine e o jogador
   continuam na cena enquanto o destino do elevador carrega. */
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Suspense, useEffect } from 'react';
import * as THREE from 'three';
import { Cidade } from '../ambientes/Cidade';
import { useJogo } from '../estado/jogo';
import { Jogador } from '../jogador/Jogador';
import { Andar } from '../mundo/Andar';
import { Elevador } from '../mundo/Elevador';
import { alturaAndar, Exterior } from '../mundo/Exterior';
import { Cliques, Interacoes } from '../mundo/Interacoes';
import { Consumo } from '../jogos/Servico';
import { GanchosFisica, GanchosTeste } from '../testes/GanchosTeste';
import { modoGravacao, modoTeste, telemetria } from '../testes/telemetria';
import { Ambiente } from './Ambiente';
import { Efeitos } from './Efeitos';
import { PRESETS, type Preset } from './qualidade';
import { Precarregar } from './Precarregar';

/** Marca o interior como pronto depois que o andar montou e alguns quadros foram desenhados. */
function ProntoJogo() {
  const andarPronto = useJogo((s) => s.andarPronto);
  const setCarregado = useJogo((s) => s.setCarregado);
  useEffect(() => {
    if (andarPronto === null) return;
    let n = 0;
    let id = 0;
    const passo = () => {
      if (++n > 3) setCarregado(true);
      else id = requestAnimationFrame(passo);
    };
    id = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(id);
  }, [andarPronto, setCarregado]);
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

function Interior({ preset }: { preset: Preset }) {
  const andar = useJogo((s) => s.andar);
  const vista = useJogo((s) => s.vista);
  return (
    <Physics timeStep="vary" interpolate={false} gravity={[0, -9.81, 0]}>
      <group visible={vista !== 'externa'}>
        <Suspense fallback={null}>
          <Andar key={andar} n={andar} preset={preset} />
        </Suspense>
        <Suspense fallback={null}>
          <Elevador />
        </Suspense>
        <Suspense fallback={null}>
          <Jogador preset={preset} />
        </Suspense>
      </group>
      <Interacoes />
      <Consumo />
      <ProntoJogo />
      {modoTeste && <GanchosFisica />}
    </Physics>
  );
}

export function Cena({ onElemento }: { onElemento?: (el: HTMLDivElement | null) => void }) {
  const qualidade = useJogo((s) => s.qualidade);
  const etapa = useJogo((s) => s.etapa);
  const vista = useJogo((s) => s.vista);
  const andar = useJogo((s) => s.andar);
  const preset = PRESETS[qualidade];
  const fora = etapa !== 'jogo' || vista === 'externa';
  return (
    <div ref={onElemento} className="palco">
      <Canvas
        shadows={preset.sombras ? 'percentage' : false}
        dpr={preset.dpr}
        gl={{ antialias: preset.posProcessamento === 'nenhum', powerPreference: 'high-performance' }}
        camera={{ fov: 62, near: 0.05, far: 3200, position: [0, 30, 160] }}
        frameloop={modoGravacao ? 'never' : 'always'}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.AgXToneMapping;
          gl.toneMappingExposure = 1.05;
          gl.localClippingEnabled = true;
        }}
      >
        <color attach="background" args={['#05060c']} />
        <Suspense fallback={null}>
          <Ambiente resolucao={preset.posProcessamento === 'completo' ? 512 : 256} intensidade={0.55} />
          {fora && (
            <Suspense fallback={null}>
              <Exterior preset={preset} />
            </Suspense>
          )}
          {etapa === 'jogo' && <Interior preset={preset} />}
          <Cidade quantidade={preset.predios} distancia={preset.distancia} chao={fora ? -0.4 : -alturaAndar(andar)} frenteLivre={fora} />
          <Efeitos preset={preset} />
          {etapa !== 'jogo' && <Precarregar preset={preset} />}
        </Suspense>
        <Cliques />
        <Medidor />
        {modoTeste && <GanchosTeste />}
      </Canvas>
    </div>
  );
}
