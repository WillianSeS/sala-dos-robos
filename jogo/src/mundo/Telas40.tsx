/* Monitores dos traders e telão do 40º andar: gráficos animados de mercado FICTÍCIO (simulação), desenhados em
   canvas. Nenhum dado real, nenhuma corretora. */
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { aplicarCorte } from './comandos';
import { PARES, serieSimulada } from './mercado';

function tela(w: number, h: number) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.flipY = false;
  const material = new THREE.MeshBasicMaterial({ map: textura, toneMapped: false });
  aplicarCorte(material);
  return { canvas, textura, material };
}

function desenharGrafico(g: CanvasRenderingContext2D, w: number, h: number, titulo: string, serie: number[], destaque = false) {
  g.fillStyle = '#050a12';
  g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(120,160,200,0.12)';
  g.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    g.beginPath();
    g.moveTo(0, (h * i) / 6);
    g.lineTo(w, (h * i) / 6);
    g.stroke();
  }
  const min = Math.min(...serie);
  const max = Math.max(...serie);
  const y = (v: number) => h * 0.85 - ((v - min) / (max - min || 1)) * h * 0.62;
  const sobe = serie[serie.length - 1] >= serie[0];
  g.strokeStyle = sobe ? '#3ee08f' : '#ff5c6c';
  g.lineWidth = destaque ? 4 : 3;
  g.beginPath();
  serie.forEach((v, i) => {
    const x = (i / (serie.length - 1)) * w;
    if (i === 0) g.moveTo(x, y(v));
    else g.lineTo(x, y(v));
  });
  g.stroke();
  g.fillStyle = '#e9f1ff';
  g.font = `600 ${Math.round(h * 0.09)}px Arial, sans-serif`;
  g.fillText(titulo, w * 0.04, h * 0.13);
  g.fillStyle = sobe ? '#3ee08f' : '#ff5c6c';
  g.textAlign = 'right';
  g.fillText(serie[serie.length - 1].toFixed(4), w * 0.96, h * 0.13);
  g.textAlign = 'left';
  g.fillStyle = 'rgba(255,214,120,0.85)';
  g.font = `600 ${Math.round(h * 0.06)}px Arial, sans-serif`;
  g.fillText('SIMULAÇÃO · SEM DINHEIRO REAL', w * 0.04, h * 0.96);
}

export function Telas40({ malhas }: { malhas: Record<string, THREE.Mesh> }) {
  const telas = useMemo(() => {
    const lista: { mesh: THREE.Mesh; par: string; t: ReturnType<typeof tela>; telao: boolean; idx: number }[] = [];
    for (const [nome, mesh] of Object.entries(malhas)) {
      const m = nome.match(/^TELA_monitor_(\d+)_(\d+)$/);
      if (m) lista.push({ mesh, par: PARES[(Number(m[1]) + Number(m[2]) * 3) % PARES.length], t: tela(320, 184), telao: false, idx: Number(m[1]) * 2 + Number(m[2]) });
      if (nome === 'TELA_telao') lista.push({ mesh, par: 'CARTEIRA', t: tela(1024, 538), telao: true, idx: 99 });
    }
    return lista;
  }, [malhas]);

  useEffect(() => {
    const originais = telas.map((t) => t.mesh.material);
    telas.forEach((t) => (t.mesh.material = t.t.material));
    return () => {
      telas.forEach((t, i) => {
        t.mesh.material = originais[i];
        t.t.material.dispose();
        t.t.textura.dispose();
      });
    };
  }, [telas]);

  const tempo = useRef({ t: 0, proximo: 0, vez: 0 });
  useFrame((_, dt) => {
    const s = tempo.current;
    s.t += dt;
    if (s.t < s.proximo) return;
    s.proximo = s.t + 0.25;
    // redesenha algumas telas por vez para não pesar
    s.vez = (s.vez + 1) % 4;
    telas.forEach((t, i) => {
      if (!t.telao && i % 4 !== s.vez) return;
      const g = t.t.canvas.getContext('2d');
      if (!g) return;
      const serie = serieSimulada(t.telao ? 'CARTEIRA' : t.par, s.t, t.telao ? 120 : 48, t.idx);
      desenharGrafico(g, t.t.canvas.width, t.t.canvas.height, t.telao ? 'CARTEIRA DOS ROBÔS (fictícia)' : t.par, serie, t.telao);
      t.t.textura.needsUpdate = true;
    });
  });
  return null;
}
