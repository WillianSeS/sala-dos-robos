/* Elevador funcional: cabine 3D (ferramentas/blender/elevador.py), quatro folhas de porta deslizantes com colisão
   (cabine + hall), painel com os cinco andares, botões que acendem, visores com número e seta, tremor na viagem
   e troca do andar de destino (que precisa estar carregado para as portas abrirem). */
import { CuboidCollider, RigidBody, useBeforePhysicsStep, type RapierRigidBody } from '@react-three/rapier';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useJogo } from '../estado/jogo';
import { useModelo } from '../motor/carregar';
import { telemetria } from '../testes/telemetria';
import { ANDARES, INFO_ANDAR, type NumeroAndar } from './andares';
import { prepararCena } from './Andar';
import { clicaveis } from './cliques';
import { comandosElevador, dentroDaCabine } from './comandos';
import { duracaoViagem, novoElevador, passo, seta } from './elevador';
import { atualizarIndicador, materialIndicador } from './indicador';
import { candidatar, retirar } from './interacoes';

const VAO = { xa: 2.65, xb: 3.75 };
const LARGURA_FOLHA = 0.55;
const COR_BOTAO = new THREE.Color('#ffcf7a');

interface Folha {
  nome: string;
  objeto: THREE.Object3D;
  base: THREE.Vector3;
  sinal: number;
  tam: THREE.Vector3;
}

const suave = (k: number) => k * k * (3 - 2 * k);

/** Tremor da cabine: tranco na partida e na chegada e uma vibração leve no meio. */
function tremorViagem(k: number) {
  const tranco = Math.exp(-(((k - 0.05) / 0.05) ** 2)) + Math.exp(-(((k - 0.95) / 0.05) ** 2));
  return Math.min(1, 0.18 + tranco);
}

