import { THREE, loadFBX } from './common.mjs';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import fs from 'fs';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
const [name, out] = process.argv.slice(2);
const RB = process.env.RB || 'rb';
const dir = `${RB}/Assets/Avatars/${process.env.CAT || 'Professions'}/${name}`;
const obj = loadFBX(`${dir}/Export/${name}.fbx`);
const texmap = {};
const drop = []; obj.traverse(o => { if (o.isLight || o.isCamera) drop.push(o); }); drop.forEach(o => o.parent.remove(o));
obj.traverse(o => {
  if (!o.isMesh) return;
  o.geometry.deleteAttribute('color');
  const before = o.geometry.attributes.position.count; o.geometry = mergeVertices(o.geometry, 1e-4); console.log('verts', before, '->', o.geometry.attributes.position.count, 'groups', o.geometry.groups.length);
  const mats = Array.isArray(o.material) ? o.material : [o.material];
  const nm = mats.map(m => {
    const base = f => m[f] && m[f].userData.url ? m[f].userData.url.split(/[\\/]/).pop().replace(/\.tga$/i, '') : null;
    texmap[m.name] = { map: base('map'), normalMap: base('normalMap'), alphaMap: base('alphaMap'), transparent: m.transparent };
    return new THREE.MeshStandardMaterial({ name: m.name, color: 0xffffff, roughness: 0.7, metalness: 0 });
  });
  o.material = Array.isArray(o.material) ? nm : nm[0];
});
obj.animations = [];
const root = new THREE.Group(); root.name = name; obj.scale.setScalar(0.01); root.add(obj);
new GLTFExporter().parse(root, glb => {
  fs.writeFileSync(`${out}/${name}.raw.glb`, Buffer.from(glb));
  fs.writeFileSync(`${out}/${name}.tex.json`, JSON.stringify(texmap, null, 1));
  console.log(name, 'glb', Math.round(glb.byteLength / 1024) + 'KB', JSON.stringify(texmap));
}, e => { console.error('ERRO', e); process.exit(1); }, { binary: true, onlyVisible: false });
