/** NPCs Rocketbox reais da fase 3. A cena e o elevador continuam carregando mesmo que
 * os personagens ainda não tenham terminado de baixar. Não há trading com dinheiro real. */
import { useFrame } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { clone as clonarComEsqueleto } from 'three/addons/utils/SkeletonUtils.js';
import { useJogo } from '../estado/jogo';
import { useModelo } from '../motor/carregar';
import { candidatar, retirar } from './interacoes';
import { boasVindas40, PESSOAS40, resultadoSimulado, type Pessoa40 } from './equipe40';

const ATIVOS = new Set<string>();

/** Textos projetados no mundo 3D sem dependências de fontes externas. */
function cracha(p: Pessoa40, pnl: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 150;
  const g = canvas.getContext('2d')!;
  const fundo = p.funcao === 'aurora' ? '#21233a' : '#0e1922';
  g.fillStyle = fundo; g.fillRect(0, 0, 512, 150);
  g.strokeStyle = p.funcao === 'aurora' ? '#d7b26e' : '#507784';
  g.lineWidth = 5; g.strokeRect(3, 3, 506, 144);
  g.textAlign = 'center';
  g.fillStyle = '#fff7e5'; g.font = 'bold 29px Arial';
  g.fillText(p.nome, 256, 58, 490);
  g.font = 'bold 22px Arial'; g.fillStyle = p.funcao === 'aurora' ? '#f4db99' : '#87d4bc';
  const detalhe = p.funcao === 'aurora' ? 'RECEPÇÃO · AURORA'
    : `SIMULAÇÃO · ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}`;
  g.fillText(detalhe, 256, 105, 490);
  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  return textura;
}

function falarAurora(frase: string) {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const voz = new SpeechSynthesisUtterance(frase);
    voz.lang = 'pt-BR'; voz.rate = 0.94; voz.pitch = 1.1;
    window.speechSynthesis.speak(voz);
  } catch {
    // Voz opcional: o balão de texto continua funcionando mesmo sem áudio.
  }
}

type Marco = { x: number; z: number; yaw: number };

