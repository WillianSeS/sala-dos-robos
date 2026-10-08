
/* ================= pessoas realistas (Microsoft Rocketbox, licença MIT) ================= */
/* Os bonecos procedurais aparecem na hora; quando os modelos realistas chegam, cada um é trocado. */
const AV_FILES = ['Business_Male_01', 'Business_Female_01', 'Business_Male_02', 'Business_Female_02', 'Business_Male_03', 'Business_Male_04', 'Business_Female_03', 'Business_Male_05', 'Business_Female_04', 'Business_Male_06'];
const PERSON_NAMES = ['Arthur Blackwell', 'Helena Prescott', 'Rafael Monteiro', 'Camila Ferraz', 'Theo Ashford', 'Leonardo Prado', 'Olivia Hartmann', 'Henry Whitlock', 'Beatriz Lacerda', 'Marcos Valença'];
const shortName = n => { const p = n.split(' '); return p[0][0] + '. ' + p.slice(1).join(' '); };
/* pose da simulação -> animação capturada */
const POSE_CLIP = { sitType: 'sitWork', sitRelax: 'sitRelax', sitHead: 'sitWait', sitCheer: 'cheer', sitFrustr: 'frustr', sofa: 'sitRelax', standCup: 'drink', pocket: 'idle', cross: 'talk', poolAim: 'idle', standCue: 'lookAround', stand: 'idle' };
const _ha = new THREE.Vector3(), _hb = new THREE.Vector3();
/* Velocidade natural da animação de caminhada (passada medida nos clipes do Rocketbox): com ela os pés não deslizam. */
const WALK_CLIP_SPEED = 2.1;
class Avatar {
  constructor(gltf, clips, old, file) {
    this.isAvatar = true; this.file = file;
    this.root = new THREE.Group(); this.root.rotation.order = 'YXZ'; this.root.add(gltf.scene); GROUPS.main.add(this.root);
    this.root.position.copy(old.root.position); this.yaw = old.yaw; this.pose = old.pose; this.speed = 0;
    gltf.scene.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
      for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
        m.envMapIntensity = 0.55;
        if (m.alphaTest > 0) { m.alphaToCoverage = true; m.roughness = 0.92; m.envMapIntensity = 0.2; m.color.multiplyScalar(1.15); }  /* cabelo: fosco */
        if (m.transparent && m.alphaTest === 0) { m.depthWrite = false; }                                                              /* lentes dos óculos */
        MATS.push(m);
      }
    });
    this.mixer = new THREE.AnimationMixer(gltf.scene);
    this.actions = {}; for (const c of clips) this.actions[c.name] = this.mixer.clipAction(c);
    this.sceneRest = { p: gltf.scene.position.clone(), q: gltf.scene.quaternion.clone() };
    this.danceBones = ['Spine', 'Spine1', 'L_UpperArm', 'R_UpperArm', 'L_Forearm', 'R_Forearm', 'L_Thigh', 'R_Thigh', 'L_Calf', 'R_Calf', 'Pelvis', 'Neck'].map(n => gltf.scene.getObjectByName('Bip01_' + n));
    this.J = { head: gltf.scene.getObjectByName('Bip01_Head'), rSh: gltf.scene.getObjectByName('Bip01_R_UpperArm'), rEl: gltf.scene.getObjectByName('Bip01_R_Forearm'), rWr: gltf.scene.getObjectByName('Bip01_R_Hand') };
    this.hand = gltf.scene.getObjectByName('Bip01_R_Hand'); this.finger = gltf.scene.getObjectByName('Bip01_R_Finger21') || this.hand;
    this.cup = new THREE.Mesh(PG.cup, mat.mug); this.cup.castShadow = true; this.cup.visible = false; GROUPS.main.add(this.cup);
    this.cur = null; this.clip = null; this.alt = false; this.altT = 0; this.frKind = 'frustr';
    this.smokingUntil = old.smokingUntil || 0;
    if (old.heldItem) { setPersonItem(this, old.heldItem, old.consumeUntil || 0); disposePersonItem(old); }
    if (old.smokeRig && typeof disposeSmokingPerson === 'function') disposeSmokingPerson(old);
  }
  play(name) {
    if (name === this.clip) return;
    const a = this.actions[name] || this.actions.idle;
    if (this.cur) this.cur.fadeOut(0.5);
    a.reset(); a.time = name === 'walk' || name === 'cheer' || name === 'frustr' || name === 'touchFace' || (name === 'drink' && this.heldItem) ? 0 : Math.random() * a.getClip().duration;
    a.setEffectiveWeight(1).fadeIn(0.5).play();
    this.cur = a; this.clip = name;
  }
  update(dt, t) {
    restorePersonItemPose(this);
    if (this.danceRest) { this.danceBones.forEach((bone, i) => { if (bone && this.danceRest[i]) bone.quaternion.copy(this.danceRest[i]); }); this.danceRest = null; const sc = this.root.children[0]; sc.position.copy(this.sceneRest.p); sc.quaternion.copy(this.sceneRest.q); }
    this.root.rotation.z = 0;
    let name = POSE_CLIP[this.pose] || 'idle';
    if (this.pose === 'stand' && this.speed > 0.05) name = 'walk';
    if (this.pose === 'sitFrustr') name = this.frKind;
    const consumingDrink = CONSUMABLES[this.heldItem]?.kind === 'drink' && this.consumeUntil > t;
    if (consumingDrink && this.speed < 0.05 && ['stand', 'standCup', 'pocket', 'cross'].includes(this.pose)) name = 'drink';
    if (name === 'sitWork') { if (t > this.altT) { this.alt = Math.random() < 0.3; this.altT = t + rnd(12, 30); } if (this.alt) name = 'sitLook'; }
    this.play(name);
    this.cur.timeScale = name === 'walk' ? clamp(this.speed / WALK_CLIP_SPEED, 0.45, 1.9) : name === 'drink' && consumingDrink ? this.cur.getClip().duration / 2.4 : 1;
    this.mixer.update(dt);
    this.root.rotation.y = this.yaw;
    /* Correndo, o corpo inclina um pouco para frente. */
    this.lean = damp(this.lean || 0, name === 'walk' && this.speed > 2.4 ? 0.12 : 0, 6, dt);
    this.root.rotation.x = this.lean;
    this.root.position.y = this.pose === 'sofa' ? -0.03 : 0;
    if (this.pose === 'dance') applyAvatarDance(this, t);
    /* xícara na mão durante o café */
    this.cup.visible = name === 'drink' && !this.heldItem && !!this.hand;
    if (this.cup.visible) {
      this.root.updateMatrixWorld(true);
      this.hand.getWorldPosition(_ha); this.finger.getWorldPosition(_hb);
      this.cup.position.addVectors(_ha, _hb).multiplyScalar(0.5); this.cup.position.y -= 0.015;
    }
    updatePersonItem(this, t);
    updatePersonSmokingPose(this, t);
  }
}
const AV = { ready: false, loaded: 0, total: AV_FILES.length + 2, failed: false };
async function loadAvatars(onProgress) {
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const loader = new GLTFLoader();
  const tick = () => { AV.loaded++; onProgress(AV.loaded, AV.total); };
  const [am, af] = await Promise.all(['m', 'f'].map(g => loader.loadAsync('people/anim_' + g + '.json').then(x => { tick(); return x; })));
  AV.clips = { m: am.animations, f: af.animations };
  await Promise.all(robots.map(async (r, i) => {
    const file = AV_FILES[i], gltf = await loader.loadAsync('people/' + file + '.json'); tick();
    const A = new Avatar(gltf, (file.includes('Female') ? af : am).animations, r.P, file);
    r.P.root.visible = false; r.P = A;
  }));
  AV.ready = true;
}
