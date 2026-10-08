/* Ganchos para os testes automatizados (só com ?teste): estatísticas da cena, avanço quadro a quadro e
   atalhos de navegação. */
import { useThree } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import { useEffect } from 'react';
import { Vector3, type Mesh } from 'three';
import { apertarAndar } from '../mundo/Elevador';
import { comandosElevador } from '../mundo/comandos';
import { chamarElevador, entrar, irPara, vistaExterna } from '../mundo/navegacao';
import { escolher } from '../mundo/interacoes';
import type { NumeroAndar } from '../mundo/andares';
import { acoesTeste, telemetria } from './telemetria';

const fisica = { colisores: 0 };

export function GanchosTeste() {
  const { scene, gl, advance, camera } = useThree();
  useEffect(() => {
    let tempo = 0;
    acoesTeste.estatisticas = () => {
      let malhas = 0;
      let triangulos = 0;
      scene.traverse((o) => {
        const m = o as Mesh;
        if (m.isMesh && m.visible) {
          malhas++;
          const g = m.geometry;
          triangulos += (g.index ? g.index.count : g.attributes.position.count) / 3;
        }
      });
      return { malhas, triangulos: Math.round(triangulos), colisores: fisica.colisores, chamadas: gl.info.render.calls };
    };
    // avança N quadros de jogo; só o último é desenhado (física, animação e câmera rodam em todos):
    // os testes de lógica ficam rápidos mesmo sem GPU, e o vídeo avança de 1 em 1 (todo quadro desenhado)
    acoesTeste.avancar = (quadros, dt) => {
      const desenhar = gl.render;
      try {
        for (let i = 0; i < quadros; i++) {
          tempo += dt;
          gl.render = i < quadros - 1 ? () => undefined : desenhar;
          advance(tempo);
        }
      } finally {
        gl.render = desenhar;
      }
    };
    acoesTeste.irPara = (n) => irPara(n as NumeroAndar);
    acoesTeste.chamarElevador = () => chamarElevador();
    acoesTeste.vistaExterna = (ligar) => vistaExterna(ligar);
    acoesTeste.entrar = (nome) => entrar(nome);
    acoesTeste.apertar = (botao) => {
      if (botao === 'abrir') comandosElevador.abrir = true;
      else if (botao === 'fechar') comandosElevador.fechar = true;
      else apertarAndar(Number(botao) as NumeroAndar);
    };
    acoesTeste.projetar = (nome) => {
      const o = scene.getObjectByName(nome);
      if (!o) return null;
      const v = o.getWorldPosition(new Vector3()).project(camera);
      const r = gl.domElement.getBoundingClientRect();
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height, frente: v.z < 1 };
    };
    acoesTeste.sentarNoMaisProximo = () => {
      const a = escolher(telemetria.pos.x, telemetria.pos.z, 'sentar');
      if (a) a.acao();
      return !!a;
    };
    return () => {
      acoesTeste.estatisticas = undefined;
      acoesTeste.avancar = undefined;
    };
  }, [scene, gl, advance, camera]);
  return null;
}

/** Dentro da física: conta os colisores do mundo. */
export function GanchosFisica() {
  const { world } = useRapier();
  useEffect(() => {
    const id = setInterval(() => {
      fisica.colisores = world.colliders.len();
    }, 200);
    fisica.colisores = world.colliders.len();
    return () => clearInterval(id);
  }, [world]);
  return null;
}
