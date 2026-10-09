/* Vida dos ambientes (Fase 4): DJ e dançarinos na discoteca (42º), narguilé virtual no Smoking Lounge (43º) e o
   show do Las Vegas Night (44º), com artistas em figurinos de palco elegantes. Tudo não explícito. */
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useJogo } from '../estado/jogo';
import { aplicarCorte } from '../mundo/comandos';
import { candidatar, retirar } from '../mundo/interacoes';
import { ESTILOS, type Estilo } from './danca';
import { Pessoa } from './Pessoa';

type Marco = { x: number; y: number; z: number; yaw: number };

/* ------------------------------------------------------------------ discoteca */
const DANCARINOS = ['Female_Adult_09', 'Male_Adult_02', 'Business_Female_02', 'Male_Adult_10'];

export function Disco42({ marcos }: { marcos: Record<string, Marco> }) {
  const dj = marcos.PESSOA_dj;
  return (
    <>
      {dj && (
        <Pessoa
          modelo="Male_Adult_10"
          lugar={dj}
          nome="DJ Nexus (robô)"
          clipe={() => 'idle'}
          danca={() => 'balanco'}
          fase={0.2}
        />
      )}
      {DANCARINOS.map((modelo, i) => {
        const m = marcos[`DANCA_${i}`];
        if (!m) return null;
        // cada um troca de passo a cada 16 batidas
        const estilos = ESTILOS.map((e) => e.id);
        return (
          <Pessoa
            key={modelo}
            modelo={modelo}
            lugar={m}
            clipe={() => 'idle'}
            danca={(t) => estilos[(Math.floor(t / 8) + i) % estilos.length] as Estilo}
            fase={i * 0.37}
          />
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ fumaça (narguilé virtual) */
function textoFumaca() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const r = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  r.addColorStop(0, 'rgba(235,235,240,0.55)');
  r.addColorStop(1, 'rgba(235,235,240,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function Fumaca({ origem, ativa }: { origem: THREE.Vector3; ativa: () => boolean }) {
  const N = 40;
  const { pontos, idades } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
    const mat = new THREE.PointsMaterial({ map: textoFumaca(), size: 0.22, transparent: true, depthWrite: false, opacity: 0.6, color: '#d8dce6' });
    aplicarCorte(mat);
    const pontos = new THREE.Points(geo, mat);
    pontos.frustumCulled = false;
    pontos.userData.semReflexo = true;
    return { pontos, idades: new Float32Array(N).map(() => Math.random() * 3) };
  }, []);
  useFrame((_, dt) => {
    const pos = pontos.geometry.attributes.position as THREE.BufferAttribute;
    const liga = ativa();
    for (let i = 0; i < N; i++) {
      idades[i] += dt;
      if (idades[i] > 3) idades[i] = liga ? 0 : 3;
      const a = idades[i];
      const visivel = a < 3;
      pos.setXYZ(i, origem.x + Math.sin(a * 1.7 + i) * 0.06 * a, visivel ? origem.y + a * 0.35 : -100, origem.z + Math.cos(a * 1.3 + i) * 0.06 * a);
    }
    pos.needsUpdate = true;
  });
  return <primitive object={pontos} />;
}

export function Lounge43({ marcos }: { marcos: Record<string, Marco> }) {
  const narguiles = useMemo(() => Object.entries(marcos).filter(([n]) => n.startsWith('NARGUILE_')).map(([n, m]) => ({ id: n, p: new THREE.Vector3(m.x, m.y, m.z) })), [marcos]);
  const ate = useRef<Record<string, number>>({});
  const relogio = useRef(0);
  useFrame((_, dt) => {
    relogio.current += dt;
  });
  useEffect(() => {
    for (const n of narguiles)
      candidatar({
        id: n.id,
        rotulo: 'Usar o narguilé (virtual)',
        x: n.p.x,
        z: n.p.z,
        alcance: 1.5,
        acao: () => {
          ate.current[n.id] = relogio.current + 8;
          useJogo.getState().avisar('Narguilé virtual: só efeito visual, sem tabaco de verdade.');
        },
      });
    return () => {
      for (const n of narguiles) retirar(n.id);
    };
  }, [narguiles]);
  return (
    <>
      {narguiles.map((n) => (
        <Fumaca key={n.id} origem={n.p} ativa={() => (ate.current[n.id] ?? 0) > relogio.current || Math.sin(relogio.current * 0.2 + n.p.x) > 0.85} />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ show */
const ARTISTAS = ['Business_Female_01', 'Business_Female_04', 'Business_Female_03'];
/** Show de 64 s a cada 90 s: entra em cancan sincronizado; no intervalo, as artistas acenam e conversam. */
export const emShow = (t: number) => t % 90 < 64;

export function Show44({ marcos }: { marcos: Record<string, Marco> }) {
  const palco = useMemo(() => {
    const m = marcos.PESSOA_artista_1;
    return m ? new THREE.Vector3(m.x, 0, m.z + 2.2) : null;
  }, [marcos]);
  useEffect(() => {
    if (!palco) return;
    candidatar({
      id: 'show-aplaudir',
      rotulo: 'Aplaudir o show',
      x: palco.x,
      z: palco.z + 1.2,
      alcance: 4,
      prioridade: -1,
      acao: () => useJogo.getState().avisar('👏 Você aplaudiu as artistas do Las Vegas Night!'),
    });
    return () => retirar('show-aplaudir');
  }, [palco]);
  return (
    <>
      {ARTISTAS.map((modelo, i) => {
        const m = marcos[`PESSOA_artista_${i}`];
        if (!m) return null;
        return (
          <Pessoa
            key={modelo + i}
            modelo={modelo}
            lugar={m}
            clipe={(t) => (emShow(t) ? 'idle' : i === 1 ? 'talk' : 'idle')}
            danca={(t) => (emShow(t) ? 'cancan' : null)}
            fase={0}
          />
        );
      })}
    </>
  );
}
