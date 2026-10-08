/* Copia os decodificadores Draco e Basis (KTX2) do three.js para public/libs, para o jogo não depender de CDN. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const libs = path.join(raiz, 'node_modules/three/examples/jsm/libs');
const pares = [
  ['draco/gltf/draco_decoder.js', 'draco/draco_decoder.js'],
  ['draco/gltf/draco_decoder.wasm', 'draco/draco_decoder.wasm'],
  ['draco/gltf/draco_wasm_wrapper.js', 'draco/draco_wasm_wrapper.js'],
  ['basis/basis_transcoder.js', 'basis/basis_transcoder.js'],
  ['basis/basis_transcoder.wasm', 'basis/basis_transcoder.wasm'],
];
for (const [de, para] of pares) {
  const destino = path.join(raiz, 'public/libs', para);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.copyFileSync(path.join(libs, de), destino);
}
console.log('decodificadores copiados para public/libs');
