/* Sala de Jogos (41º): sinuca contra o robô Orion, dardos com troféus e Clube do 21 com a crupiê robô Vega.
   As mesas e o alvo vêm do GLB (marcadores JOGO_*); bolas, taco, dardos e câmeras de jogo são desenhados aqui. */
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { consumirOlhar, entrada } from '../controles/entrada';
import { useJogo } from '../estado/jogo';
import { aplicarCorte } from '../mundo/comandos';
import { candidatar, retirar } from '../mundo/interacoes';
import { telemetria } from '../testes/telemetria';
import { DARDOS_POR_PARTIDA, NUMEROS, pontuar, TROFEUS, tremor } from './dardos';
import { comandosJogo, useJogos } from './estado';
import { aoParar, novaPartida, passoFisica, planoRobo, R, tacar, tracarMira, type Partida } from './sinuca';
import { Pessoa } from './Pessoa';

type Marco = { x: number; y: number; z: number; yaw: number };
export const ROBO_SINUCA = 'Orion';

const CORES_BOLA = [null, '#f2c230', '#1d4fbf', '#d0312d', '#5b2a86', '#ef7d22', '#1f7a3a', '#7a1f2b', '#111111', '#f2c230', '#1d4fbf', '#d0312d', '#5b2a86', '#ef7d22', '#1f7a3a', '#7a1f2b'];

function texturaBola(n: number) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d')!;
  const marfim = '#f4f1e8';
  g.fillStyle = n === 0 || n >= 9 ? marfim : CORES_BOLA[n]!;
  g.fillRect(0, 0, 256, 128);
  if (n >= 9) {
    g.fillStyle = CORES_BOLA[n]!;
    g.fillRect(0, 38, 256, 52);
  }
  if (n > 0)
    for (const cx of [64, 192]) {
      g.fillStyle = marfim;
      g.beginPath();
      g.ellipse(cx, 64, 17, 21, 0, 0, 7);
      g.fill();
      g.fillStyle = '#151515';
      g.font = '700 24px Arial';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(String(n), cx, 65);
    }
  if (n === 0) {
    g.fillStyle = '#c0392b';
    g.beginPath();
    g.arc(64, 64, 5, 0, 7);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Plano horizontal no nível das bolas, para mirar com o ponteiro. */
function useApontador(ativo: boolean, aoMover: (ndc: THREE.Vector2) => void, aoApertar: (baixo: boolean) => void, ndcGuardado?: THREE.Vector2) {
  const { gl } = useThree();
  useEffect(() => {
    if (!ativo) return;
    const alvo = (gl.domElement.closest('.palco') as HTMLElement | null) ?? gl.domElement;
    const ndc = new THREE.Vector2();
    const mover = (e: PointerEvent) => {
      const r = gl.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ndcGuardado?.copy(ndc);
      aoMover(ndc);
    };
    const baixo = (e: PointerEvent) => {
      mover(e);
      if (e.pointerType === 'mouse' && e.button === 0) aoApertar(true);
    };
    const cima = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button === 0) aoApertar(false);
    };
    alvo.addEventListener('pointermove', mover);
    alvo.addEventListener('pointerdown', baixo);
    alvo.addEventListener('pointerup', cima);
    return () => {
      alvo.removeEventListener('pointermove', mover);
      alvo.removeEventListener('pointerdown', baixo);
      alvo.removeEventListener('pointerup', cima);
    };
  }, [ativo, gl, aoMover, aoApertar, ndcGuardado]);
}

