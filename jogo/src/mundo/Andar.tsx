/* Um andar do prédio: GLB modelado no Blender (ferramentas/blender/andar40.py e andares.py), colisores,
   luzes com o clima do ambiente, assentos, porta, visor do elevador e efeitos próprios (pista, globo, palco). */
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { Luzes, TEMAS } from '../ambientes/Luzes';
import { Porta } from '../ambientes/Porta';
import { useJogo } from '../estado/jogo';
import { useModelo } from '../motor/carregar';
import type { Preset } from '../motor/qualidade';
import { modeloAndar, type NumeroAndar } from './andares';
import { aplicarCorte, comandosJogador, type Assento, type Ponto } from './comandos';
import { Especiais } from './Especiais';
import { Equipe40 } from './Equipe40';
import { Telas40 } from './Telas40';
import { Protecao } from '../motor/Protecao';
import { materialIndicador } from './indicador';
import { candidatar, retirar } from './interacoes';

export interface Colisor {
  pos: [number, number, number];
  rot: [number, number, number];
  meia: [number, number, number];
}

export interface DadosAndar {
  cena: THREE.Object3D;
  colisores: Colisor[];
  luzes: Record<string, THREE.Vector3>;
  partida: Ponto;
  porta: THREE.Object3D | null;
  assentos: Assento[];
  pista: THREE.Mesh | null;
  globo: THREE.Object3D | null;
  centro: [number, number, number];
  marcos: Record<string, Ponto & { y: number }>;
  malhas: Record<string, THREE.Mesh>;
}

const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();

/** Distância do assento ao ponto onde o personagem fica em pé antes de sentar (vem do clipe sitDown). */
export const RECUO_SENTAR = 0.461;

/** Lê os marcadores do GLB e prepara materiais. Serve para os andares e para a cabine do elevador. */
export function prepararCena(scene: THREE.Object3D) {
  const raiz = scene.clone(true);
  raiz.updateMatrixWorld(true);
  const colisores: Colisor[] = [];
  const luzes: Record<string, THREE.Vector3> = {};
  const marcos: Record<string, Ponto & { y: number }> = {};
  const malhas: Record<string, THREE.Mesh> = {};
  const assentos: Assento[] = [];
  const remover: THREE.Object3D[] = [];
  raiz.traverse((o) => {
    if (o.name.startsWith('COL_')) {
      o.matrixWorld.decompose(_p, _q, _s);
      _e.setFromQuaternion(_q, 'YXZ');
      colisores.push({ pos: [_p.x, _p.y, _p.z], rot: [_e.x, _e.y, _e.z], meia: [Math.abs(_s.x), Math.abs(_s.y), Math.abs(_s.z)] });
      remover.push(o);
      return;
    }
    if (o.name.startsWith('LUZ_')) luzes[o.name] = o.getWorldPosition(new THREE.Vector3());
    if (/^(SPAWN_|PONTO_|MIRA_|SENTAR_|TRADER_|PESSOA_)/.test(o.name)) {
      o.matrixWorld.decompose(_p, _q, _s);
      const yaw = _e.setFromQuaternion(_q, 'YXZ').y;
      marcos[o.name] = { x: _p.x, y: _p.y, z: _p.z, yaw };
      if (o.name.startsWith('SENTAR_')) assentos.push({ id: o.name, x: _p.x, z: _p.z, yaw });
    }
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    if (/^(TELA_|BOTAO_|PORTA_|MOVEL_|VIDRO_)/.test(o.name)) malhas[o.name] = m;
    m.receiveShadow = true;
    m.castShadow = !o.name.startsWith('VIDRO') && !o.name.includes('teto') && !o.name.includes('led');
    const lista = Array.isArray(m.material) ? m.material : [m.material];
    for (const mat of lista) {
      aplicarCorte(mat);
      const s = mat as THREE.MeshStandardMaterial;
      if (!s.isMeshStandardMaterial) continue;
      if (o.name.startsWith('VIDRO')) {
        s.envMapIntensity = 1.4;
        s.depthWrite = false;
        m.castShadow = false;
        m.renderOrder = 2;
      } else if (o.name.startsWith('TELA')) {
        s.toneMapped = false;
      } else {
        s.envMapIntensity = s.name === 'espelho' ? 1.6 : 0.75;
        // veludo: o brilho rasante (sheen) exportado pelo Blender fica forte demais no three.js
        const f = s as THREE.MeshPhysicalMaterial;
        if (s.name.startsWith('veludo') && f.isMeshPhysicalMaterial) {
          f.sheen = 0.6;
          f.sheenColor.copy(f.color).multiplyScalar(0.55);
          f.sheenRoughness = 0.75;
          f.envMapIntensity = 0.35;
        }
      }
    }
  });
  for (const o of remover) o.removeFromParent();
  return { raiz, colisores, luzes, marcos, malhas, assentos };
}

