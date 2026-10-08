/* Visores do elevador (dentro da cabine e no hall de cada andar): número do andar e seta, em LED âmbar,
   desenhados num canvas que vira textura. Todos os visores mostram o mesmo estado. */
import * as THREE from 'three';
import { aplicarCorte } from './comandos';

export type Formato = 'largo' | 'cabine';
const TAMANHO: Record<Formato, [number, number]> = { largo: [384, 120], cabine: [256, 128] };
const telas = new Map<Formato, { canvas: HTMLCanvasElement; textura: THREE.CanvasTexture; material: THREE.MeshBasicMaterial }>();
let atual = { numero: 40, seta: '', extra: '' };
let ultimaChave = '';

function desenhar(c: HTMLCanvasElement) {
  const g = c.getContext('2d');
  if (!g) return;
  const { width: w, height: h } = c;
  g.fillStyle = '#060403';
  g.fillRect(0, 0, w, h);
  // grade fina de LEDs apagados
  g.fillStyle = 'rgba(255,150,60,0.05)';
  for (let x = 2; x < w; x += 6) for (let y = 2; y < h; y += 6) g.fillRect(x, y, 3, 3);
  const rotulo = atual.numero === 0 ? 'T' : String(atual.numero);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = '#ff8a1e';
  g.shadowBlur = h * 0.14;
  g.fillStyle = '#ffb547';
  const temExtra = !!atual.extra;
  g.font = `700 ${Math.round(h * (temExtra ? 0.5 : 0.66))}px "Arial Narrow", Arial, sans-serif`;
  const cx = atual.seta ? w * 0.58 : w / 2;
  g.fillText(rotulo, cx, h * (temExtra ? 0.38 : 0.53));
  if (atual.seta) {
    g.font = `700 ${Math.round(h * 0.42)}px Arial, sans-serif`;
    g.fillText(atual.seta, w * 0.2, h * (temExtra ? 0.38 : 0.52));
  }
  if (temExtra) {
    g.shadowBlur = h * 0.06;
    g.font = `600 ${Math.round(h * 0.2)}px Arial, sans-serif`;
    g.fillText(atual.extra, w / 2, h * 0.8);
  }
}

/** Material do visor (sem luz própria do cenário: brilha sozinho e entra no bloom). */
export function materialIndicador(f: Formato) {
  let t = telas.get(f);
  if (!t) {
    const canvas = document.createElement('canvas');
    [canvas.width, canvas.height] = TAMANHO[f];
    desenhar(canvas);
    const textura = new THREE.CanvasTexture(canvas);
    textura.colorSpace = THREE.SRGBColorSpace;
    textura.flipY = false; // as malhas vêm do glTF
    textura.anisotropy = 4;
    const material = new THREE.MeshBasicMaterial({ map: textura, toneMapped: false });
    material.color.setScalar(1.6);
    aplicarCorte(material);
    t = { canvas, textura, material };
    telas.set(f, t);
  }
  return t.material;
}

export function atualizarIndicador(numero: number, seta: string, extra = '') {
  const chave = `${numero}|${seta}|${extra}`;
  if (chave === ultimaChave) return;
  ultimaChave = chave;
  atual = { numero, seta, extra };
  for (const t of telas.values()) {
    desenhar(t.canvas);
    t.textura.needsUpdate = true;
  }
}