/* ------------------------------------------------------------------ sinuca */
function Sinuca({ mesa }: { mesa: Marco }) {
  const { camera } = useThree();
  const ativo = useJogos((s) => s.ativo === 'sinuca');
  const p = useRef<Partida>(novaPartida());
  const st = useRef({ mira: 0, forca: 0, carregando: false, porTecla: false, tCarga: 0, golpe: 0, roboT: 0, roboPlano: { angulo: 0, forca: 0.5 }, lado: 1 });
  const bolas = useMemo(() => {
    const geo = new THREE.SphereGeometry(R, 24, 16);
    return Array.from({ length: 16 }, (_, n) => {
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: texturaBola(n), roughness: 0.12, metalness: 0 }));
      m.castShadow = true;
      m.quaternion.setFromEuler(new THREE.Euler(n * 1.3, n * 0.7, n * 2.1));
      return m;
    });
  }, []);
  const taco = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.0065, 0.014, 1.45, 12);
    g.rotateX(Math.PI / 2);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: '#8a5a2b', roughness: 0.45 }));
    m.castShadow = true;
    return m;
  }, []);
  const mira = useMemo(() => {
    const linha = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]), new THREE.LineDashedMaterial({ color: '#ffffff', dashSize: 0.03, gapSize: 0.02, transparent: true, opacity: 0.85 }));
    const anel = new THREE.Mesh(new THREE.RingGeometry(R * 0.9, R, 24), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
    anel.rotation.x = -Math.PI / 2;
    for (const o of [linha, anel]) aplicarCorte(o.material as THREE.Material);
    return { linha, anel };
  }, []);
  const plano = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -(mesa.y + R)), [mesa.y]);
  const raio = useMemo(() => new THREE.Raycaster(), []);
  const ponto = useMemo(() => new THREE.Vector3(), []);

  // entrar no jogo: nova partida, lado da mesa onde o jogador está
  useEffect(() => {
    if (!ativo) return;
    p.current = novaPartida();
    st.current.lado = telemetria.pos.z >= mesa.z ? 1 : -1;
    st.current.mira = 0;
    consumirOlhar();
  }, [ativo, mesa.z]);

  useApontador(
    ativo,
    (ndc) => {
      if (p.current.fase !== 'mirar' || st.current.carregando) return;
      raio.setFromCamera(ndc, camera);
      if (raio.ray.intersectPlane(plano, ponto)) {
        const c = p.current.bolas[0];
        const lx = ponto.x - mesa.x;
        const lz = ponto.z - mesa.z;
        if (Math.hypot(lx - c.x, lz - c.z) > 0.02) st.current.mira = Math.atan2(lz - c.z, lx - c.x);
      }
    },
    (baixo) => {
      if (baixo) comandosJogo.carregar = true;
      else comandosJogo.soltar = true;
    },
  );

  useFrame((_, dtBruto) => {
    const dt = Math.min(dtBruto, 0.05);
    const P = p.current;
    const s = st.current;
    if (ativo) {
      if (comandosJogo.novaPartida) {
        comandosJogo.novaPartida = false;
        p.current = novaPartida();
      }
      if (entrada.teclas.has('Space') && !s.carregando) comandosJogo.carregar = true;
      if (!entrada.teclas.has('Space') && s.carregando && s.tCarga > 0.05 && !comandosJogo.soltar && s.porTecla) comandosJogo.soltar = true;
      if (comandosJogo.carregar) {
        comandosJogo.carregar = false;
        if (P.fase === 'mirar') {
          s.carregando = true;
          s.tCarga = 0;
          s.porTecla = entrada.teclas.has('Space');
        }
      }
      if (comandosJogo.soltar) {
        comandosJogo.soltar = false;
        if (s.carregando && P.fase === 'mirar' && s.forca > 0.03) {
          tacar(P, s.mira, s.forca);
          s.golpe = 0.12;
        }
        s.carregando = false;
        s.forca = 0;
      }
      if (s.carregando) {
        s.tCarga += dt;
        s.forca = 0.5 - 0.5 * Math.cos((s.tCarga * Math.PI) / 1.1);
      }
      if (entrada.teclas.has('ArrowLeft') || entrada.teclas.has('KeyA')) s.mira -= dt * 0.6;
      if (entrada.teclas.has('ArrowRight') || entrada.teclas.has('KeyD')) s.mira += dt * 0.6;
      if (P.fase === 'rolando' && !passoFisica(P, dt)) {
        aoParar(P, ROBO_SINUCA);
        s.roboT = 1.2;
      }
      // vez do robô: pensa, mira devagar e taca
      if (P.fase === 'roboPensa') {
        s.roboT -= dt;
        if (s.roboT <= 0) {
          s.roboPlano = planoRobo(P);
          P.fase = 'roboMira';
          s.roboT = 1.1;
          s.mira = s.roboPlano.angulo;
        }
      } else if (P.fase === 'roboMira') {
        s.roboT -= dt;
        s.forca = Math.min(s.roboPlano.forca, ((1.1 - s.roboT) / 1.1) * s.roboPlano.forca);
        if (s.roboT <= 0) {
          tacar(P, s.roboPlano.angulo, s.roboPlano.forca);
          s.golpe = 0.12;
          s.forca = 0;
        }
      }
      // câmera 3/4 do lado do jogador (de pé no celular: da cabeceira)
      const retrato = (camera as THREE.PerspectiveCamera).aspect < 1;
      const alvoCam = retrato ? new THREE.Vector3(mesa.x - 2.3, mesa.y + 1.55, mesa.z) : new THREE.Vector3(mesa.x, mesa.y + 1.5, mesa.z + 1.95 * s.lado);
      camera.position.lerp(alvoCam, 1 - Math.exp(-6 * dt));
      camera.lookAt(mesa.x, mesa.y - 0.08, mesa.z);
      useJogos.getState().atualizar({
        voce: P.placar.voce,
        robo: P.placar.robo,
        vez: P.vez,
        fase: P.fase,
        msg: P.msg,
        forca: Math.round(s.forca * 100),
        restantes: P.bolas.filter((b) => b.em && b.n > 0).length,
      });
    }
    // bolas sempre na mesa (também fora do jogo)
    P.bolas.forEach((b, i) => {
      const m = bolas[i];
      if (b.em) {
        m.visible = true;
        const v = Math.hypot(b.vx, b.vz);
        m.position.set(mesa.x + b.x, mesa.y + R, mesa.z + b.z);
        if (v > 1e-4) m.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(b.vz, 0, -b.vx).normalize(), (v * dt) / R));
      } else if (b.afundando > 0) {
        b.afundando = Math.max(0, b.afundando - dt * 3);
        m.position.y = mesa.y + R - (1 - b.afundando) * 0.07;
        if (b.afundando === 0) m.visible = false;
      }
    });
    // taco e linha de mira
    const c = P.bolas[0];
    const mirando = ativo && (P.fase === 'mirar' || P.fase === 'roboMira') && c.em;
    s.golpe = Math.max(0, s.golpe - dt);
    taco.visible = mirando || s.golpe > 0;
    if (taco.visible) {
      const dx = Math.cos(s.mira);
      const dz = Math.sin(s.mira);
      const recuo = s.golpe > 0 ? -0.02 : 0.03 + s.forca * 0.25;
      const ponta = new THREE.Vector3(mesa.x + c.x - dx * (R + recuo), mesa.y + R * 1.1, mesa.z + c.z - dz * (R + recuo));
      taco.position.set(ponta.x - dx * 0.725, ponta.y + 0.08, ponta.z - dz * 0.725);
      taco.lookAt(ponta);
    }
    const mostrar = ativo && P.fase === 'mirar' && c.em;
    mira.linha.visible = mira.anel.visible = mostrar;
    if (mostrar) {
      const tr = tracarMira(P, s.mira);
      const y = mesa.y + R;
      mira.linha.geometry.setFromPoints([new THREE.Vector3(mesa.x + c.x, y, mesa.z + c.z), new THREE.Vector3(mesa.x + tr.gx, y, mesa.z + tr.gz)]);
      mira.linha.computeLineDistances();
      mira.anel.position.set(mesa.x + tr.gx, mesa.y + 0.004, mesa.z + tr.gz);
    }
  });

  return (
    <>
      {bolas.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
      <primitive object={taco} />
      <primitive object={mira.linha} />
      <primitive object={mira.anel} />
    </>
  );
}

