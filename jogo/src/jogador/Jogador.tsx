/* Jogador: corpo cinemático do Rapier (cápsula de 1,80 m) + personagem animado + câmera em 3ª/1ª pessoa,
   vista aérea, sentar/levantar nos assentos e crachá com o nome do visitante. */
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
  diferencaAngular,
  direcaoMundo,
  eixoFinal,
  girarPara,
  VEL_ANDAR,
  velocidadeAlvo,
} from '../controles/movimento';
import { controleLivre, useJogo } from '../estado/jogo';
import { useJogos } from '../jogos/estado';
import { aplicarDanca, BATIDA, guardarPose, ossosDeDanca, pose, restaurarPose } from '../jogos/danca';
import { useModelo } from '../motor/carregar';
import type { Preset } from '../motor/qualidade';
import { RECUO_SENTAR } from '../mundo/Andar';
import { comandosElevador, comandosJogador, dentroDaCabine, PONTO_CABINE, planoCorte, type Assento } from '../mundo/comandos';
import { acoesTeste, telemetria } from '../testes/telemetria';
import { Cracha } from './Cracha';
import { ItemNaMao } from '../jogos/Itens3D';
import { amostrar, deslocamentoMundo, extrairRaiz, type CurvaRaiz } from './sentar';

const ALTURA_OLHOS = 1.62;
const ALVO_TERCEIRA = 1.5;
const ALVO_SENTADO = 1.1;
const CORTE_AEREA = 2.45;
const _v = new THREE.Vector3();
const _e = new THREE.Euler();

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

