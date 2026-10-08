/* Jogador: corpo cinemático do Rapier (cápsula de 1,80 m) + personagem animado + câmera em 3ª/1ª pessoa. */
import { useFrame, useThree } from '@react-three/fiber';
import {
  CapsuleCollider,
  RigidBody,
  useAfterPhysicsStep,
  useBeforePhysicsStep,
  useRapier,
  type RapierCollider,
  type RapierRigidBody,
} from '@react-three/rapier';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { clone as clonarComEsqueleto } from 'three/addons/utils/SkeletonUtils.js';
import type { KinematicCharacterController } from '@dimforge/rapier3d-compat';
import { CLIPE, escalaTempo, proximoEstado, transicao, type EstadoLocomocao, type Naturais } from '../animacao/locomocao';
import { aplicarOlhar, limitarDistancia, LIMITES, posicaoOrbita } from '../camera/orbita';
import { consumirOlhar, entrada } from '../controles/entrada';
import {
  anguloDe,
  aproximar,
  corridaTeclado,
  direcaoMundo,
  eixoFinal,
  girarPara,
  velocidadeAlvo,
} from '../controles/movimento';
import { useJogo } from '../estado/jogo';
import { useModelo } from '../motor/carregar';
import type { Preset } from '../motor/qualidade';
import { acoesTeste, telemetria } from '../testes/telemetria';

const ALTURA_OLHOS = 1.62;
const ALVO_TERCEIRA = 1.5;
const _v = new THREE.Vector3();
const _e = new THREE.Euler();

export interface Partida {
  pos: THREE.Vector3;
  yaw: number;
}