function Pessoa({ pessoa, indice, lugar }: { pessoa: Pessoa40; indice: number; lugar: Marco }) {
  const { scene } = useModelo('people/' + pessoa.modelo + '.json');
  const anim = useModelo('people/anim_' + (pessoa.modelo.includes('Female') ? 'f' : 'm') + '.json');
  const rig = useMemo(() => {
    const c = clonarComEsqueleto(scene);
    c.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true; m.receiveShadow = true;
    });
    const mixer = new THREE.AnimationMixer(c);
    const acoes: Record<string, THREE.AnimationAction> = {};
    for (const clip of anim.animations) acoes[clip.name] = mixer.clipAction(clip);
    const spine = c.getObjectByName('Bip01_Spine');
    const neck = c.getObjectByName('Bip01_Neck');
    const arm = c.getObjectByName('Bip01_R_Forearm');
    return {
      c, mixer, acoes, atual: null as THREE.AnimationAction | null, nomeAtual: '', ate: 0, troca: 0, falandoAte: 0,
      spine, neck, arm,
      spineBase: spine?.quaternion.clone(), neckBase: neck?.quaternion.clone(),
      armBase: arm?.quaternion.clone(), q: new THREE.Quaternion(),
    };
  }, [scene, anim.animations]);
  const etiqueta = useMemo(() => cracha(pessoa, 0), [pessoa]);
  const ultimo = useRef(-1);

  useEffect(() => {
    ATIVOS.add(pessoa.id);
    const { x, z } = lugar;
    candidatar({
      id: 'pessoa40-' + pessoa.id, rotulo: pessoa.funcao === 'aurora' ? 'Conversar com Aurora' : 'Conversar com ' + pessoa.nome,
      x, z, alcance: 1.45, prioridade: pessoa.funcao === 'aurora' ? 0.25 : 0,
      acao: () => {
        const nome = useJogo.getState().nome;
        if (pessoa.funcao === 'aurora') {
          const frase = boasVindas40(nome);
          useJogo.getState().avisar(frase);
          falarAurora(frase);
          rig.falandoAte = performance.now() / 1000 + 6;
        } else {
          const ganho = resultadoSimulado(indice, performance.now() / 1000);
          useJogo.getState().avisar(`${pessoa.nome}: mercado de demonstração, resultado ${ganho >= 0 ? '+' : ''}${ganho.toFixed(2)} fictício.`);
        }
      },
    });
    return () => {
      ATIVOS.delete(pessoa.id);
      retirar('pessoa40-' + pessoa.id);
    };
  }, [pessoa, indice, lugar, rig]);

  useEffect(() => () => etiqueta.dispose(), [etiqueta]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    // clipe de captura de movimento: traders trabalham sentados (às vezes comemoram ou se frustram com a
    // simulação); Aurora fica de pé e gesticula quando conversa
    let nome: string;
    if (pessoa.funcao === 'aurora') nome = performance.now() / 1000 < rig.falandoAte ? 'talk' : t % 24 > 20 ? 'lookAround' : 'idle';
    else {
      if (t > rig.troca) {
        const delta = resultadoSimulado(indice, t) - resultadoSimulado(indice, t - 6);
        rig.ate = t + (Math.abs(delta) > 9 ? 3.5 : 12 + (indice % 5) * 3);
        rig.nomeAtual = Math.abs(delta) > 9 ? (delta > 0 ? 'cheer' : 'frustr') : Math.floor(t / 12) % 3 === indice % 3 ? 'sitLook' : 'sitWork';
        rig.troca = rig.ate;
      }
      nome = rig.nomeAtual || 'sitWork';
    }
    const acao = rig.acoes[nome] ?? rig.acoes.idle;
    if (acao && acao !== rig.atual) {
      rig.atual?.fadeOut(0.5);
      acao.reset();
      acao.time = Math.random() * acao.getClip().duration;
      acao.setEffectiveWeight(1).fadeIn(0.5).play();
      rig.atual = acao;
    }
    rig.mixer.update(Math.min(dt, 0.1));
    // O movimento é nos ossos, sem deslocar o personagem através das paredes.
    // Respiração, olhar e pequenas ações de braços são independentes para cada avatar.
    if (rig.spine && rig.spineBase) {
      rig.spine.quaternion.copy(rig.spineBase)
        .multiply(rig.q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, Math.sin(t * 0.88 + indice) * 0.013));
    }
    if (rig.neck && rig.neckBase) {
      rig.neck.quaternion.copy(rig.neckBase)
        .multiply(rig.q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, Math.sin(t * 0.37 + indice * 2) * 0.065));
    }
    if (rig.arm && rig.armBase) {
      rig.arm.quaternion.copy(rig.armBase)
        .multiply(rig.q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, Math.sin(t * 1.7 + indice) * 0.055));
    }
    const bloco = Math.floor(t / 4);
    if (pessoa.funcao === 'trader' && ultimo.current !== bloco) {
      ultimo.current = bloco;
      // Atualiza somente o canvas associado à textura; não cria textura a cada quadro.
      const valor = resultadoSimulado(indice, t);
      const c = etiqueta.image as HTMLCanvasElement;
      const g = c.getContext('2d')!;
      g.clearRect(0, 0, c.width, c.height);
      g.fillStyle = '#0e1922'; g.fillRect(0, 0, 512, 150);
      g.strokeStyle = '#507784'; g.lineWidth = 5; g.strokeRect(3, 3, 506, 144);
      g.textAlign = 'center'; g.fillStyle = '#fff7e5'; g.font = 'bold 29px Arial';
      g.fillText(pessoa.nome, 256, 58, 490);
      g.font = 'bold 22px Arial'; g.fillStyle = valor >= 0 ? '#87d4bc' : '#ff9b9b';
      g.fillText(`SIMULAÇÃO · ${valor >= 0 ? '+' : ''}${valor.toFixed(2)}`, 256, 105, 490);
      etiqueta.needsUpdate = true;
    }
  });

  return (
    <group position={[lugar.x, 0, lugar.z]} rotation={[0, lugar.yaw, 0]}
      userData={{ pessoa40: pessoa.id, semReflexo: true }}>
      <primitive object={rig.c} />
      <sprite position={[0, pessoa.funcao === 'aurora' ? 2.1 : 1.62, 0]} scale={[0.82, 0.24, 1]} userData={{ semReflexo: true }}>
        <spriteMaterial map={etiqueta} transparent depthWrite={false} toneMapped={false} />
      </sprite>
    </group>
  );
}

/** Reserva visual durante download dos modelos realistas. */
function lugarDe(p: Pessoa40, i: number, marcos: Record<string, Marco>): Marco {
  const m = p.funcao === 'aurora' ? marcos.PESSOA_aurora : marcos[`TRADER_${i - 1}`];
  return m ?? { x: p.pos[0], z: p.pos[1], yaw: p.yaw };
}

function Reservas({ marcos }: { marcos: Record<string, Marco> }) {
  return (
    <group userData={{ equipe40Carregando: true }}>
      {PESSOAS40.map((p, i) => (
        <group key={p.id} position={[lugarDe(p, i, marcos).x, 0, lugarDe(p, i, marcos).z]}>
          <mesh position={[0, 0.9, 0]}><capsuleGeometry args={[0.24, 1.15, 3, 8]} />
            <meshStandardMaterial color={p.funcao === 'aurora' ? '#c7a66f' : '#434a5c'} roughness={0.8} />
          </mesh>
          <mesh position={[0, 1.68, 0]}><sphereGeometry args={[0.23, 12, 10]} />
            <meshStandardMaterial color="#b3b7bc" roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Equipe40({ marcos }: { marcos: Record<string, Marco> }) {
  useEffect(() => {
    if (new URLSearchParams(location.search).has('teste')) {
      (window as unknown as { __equipe40?: unknown }).__equipe40 = {
        esperado: PESSOAS40.length,
        carregados: () => ATIVOS.size,
      };
    }
    return () => {
      if (new URLSearchParams(location.search).has('teste')) {
        delete (window as unknown as { __equipe40?: unknown }).__equipe40;
      }
    };
  }, []);
  return (
    <Suspense fallback={<Reservas marcos={marcos} />}>
      {PESSOAS40.map((p, i) => <Pessoa key={p.id} pessoa={p} indice={i} lugar={lugarDe(p, i, marcos)} />)}
    </Suspense>
  );
}
