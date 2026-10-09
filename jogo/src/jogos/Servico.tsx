/* Fase 6: atendimento. Bar dos andares 41–44 com Caio ou Sofia (robôs de serviço), copa e geladeira do 40º.
   O pedido é preparado e entregue na mão do visitante; consumir é só uma animação. Nada é cobrado. */
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useJogo } from '../estado/jogo';
import type { NumeroAndar } from '../mundo/andares';
import { candidatar, retirar } from '../mundo/interacoes';
import { useJogos } from './estado';
import { ATENDENTES, DURACAO_CONSUMO, item } from './itens';
import { Pessoa } from './Pessoa';

type Marco = { x: number; y: number; z: number; yaw: number };

/** Relógio de serviço (s), avançado pelo laço do jogo (funciona também nos testes quadro a quadro). */
export const relogioServico = { t: 0 };

/** Avança o preparo do pedido e o consumo do item na mão. Montado uma vez no interior. */
export function Consumo() {
  useFrame((_, dt) => {
    relogioServico.t += Math.min(dt, 0.1);
    const s = useJogos.getState();
    if (s.pedido && relogioServico.t >= s.pedido.prontoEm) {
      const i = item(s.pedido.id);
      s.setPedido(null);
      s.setNaMao(s.pedido.id);
      if (i) useJogo.getState().avisar(`${i.emoji} ${i.nome} na sua mão. Bom proveito!`);
    }
    if (s.consumindo && s.naMao) {
      const c = Math.min(1, s.consumo + Math.min(dt, 0.1) / DURACAO_CONSUMO);
      if (c >= 1) {
        const i = item(s.naMao);
        s.setNaMao(null);
        if (i) useJogo.getState().avisar(`${i.emoji} Você terminou: ${i.nome.toLowerCase()}.`);
      } else s.setConsumo(c, true);
    }
  });
  return null;
}

export function Bar({ n, marcos }: { n: NumeroAndar; marcos: Record<string, Marco> }) {
  const atendente = ATENDENTES[n];
  const lugar = marcos.PESSOA_bar;
  const balcao = marcos.PONTO_balcao;
  useEffect(() => {
    if (!atendente || !balcao) return;
    candidatar({
      id: 'bar',
      rotulo: `Pedir no bar (${atendente.nome})`,
      x: balcao.x,
      z: balcao.z,
      alcance: 2.6,
      acao: () => useJogos.getState().setCardapio({ onde: 'bar', atendente: atendente.nome }),
    });
    return () => retirar('bar');
  }, [atendente, balcao]);
  if (!atendente || !lugar) return null;
  return (
    <Pessoa
      modelo={atendente.modelo}
      lugar={lugar}
      nome={`${atendente.nome} · atendimento (robô)`}
      clipe={() => (useJogos.getState().pedido ? 'talk' : 'idle')}
    />
  );
}

export function Copa40({ malhas }: { malhas: Record<string, THREE.Mesh> }) {
  const pontos = useMemo(() => {
    const p = (m?: THREE.Mesh) => (m ? m.getWorldPosition(new THREE.Vector3()) : null);
    return { cafe: p(malhas.MOVEL_cafeteira), geladeira: p(malhas.MOVEL_geladeira) };
  }, [malhas]);
  useEffect(() => {
    if (pontos.cafe)
      candidatar({ id: 'copa-cafe', rotulo: 'Tirar um café', x: pontos.cafe.x - 0.7, z: pontos.cafe.z, alcance: 1.4, acao: () => useJogos.getState().setCardapio({ onde: 'copa' }) });
    if (pontos.geladeira)
      candidatar({ id: 'copa-geladeira', rotulo: 'Abrir a geladeira', x: pontos.geladeira.x - 0.8, z: pontos.geladeira.z, alcance: 1.4, acao: () => useJogos.getState().setCardapio({ onde: 'geladeira' }) });
    return () => {
      retirar('copa-cafe');
      retirar('copa-geladeira');
    };
  }, [pontos]);
  return null;
}
