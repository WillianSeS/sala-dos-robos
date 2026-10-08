/* Converte um avatar do Microsoft Rocketbox (MIT) + as animações de parado, caminhada e corrida
   em um único GLB (malha, esqueleto e clipes). Mede a velocidade natural de cada clipe de locomoção
   (pé de apoio parado no chão) e grava em extras, para o jogo casar a velocidade com a passada.
   Uso: RB=<pasta do Rocketbox> node converter.mjs Male_Adult_07 Adults m <saida> */
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import fs from 'node:fs';

/* Node: o exportador usa FileReader; as texturas TGA entram depois (texturas.py). */
globalThis.FileReader = class {
  readAsArrayBuffer(b) { b.arrayBuffer().then(ab => { this.result = ab; this.onloadend?.(); }); }
  readAsDataURL(b) { b.arrayBuffer().then(ab => { this.result = 'data:' + (b.type || 'application/octet-stream') + ';base64,' + Buffer.from(ab).toString('base64'); this.onloadend?.(); }); }
};
THREE.DefaultLoadingManager.addHandler(/\.tga$/i, new (class { setPath() { return this; } setCrossOrigin() { return this; } load(url) { const t = new THREE.Texture(); t.userData.url = url; return t; } })());
const warn = console.warn; console.warn = (...a) => { const s = String(a[0]); if (s.includes('TGA') || s.includes('GLTFExporter')) return; warn(...a); };
const loadFBX = p => { const b = fs.readFileSync(p); return new FBXLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), ''); };

const [name, cat, g, out] = process.argv.slice(2);
const RB = process.env.RB || 'rb';
const ST = `${RB}/Assets/Animations/all_animations_max_motextr_static/`, XY = `${RB}/Assets/Animations/all_animations_max_motextr_xy/`;
/* Modos dos clipes:
   loco    – caminhada/corrida: o deslocamento da raiz vira a velocidade natural e sai do clipe
   laco    – clipe curto que repete (fecha o laço com o primeiro quadro)
   janela  – clipe longo: escolhe o trecho [min, max] s que fecha melhor o ciclo
   sentar  – transição: a raiz termina no assento (0); guarda onde começa (em pé, à frente)
   levantar– transição: começa no assento (0); guarda onde termina (em pé, à frente) */
const XYZ = `${RB}/Assets/Animations/all_animations_max_motextr_xyz/`;
const SPECS = [
  { nome: 'idle', arq: ST + g + '_idle_breathe_01.max.fbx', modo: 'laco' },
  { nome: 'lookAround', arq: ST + g + '_idle_look_around_01.max.fbx', modo: 'laco' },
  { nome: 'walk', arq: XY + g + '_walk_neutral_01.max.fbx', modo: 'loco' },
  { nome: 'run', arq: XY + g + '_run_neutral_01.max.fbx', modo: 'loco' },
  { nome: 'sitDown', arq: XYZ + g + '_sit_down_chair_01.max.fbx', modo: 'sentar' },
  { nome: 'sitIdle', arq: ST + g + '_sit_chair_idle_relaxed_01.max.fbx', modo: 'janela', janela: [8, 14] },
  { nome: 'standUp', arq: XYZ + g + '_sit_stand_up_chair_01.max.fbx', modo: 'levantar' },
  { nome: 'wave', arq: ST + g + '_wave_01.max.fbx', modo: 'laco' },
  { nome: 'talk', arq: ST + g + '_gestic_talk_neutral_01.max.fbx', modo: 'janela', janela: [6, 12] },
];
const FPS = 30;
const BODY = /^Bip01(_Pelvis|_Spine\d?|_Neck|_Head|_[LR]_(Clavicle|UpperArm|Forearm|Hand|Finger\d+|Thigh|Calf|Foot|Toe0))?$/;

