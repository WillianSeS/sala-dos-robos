/* Interações por proximidade (E / ✋ / 🪑) e por clique nos botões 3D.
   A cada passo escolhe o objeto interativo mais perto do jogador, mostra a dica e executa a ação pedida. */
import { useThree } from '@react-three/fiber';
import { useAfterPhysicsStep } from '@react-three/rapier';
import { useEffect } from 'react';
import * as THREE from 'three';
import { consumirInteracao, consumirSentar } from '../controles/entrada';
import { controleLivre, useJogo } from '../estado/jogo';
import { telemetria } from '../testes/telemetria';
import { escolherClicavel } from './cliques';
import { comandosJogador } from './comandos';
import { escolher } from './interacoes';

export function Interacoes() {
  useAfterPhysicsStep(() => {
    const jogo = useJogo.getState();
    const p = telemetria.pos;
    if (!controleLivre()) {
      consumirInteracao();
      consumirSentar();
      jogo.setPodeSentar(false);
      if (jogo.dica) jogo.setDica(null, false);
      return;
    }
    const fase = comandosJogador.fase;
    if (fase !== 'livre') {
      // sentado: E, 🪑 ou andar levantam o personagem
      const sentado = fase === 'sentado';
      jogo.setDica(sentado ? 'Levantar' : null, sentado);
      jogo.setPodeSentar(sentado);
      const pediu = consumirInteracao() || consumirSentar();
      if (sentado && pediu) comandosJogador.levantar = true;
      return;
    }
    const c = escolher(p.x, p.z);
    const assento = escolher(p.x, p.z, 'sentar');
    jogo.setDica(c ? c.rotulo : null, !!c && c.ativo !== false);
    jogo.setPodeSentar(!!assento);
    if (consumirInteracao() && c && c.ativo !== false) c.acao();
    if (consumirSentar() && assento) assento.acao();
  });
  return null;
}

/** Clique/toque curto na tela: aperta o botão 3D apontado (painel do elevador, botão de chamada). */
export function Cliques() {
  const { camera, gl } = useThree();
  useEffect(() => {
    const alvo = (gl.domElement.closest('.palco') as HTMLElement | null) ?? gl.domElement;
    const raio = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let inicio: { x: number; y: number; t: number; id: number } | null = null;
    const baixo = (e: PointerEvent) => {
      inicio = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
    };
    const cima = (e: PointerEvent) => {
      const i = inicio;
      inicio = null;
      if (!i || i.id !== e.pointerId) return;
      if (Math.hypot(e.clientX - i.x, e.clientY - i.y) > 8 || performance.now() - i.t > 450) return;
      if (!controleLivre()) return;
      const r = gl.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raio.setFromCamera(ndc, camera);
      const achado = escolherClicavel(raio.ray, telemetria.pos);
      if (!achado) return;
      if (achado.longe) useJogo.getState().avisar('Chegue mais perto para apertar o botão');
      else achado.c.acao();
    };
    alvo.addEventListener('pointerdown', baixo);
    alvo.addEventListener('pointerup', cima);
    return () => {
      alvo.removeEventListener('pointerdown', baixo);
      alvo.removeEventListener('pointerup', cima);
    };
  }, [camera, gl]);
  return null;
}