export function useAndar(n: NumeroAndar, preset: Preset): DadosAndar {
  const ultra = preset.posProcessamento === 'completo';
  const { scene } = useModelo(modeloAndar(n, ultra));
  return useMemo(() => {
    const { raiz, colisores, luzes, marcos, malhas, assentos } = prepararCena(scene);
    // a folha da porta (com os puxadores, filhos dela) vira um corpo cinemático próprio
    const porta = malhas.PORTA_folha ?? null;
    if (porta) porta.removeFromParent();
    const indicador = malhas.TELA_indicador_hall;
    if (indicador) indicador.material = materialIndicador('largo');
    const s = marcos.SPAWN_jogador;
    const partida: Ponto = s ? { x: s.x, z: s.z, yaw: s.yaw } : { x: 3.2, z: 8.5, yaw: Math.PI };
    // ponto de captura dos reflexos: meio da sala principal
    const centro: [number, number, number] = [0, 1.7, -2];
    return { cena: raiz, colisores, luzes, partida, porta, assentos, pista: malhas.TELA_pista ?? null, globo: malhas.MOVEL_globo ?? null, centro, marcos, malhas };
  }, [scene]);
}

/** Cada assento vira um ponto de interação "Sentar" (no lugar onde o personagem fica em pé, à frente dele). */
function Assentos({ assentos }: { assentos: Assento[] }) {
  useEffect(() => {
    for (const a of assentos) {
      candidatar({
        id: a.id,
        rotulo: 'Sentar',
        tipo: 'sentar',
        x: a.x + Math.sin(a.yaw) * RECUO_SENTAR,
        z: a.z + Math.cos(a.yaw) * RECUO_SENTAR,
        alcance: 0.95,
        acao: () => {
          comandosJogador.sentar = a;
        },
      });
    }
    return () => {
      for (const a of assentos) retirar(a.id);
    };
  }, [assentos]);
  return null;
}

export function Andar({ n, preset }: { n: NumeroAndar; preset: Preset }) {
  const dados = useAndar(n, preset);
  useEffect(() => {
    const jogo = useJogo.getState();
    if (comandosJogador.nascerNoSpawn) {
      comandosJogador.teleporte = dados.partida;
      comandosJogador.nascerNoSpawn = false;
    }
    jogo.setAndarPronto(n);
    if (jogo.vista !== 'externa') jogo.cenaPronta(dados.centro);
    return () => {
      if (useJogo.getState().andarPronto === n) useJogo.getState().setAndarPronto(null);
    };
  }, [dados, n]);
  return (
    <>
      <primitive object={dados.cena} />
      <RigidBody type="fixed" colliders={false}>
        {dados.colisores.map((c, i) => (
          <CuboidCollider key={i} args={c.meia} position={c.pos} rotation={c.rot} />
        ))}
      </RigidBody>
      {dados.porta && <Porta objeto={dados.porta} />}
      <Assentos assentos={dados.assentos} />
      <Luzes luzes={dados.luzes} preset={preset} tema={TEMAS[n]} />
      <Especiais n={n} dados={dados} preset={preset} />
      {n === 40 && (
        <Protecao nome="equipe do 40º">
          <Equipe40 marcos={dados.marcos} />
        </Protecao>
      )}
      {n === 40 && <Telas40 malhas={dados.malhas} />}
    </>
  );
}
