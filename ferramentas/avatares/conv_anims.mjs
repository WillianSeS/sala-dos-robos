import { THREE, loadFBX } from './common.mjs';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import fs from 'fs';
const g = process.argv[2];               /* 'm' ou 'f' */
const ref = g === 'm' ? 'Business_Male_01' : 'Business_Female_01';
const RB = process.env.RB || 'rb', OUT = process.env.OUT || 'out';
const ST = RB + '/Assets/Animations/all_animations_max_motextr_static/', XY = RB + '/Assets/Animations/all_animations_max_motextr_xy/';
const SPECS = [
  ['sitWork', ST + g + '_sit_table_idle_neutral_01.max.fbx', 'loop', 8, 14, 15],
  ['sitLook', ST + g + '_sit_table_idle_look_around.max.fbx', 'loop', 8, 14, 15],
  ['sitRelax', ST + g + '_sit_chair_idle_relaxed_01.max.fbx', 'loop', 8, 14, 15],
  ['sitWait', ST + g + '_sit_chair_idle_waiting_01.max.fbx', 'loop', 8, 14, 15],
  ['frustr', ST + g + '_sit_table_idle_scratch_head.max.fbx', 'shot', 4.2, 0, 15],
  ['touchFace', ST + g + '_sit_table_idle_touch_face.max.fbx', 'shot', 4.2, 0, 15],
  ['shrug', ST + g + '_sit_table_gestic_shrug_01.max.fbx', 'shot', 3.6, 0, 15],
  ['cheer', ST + g + '_cheer_01.max.fbx', 'shot', 3.6, 0, 20],
  ['idle', ST + g + '_idle_breathe_01.max.fbx', 'loop', 6, 12, 15],
  ['drink', ST + g + '_drink_drinking.max.fbx', 'loop', 6, 12, 15],
  ['lookAround', ST + g + '_idle_look_around_01.max.fbx', 'loop', 8, 14, 15],
  ['talk', ST + g + '_gestic_talk_neutral_01.max.fbx', 'loop', 6, 12, 15],
  ['walk', XY + g + '_walk_neutral_01.max.fbx', 'full', 0, 0, 30],
];
const BODY = /^Bip01(_Pelvis|_Spine\d?|_Neck|_Head|_[LR]_(Clavicle|UpperArm|Forearm|Hand|Finger\d+|Thigh|Calf|Foot|Toe0))?$/;
const KEY = ['Bip01_Spine1', 'Bip01_Spine2', 'Bip01_Neck', 'Bip01_Head', 'Bip01_L_UpperArm', 'Bip01_R_UpperArm', 'Bip01_L_Forearm', 'Bip01_R_Forearm', 'Bip01_L_Hand', 'Bip01_R_Hand', 'Bip01_L_Thigh', 'Bip01_R_Thigh', 'Bip01_L_Calf', 'Bip01_R_Calf'];
const ARMS = ['Bip01_L_UpperArm', 'Bip01_R_UpperArm', 'Bip01_L_Forearm', 'Bip01_R_Forearm', 'Bip01_L_Hand', 'Bip01_R_Hand', 'Bip01_Head', 'Bip01_Spine2'];
function sampleTrack(tr, t0, n, fps) {
  const it = tr.createInterpolant(), sz = tr.getValueSize(), out = new Float32Array(n * sz);
  for (let k = 0; k < n; k++) out.set(it.evaluate(t0 + k / fps), k * sz);
  return out;
}
const clips = [];
for (const [name, file, mode, a, b, fps] of SPECS) {
  const src = loadFBX(file).animations[0];
  const keep = src.tracks.filter(t => { const [bone, prop] = [t.name.slice(0, t.name.lastIndexOf('.')), t.name.split('.').pop()]; return BODY.test(bone) && (prop === 'quaternion' || (prop === 'position' && bone === 'Bip01')); });
  const N = Math.floor(src.duration * fps);
  const full = keep.map(t => ({ t, v: sampleTrack(t, 0, N, fps) }));
  const feat = KEY.map(k => full.find(x => x.t.name === k + '.quaternion')).filter(Boolean);
  const arms = ARMS.map(k => full.find(x => x.t.name === k + '.quaternion')).filter(Boolean);
  const dist = (i, j) => { let d = 0; for (const f of feat) { let dot = 0; for (let c = 0; c < 4; c++) dot += f.v[i * 4 + c] * f.v[j * 4 + c]; d += 1 - Math.abs(dot); } return d; };
  let s = 0, e = N - 1;
  if (mode === 'loop') {
    let best = Infinity; const lo = Math.round(a * fps), hi = Math.min(N - 1, Math.round(b * fps));
    for (let i = 0; i + lo < N; i += 2) for (let j = i + lo; j <= Math.min(N - 1, i + hi); j++) { const d = dist(i, j); if (d < best) { best = d; s = i; e = j; } }
  } else if (mode === 'shot') {
    const L = Math.min(N - 1, Math.round(a * fps)); const en = new Float32Array(N);
    for (let k = 1; k < N; k++) { let m = 0; for (const f of arms) { let dot = 0; for (let c = 0; c < 4; c++) dot += f.v[k * 4 + c] * f.v[(k - 1) * 4 + c]; m += 1 - Math.abs(dot); } en[k] = m; }
    let best = -1, acc = 0; for (let k = 0; k < L; k++) acc += en[k];
    for (let i = 0; i + L < N; i++) { if (acc > best) { best = acc; s = i; e = i + L; } acc += en[i + L] - en[i]; }
  }
  const n = e - s + 1, times = new Float32Array(n).map((_, k) => k / fps);
  const tracks = [];
  for (const { t, v } of full) {
    const sz = t.getValueSize(); let vals = v.slice(s * sz, (e + 1) * sz);
    if (mode === 'loop') vals.set(vals.slice(0, sz), (n - 1) * sz);   /* fecha o laço */
    let constant = true; for (let k = sz; k < vals.length && constant; k++) if (Math.abs(vals[k] - vals[k % sz]) > 1e-4) constant = false;
    const T = t.name.endsWith('.quaternion') ? THREE.QuaternionKeyframeTrack : THREE.VectorKeyframeTrack;
    tracks.push(constant ? new T(t.name, [0], Array.from(vals.slice(0, sz))) : new T(t.name, Array.from(times), Array.from(vals)));
  }
  const clip = new THREE.AnimationClip(name, (n - 1) / fps, tracks);
  clips.push(clip);
  const floats = tracks.reduce((q, t) => q + t.values.length + t.times.length, 0);
  console.log(g, name, 'dur', clip.duration.toFixed(2) + 's', 'from', (s / fps).toFixed(1), 'tracks', tracks.length, '~KB', Math.round(floats * 4 / 1024));
}
/* esqueleto de referência (sem malha) para exportar as animações */
const rig = loadFBX(`${RB}/Assets/Avatars/Professions/${ref}/Export/${ref}.fbx`);
const rm = []; rig.traverse(o => { if (o.isMesh || o.isLight || o.isCamera) rm.push(o); }); rm.forEach(o => o.parent.remove(o));
rig.animations = []; rig.scale.setScalar(0.01);
const root = new THREE.Group(); root.name = 'rig_' + g; root.add(rig);
new GLTFExporter().parse(root, glb => { fs.writeFileSync(`${OUT}/anim_${g}.glb`, Buffer.from(glb)); console.log(`${OUT}/anim_${g}.glb`, Math.round(glb.byteLength / 1024) + 'KB'); }, e => { console.error('ERRO', e); process.exit(1); }, { binary: true, animations: clips });
