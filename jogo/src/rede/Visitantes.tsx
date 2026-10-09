/* Outras pessoas conectadas no mesmo andar: avatar Rocketbox com crachá "nome · visitante", andando, sentado ou dançando
   conforme a presença recebida (posição suavizada). NPCs nunca entram aqui. */
import { useFrame } from '@react-three/fiber';
import { passoVoz } from './voz';
import { useRef } from 'react';
import * as THREE from 'three';
import { useJogo } from '../estado/jogo';
import { ESTILOS, type Estilo } from '../jogos/danca';
import { Pessoa } from '../jogos/Pessoa';
import { passoRede, useSala, VERSAO, VISUAIS } from './sala';

const amortecer = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));
const ESTILO_OK = new Set<string>(ESTILOS.map((e) => e.id));

function Visitante({ id }: { id: string }) {
  const ini = useSala.getState().pessoas[id];
  const atual = useRef({ x: ini?.x ?? 0, y: ini?.y ?? 0, z: ini?.z ?? 0, yaw: ini?.yaw ?? 0, vel: 0, t: -1 });
  const nome = ini?.nome ?? 'Visitante';
  const modelo = VISUAIS[Math.abs(Number(ini?.a) | 0) % VISUAIS.length];
  const alvo = () => useSala.getState().pessoas[id];
  return (
    <Pessoa
      modelo={modelo}
      lugar={{ x: atual.current.x, z: atual.current.z, yaw: atual.current.yaw }}
      nome={`${nome} · visitante`}
      clipe={() => {
        const p = alvo();
        if (p?.m === 's') return 'sitRelax';
        return atual.current.vel > 0.25 ? 'walk' : 'idle';
      }}
      danca={() => {
        const p = alvo();
        return p?.m === 'd' && p.ds && ESTILO_OK.has(p.ds) ? (p.ds as Estilo) : null;
      }}
      mover={(t, g: THREE.Group) => {
        const p = alvo();
        if (!p) return;
        const a = atual.current;
        const dt = a.t < 0 ? 1 / 60 : Math.min(Math.max(t - a.t, 1e-3), 0.1);
        a.t = t;
        const tx = Number(p.x) || 0;
        const tz = Number(p.z) || 0;
        const d = Math.hypot(tx - a.x, tz - a.z);
        if (d > 4) {
          a.x = tx;
          a.z = tz;
        } // teleporte (elevador, entrar sentado): sem atravessar paredes
        const nx = amortecer(a.x, tx, 6, dt);
        const nz = amortecer(a.z, tz, 6, dt);
        a.vel = amortecer(a.vel, Math.hypot(nx - a.x, nz - a.z) / dt, 8, dt);
        a.x = nx;
        a.z = nz;
        a.y = amortecer(a.y, Number(p.y) || 0, 8, dt);
        let dy = (Number(p.yaw) || 0) - a.yaw;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        a.yaw += dy * (1 - Math.exp(-8 * dt));
        g.position.set(a.x, a.y, a.z);
        g.rotation.y = a.yaw;
      }}
    />
  );
}

export function Visitantes() {
  const andar = useJogo((s) => s.andar);
  const ids = useSala((s) =>
    Object.entries(s.pessoas)
      .filter(([, p]) => p.v === VERSAO && p.andar === andar)
      .map(([k]) => k)
      .sort()
      .join(','),
  );
  const frente = useRef(new THREE.Vector3());
  useFrame(({ camera }, dt) => {
    passoRede(Math.min(dt, 0.1));
    camera.getWorldDirection(frente.current);
    const f = frente.current;
    passoVoz({ x: camera.position.x, y: camera.position.y, z: camera.position.z, fx: f.x, fy: f.y, fz: f.z });
  });
  return (
    <>
      {ids
        .split(',')
        .filter(Boolean)
        .map((id) => (
          <Visitante key={id} id={id} />
        ))}
    </>
  );
}
