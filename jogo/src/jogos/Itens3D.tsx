/* Modelos 3D dos itens do cardápio (copo, lata, caneca, taça, sanduíche, pizza, maçã) e o item na mão do jogador. */
import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { item as itemDe, type Item } from './itens';
import { useJogos } from './estado';

const mat = (cor: string, rough = 0.5, metal = 0, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color: cor, roughness: rough, metalness: metal, ...extra });

function rotuloLata(i: Item) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = i.cor ?? '#888';
  g.fillRect(0, 0, 256, 128);
  g.fillStyle = '#f9f2dd';
  g.textAlign = 'center';
  g.font = 'bold 30px Arial';
  g.fillText(i.rotulo ?? '', 128, 62);
  g.font = '11px Arial';
  g.fillText('SALA DOS ROBÔS · 350 ml', 128, 90);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Modelo do item (origem na base). nivel: 1 cheio .. 0 vazio (líquidos e comida diminuem). */
export function modeloItem(i: Item): { grupo: THREE.Group; nivel: (n: number) => void } {
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, y = 0, x = 0, z = 0) => {
    const me = new THREE.Mesh(geo, m);
    me.position.set(x, y, z);
    me.castShadow = true;
    g.add(me);
    return me;
  };
  const vidro = mat('#d6eef7', 0.08, 0.05, { transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
  let conteudo: THREE.Mesh | null = null;
  let altura = 0.1;
  switch (i.forma) {
    case 'lata': {
      add(new THREE.CylinderGeometry(0.033, 0.033, 0.12, 24), new THREE.MeshStandardMaterial({ map: rotuloLata(i), roughness: 0.32, metalness: 0.4 }), 0.06);
      add(new THREE.CylinderGeometry(0.03, 0.033, 0.006, 24), mat('#b9c2c7', 0.23, 0.82), 0.123);
      break;
    }
    case 'caneca': {
      add(new THREE.CylinderGeometry(0.04, 0.036, 0.09, 24, 1, true), mat('#ece7df', 0.27, 0, { side: THREE.DoubleSide }), 0.045);
      add(new THREE.CylinderGeometry(0.036, 0.036, 0.006, 24), mat('#ece7df', 0.27), 0.003);
      const alca = add(new THREE.TorusGeometry(0.022, 0.006, 8, 16, Math.PI), mat('#ece7df', 0.27), 0.05, 0.042);
      alca.rotation.z = -Math.PI / 2;
      conteudo = add(new THREE.CylinderGeometry(0.037, 0.035, 0.07, 24), mat(i.cor ?? '#352015', 0.2), 0.04);
      altura = 0.07;
      break;
    }
    case 'taca': {
      add(new THREE.CylinderGeometry(0.035, 0.035, 0.004, 24), vidro, 0.002);
      add(new THREE.CylinderGeometry(0.004, 0.004, 0.09, 8), vidro, 0.047);
      add(new THREE.SphereGeometry(0.045, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), vidro, 0.135).rotation.x = Math.PI;
      conteudo = add(new THREE.SphereGeometry(0.04, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(i.cor ?? '#641a29', 0.15), 0.13);
      conteudo.rotation.x = Math.PI;
      altura = 0.04;
      break;
    }
    case 'sanduiche': {
      add(new THREE.BoxGeometry(0.11, 0.02, 0.09), mat('#e8cd98', 0.95), 0.01);
      add(new THREE.BoxGeometry(0.115, 0.008, 0.095), mat('#447643', 0.88), 0.024);
      add(new THREE.BoxGeometry(0.11, 0.008, 0.09), mat('#efbf54', 0.85), 0.032);
      conteudo = add(new THREE.BoxGeometry(0.11, 0.02, 0.09), mat('#e8cd98', 0.95), 0.046);
      altura = 0.02;
      break;
    }
    case 'pizza': {
      const fatia = new THREE.CylinderGeometry(0.13, 0.13, 0.012, 3, 1, false, 0, Math.PI / 4);
      conteudo = add(fatia, mat('#d8a05f', 0.9), 0.006);
      add(new THREE.CylinderGeometry(0.125, 0.125, 0.004, 3, 1, false, 0, Math.PI / 4), mat('#bc4236', 0.7), 0.014);
      altura = 0.012;
      break;
    }
    case 'fruta': {
      conteudo = add(new THREE.SphereGeometry(0.04, 20, 14), mat('#bb3432', 0.33), 0.04);
      add(new THREE.CylinderGeometry(0.002, 0.002, 0.02, 6), mat('#4a3420', 0.8), 0.085);
      altura = 0.08;
      break;
    }
    default: {
      add(new THREE.CylinderGeometry(0.036, 0.031, 0.11, 24, 1, true), vidro, 0.055);
      add(new THREE.CylinderGeometry(0.031, 0.031, 0.004, 24), vidro, 0.002);
      conteudo = add(new THREE.CylinderGeometry(0.033, 0.03, 0.085, 24), mat(i.cor ?? '#b5dce8', 0.12, 0, i.id === 'agua' ? { transparent: true, opacity: 0.45 } : {}), 0.045);
      altura = 0.085;
    }
  }
  const c = conteudo;
  const base = c?.position.y ?? 0;
  return {
    grupo: g,
    nivel: (n: number) => {
      if (!c) return;
      const k = Math.max(0.02, n);
      c.scale.y = k;
      c.position.y = base - (altura * (1 - k)) / 2;
    },
  };
}

/** Item preso à mão direita do jogador. */
export function ItemNaMao({ mao }: { mao: THREE.Object3D | null | undefined }) {
  const id = useJogos((s) => s.naMao);
  const modelo = useMemo(() => {
    const i = itemDe(id);
    return i ? modeloItem(i) : null;
  }, [id]);
  useFrame(() => {
    if (!modelo || !mao) return;
    const { consumo } = useJogos.getState();
    mao.updateMatrixWorld(true);
    modelo.grupo.position.setFromMatrixPosition(mao.matrixWorld);
    modelo.grupo.position.y -= 0.06;
    modelo.nivel(1 - consumo);
  });
  if (!modelo) return null;
  return <primitive object={modelo.grupo} userData={{ semReflexo: true }} />;
}