export function Elevador() {
  const { scene } = useModelo('modelos/elevador.glb');
  const dados = useMemo(() => {
    const { raiz, colisores, luzes, marcos, malhas } = prepararCena(scene);
    const folhas: Folha[] = [];
    for (const nome of ['PORTA_cab_esq', 'PORTA_cab_dir', 'PORTA_hall_esq', 'PORTA_hall_dir']) {
      const o = malhas[nome];
      if (!o) continue;
      const base = o.position.clone();
      o.removeFromParent();
      o.position.set(0, 0, 0);
      o.updateMatrixWorld(true);
      const tam = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
      folhas.push({ nome, objeto: o, base, sinal: nome.endsWith('esq') ? -1 : 1, tam });
    }
    const botoes: Record<string, THREE.Mesh> = {};
    for (const [nome, m] of Object.entries(malhas)) {
      if (!nome.startsWith('BOTAO_')) continue;
      const mat = (m.material as THREE.MeshStandardMaterial).clone();
      mat.emissive.copy(COR_BOTAO);
      mat.emissiveIntensity = 0;
      m.material = mat;
      botoes[nome.slice(6)] = m;
    }
    if (malhas.TELA_cabine) malhas.TELA_cabine.material = materialIndicador('cabine');
    if (malhas.TELA_cabine_porta) malhas.TELA_cabine_porta.material = materialIndicador('largo');
    return { raiz, colisores, luz: luzes.LUZ_cabine, ponto: marcos.PONTO_cabine, folhas, botoes };
  }, [scene]);

  const corpos = useRef<(RapierRigidBody | null)[]>([]);
  const piscar = useRef<Record<string, number>>({});

  // botões 3D clicáveis (mouse ou toque) e limpeza das interações ao desmontar
  useEffect(() => {
    const ids: string[] = [];
    for (const [nome, m] of Object.entries(dados.botoes)) {
      const id = `elevador-${nome}`;
      ids.push(id);
      clicaveis.set(id, {
        objeto: m,
        alcance: 1.7,
        acao: () => {
          piscar.current[nome] = 0.35;
          if (nome === 'abrir') comandosElevador.abrir = true;
          else if (nome === 'fechar') comandosElevador.fechar = true;
          else apertarAndar(Number(nome) as NumeroAndar);
        },
      });
    }
    return () => {
      for (const id of ids) clicaveis.delete(id);
      retirar('elevador-painel');
      retirar('elevador-chamar');
    };
  }, [dados]);

  useBeforePhysicsStep((w) => {
    const dt = Math.min(w.timestep, 0.1);
    if (dt <= 0) return;
    const c = comandosElevador;
    const jogo = useJogo.getState();
    let e = c.estado ?? novoElevador(jogo.andar);
    if (c.forcar) {
      const aberto = !!c.forcar.aberto;
      e = { ...novoElevador(c.forcar.andar), destino: c.forcar.destino, fase: aberto ? 'aberto' : 'fechado', portas: aberto ? 1 : 0 };
      c.forcar = null;
      c.graca = 0.3;
    }
    const p = telemetria.pos;
    c.graca = Math.max(0, c.graca - dt);
    const aBordo = dentroDaCabine(p.x, p.z) || c.graca > 0;
    const presenca = p.x > VAO.xa - 0.2 && p.x < VAO.xb + 0.2 && p.z > 9.5 && p.z < 10.4;
    const antes = e.fase;
    e = passo(e, dt, {
      abrir: c.abrir,
      fechar: c.fechar,
      escolher: c.escolher,
      presenca,
      aBordo,
      carregado: (n) => useJogo.getState().andarPronto === n,
    });
    c.abrir = c.fechar = false;
    c.escolher = undefined;
    if (e.fase === 'viajando' && antes !== 'viajando' && e.destino !== null) jogo.setAndar(e.destino);
    c.estado = e;

    // portas: as folhas da cabine e do hall abrem juntas, para os lados
    const k = suave(e.portas);
    dados.folhas.forEach((f, i) => {
      corpos.current[i]?.setNextKinematicTranslation({ x: f.base.x + f.sinal * LARGURA_FOLHA * 0.98 * k, y: f.base.y, z: f.base.z });
    });

    // tremor, visores e botões acesos
    if (e.fase === 'viajando' && e.destino !== null) c.tremor = tremorViagem(Math.min(1, e.t / duracaoViagem(e.andar, e.destino)));
    else c.tremor = 0;
    const esperando = e.fase === 'viajando' && e.destino !== null && e.t > duracaoViagem(e.andar, e.destino) && jogo.andarPronto !== e.destino;
    atualizarIndicador(e.indicador, seta(e), esperando ? 'carregando' : '');
    for (const [nome, b] of Object.entries(dados.botoes)) {
      const mat = b.material as THREE.MeshStandardMaterial;
      const pisca = (piscar.current[nome] = Math.max(0, (piscar.current[nome] ?? 0) - dt));
      const aceso = String(e.destino) === nome || pisca > 0 || (nome === 'abrir' && e.fase === 'abrindo') || (nome === 'fechar' && e.fase === 'fechando');
      mat.emissiveIntensity = aceso ? 2.4 : 0;
    }
    jogo.setElevador({ fase: e.fase, andar: e.andar, indicador: e.indicador, destino: e.destino });

    // interações: painel (de dentro da cabine) e botão de chamada (no hall)
    if (aBordo && jogo.etapa === 'jogo') {
      candidatar({ id: 'elevador-painel', rotulo: 'Painel do elevador', x: 4.0, z: 10.45, alcance: 2.2, prioridade: 0.5, acao: () => useJogo.getState().setPainel('elevador') });
    } else retirar('elevador-painel');
    if (p.z > 6.6 && p.z < 9.95 && p.x > 1.4 && p.x < 6.4) {
      const aberto = e.fase === 'aberto' || e.fase === 'abrindo';
      candidatar({
        id: 'elevador-chamar',
        rotulo: aberto ? 'Elevador aberto' : 'Chamar o elevador',
        x: 4.17,
        z: 9.55,
        alcance: 1.5,
        ativo: !aberto,
        acao: () => {
          piscar.current.chamar = 0.4;
          comandosElevador.abrir = true;
        },
      });
    } else retirar('elevador-chamar');
  });

  const luz = dados.luz;
  return (
    <>
      <primitive object={dados.raiz} />
      <RigidBody type="fixed" colliders={false}>
        {dados.colisores.map((c, i) => (
          <CuboidCollider key={i} args={c.meia} position={c.pos} rotation={c.rot} />
        ))}
      </RigidBody>
      {dados.folhas.map((f, i) => (
        <RigidBody
          key={f.nome}
          ref={(r) => {
            corpos.current[i] = r;
          }}
          type="kinematicPosition"
          colliders={false}
          position={[f.base.x, f.base.y, f.base.z]}
        >
          <CuboidCollider args={[f.tam.x / 2, f.tam.y / 2, Math.max(f.tam.z / 2, 0.02)]} position={[0, f.tam.y / 2, 0]} />
          <primitive object={f.objeto} />
        </RigidBody>
      ))}
      {luz && <pointLight position={[luz.x, luz.y, luz.z]} intensity={3.2} distance={4} decay={1.8} color="#fff1dc" />}
    </>
  );
}

/** Painel (HTML ou 3D): escolher um andar. O botão pisca e a cabine parte assim que as portas fecharem. */
export function apertarAndar(n: NumeroAndar) {
  const jogo = useJogo.getState();
  if (!ANDARES.includes(n)) return;
  comandosElevador.escolher = n;
  if (n === jogo.elevador.andar) jogo.avisar(`Você já está no ${n}º andar · ${INFO_ANDAR[n].nome}`);
}