function sombraFalsa() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const r = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  r.addColorStop(0, 'rgba(0,0,0,0.55)');
  r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export function Jogador({ partida, preset }: { partida: Partida; preset: Preset }) {
  const gltf = useModelo(preset.jogador);
  const { world, rapier } = useRapier();
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const corpo = useRef<RapierRigidBody>(null);
  const colisor = useRef<RapierCollider>(null);
  const visual = useRef<THREE.Group>(null);
  const ctrl = useRef<KinematicCharacterController | null>(null);

  const avatar = useMemo(() => {
    const a = clonarComEsqueleto(gltf.scene);
    a.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.frustumCulled = false;
      for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
        const s = mat as THREE.MeshStandardMaterial;
        s.envMapIntensity = 0.8;
        if (s.alphaTest > 0) s.alphaToCoverage = true;
      }
    });
    return a;
  }, [gltf.scene]);

  const naturais = useMemo<Naturais>(() => {
    const c = (gltf.scene.getObjectByName('jogador')?.userData?.clipes ?? {}) as Record<string, { naturalSpeed?: number }>;
    return { walk: c.walk?.naturalSpeed || 1.01, run: c.run?.naturalSpeed || 2.88 };
  }, [gltf.scene]);

  const { mixer, acoes } = useMemo(() => {
    const mixer = new THREE.AnimationMixer(avatar);
    const acoes: Record<string, THREE.AnimationAction> = {};
    for (const clip of gltf.animations) acoes[clip.name] = mixer.clipAction(clip);
    acoes.lookAround?.setLoop(THREE.LoopOnce, 1);
    if (acoes.lookAround) acoes.lookAround.clampWhenFinished = false;
    return { mixer, acoes };
  }, [avatar, gltf.animations]);

  const ossos = useMemo(
    () => ({
      cabeca: avatar.getObjectByName('Bip01_Head')!,
      peEsq: avatar.getObjectByName('Bip01_L_Foot')!,
      peDir: avatar.getObjectByName('Bip01_R_Foot')!,
    }),
    [avatar],
  );

  const sombra = useMemo(() => sombraFalsa(), []);

  const s = useRef({
    vel: { x: 0, z: 0 },
    velY: 0,
    velReal: 0,
    noChao: true,
    yawCorpo: partida.yaw,
    yawCam: partida.yaw + Math.PI,
    pitch: 0.22,
    dist: LIMITES.terceira.dist as number,
    distAtual: LIMITES.terceira.dist as number,
    estado: 'parado' as EstadoLocomocao,
    tempoParado: 0,
    olhandoAte: 0,
    olhos: new THREE.Vector3(),
    olhosIniciados: false,
    alvo: new THREE.Vector3(),
    alvoIniciado: false,
  }).current;

  // controlador de personagem do Rapier (criado no efeito para sobreviver ao StrictMode)
  useEffect(() => {
    const c = world.createCharacterController(0.02);
    c.setUp({ x: 0, y: 1, z: 0 });
    c.setSlideEnabled(true);
    c.enableAutostep(0.22, 0.15, false);
    c.enableSnapToGround(0.25);
    c.setMaxSlopeClimbAngle(THREE.MathUtils.degToRad(45));
    c.setMinSlopeSlideAngle(THREE.MathUtils.degToRad(35));
    c.setApplyImpulsesToDynamicBodies(true);
    ctrl.current = c;
    return () => {
      world.removeCharacterController(c);
      ctrl.current = null;
    };
  }, [world]);

  // animação inicial
  useEffect(() => {
    acoes.idle?.reset().play();
    return () => {
      mixer.stopAllAction();
    };
  }, [acoes, mixer]);

  // ações de teste: teleporte e câmera
  useEffect(() => {
    acoesTeste.teleportar = (x, z, yaw) => {
      corpo.current?.setTranslation({ x, y: 0.02, z }, true);
      s.vel.x = s.vel.z = 0;
      if (yaw !== undefined) {
        s.yawCorpo = yaw;
        s.yawCam = yaw + Math.PI;
      }
      s.alvoIniciado = false;
    };
    acoesTeste.definirCamera = (yaw, pitch) => {
      s.yawCam = yaw;
      s.pitch = pitch;
    };
    return () => {
      acoesTeste.teleportar = undefined;
      acoesTeste.definirCamera = undefined;
    };
  }, [s]);

  // movimento: antes de cada passo da física
  useBeforePhysicsStep((w) => {
    const c = ctrl.current;
    const b = corpo.current;
    const col = colisor.current;
    if (!c || !b || !col) return;
    const dt = Math.min(w.timestep, 0.1);
    if (dt <= 0) return;
    const jogo = useJogo.getState();
    const livre = !jogo.painel;
    const eixo = livre ? eixoFinal(entrada.teclas, entrada.joystick) : { x: 0, y: 0, forca: 0 };
    const correr = corridaTeclado(entrada.teclas) || jogo.correndoToque;
    const alvo = velocidadeAlvo(eixo.forca, correr);
    const dir = direcaoMundo(eixo, s.yawCam);
    const taxa = alvo > 0 ? 8 : 11;
    s.vel.x = aproximar(s.vel.x, dir.x * alvo, taxa, dt);
    s.vel.z = aproximar(s.vel.z, dir.z * alvo, taxa, dt);
    // no chão a velocidade vertical é zero (o snap-to-ground mantém o apoio); empurrar contra o piso trava o controlador
    s.velY = s.noChao ? 0 : Math.max(s.velY - 9.81 * dt, -20);
    c.computeColliderMovement(col, { x: s.vel.x * dt, y: s.velY * dt, z: s.vel.z * dt });
    const m = c.computedMovement();
    s.noChao = c.computedGrounded();
    const p = b.translation();
    b.setNextKinematicTranslation({ x: p.x + m.x, y: p.y + m.y, z: p.z + m.z });
    // a velocidade guardada passa a ser a real (encostado na parede, ela cai e o boneco não "anda no lugar")
    s.vel.x = m.x / dt;
    s.vel.z = m.z / dt;
    s.velReal = Math.hypot(m.x, m.z) / dt;
  });

  // depois do passo: personagem, animação e câmera, na mesma ordem a cada quadro
  useAfterPhysicsStep((w) => {
    const b = corpo.current;
    const g = visual.current;
    if (!b || !g) return;
    const dt = Math.min(w.timestep, 0.1);
    const jogo = useJogo.getState();
    const primeira = jogo.modoCamera === 'primeira';
    const p = b.translation();

    // direção do corpo
    if (primeira) s.yawCorpo = s.yawCam + Math.PI;
    else if (s.velReal > 0.12) s.yawCorpo = girarPara(s.yawCorpo, anguloDe(s.vel.x, s.vel.z), 10, dt);
    g.position.set(p.x, p.y, p.z);
    g.rotation.y = s.yawCorpo;

    // máquina de estados da locomoção
    const novo = proximoEstado(s.estado, s.velReal);
    if (novo !== s.estado) {
      const de = acoes[CLIPE[s.estado]];
      const para = acoes[CLIPE[novo]];
      acoes.lookAround?.fadeOut(0.3);
      if (de && para) {
        para.reset().play();
        para.crossFadeFrom(de, transicao(s.estado, novo), false);
      }
      s.estado = novo;
      s.tempoParado = 0;
    }
    const atual = acoes[CLIPE[s.estado]];
    if (atual) atual.timeScale = escalaTempo(s.estado, s.velReal, naturais);
    // parado por um tempo: olha em volta e volta a respirar
    const olhar = acoes.lookAround;
    if (s.estado === 'parado' && olhar) {
      s.tempoParado += dt;
      if (s.olhandoAte <= 0 && s.tempoParado > 9) {
        s.tempoParado = 0;
        s.olhandoAte = olhar.getClip().duration - 0.5;
        olhar.reset().setEffectiveWeight(1).fadeIn(0.4).play();
      } else if (s.olhandoAte > 0) {
        s.olhandoAte -= dt;
        if (s.olhandoAte <= 0) olhar.fadeOut(0.5);
      }
    } else if (s.olhandoAte > 0) {
      s.olhandoAte = 0;
    }
    mixer.update(dt);

    // primeira pessoa: esconde a cabeça (o corpo continua visível ao olhar para baixo)
    ossos.cabeca.scale.setScalar(primeira ? 0.001 : 1);

    atualizarCamera(w, dt, p, primeira);

    // telemetria para HUD e testes
    telemetria.pos = { x: p.x, y: p.y, z: p.z };
    telemetria.vel = { x: s.vel.x, z: s.vel.z };
    telemetria.velocidade = s.velReal;
    telemetria.dtFisica = w.timestep;
    telemetria.noChao = s.noChao;
    telemetria.locomocao = s.estado;
    telemetria.clipe = CLIPE[s.estado];
    telemetria.escalaTempo = atual?.timeScale ?? 1;
    telemetria.yawCorpo = s.yawCorpo;
    for (const [nome, a] of Object.entries(acoes)) {
      telemetria.pesos[nome] = a.isRunning() ? +a.getEffectiveWeight().toFixed(3) : 0;
      telemetria.tempos[nome] = +a.time.toFixed(4);
    }
    g.updateMatrixWorld(true);
    for (const k of ['cabeca', 'peEsq', 'peDir'] as const) {
      ossos[k].getWorldPosition(_v);
      telemetria.ossos[k] = { x: _v.x, y: _v.y, z: _v.z };
    }
    // E apertado longe de qualquer coisa interativa não fica guardado para depois
    entrada.interagir = false;
  });

  function atualizarCamera(w: typeof world, dt: number, p: { x: number; y: number; z: number }, primeira: boolean) {
    const jogo = useJogo.getState();
    const olhar = consumirOlhar();
    const modo = jogo.modoCamera;
    const o = aplicarOlhar(s.yawCam, s.pitch, olhar.dx, olhar.dy, jogo.sensibilidade * (jogo.toque ? 1.5 : 1), jogo.inverterY, modo);
    s.yawCam = o.yaw;
    s.pitch = o.pitch;
    const g = visual.current!;
    if (!primeira) {
      s.dist = limitarDistancia(s.dist + olhar.zoom);
      const alvo = _v.set(p.x, p.y + ALVO_TERCEIRA, p.z);
      if (!s.alvoIniciado) {
        s.alvo.copy(alvo);
        s.alvoIniciado = true;
      }
      s.alvo.x = aproximar(s.alvo.x, alvo.x, 25, dt);
      s.alvo.y = aproximar(s.alvo.y, alvo.y, 12, dt);
      s.alvo.z = aproximar(s.alvo.z, alvo.z, 25, dt);
      const desejada = posicaoOrbita(s.alvo, s.yawCam, s.pitch, s.dist);
      const dir = { x: desejada.x - s.alvo.x, y: desejada.y - s.alvo.y, z: desejada.z - s.alvo.z };
      const len = Math.hypot(dir.x, dir.y, dir.z) || 1;
      const ray = new rapier.Ray({ x: s.alvo.x, y: s.alvo.y, z: s.alvo.z }, { x: dir.x / len, y: dir.y / len, z: dir.z / len });
      const hit = w.castRay(ray, len, true, undefined, undefined, undefined, corpo.current ?? undefined);
      const livre = hit ? Math.max(0.25, hit.timeOfImpact - 0.25) : len;
      s.distAtual = livre < s.distAtual ? livre : aproximar(s.distAtual, livre, 4, dt);
      const pos = posicaoOrbita(s.alvo, s.yawCam, s.pitch, s.distAtual);
      camera.position.set(pos.x, pos.y, pos.z);
      camera.lookAt(s.alvo);
      // câmera colada no personagem: esconde o boneco para não mostrar o "interior" dele
      g.visible = s.distAtual > 0.55;
      s.olhosIniciados = false;
    } else {
      g.visible = true;
      g.updateMatrixWorld(true);
      ossos.cabeca.getWorldPosition(_v);
      const fx = -Math.sin(s.yawCam);
      const fz = -Math.cos(s.yawCam);
      _v.x += fx * 0.12;
      _v.z += fz * 0.12;
      _v.y = Math.max(_v.y + 0.07, p.y + 1.2);
      if (!s.olhosIniciados) {
        s.olhos.copy(_v);
        s.olhosIniciados = true;
      }
      s.olhos.x = _v.x;
      s.olhos.z = _v.z;
      s.olhos.y = aproximar(s.olhos.y, Math.min(_v.y, p.y + ALTURA_OLHOS + 0.1), 14, dt);
      camera.position.copy(s.olhos);
      camera.quaternion.setFromEuler(_e.set(-s.pitch, s.yawCam, 0, 'YXZ'));
      s.alvoIniciado = false;
    }
    camera.updateMatrixWorld();
    telemetria.camera = {
      modo,
      yaw: s.yawCam,
      pitch: s.pitch,
      zoom: s.dist,
      dist: primeira ? 0 : s.distAtual,
      pos: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
    };
  }

  // sombra falsa sob os pés (sempre; com sombras reais ela fica mais clara)
  const sombraRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const m = sombraRef.current;
    if (!m) return;
    m.position.set(telemetria.pos.x, telemetria.pos.y + 0.012, telemetria.pos.z);
  });

  return (
    <>
      <RigidBody ref={corpo} type="kinematicPosition" colliders={false} position={[partida.pos.x, partida.pos.y + 0.02, partida.pos.z]}>
        <CapsuleCollider ref={colisor} args={[0.6, 0.3]} position={[0, 0.9, 0]} />
      </RigidBody>
      <group ref={visual} position={[partida.pos.x, partida.pos.y, partida.pos.z]} rotation={[0, partida.yaw, 0]} userData={{ semReflexo: true }}>
        <primitive object={avatar} />
      </group>
      <mesh ref={sombraRef} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1} userData={{ semReflexo: true }}>
        <planeGeometry args={[0.9, 0.9]} />
        <meshBasicMaterial map={sombra} transparent depthWrite={false} opacity={preset.sombras ? 0.55 : 0.9} />
      </mesh>
    </>
  );
}