/* ------------------------------------------------------------------ dardos */
const CHAVE_DARDOS = 'sala-dos-robos:dardos:v1';
const RAIO_ALVO = 0.17; // raio do duplo (m)

function lerDardos(): { recorde: number; trofeus: string[] } {
  try {
    const s = JSON.parse(localStorage.getItem(CHAVE_DARDOS) ?? 'null') as { recorde?: number; trofeus?: string[] } | null;
    return { recorde: Math.max(0, Math.min(450, Number(s?.recorde) || 0)), trofeus: Array.isArray(s?.trofeus) ? s.trofeus.filter((t) => TROFEUS.some((x) => x.id === t)) : [] };
  } catch {
    return { recorde: 0, trofeus: [] };
  }
}

function desenharAlvo(g: CanvasRenderingContext2D, w: number) {
  const c = w / 2;
  const r = (w / 2) * (RAIO_ALVO / 0.23);
  g.clearRect(0, 0, w, w);
  g.fillStyle = '#101010';
  g.beginPath();
  g.arc(c, c, r * 1.27, 0, 7);
  g.fill();
  const aneis: [number, number][] = [[1, 0.953], [0.953, 0.629], [0.629, 0.582], [0.582, 0.0935]];
  for (let k = 0; k < 20; k++) {
    const a0 = -Math.PI / 2 - Math.PI / 20 + (k * Math.PI) / 10;
    const a1 = a0 + Math.PI / 10;
    aneis.forEach(([ro, ri], j) => {
      const mult = j === 0 || j === 2;
      g.fillStyle = mult ? (k % 2 ? '#1e7a3c' : '#c3232c') : k % 2 ? '#efe4c8' : '#161616';
      g.beginPath();
      g.arc(c, c, ro * r, a0, a1);
      g.arc(c, c, ri * r, a1, a0, true);
      g.closePath();
      g.fill();
    });
    g.save();
    g.translate(c, c);
    g.rotate(a0 + Math.PI / 20 + Math.PI / 2);
    g.fillStyle = '#f2f2f2';
    g.font = `700 ${Math.round(w * 0.05)}px Arial`;
    g.textAlign = 'center';
    g.fillText(String(NUMEROS[k]), 0, -r * 1.1);
    g.restore();
  }
  g.fillStyle = '#1e7a3c';
  g.beginPath();
  g.arc(c, c, 0.0935 * r, 0, 7);
  g.fill();
  g.fillStyle = '#c3232c';
  g.beginPath();
  g.arc(c, c, 0.0374 * r, 0, 7);
  g.fill();
}

