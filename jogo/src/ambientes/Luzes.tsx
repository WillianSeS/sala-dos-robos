/* Luzes em tempo real nas posições marcadas no Blender (vazios LUZ_*), com o clima de cada andar.
   Os focos de teto fazem as manchas de luz; a luz direcional acompanha o jogador para a sombra dele ficar nítida
   em qualquer ponto do andar. A quantidade de luzes depende do preset (cada luz custa em todo pixel). */
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import type { Preset } from '../motor/qualidade';
import type { NumeroAndar } from '../mundo/andares';
import { telemetria } from '../testes/telemetria';

let areaPronta = false;

export interface TemaLuz {
  teto: string;
  forcaTeto: number;
  pendente: string;
  letreiro: string;
  hemisferio: [string, string, number];
}

export const TEMAS: Record<NumeroAndar, TemaLuz> = {
  40: { teto: '#ffe2bf', forcaTeto: 1, pendente: '#ffc983', letreiro: '#f3d79a', hemisferio: ['#b9c4e6', '#3a2a1c', 0.32] },
  41: { teto: '#ffe6c8', forcaTeto: 1, pendente: '#fff0d4', letreiro: '#4cff8a', hemisferio: ['#b9d6c4', '#2a2a1c', 0.3] },
  42: { teto: '#b98cff', forcaTeto: 0.45, pendente: '#ff5fd2', letreiro: '#ff4dd2', hemisferio: ['#8a7ad6', '#1a1028', 0.22] },
  43: { teto: '#ffb46b', forcaTeto: 0.62, pendente: '#ffad5c', letreiro: '#ff9d3d', hemisferio: ['#c9a78a', '#2a1a10', 0.24] },
  44: { teto: '#ffd9b0', forcaTeto: 0.7, pendente: '#ffc983', letreiro: '#ff4d9a', hemisferio: ['#c9a0b4', '#2a1018', 0.26] },
};

/** Luz direcional que segue o jogador: sombra sempre nítida perto dele, com o mapa de sombra pequeno. */
function SombraDoJogador({ preset }: { preset: Preset }) {
  const luz = useRef<THREE.DirectionalLight>(null);
  const alvo = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    const l = luz.current;
    if (!l) return;
    const p = telemetria.pos;
    // arredonda para não "tremer" a sombra quando o jogador anda
    const x = Math.round(p.x * 8) / 8;
    const z = Math.round(p.z * 8) / 8;
    l.position.set(x + 1.5, 9, z + 3.5);
    alvo.position.set(x, 0, z);
    alvo.updateMatrixWorld();
  });
  return (
    <>
      <primitive object={alvo} />
      <directionalLight
        ref={luz}
        target={alvo}
        intensity={preset.sombras ? 0.55 : 0.35}
        color="#ffe6c9"
        castShadow={preset.sombras}
        shadow-mapSize={[preset.tamanhoSombra, preset.tamanhoSombra]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-near={1}
        shadow-camera-far={20}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
    </>
  );
}

export function Luzes({ luzes, preset, tema }: { luzes: Record<string, THREE.Vector3>; preset: Preset; tema: TemaLuz }) {
  useEffect(() => {
    if (!areaPronta) {
      RectAreaLightUniformsLib.init();
      areaPronta = true;
    }
  }, []);

  const { sala, hall, corredor } = useMemo(() => {
    const todas = Object.entries(luzes).filter(([n]) => n.startsWith('LUZ_teto') || n === 'LUZ_corredor');
    const sala = todas.filter(([n]) => /^LUZ_teto_\d+$/.test(n)).map(([n, p]) => ({ n, p }));
    const hall = todas.filter(([n]) => n.startsWith('LUZ_teto_hall')).map(([n, p]) => ({ n, p }));
    const corredor = todas.filter(([n]) => n === 'LUZ_teto_corredor' || n === 'LUZ_corredor').map(([n, p]) => ({ n, p }));
    return { sala, hall, corredor };
  }, [luzes]);

  // Econômico: metade dos focos da sala, mais fortes; hall com um foco só (o do meio) fora do Ultra
  const extras = preset.luzesExtras;
  const ultra = preset.posProcessamento === 'completo';
  const focos = useMemo(() => {
    const lista = [
      ...sala.filter((_, i) => extras || i % 2 === 0).map((f) => ({ ...f, forca: (extras ? 26 : 40) * tema.forcaTeto, cor: tema.teto })),
      ...corredor.map((f) => ({ ...f, forca: 18, cor: '#ffe2bf' })),
      ...hall.filter((f) => ultra || f.n.endsWith('_2')).map((f) => ({ ...f, forca: ultra ? 16 : 28, cor: '#ffe2bf' })),
    ];
    return lista.map((f) => {
      const alvo = new THREE.Object3D();
      alvo.position.set(f.p.x, 0, f.p.z);
      return { ...f, alvo };
    });
  }, [sala, hall, corredor, extras, ultra, tema]);

  const pendentes = useMemo(() => Object.entries(luzes).filter(([n]) => n.startsWith('LUZ_pendente')).map(([, p]) => p), [luzes]);
  const abajur = luzes.LUZ_abajur;
  const janela = luzes.LUZ_janela;
  const letreiro = luzes.LUZ_letreiro;

  return (
    <>
      <hemisphereLight args={tema.hemisferio} />
      {focos.map((f) => (
        <spotLight key={f.n} position={[f.p.x, f.p.y, f.p.z]} target={f.alvo} angle={0.95} penumbra={0.75} intensity={f.forca} distance={9} decay={1.6} color={f.cor} />
      ))}
      {focos.map((f) => (
        <primitive key={`alvo-${f.n}`} object={f.alvo} />
      ))}
      {extras && pendentes.map((p, i) => <pointLight key={i} position={[p.x, p.y, p.z]} intensity={2.2} distance={3.4} decay={1.8} color={tema.pendente} />)}
      {!extras && pendentes[1] && <pointLight position={[pendentes[1].x, pendentes[1].y, pendentes[1].z]} intensity={5} distance={4} decay={1.6} color={tema.pendente} />}
      {abajur && <pointLight position={[abajur.x, abajur.y, abajur.z]} intensity={3} distance={4} decay={1.7} color="#ffcf98" />}
      {letreiro && <pointLight position={[letreiro.x, letreiro.y, letreiro.z + 0.4]} intensity={3.2} distance={5} decay={1.8} color={tema.letreiro} />}
      {janela && extras && (
        <rectAreaLight position={[janela.x, janela.y, janela.z - 0.25]} width={janela.z < -6 ? 13 : 8.6} height={2.8} intensity={1.6} color="#5d74c9" />
      )}
      <SombraDoJogador preset={preset} />
    </>
  );
}
