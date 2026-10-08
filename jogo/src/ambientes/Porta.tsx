/* Porta de nogueira: abre e fecha com E (ou o botão de interação no celular). A folha é um corpo cinemático
   com colisor próprio, que gira em torno da dobradiça; fechada, bloqueia a passagem. */
import { CuboidCollider, RigidBody, useBeforePhysicsStep, type RapierRigidBody } from '@react-three/rapier';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { aproximar } from '../controles/movimento';
import { useJogo } from '../estado/jogo';
import { candidatar, retirar } from '../mundo/interacoes';
import { telemetria } from '../testes/telemetria';

export const PORTA_ABERTA = -THREE.MathUtils.degToRad(95);
const ALCANCE = 1.7;
const _q = new THREE.Quaternion();
const _eixo = new THREE.Vector3(0, 1, 0);

export function Porta({ objeto }: { objeto: THREE.Object3D }) {
  const corpo = useRef<RapierRigidBody>(null);
  const estado = useRef({ angulo: 0, aberta: false });

  const { dobradica, tam, centroLocal } = useMemo(() => {
    const dobradica = objeto.position.clone();
    objeto.position.set(0, 0, 0);
    objeto.rotation.set(0, 0, 0);
    objeto.updateMatrixWorld(true);
    const caixa = new THREE.Box3().setFromObject(objeto);
    const tam = caixa.getSize(new THREE.Vector3());
    const centroLocal = caixa.getCenter(new THREE.Vector3());
    objeto.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    return { dobradica, tam, centroLocal };
  }, [objeto]);

  useBeforePhysicsStep((w) => {
    const b = corpo.current;
    if (!b) return;
    const dt = Math.min(w.timestep, 0.1);
    const e = estado.current;
    // meio do vão: ponto da interação
    const cx = dobradica.x + tam.x / 2;
    const cz = dobradica.z;
    const p = telemetria.pos;
    // jogador dentro do arco da folha (lado do corredor): não deixa a porta bater nele
    const noArco = p.x > dobradica.x - 0.35 && p.x < dobradica.x + tam.x + 0.35 && p.z > cz - 0.05 && p.z < cz + tam.x + 0.35;
    candidatar({
      id: 'porta',
      rotulo: noArco ? 'Saia da frente da porta' : e.aberta ? 'Fechar a porta' : 'Abrir a porta',
      x: cx,
      z: cz,
      alcance: ALCANCE,
      ativo: !noArco,
      acao: () => {
        e.aberta = !e.aberta;
        useJogo.getState().setPortaAberta(e.aberta);
      },
    });
    const alvo = e.aberta ? PORTA_ABERTA : 0;
    e.angulo = aproximar(e.angulo, alvo, 5.5, dt);
    if (Math.abs(e.angulo - alvo) < 0.002) e.angulo = alvo;
    _q.setFromAxisAngle(_eixo, e.angulo);
    b.setNextKinematicRotation(_q);
    telemetria.porta = { aberta: e.aberta, angulo: e.angulo };
  });

  useEffect(() => () => retirar('porta'), []);

  return (
    <RigidBody ref={corpo} type="kinematicPosition" colliders={false} position={[dobradica.x, dobradica.y, dobradica.z]}>
      <CuboidCollider args={[tam.x / 2, tam.y / 2, Math.max(tam.z / 2, 0.025)]} position={[centroLocal.x, centroLocal.y, centroLocal.z]} />
      <primitive object={objeto} />
    </RigidBody>
  );
}