function Dardos({ alvo, linha, tela }: { alvo: Marco; linha: Marco; tela: THREE.Mesh | null }) {
  const { camera } = useThree();
  const ativo = useJogos((s) => s.ativo === 'dardos');
  const grupo = useRef<THREE.Group>(null);
  const st = useRef({ mira: { x: 0, y: 0 }, segurando: 0, carregando: false, lancados: 0, pontos: 0, voo: null as null | { t: number; de: THREE.Vector3; para: THREE.Vector3; dardo: THREE.Object3D; acerto: ReturnType<typeof pontuar> }, msg: '', historico: [] as number[], tempo: 0, ...lerDardos() });

  // alvo desenhado em canvas no lugar da tela do GLB
  useEffect(() => {
    if (!tela) return;
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    desenharAlvo(c.getContext('2d')!, 512);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.flipY = false;
    const original = tela.material;
    const mat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, alphaTest: 0.5 });
    aplicarCorte(mat);
    tela.material = mat;
    return () => {
      tela.material = original;
      mat.dispose();
      t.dispose();
    };
  }, [tela]);

  const novoDardo = (cor: string) => {
    const d = new THREE.Group();
    const aco = new THREE.MeshStandardMaterial({ color: '#d9e4e6', metalness: 0.82, roughness: 0.26 });
    const pena = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.55 });
    const ponta = new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.035, 8), aco);
    ponta.rotation.x = Math.PI / 2;
    ponta.position.z = 0.0175;
    const corpo = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.006, 0.06, 12), pena);
    corpo.rotation.x = Math.PI / 2;
    corpo.position.z = -0.03;
    const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.14, 8), aco);
    haste.rotation.x = Math.PI / 2;
    haste.position.z = -0.12;
    d.add(ponta, corpo, haste);
    for (const a of [0, Math.PI / 2]) {
      const asa = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.002, 0.048), pena);
      asa.position.z = -0.19;
      asa.rotation.z = a;
      d.add(asa);
    }
    return d;
  };

  const plano = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), -alvo.z), [alvo.z]);
  const raio = useMemo(() => new THREE.Raycaster(), []);
  const ponto = useMemo(() => new THREE.Vector3(), []);
  const ndcDardos = useMemo(() => new THREE.Vector2(0, 0), []);

  // lente fechada (zoom) enquanto joga dardos
  useEffect(() => {
    if (!ativo) return;
    const cam = camera as THREE.PerspectiveCamera;
    const antes = cam.fov;
    cam.fov = 30;
    cam.updateProjectionMatrix();
    return () => {
      cam.fov = antes;
      cam.updateProjectionMatrix();
    };
  }, [ativo, camera]);

  useEffect(() => {
    if (!ativo) return;
    const s = st.current;
    s.lancados = 0;
    s.pontos = 0;
    s.historico = [];
    s.msg = 'Mire no alvo, segure para firmar a mão e solte para lançar.';
    grupo.current?.clear();
    consumirOlhar();
  }, [ativo]);

  const mirarDardo = (ndc: THREE.Vector2) => {
    raio.setFromCamera(ndc, camera);
    if (raio.ray.intersectPlane(plano, ponto)) st.current.mira = { x: (ponto.x - alvo.x) / RAIO_ALVO, y: (ponto.y - alvo.y) / RAIO_ALVO };
  };
  useApontador(
    ativo,
    mirarDardo,
    (baixo) => {
      if (baixo) comandosJogo.carregar = true;
      else comandosJogo.soltar = true;
    },
    ndcDardos,
  );

  useFrame((_, dtBruto) => {
    if (!ativo) return;
    const dt = Math.min(dtBruto, 0.05);
    const s = st.current;
    s.tempo += dt;
    mirarDardo(ndcDardos); // a câmera se move: a mira é recalculada a cada quadro
    if (comandosJogo.novaPartida) {
      comandosJogo.novaPartida = false;
      s.lancados = 0;
      s.pontos = 0;
      s.historico = [];
      grupo.current?.clear();
      s.msg = 'Nova partida: 9 dardos.';
    }
    if (comandosJogo.carregar) {
      comandosJogo.carregar = false;
      if (!s.voo && s.lancados < DARDOS_POR_PARTIDA) {
        s.carregando = true;
        s.segurando = 0;
      }
    }
    if (s.carregando) s.segurando += dt;
    const tr = tremor(s.tempo, s.carregando ? s.segurando : 0);
    if (comandosJogo.soltar || comandosJogo.lancar) {
      comandosJogo.soltar = comandosJogo.lancar = false;
      if (!s.voo && s.lancados < DARDOS_POR_PARTIDA) {
        const x = s.mira.x + tr.x;
        const y = s.mira.y + tr.y;
        const acerto = pontuar(x, y);
        const para = new THREE.Vector3(alvo.x + x * RAIO_ALVO, alvo.y + y * RAIO_ALVO, alvo.z - 0.015);
        const dardo = novoDardo(['#74ecd3', '#ffcc68', '#ef8ab9'][Math.floor(s.lancados / 3) % 3]);
        grupo.current?.add(dardo);
        s.voo = { t: 0, de: camera.position.clone().add(new THREE.Vector3(0.12, -0.15, -0.3)), para, dardo, acerto };
        s.lancados++;
      }
      s.carregando = false;
    }
    if (s.voo) {
      const v = s.voo;
      v.t = Math.min(1, v.t + dt / 0.32);
      const pos = v.de.clone().lerp(v.para, v.t);
      pos.y += Math.sin(v.t * Math.PI) * 0.12;
      v.dardo.position.copy(pos);
      v.dardo.lookAt(v.para.x, v.para.y, v.para.z + 1); // a ponta (+z do dardo) aponta para o alvo
      if (v.t >= 1) {
        s.pontos += v.acerto.pontos;
        s.historico.push(v.acerto.pontos);
        s.msg = v.acerto.rotulo;
        if (s.lancados >= DARDOS_POR_PARTIDA) {
          const novos: string[] = [];
          for (const t of TROFEUS) {
            const ganhou = t.pontos === null ? v.acerto.centro || s.historico.includes(50) : s.pontos >= t.pontos;
            if (ganhou && !s.trofeus.includes(t.id)) novos.push(t.id);
          }
          s.trofeus.push(...novos);
          s.recorde = Math.max(s.recorde, s.pontos);
          try {
            localStorage.setItem(CHAVE_DARDOS, JSON.stringify({ v: 1, recorde: s.recorde, trofeus: s.trofeus }));
          } catch {
            /* sem armazenamento: o jogo continua */
          }
          s.msg = `Fim: ${s.pontos} pontos.${novos.length ? ' Novo prêmio: ' + novos.map((id) => TROFEUS.find((t) => t.id === id)!.nome).join(', ') + '!' : ''}`;
        }
        s.voo = null;
      }
    }
    // câmera na linha de arremesso, olhando para o alvo
    camera.position.lerp(new THREE.Vector3(linha.x, 1.62, linha.z), 1 - Math.exp(-6 * dt));
    camera.lookAt(alvo.x, alvo.y, alvo.z);
    useJogos.getState().atualizar({
      pontos: s.pontos,
      lancados: s.lancados,
      total: DARDOS_POR_PARTIDA,
      msg: s.msg,
      recorde: s.recorde,
      trofeus: s.trofeus.join(','),
      historico: s.historico.join(' · '),
      firmeza: s.carregando ? Math.round(Math.min(1, s.segurando / 1.2) * 100) : 0,
      miraX: +(s.mira.x + tr.x).toFixed(3),
      miraY: +(s.mira.y + tr.y).toFixed(3),
    });
  });

  return <group ref={grupo} />;
}