/* ---------- avatar ---------- */
const obj = loadFBX(`${RB}/Assets/Avatars/${cat}/${name}/Export/${name}.fbx`);
const drop = []; obj.traverse(o => { if (o.isLight || o.isCamera) drop.push(o); }); drop.forEach(o => o.parent.remove(o));
const texmap = {};
obj.traverse(o => {
  if (!o.isMesh) return;
  o.geometry.deleteAttribute('color');
  o.geometry = mergeVertices(o.geometry, 1e-4);
  const mats = Array.isArray(o.material) ? o.material : [o.material];
  const nm = mats.map(m => {
    const base = f => m[f]?.userData.url ? m[f].userData.url.split(/[\\/]/).pop().replace(/\.tga$/i, '') : null;
    texmap[m.name] = { map: base('map'), normalMap: base('normalMap'), specularMap: base('specularMap'), alphaMap: base('alphaMap'), transparent: m.transparent };
    return new THREE.MeshStandardMaterial({ name: m.name, color: 0xffffff, roughness: 0.7, metalness: 0 });
  });
  o.material = Array.isArray(o.material) ? nm : nm[0];
});
obj.animations = [];
obj.scale.setScalar(0.01);
const root = new THREE.Group(); root.name = 'jogador'; root.add(obj);
root.updateMatrixWorld(true);

/* ---------- clipes ---------- */
function sample(tr, t0, n, fps) {
  const it = tr.createInterpolant(), sz = tr.getValueSize(), o = new Float32Array(n * sz);
  for (let k = 0; k < n; k++) o.set(it.evaluate(t0 + k / fps), k * sz);
  return o;
}
const clips = [], info = {};
const CHAVE = ['Bip01_Spine1', 'Bip01_Neck', 'Bip01_Head', 'Bip01_L_UpperArm', 'Bip01_R_UpperArm', 'Bip01_L_Forearm', 'Bip01_R_Forearm', 'Bip01_L_Thigh', 'Bip01_R_Thigh', 'Bip01_L_Calf', 'Bip01_R_Calf'];
for (const spec of SPECS) {
  const src = loadFBX(spec.arq).animations[0];
  const keep = src.tracks.filter(t => {
    const bone = t.name.slice(0, t.name.lastIndexOf('.')), prop = t.name.split('.').pop();
    return BODY.test(bone) && (prop === 'quaternion' || (prop === 'position' && bone === 'Bip01'));
  });
  const total = Math.max(2, Math.round(src.duration * FPS) + 1);
  const full = keep.map(t => ({ t, v: sample(t, 0, total, FPS) }));
  // trecho [s, e] do clipe original
  let s0 = 0, e0 = total - 1;
  if (spec.modo === 'janela') {
    const feat = CHAVE.map(k => full.find(x => x.t.name === k + '.quaternion')).filter(Boolean);
    const dist = (i, j) => { let d = 0; for (const f of feat) { let dot = 0; for (let c = 0; c < 4; c++) dot += f.v[i * 4 + c] * f.v[j * 4 + c]; d += 1 - Math.abs(dot); } return d; };
    let best = Infinity; const lo = Math.round(spec.janela[0] * FPS), hi = Math.round(spec.janela[1] * FPS);
    for (let i = 0; i + lo < total; i += 2) for (let j = i + lo; j <= Math.min(total - 1, i + hi); j++) { const d = dist(i, j); if (d < best) { best = d; s0 = i; e0 = j; } }
  }
  const n = e0 - s0 + 1, T = (n - 1) / FPS;
  const times = Array.from({ length: n }, (_, k) => k / FPS);
  const dados = { duration: 0, naturalSpeed: 0 };
  const tracks = full.map(({ t, v }) => {
    const sz = t.getValueSize(), vals = v.slice(s0 * sz, (e0 + 1) * sz);
    if (t.name === 'Bip01.position') {
      const dx = vals[(n - 1) * 3] - vals[0], dz = vals[(n - 1) * 3 + 2] - vals[2];
      if (spec.modo === 'loco') {
        /* deslocamento médio por ciclo (cm): sai da animação e vira velocidade */
        dados.naturalSpeed = +(Math.hypot(dx, dz) / 100 / T).toFixed(3);
        for (let k = 0; k < n; k++) { vals[k * 3] -= dx * k / (n - 1); vals[k * 3 + 2] -= dz * k / (n - 1); }
      } else if (spec.modo === 'sentar') {
        /* desloca para a raiz terminar em (0, 0) no plano; o começo fica à frente do assento */
        const fx = vals[(n - 1) * 3], fz = vals[(n - 1) * 3 + 2];
        for (let k = 0; k < n; k++) { vals[k * 3] -= fx; vals[k * 3 + 2] -= fz; }
        dados.inicio = [+(vals[0] / 100).toFixed(3), +(vals[2] / 100).toFixed(3)];
      } else if (spec.modo === 'levantar') {
        const ix = vals[0], iz = vals[2];
        for (let k = 0; k < n; k++) { vals[k * 3] -= ix; vals[k * 3 + 2] -= iz; }
        dados.fim = [+(vals[(n - 1) * 3] / 100).toFixed(3), +(vals[(n - 1) * 3 + 2] / 100).toFixed(3)];
      }
    }
    if (spec.modo !== 'sentar' && spec.modo !== 'levantar') vals.set(vals.slice(0, sz), (n - 1) * sz); /* fecha o laço */
    let constant = true; for (let k = sz; k < vals.length && constant; k++) if (Math.abs(vals[k] - vals[k % sz]) > 1e-4) constant = false;
    const K = t.name.endsWith('.quaternion') ? THREE.QuaternionKeyframeTrack : THREE.VectorKeyframeTrack;
    return constant ? new K(t.name, [0], Array.from(vals.slice(0, sz))) : new K(t.name, times, Array.from(vals));
  });
  const clip = new THREE.AnimationClip(spec.nome, T, tracks);
  clips.push(clip);
  dados.duration = +T.toFixed(3);
  info[spec.nome] = dados;
}

