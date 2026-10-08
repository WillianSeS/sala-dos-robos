/* Otimiza um GLB com glTF Transform.
   Uso: node otimizar.mjs entrada.glb saida.glb [--geo meshopt|draco|nenhuma] [--tex ktx2|webp|manter] [--max 1024]
   - meshopt: comprime geometria e animação (personagens);  draco: geometria estática (cenários).
   - ktx2: textura comprimida na GPU (ETC1S nas cores e na rugosidade); mapas normais em WebP, porque em ETC1S
     ficam com blocos e em UASTC pesam ~1 MB cada.  webp: tudo em WebP. */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, resample, weld, quantize, meshopt, draco, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import draco3d from 'draco3dgltf';
import sharp from 'sharp';
import { ktx2 } from 'ktx2-encoder/gltf-transform';
import fs from 'node:fs';

const [inp, out, ...rest] = process.argv.slice(2);
const opt = (k, d) => { const i = rest.indexOf('--' + k); return i >= 0 ? rest[i + 1] : d; };
const geo = opt('geo', 'meshopt'), tex = opt('tex', 'ktx2'), max = +opt('max', 1024);

await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder,
  'draco3d.encoder': await draco3d.createEncoderModule(), 'draco3d.decoder': await draco3d.createDecoderModule(),
});
const doc = await io.read(inp);
const imageDecoder = async buf => {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width: info.width, height: info.height };
};
const steps = [dedup(), prune({ keepExtras: true, keepLeaves: true }), resample()];  // keepLeaves: mantém os vazios COL_/LUZ_/SPAWN_
if (geo !== 'nenhuma') steps.push(weld());
if (tex === 'webp') steps.push(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [max, max], quality: 88 }));
else if (tex === 'ktx2') {
  steps.push(textureCompress({ encoder: sharp, resize: [max, max] }));
  steps.push(textureCompress({ encoder: sharp, targetFormat: 'webp', slots: /normalTexture/, quality: 92 }));
  steps.push(ktx2({ slots: /baseColorTexture|emissiveTexture/, isUASTC: false, qualityLevel: 200, generateMipmap: true, isPerceptual: true, isSetKTX2SRGBTransferFunc: true, imageDecoder }));
  steps.push(ktx2({ slots: /metallicRoughnessTexture|occlusionTexture/, isUASTC: false, qualityLevel: 160, generateMipmap: true, isPerceptual: false, imageDecoder }));
}
if (geo === 'meshopt') steps.push(quantize(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
if (geo === 'draco') steps.push(draco({ method: 'edgebreaker' }));
await doc.transform(...steps);
await io.write(out, doc);
const kb = f => Math.round(fs.statSync(f).size / 1024);
console.log(`${inp} ${kb(inp)}KB -> ${out} ${kb(out)}KB (geo=${geo}, tex=${tex}, max=${max})`);