/* ------------------------------------------------------------------ montagem do andar */
export function Jogos41({ marcos, malhas }: { marcos: Record<string, Marco>; malhas: Record<string, THREE.Mesh> }) {
  const mesa = marcos.JOGO_sinuca;
  const alvo = marcos.JOGO_dardos;
  const linha = marcos.JOGO_dardos_linha;
  const vinteum = marcos.JOGO_vinteum;
  const crupie = marcos.PESSOA_crupie;

  useEffect(() => {
    const abrir = (j: 'sinuca' | 'dardos' | 'vinteum') => () => {
      useJogo.getState().setPainel(null);
      useJogos.getState().abrir(j);
    };
    if (mesa) candidatar({ id: 'jogo-sinuca', rotulo: 'Jogar sinuca contra Orion', x: mesa.x, z: mesa.z, alcance: 2.0, acao: abrir('sinuca') });
    if (linha) candidatar({ id: 'jogo-dardos', rotulo: 'Jogar dardos', x: linha.x, z: linha.z, alcance: 1.3, acao: abrir('dardos') });
    if (vinteum) candidatar({ id: 'jogo-21', rotulo: 'Jogar 21 com a crupiê Vega', x: vinteum.x, z: vinteum.z, alcance: 1.7, acao: abrir('vinteum') });
    return () => {
      retirar('jogo-sinuca');
      retirar('jogo-dardos');
      retirar('jogo-21');
      useJogos.getState().fechar();
    };
  }, [mesa, linha, vinteum]);

  return (
    <>
      {mesa && <Sinuca mesa={mesa} />}
      {alvo && linha && <Dardos alvo={alvo} linha={linha} tela={malhas.TELA_dardos ?? null} />}
      {crupie && <Pessoa modelo="Female_Adult_02" lugar={crupie} nome="Vega · crupiê robô" clipe={() => (useJogos.getState().ativo === 'vinteum' ? 'talk' : 'idle')} />}
    </>
  );
}
