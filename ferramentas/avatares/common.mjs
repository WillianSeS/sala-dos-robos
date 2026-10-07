import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import fs from 'fs';
/* Node: polyfills mínimos para GLTFExporter */
globalThis.FileReader = class { readAsArrayBuffer(b) { b.arrayBuffer().then(ab => { this.result = ab; this.onloadend && this.onloadend(); }); } readAsDataURL(b) { b.arrayBuffer().then(ab => { this.result = 'data:' + (b.type || 'application/octet-stream') + ';base64,' + Buffer.from(ab).toString('base64'); this.onloadend && this.onloadend(); }); } };
THREE.DefaultLoadingManager.addHandler(/\.tga$/i, new (class { setPath() { return this; } setCrossOrigin() { return this; } load(url) { const t = new THREE.Texture(); t.userData.url = url; return t; } })());
const _warn = console.warn; console.warn = (...a) => { if (String(a[0]).includes('TGA loader') || String(a[0]).includes('GLTFExporter: Use MeshStandard')) return; _warn(...a); };
export function loadFBX(path) {
  const buf = fs.readFileSync(path);
  return new FBXLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '');
}
export { THREE };