export function Jogador({ preset }: { preset: Preset }) {
  const gltf = useModelo(preset.jogador);
  const { world, rapier } = useRapier();
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const corpo = useRef<RapierRigidBody>(null);
  const colisor = useRef<RapierCollider>(null);
  const visual = useRef<THREE.Group>(null);
  const ctrl = useRef<KinematicCharacterController | null>(null);
  const partida = useMemo(() => comandosJogador.ultima ?? comandosJogador.partida ?? PONTO_CABINE, []);

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

  // clipes de sentar/levantar sem o deslocamento da raiz (o grupo é que se move, pela curva extraída)
  const { mixer, acoes, curvas, raizParaCorpo } = useMemo(() => {
    const mixer = new THREE.AnimationMixer(avatar);
    const acoes: Record<string, THREE.AnimationAction> = {};
    const curvas: Record<string, CurvaRaiz> = {};
    for (const clip of gltf.animations) {
      let c = clip;
      if (clip.name === 'sitDown' || clip.name === 'standUp') {
        const r = extrairRaiz(clip);
        if (r) {
          c = r.clipe;
          curvas[clip.name] = r.curva;
        }
      }
      acoes[clip.name] = mixer.clipAction(c);
    }
    acoes.lookAround?.setLoop(THREE.LoopOnce, 1);
    if (acoes.lookAround) acoes.lookAround.clampWhenFinished = false;
    for (const n of ['sitDown', 'standUp']) {
      acoes[n]?.setLoop(THREE.LoopOnce, 1);
      if (acoes[n]) acoes[n].clampWhenFinished = true;
    }
    // matriz do osso pai da raiz (escala cm → m e eixos) com o personagem na origem
    avatar.updateMatrixWorld(true);
    const pai = avatar.getObjectByName('Bip01')?.parent;
    const raizParaCorpo = new THREE.Matrix3().setFromMatrix4(pai ? pai.matrixWorld : new THREE.Matrix4());
    return { mixer, acoes, curvas, raizParaCorpo };
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
  const ossosDanca = useMemo(() => ossosDeDanca(avatar), [avatar]);
  const maoDireita = useMemo(() => avatar.getObjectByName('Bip01_R_Hand'), [avatar]);

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
    distAerea: 13,
    estado: 'parado' as EstadoLocomocao,
    tempoParado: 0,
    olhandoAte: 0,
    olhos: new THREE.Vector3(),
    olhosIniciados: false,
    alvo: new THREE.Vector3(),
    alvoIniciado: false,
    // sentar
    assento: null as Assento | null,
    tFase: 0,
    grupo: new THREE.Vector3(),
    residuo: { x: 0, z: 0, calculado: false },
    virando: false,
    dancou: false,
    guardaDanca: [] as (THREE.Quaternion | null)[],
    tempo: 0,
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

  // animação inicial; ao desmontar, o jogador volta a ficar livre
  useEffect(() => {
    acoes.idle?.reset().play();
    comandosJogador.fase = 'livre';
    return () => {
      mixer.stopAllAction();
      comandosJogador.fase = 'livre';
      useJogo.getState().setSentado(false);
      planoCorte.constant = 1000;
    };
  }, [acoes, mixer]);

  // ações de teste: teleporte e câmera
  useEffect(() => {
    acoesTeste.teleportar = (x, z, yaw) => {
      comandosJogador.teleporte = { x, z, yaw: yaw ?? s.yawCorpo };
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

  /** Troca para um clipe de corpo inteiro (sentar/levantar/locomoção) com transição. */
  function tocar(nome: string, de: (THREE.AnimationAction | undefined)[], duracao: number) {
    const para = acoes[nome];
    if (!para) return;
    para.reset().setEffectiveWeight(1).play();
    for (const a of de) if (a && a !== para && a.isRunning()) a.crossFadeTo(para, duracao, false);
  }

  const emUso = () => Object.values(acoes).filter((a) => a.isRunning());

  function voltarLivre() {
    comandosJogador.fase = 'livre';
    s.assento = null;
    s.estado = 'parado';
    s.tempoParado = 0;
    useJogo.getState().setSentado(false);
  }

  // movimento: antes de cada passo da física
  useBeforePhysicsStep((w) => {
    const c = ctrl.current;
    const b = corpo.current;
    const col = colisor.current;
    if (!c || !b || !col) return;
    const dt = Math.min(w.timestep, 0.1);
    if (dt <= 0) return;
    const jogo = useJogo.getState();
    const cmd = comandosJogador;

    // teleporte pedido (entrada no prédio, atalhos, testes)
    if (cmd.teleporte) {
      const t = cmd.teleporte;
      cmd.teleporte = null;
      b.setTranslation({ x: t.x, y: 0.02, z: t.z }, true);
      b.setNextKinematicTranslation({ x: t.x, y: 0.02, z: t.z });
      s.vel.x = s.vel.z = 0;
      s.velY = 0;
      s.yawCorpo = t.yaw;
      s.yawCam = t.yaw + Math.PI;
      s.alvoIniciado = false;
      if (cmd.fase !== 'livre') {
        tocar('idle', emUso(), 0.1);
        voltarLivre();
      }
      return;
    }

    const p = b.translation();
    // sem chão carregado (troca de andar ou de qualidade) o jogador espera parado, sem cair
    const chaoPronto = jogo.andarPronto !== null || dentroDaCabine(p.x, p.z);
    const livre = controleLivre() && chaoPronto;
    const eixo = livre ? eixoFinal(entrada.teclas, entrada.joystick, jogo.teclas) : { x: 0, y: 0, forca: 0 };

    // pedido de sentar (interação com um assento)
    if (cmd.sentar) {
      if (cmd.fase === 'livre' && livre) {
        s.assento = cmd.sentar;
        s.tFase = 0;
        s.virando = false;
        cmd.fase = 'aproximando';
      }
      cmd.sentar = null;
    }

    let alvoX = 0;
    let alvoZ = 0;
    let alvoV = 0;
    if (eixo.forca > 0.5 && useJogos.getState().danca) useJogos.getState().setDanca(null);
    if (cmd.fase === 'livre') {
      const correr = corridaTeclado(entrada.teclas, jogo.teclas) || jogo.correndoToque;
      alvoV = velocidadeAlvo(eixo.forca, correr);
      const dir = direcaoMundo(eixo, s.yawCam);
      alvoX = dir.x * alvoV;
      alvoZ = dir.z * alvoV;
    } else if (cmd.fase === 'aproximando' && s.assento) {
      // anda sozinho até o ponto em frente ao assento e vira de costas para ele
      s.tFase += dt;
      const a = s.assento;
      const fx = a.x + Math.sin(a.yaw) * RECUO_SENTAR - p.x;
      const fz = a.z + Math.cos(a.yaw) * RECUO_SENTAR - p.z;
      const d = Math.hypot(fx, fz);
      if (eixo.forca > 0.5 || !livre) {
        voltarLivre();
      } else if (d > 0.05 && s.tFase < 2.5 && !s.virando && !(s.tFase > 0.5 && s.velReal < 0.08)) {
        alvoV = Math.min(VEL_ANDAR, d * 4);
        alvoX = (fx / d) * alvoV;
        alvoZ = (fz / d) * alvoV;
      } else if (Math.abs(diferencaAngular(s.yawCorpo, a.yaw)) > 0.06) {
        // chegou (ou o móvel não deixa chegar mais perto): para e vira de costas para o assento
        s.virando = true;
        s.yawCorpo = girarPara(s.yawCorpo, a.yaw, 9, dt);
      } else {
        s.yawCorpo = a.yaw;
        cmd.fase = 'sentando';
        s.tFase = 0;
        s.residuo.calculado = false;
        acoes.lookAround?.fadeOut(0.2);
        tocar('sitDown', emUso(), 0.25);
        jogo.setSentado(true);
      }
    } else if (cmd.fase === 'sentado') {
      if (cmd.levantar || eixo.forca > 0.5) {
        cmd.fase = 'levantando';
        s.tFase = 0;
        tocar('standUp', emUso(), 0.3);
      }
    }
    cmd.levantar = false;

    if (cmd.fase === 'livre' || (cmd.fase === 'aproximando' && !s.virando)) {
      const taxa = alvoV > 0 ? 8 : 11;
      s.vel.x = aproximar(s.vel.x, alvoX, taxa, dt);
      s.vel.z = aproximar(s.vel.z, alvoZ, taxa, dt);
      // no chão a velocidade vertical é zero (o snap-to-ground mantém o apoio); empurrar contra o piso trava o controlador
      s.velY = s.noChao || !chaoPronto ? 0 : Math.max(s.velY - 9.81 * dt, -20);
      if (!chaoPronto) s.vel.x = s.vel.z = 0;
      c.computeColliderMovement(col, { x: s.vel.x * dt, y: s.velY * dt, z: s.vel.z * dt });
      const m = c.computedMovement();
      s.noChao = c.computedGrounded() || !chaoPronto;
      b.setNextKinematicTranslation({ x: p.x + m.x, y: p.y + m.y, z: p.z + m.z });
      // a velocidade guardada passa a ser a real (encostado na parede, ela cai e o boneco não "anda no lugar")
      s.vel.x = m.x / dt;
      s.vel.z = m.z / dt;
      s.velReal = Math.hypot(m.x, m.z) / dt;
    } else {
      s.vel.x = s.vel.z = 0;
      s.velReal = 0;
    }
  });

  // depois do passo: personagem, animação e câmera, na mesma ordem a cada quadro
  useAfterPhysicsStep((w) => {
    const b = corpo.current;
    const g = visual.current;
    if (!b || !g) return;
    const dt = Math.min(w.timestep, 0.1);
    s.tempo += dt;
    const jogo = useJogo.getState();
    const cmd = comandosJogador;
    const primeira = jogo.modoCamera === 'primeira' && jogo.vista === 'normal';
    const p = b.translation();
    const a = s.assento;

    if (cmd.fase === 'livre' || cmd.fase === 'aproximando' || !a) {
      // direção do corpo
      if (primeira && cmd.fase === 'livre') s.yawCorpo = s.yawCam + Math.PI;
      else if (s.velReal > 0.12 && !(cmd.fase === 'aproximando' && s.virando)) s.yawCorpo = girarPara(s.yawCorpo, anguloDe(s.vel.x, s.vel.z), 10, dt);
      g.position.set(p.x, p.y, p.z);
      g.rotation.y = s.yawCorpo;

      // máquina de estados da locomoção
      const novo = proximoEstado(s.estado, s.velReal);
      if (novo !== s.estado) {
        acoes.lookAround?.fadeOut(0.3);
        tocar(CLIPE[novo], [acoes[CLIPE[s.estado]]], transicao(s.estado, novo));
        s.estado = novo;
        s.tempoParado = 0;
      }
      const atual = acoes[CLIPE[s.estado]];
      if (atual) atual.timeScale = escalaTempo(s.estado, s.velReal, naturais);
      // parado por um tempo: olha em volta e volta a respirar
      const olhar = acoes.lookAround;
      if (s.estado === 'parado' && olhar && cmd.fase === 'livre') {
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
    } else {
      // sentando, sentado ou levantando: o grupo segue a curva da raiz a partir do assento
      s.tFase += dt;
      const sentar = acoes.sitDown;
      const levantar = acoes.standUp;
      let d = { x: 0, z: 0 };
      // a cápsula nem sempre chega ao ponto exato do clipe (o colisor do sofá a para antes); a diferença
      // é absorvida aos poucos: no começo do sentar ela some, no fim do levantar ela volta até a cápsula
      let ajuste = 0;
      if (cmd.fase === 'sentando' && curvas.sitDown) {
        d = deslocamentoMundo(raizParaCorpo, amostrar(curvas.sitDown, sentar.time), a.yaw);
        ajuste = 1 - THREE.MathUtils.smoothstep(sentar.time, 0, 0.7);
      } else if (cmd.fase === 'levantando' && curvas.standUp) {
        d = deslocamentoMundo(raizParaCorpo, amostrar(curvas.standUp, levantar.time), a.yaw);
        const fim = levantar.getClip().duration - 0.25;
        ajuste = THREE.MathUtils.smoothstep(levantar.time, fim - 0.7, fim);
      }
      if (s.residuo.calculado === false) {
        const d0 = deslocamentoMundo(raizParaCorpo, amostrar(curvas.sitDown ?? { tempos: [], x: [], z: [] }, 0), a.yaw);
        s.residuo.x = p.x - (a.x + d0.x);
        s.residuo.z = p.z - (a.z + d0.z);
        s.residuo.calculado = true;
      }
      if (cmd.fase === 'levantando' && curvas.standUp) {
        const dFim = deslocamentoMundo(raizParaCorpo, amostrar(curvas.standUp, Infinity), a.yaw);
        s.residuo.x = p.x - (a.x + dFim.x);
        s.residuo.z = p.z - (a.z + dFim.z);
      }
      s.grupo.set(a.x + d.x + s.residuo.x * ajuste, p.y, a.z + d.z + s.residuo.z * ajuste);
      g.position.copy(s.grupo);
      g.rotation.y = s.yawCorpo = a.yaw;
      if (cmd.fase === 'sentando' && sentar && sentar.time >= sentar.getClip().duration - 0.3) {
        tocar('sitIdle', [sentar], 0.3);
        cmd.fase = 'sentado';
      } else if (cmd.fase === 'levantando' && levantar && levantar.time >= levantar.getClip().duration - 0.25) {
        // de pé, de volta à cápsula (que ficou parada, num lugar livre): a locomoção recomeça sem salto
        tocar('idle', [levantar, acoes.sitIdle], 0.3);
        voltarLivre();
      }
    }
    if (s.dancou) restaurarPose(ossosDanca, s.guardaDanca);
    mixer.update(dt);
    // dança por cima da respiração (parado e livre)
    const danca = useJogos.getState().danca;
    s.dancou = !!(danca && cmd.fase === 'livre' && s.velReal < 0.1);
    if (danca && cmd.fase === 'livre' && s.velReal < 0.1) {
      guardarPose(ossosDanca, s.guardaDanca);
      const r = aplicarDanca(ossosDanca, pose(danca, s.tempo / BATIDA));
      avatar.position.set(r.passo, r.pulo, 0);
      avatar.rotation.y = r.giro;
    } else if (avatar.rotation.y !== 0 || avatar.position.y !== 0) {
      avatar.position.set(0, 0, 0);
      avatar.rotation.y = 0;
    }

    // primeira pessoa: esconde a cabeça (o corpo continua visível ao olhar para baixo)
    ossos.cabeca.scale.setScalar(primeira ? 0.001 : 1);

    const cameraDoJogo = useJogos.getState().ativo === 'sinuca' || useJogos.getState().ativo === 'dardos';
    // nos minijogos com câmera própria o avatar sai da frente (a câmera fica sobre a mesa ou na linha de arremesso)
    if (cameraDoJogo) g.visible = false;
    if (jogo.vista !== 'externa' && !cameraDoJogo) atualizarCamera(w, dt, cmd.fase === 'livre' || cmd.fase === 'aproximando' ? p : s.grupo, primeira, cmd.fase);

    // telemetria para HUD e testes
    const atual = acoes[CLIPE[s.estado]];
    telemetria.pos = { x: p.x, y: p.y, z: p.z };
    telemetria.vel = { x: s.vel.x, z: s.vel.z };
    telemetria.velocidade = s.velReal;
    telemetria.dtFisica = w.timestep;
    telemetria.noChao = s.noChao;
    telemetria.locomocao = s.estado;
    telemetria.clipe = cmd.fase === 'livre' ? CLIPE[s.estado] : cmd.fase;
    telemetria.escalaTempo = atual?.timeScale ?? 1;
    telemetria.yawCorpo = s.yawCorpo;
    telemetria.fase = cmd.fase;
    telemetria.grupo = { x: g.position.x, y: g.position.y, z: g.position.z };
    for (const [nome, ac] of Object.entries(acoes)) {
      telemetria.pesos[nome] = ac.isRunning() ? +ac.getEffectiveWeight().toFixed(3) : 0;
      telemetria.tempos[nome] = +ac.time.toFixed(4);
    }
    g.updateMatrixWorld(true);
    for (const k of ['cabeca', 'peEsq', 'peDir'] as const) {
      ossos[k].getWorldPosition(_v);
      telemetria.ossos[k] = { x: _v.x, y: _v.y, z: _v.z };
    }
    comandosJogador.ultima = { x: p.x, z: p.z, yaw: s.yawCorpo };
  });

  function atualizarCamera(w: typeof world, dt: number, p: { x: number; y: number; z: number }, primeira: boolean, fase: string) {
    const jogo = useJogo.getState();
    const olhar = consumirOlhar();
    const aerea = jogo.vista === 'aerea';
    const modo = aerea ? 'terceira' : jogo.modoCamera;
    const o = aplicarOlhar(s.yawCam, s.pitch, olhar.dx, olhar.dy, jogo.sensibilidade * (jogo.toque ? 1.5 : 1), jogo.inverterY, modo);
    s.yawCam = o.yaw;
    s.pitch = o.pitch;
    const g = visual.current!;
    planoCorte.constant = aerea ? CORTE_AEREA : 1000;
    const sentado = fase === 'sentando' || fase === 'sentado' || fase === 'levantando';
    if (aerea) {
      // vista aérea: alto e inclinado, paredes cortadas na altura de 2,45 m
      s.distAerea = THREE.MathUtils.clamp(s.distAerea + olhar.zoom * 3, 7, 24);
      const alvo = _v.set(p.x, p.y + 1, p.z);
      if (!s.alvoIniciado) {
        s.alvo.copy(alvo);
        s.alvoIniciado = true;
      }
      s.alvo.x = aproximar(s.alvo.x, alvo.x, 8, dt);
      s.alvo.y = aproximar(s.alvo.y, alvo.y, 8, dt);
      s.alvo.z = aproximar(s.alvo.z, alvo.z, 8, dt);
      const pos = posicaoOrbita(s.alvo, s.yawCam, 1.05, s.distAerea);
      camera.position.set(pos.x, pos.y, pos.z);
      camera.lookAt(s.alvo);
      g.visible = true;
      s.distAtual = s.dist;
      s.olhosIniciados = false;
    } else if (!primeira) {
      s.dist = limitarDistancia(s.dist + olhar.zoom);
      const alvo = _v.set(p.x, p.y + (sentado ? ALVO_SENTADO : ALVO_TERCEIRA), p.z);
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
      _v.y = sentado ? _v.y + 0.07 : Math.max(_v.y + 0.07, p.y + 1.2);
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
    // tremor da cabine na viagem do elevador
    const tremor = comandosElevador.tremor;
    if (tremor > 0) {
      camera.position.y += tremor * (0.008 * Math.sin(s.tempo * 37) + 0.004 * Math.sin(s.tempo * 61));
      camera.position.x += tremor * 0.003 * Math.sin(s.tempo * 29);
    }
    camera.updateMatrixWorld();
    telemetria.camera = {
      modo: aerea ? 'aerea' : modo,
      yaw: s.yawCam,
      pitch: s.pitch,
      zoom: aerea ? s.distAerea : s.dist,
      dist: primeira ? 0 : aerea ? s.distAerea : s.distAtual,
      pos: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
    };
  }

  // sombra falsa sob os pés (sempre; com sombras reais ela fica mais clara)
  const sombraRef = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const m = sombraRef.current;
    const g = visual.current;
    if (!m || !g) return;
    m.position.set(g.position.x, g.position.y + 0.012, g.position.z);
  });

  return (
    <>
      <RigidBody ref={corpo} type="kinematicPosition" colliders={false} position={[partida.x, 0.02, partida.z]}>
        <CapsuleCollider ref={colisor} args={[0.6, 0.3]} position={[0, 0.9, 0]} />
      </RigidBody>
      <group ref={visual} position={[partida.x, 0, partida.z]} rotation={[0, partida.yaw, 0]} userData={{ semReflexo: true }}>
        <primitive object={avatar} />
      </group>
      <Cracha cabeca={ossos.cabeca} />
      <ItemNaMao mao={maoDireita} />
      <mesh ref={sombraRef} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1} userData={{ semReflexo: true }}>
        <planeGeometry args={[0.9, 0.9]} />
        <meshBasicMaterial map={sombra} transparent depthWrite={false} opacity={preset.sombras ? 0.55 : 0.9} />
      </mesh>
    </>
  );
}
