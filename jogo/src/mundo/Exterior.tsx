/* Fachada do prédio (ferramentas/blender/predio.py) com rua, carros e cidade, e a câmera cinematográfica:
   - entrada: órbita lenta diante da torre, com o letreiro;
   - chegando: voo da câmera até a porta giratória (depois a cortina leva o visitante à cabine do elevador);
   - vista externa: órbita controlada pelo jogador, com o andar atual pulsando na fachada. */
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { consumirOlhar } from '../controles/entrada';
import { useJogo } from '../estado/jogo';
import { useModelo } from '../motor/carregar';
import type { Preset } from '../motor/qualidade';
import { prepararCena } from './Andar';
import { Carros } from './Carros';
import { comandosVista, planoCorte } from './comandos';
import { fachadaProcedural } from './fachada';
import { chegarAoPredio } from './navegacao';
import { telemetria } from '../testes/telemetria';

/** Altura do piso de um andar na fachada (igual a predio.py: térreo de 8 m e andares de 4 m). */
export const alturaAndar = (n: number) => 8 + (n - 1) * 4;

const DURACAO_VOO = 5.5;
const suave = (k: number) => k * k * k * (k * (k * 6 - 15) + 10);

export function Exterior({ preset }: { preset: Preset }) {
  const { scene } = useModelo('modelos/predio.glb');
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const dados = useMemo(() => {
    const { raiz, luzes, marcos } = prepararCena(scene);
    const destaque: Record<number, { mat: THREE.MeshStandardMaterial; base: number }[]> = {};
    raiz.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = false;
      m.receiveShadow = false;
      const mat = m.material as THREE.MeshStandardMaterial;
      if (mat.name === 'janelas') fachadaProcedural(mat);
      const r = mat.name?.match(/^(vidro|neon)_(4[0-4])$/);
      if (r) (destaque[Number(r[2])] ??= []).push({ mat, base: mat.emissiveIntensity });
    });
    return { raiz, luzes, marcos, destaque };
  }, [scene]);

  const etapa = useJogo((s) => s.etapa);
  const vista = useJogo((s) => s.vista);

  const st = useRef({
    tempo: 0,
    voo: 0,
    chegou: false,
    curvaPos: null as THREE.CatmullRomCurve3 | null,
    curvaAlvo: null as THREE.CatmullRomCurve3 | null,
    alvo: new THREE.Vector3(0, 105, 0),
    orbita: { ang: 0, alt: 0, parado: 0 },
  }).current;

  // ao montar: reflexos capturados na praça; ao sair, o andar volta a ser a referência
  useEffect(() => {
    useJogo.getState().cenaPronta([0, 6, 40]);
    planoCorte.constant = 1000;
    if (useJogo.getState().etapa !== 'jogo') useJogo.getState().setCarregado(true);
    return () => {
      comandosVista.externaPronta = false;
      for (const lista of Object.values(dados.destaque)) for (const d of lista) d.mat.emissiveIntensity = d.base;
    };
  }, [dados]);

  // começa a vista externa olhando o andar atual de frente
  useEffect(() => {
    if (vista === 'externa') {
      st.orbita.ang = 0.35;
      st.orbita.alt = 0;
      st.orbita.parado = 0;
    }
  }, [vista, st]);

  // o voo começa da posição atual da câmera
  useEffect(() => {
    if (etapa !== 'chegando') return;
    st.voo = 0;
    st.chegou = false;
    const p0 = camera.position.clone();
    st.curvaPos = new THREE.CatmullRomCurve3(
      [p0, new THREE.Vector3(p0.x * 0.4, 40, 105), new THREE.Vector3(0, 7, 46), new THREE.Vector3(0, 1.9, 24), new THREE.Vector3(0, 1.65, 16.2)],
      false,
      'centripetal',
    );
    st.curvaAlvo = new THREE.CatmullRomCurve3(
      [st.alvo.clone(), new THREE.Vector3(0, 60, 0), new THREE.Vector3(0, 9, 14), new THREE.Vector3(0, 1.7, 15.2), new THREE.Vector3(0, 1.55, 11)],
      false,
      'centripetal',
    );
  }, [etapa, camera, st]);

  useFrame((_, dtBruto) => {
    const dt = Math.min(dtBruto, 0.1);
    st.tempo += dt;
    planoCorte.constant = 1000;
    const jogo = useJogo.getState();
    if (jogo.etapa === 'entrada') {
      // órbita lenta no arco da frente; em tela de pé, a torre sobe para dar lugar ao painel
      const t = st.tempo;
      const ang = 0.18 + 0.5 * Math.sin(t * 0.045);
      const r = 158;
      const alt = 30 + 6 * Math.sin(t * 0.07);
      camera.position.set(Math.sin(ang) * r, alt, Math.cos(ang) * r);
      const retrato = camera.aspect < 1;
      st.alvo.set(0, retrato ? 82 : 102, 0);
      if (!retrato) {
        // olha um pouco à esquerda da torre: ela fica à direita, livre do painel do nome
        const dir = st.alvo.clone().sub(camera.position).normalize();
        const direita = dir.cross(THREE.Object3D.DEFAULT_UP).normalize();
        st.alvo.addScaledVector(direita, -30);
      }
      camera.lookAt(st.alvo);
    } else if (jogo.etapa === 'chegando' && st.curvaPos && st.curvaAlvo) {
      st.voo = Math.min(1, st.voo + dt / DURACAO_VOO);
      const k = suave(st.voo);
      camera.position.copy(st.curvaPos.getPoint(k));
      st.alvo.copy(st.curvaAlvo.getPoint(k));
      camera.lookAt(st.alvo);
      if (st.voo > 0.86 && !st.chegou) {
        st.chegou = true;
        void chegarAoPredio();
      }
    } else if (jogo.vista === 'externa') {
      // órbita livre (arrastar gira e sobe/desce); parada, gira sozinha devagar
      const olhar = consumirOlhar();
      const mexeu = Math.abs(olhar.dx) + Math.abs(olhar.dy) > 0;
      st.orbita.parado = mexeu ? 0 : st.orbita.parado + dt;
      st.orbita.ang -= olhar.dx * 0.0035 * jogo.sensibilidade;
      st.orbita.alt = THREE.MathUtils.clamp(st.orbita.alt + olhar.dy * 0.15 * (jogo.inverterY ? -1 : 1), -60, 60);
      if (st.orbita.parado > 3) st.orbita.ang += dt * 0.05;
      const y = alturaAndar(jogo.andar) + 2;
      const r = 120;
      camera.position.set(Math.sin(st.orbita.ang) * r, y + 8 + st.orbita.alt, Math.cos(st.orbita.ang) * r);
      st.alvo.set(0, y, 0);
      camera.lookAt(st.alvo);
    }
    if (jogo.etapa !== 'jogo' || jogo.vista === 'externa') {
      telemetria.camera.modo = 'externa';
      telemetria.camera.pos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
    }
    if (jogo.vista === 'externa') comandosVista.externaPronta = true;
    // andar atual pulsando na fachada (vista externa)
    for (const [n, lista] of Object.entries(dados.destaque)) {
      const atual = jogo.vista === 'externa' && Number(n) === jogo.andar;
      for (const d of lista) d.mat.emissiveIntensity = atual ? d.base * (2.2 + 1.2 * Math.sin(st.tempo * 3.2)) : d.base;
    }
  });

  const extras = preset.luzesExtras;
  const letreiro = dados.luzes.LUZ_letreiro;
  const alvoLetreiro = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0, letreiro?.y ?? 200, 14);
    return o;
  }, [letreiro]);
  const postes = extras ? [-30, -15, 0, 15, 30] : [-15, 15];
  return (
    <group>
      <primitive object={dados.raiz} />
      <hemisphereLight args={['#7d8bc4', '#1d1510', 0.4]} />
      <directionalLight position={[-120, 220, 160]} intensity={0.22} color="#a9b8ff" />
      <primitive object={alvoLetreiro} />
      {letreiro && (
        <spotLight position={[letreiro.x, letreiro.y - 2, letreiro.z + 6]} target={alvoLetreiro} angle={0.75} penumbra={0.6} intensity={1600} distance={60} decay={1.6} color="#ffe2b0" />
      )}
      <pointLight position={[0, 3.2, 18.5]} intensity={32} distance={20} decay={1.5} color="#ffd59a" />
      {extras && (
        <>
          <pointLight position={[-9, 4.6, 16]} intensity={30} distance={16} decay={1.5} color="#ffd59a" />
          <pointLight position={[9, 4.6, 16]} intensity={30} distance={16} decay={1.5} color="#ffd59a" />
        </>
      )}
      {postes.map((x) => (
        <pointLight key={x} position={[x, 6.6, 29.1]} intensity={45} distance={20} decay={1.4} color="#ffc27a" />
      ))}
      <Carros quantidade={extras ? 12 : 6} />
    </group>
  );
}