/* ---------- conferência: com o clipe no lugar, o pé de apoio desliza para trás na velocidade natural ---------- */
const mixer = new THREE.AnimationMixer(obj);
const footL = obj.getObjectByName('Bip01_L_Toe0') || obj.getObjectByName('Bip01_L_Foot');
const footR = obj.getObjectByName('Bip01_R_Toe0') || obj.getObjectByName('Bip01_R_Foot');
const head = obj.getObjectByName('Bip01_Head');
const P = new THREE.Vector3();
function measure(clip) {
  mixer.stopAllAction(); const act = mixer.clipAction(clip); act.reset().play();
  const n = 120, dt = clip.duration / n, F = [];
  for (let k = 0; k <= n; k++) {
    mixer.setTime(k * dt); root.updateMatrixWorld(true);
    const l = footL.getWorldPosition(P).clone(), r = footR.getWorldPosition(P).clone();
    F.push({ l, r, h: head.getWorldPosition(P).y });
  }
  act.stop();
  const minY = Math.min(...F.map(f => Math.min(f.l.y, f.r.y)));
  let sum = 0, cnt = 0, fwd = new THREE.Vector3();
  for (let k = 1; k < F.length; k++) {
    for (const s of ['l', 'r']) {
      const a = F[k - 1][s], b = F[k][s];
      if (Math.max(a.y, b.y) < minY + 0.03) { fwd.subVectors(b, a); sum += fwd.z / dt; cnt++; }
    }
  }
  return { footSpeed: cnt ? +(-sum / cnt).toFixed(3) : 0, headY: +Math.max(...F.map(f => f.h)).toFixed(3) };
}
for (const c of clips) if (['walk', 'run'].includes(c.name)) Object.assign(info[c.name], measure(c));
mixer.stopAllAction(); mixer.setTime(0);
/* pose de referência (bind) para a altura dos olhos */
root.updateMatrixWorld(true);
const box = new THREE.Box3().setFromObject(root);
root.userData = { fonte: `Microsoft Rocketbox ${name} (licença MIT)`, clipes: info, altura: +(box.max.y - box.min.y).toFixed(3) };

fs.mkdirSync(out, { recursive: true });
new GLTFExporter().parse(root, glb => {
  fs.writeFileSync(`${out}/${name}.raw.glb`, Buffer.from(glb));
  fs.writeFileSync(`${out}/${name}.tex.json`, JSON.stringify(texmap, null, 1));
  console.log(name, Math.round(glb.byteLength / 1024) + 'KB');
  console.log(JSON.stringify(root.userData, null, 1));
}, err => { console.error('ERRO', err); process.exit(1); }, { binary: true, onlyVisible: false, animations: clips });
