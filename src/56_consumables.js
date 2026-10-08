
/* ================= bebidas/comidas e objetos acompanhando a mão ================= */
const CONSUMABLES = Object.freeze(Object.assign(Object.create(null), Object.fromEntries([
  { id: 'water', label: 'Água gelada', emoji: '💧', kind: 'drink', shape: 'glass', color: '#b5dce8' },
  { id: 'soda', label: 'Refrigerante em lata', emoji: '🥤', kind: 'drink', shape: 'can', color: '#ac2736', print: 'COLA' },
  { id: 'juice', label: 'Suco de laranja', emoji: '🍊', kind: 'drink', shape: 'glass', color: '#ed9b22' },
  { id: 'coffee', label: 'Café', emoji: '☕', kind: 'drink', shape: 'mug', color: '#352015' },
  { id: 'beer', label: 'Cerveja em lata', emoji: '🍺', kind: 'drink', shape: 'can', color: '#c0983b', print: 'MALTE' },
  { id: 'wine', label: 'Taça de vinho', emoji: '🍷', kind: 'drink', shape: 'wine', color: '#641a29' },
  { id: 'sandwich', label: 'Sanduíche', emoji: '🥪', kind: 'food', shape: 'sandwich' },
  { id: 'pizza', label: 'Fatia de pizza', emoji: '🍕', kind: 'food', shape: 'pizza' },
  { id: 'fruit', label: 'Maçã', emoji: '🍎', kind: 'food', shape: 'fruit' },
].map(item => [item.id, Object.freeze(item)]))));

/* Cada objeto usa as mesmas geometrias, materiais e rótulos, inclusive na geladeira. */
const ITEM_ASSETS = {
  geometry: new Map(), materials: new Map(),
  silver: MC('#b9c2c7', .23, .82), ceramic: MC('#ece7df', .27), paper: MC('#f3eee1', .92),
  crust: MC('#b57935', .93), bread: MC('#e8cd98', .95), cheese: MC('#efbf54', .85),
  leaf: MC('#447643', .88), tomato: MC('#bc4236', .74), apple: MC('#bb3432', .33),
  glass: M({ color: '#d6eef7', roughness: .12, metalness: .05, transparent: true, opacity: .28, depthWrite: false, side: THREE.DoubleSide }),
};
function itemGeometry(key, create) {
  if (!ITEM_ASSETS.geometry.has(key)) ITEM_ASSETS.geometry.set(key, create());
  return ITEM_ASSETS.geometry.get(key);
}
function itemMaterial(key, create) {
  if (!ITEM_ASSETS.materials.has(key)) ITEM_ASSETS.materials.set(key, create());
  return ITEM_ASSETS.materials.get(key);
}
function itemRing(parent, material, radius, y, tube = .0018) {
  const g = itemGeometry('ring', () => new THREE.TorusGeometry(1, .08, 6, 24));
  return mesh(g, material, parent, 0, y, 0, Math.PI / 2, 0, 0, radius, radius, tube / .08, false);
}
function canLabel(item) {
  return itemMaterial('label-' + item.id, () => {
    const map = canvasTex(256, 128, (g, w, h) => {
      g.fillStyle = item.color; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffffff22'; g.fillRect(0, 18, w, 3); g.fillRect(0, h - 23, w, 3);
      g.fillStyle = '#f9f2dd'; g.textAlign = 'center'; g.font = 'bold 28px sans-serif'; g.fillText(item.print, 128, 61);
      g.font = '11px sans-serif'; g.fillText('SALA DOS ROBÔS', 128, 84); g.font = '9px sans-serif'; g.fillText('350 ml', 128, 106);
    });
    return M({ map, roughness: .32, metalness: .32 });
  });
}
function makeConsumableProp(id) {
  const item = CONSUMABLES[id];
  if (!item) return null;
  const p = new THREE.Group(); p.name = 'item-' + id; p.userData.itemId = id; p.userData.kind = item.kind;
  const add = (g, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => mesh(g, m, p, x, y, z, rx, ry, rz, sx, sy, sz, false);
  const liquid = itemMaterial('liquid-' + id, () => id === 'water'
    ? M({ color: item.color, roughness: .12, transparent: true, opacity: .34, depthWrite: false })
    : MC(item.color || '#ffffff', .24));
  if (item.shape === 'can') {
    const body = itemGeometry('can-body', () => new THREE.CylinderGeometry(.033, .033, .105, 24, 1, true));
    add(body, canLabel(item));
    add(G.cyl, ITEM_ASSETS.silver, 0, .055, 0, .033, .006, .033);
    add(G.cyl, ITEM_ASSETS.silver, 0, -.055, 0, .032, .007, .032);
    itemRing(p, ITEM_ASSETS.silver, .033, .059, .0013);
    const tab = itemGeometry('can-tab', () => new THREE.TorusGeometry(.007, .0018, 5, 14));
    add(tab, ITEM_ASSETS.silver, 0, .061, .003, .8, 1.4, 1, Math.PI / 2);
    add(G.sph, MC('#39434a', .65), 0, .059, -.011, .008, .0008, .004);
  } else if (item.shape === 'glass') {
    const glass = itemGeometry('tumbler', () => new THREE.CylinderGeometry(.041, .034, .12, 24, 1, true));
    const fill = itemGeometry('tumbler-fill', () => new THREE.CylinderGeometry(.0375, .032, .081, 24));
    add(glass, ITEM_ASSETS.glass); add(G.cyl, ITEM_ASSETS.glass, 0, -.057, 0, .034, .006, .034);
    add(fill, liquid, 0, -.015, 0); itemRing(p, ITEM_ASSETS.glass, .041, .06, .0016);
    if (id === 'water' || id === 'juice') {
      const ice = itemMaterial('ice', () => M({ color: '#e0f7fa', roughness: .14, transparent: true, opacity: .65, depthWrite: false }));
      add(G.box, ice, -.013, .027, -.007, .018, .02, .018, .2, .25, .18);
      add(G.box, ice, .012, .024, .01, .017, .018, .02, -.18, -.2, .2);
    }
  } else if (item.shape === 'mug') {
    add(itemGeometry('mug-body', () => new THREE.CylinderGeometry(.039, .034, .091, 24, 1, true)), ITEM_ASSETS.ceramic);
    add(G.cyl, ITEM_ASSETS.ceramic, 0, -.043, 0, .034, .006, .034);
    add(G.cyl, liquid, 0, .026, 0, .0365, .006, .0365);
    const handle = itemGeometry('mug-handle', () => new THREE.TorusGeometry(.023, .0058, 7, 18, Math.PI * 1.5));
    add(handle, ITEM_ASSETS.ceramic, .04, 0, 0, 1, 1.1, 1, 0, 0, -Math.PI * .75);
    itemRing(p, ITEM_ASSETS.ceramic, .039, .045, .0022);
  } else if (item.shape === 'wine') {
    const bowl = itemGeometry('wine-bowl', () => new THREE.LatheGeometry(V2([[.008, 0], [.023, .011], [.035, .033], [.04, .062], [.032, .105]]), 24));
    const fill = itemGeometry('wine-fill', () => new THREE.LatheGeometry(V2([[0, .012], [.017, .012], [.031, .03], [.036, .052], [0, .052]]), 24));
    add(bowl, ITEM_ASSETS.glass); add(fill, liquid);
    add(G.cyl, ITEM_ASSETS.glass, 0, -.035, 0, .0032, .07, .0032);
    add(G.cyl, ITEM_ASSETS.glass, 0, -.072, 0, .034, .005, .034);
    itemRing(p, ITEM_ASSETS.glass, .032, .105, .0013);
  } else if (item.shape === 'sandwich') {
    const bread = itemGeometry('toast', () => rbox(.13, .024, .108, .009, 2));
    add(bread, ITEM_ASSETS.crust, 0, -.015); add(bread, ITEM_ASSETS.crust, 0, .028);
    add(G.box, ITEM_ASSETS.bread, 0, .041, 0, .108, .002, .087);
    add(G.box, ITEM_ASSETS.cheese, .003, .006, 0, .127, .006, .102, 0, .1);
    add(G.box, ITEM_ASSETS.leaf, -.002, .014, .002, .136, .009, .107, 0, -.07);
    for (const x of [-.028, .028]) add(G.cyl, ITEM_ASSETS.tomato, x, .018, .005, .028, .006, .028);
    add(G.box, ITEM_ASSETS.paper, 0, -.03, .021, .12, .003, .07);
  } else if (item.shape === 'pizza') {
    const slice = itemGeometry('pizza-slice', () => {
      const s = new THREE.Shape(); s.moveTo(0, .085); s.lineTo(-.073, -.06); s.quadraticCurveTo(0, -.085, .073, -.06); s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: .014, bevelEnabled: false }); g.rotateX(-Math.PI / 2); return g;
    });
    add(slice, ITEM_ASSETS.crust, 0, -.019); add(slice, ITEM_ASSETS.cheese, 0, -.005, 0, .91, .45, .94);
    for (const [x, z] of [[0, -.033], [-.026, .02], [.026, .02]]) {
      add(G.cyl, ITEM_ASSETS.tomato, x, .008, z, .017, .002, .017);
      add(G.sph, ITEM_ASSETS.leaf, x + .009, .009, z + .013, .007, .001, .004);
    }
    add(itemGeometry('pizza-crust', () => new THREE.CapsuleGeometry(.012, .126, 3, 10)), ITEM_ASSETS.crust, 0, .002, .064, 1, 1, 1, 0, 0, Math.PI / 2);
    add(G.box, ITEM_ASSETS.paper, 0, -.023, .035, .12, .003, .079);
  } else if (item.shape === 'fruit') {
    add(G.sph, ITEM_ASSETS.apple, 0, .001, 0, .048, .046, .047);
    add(G.cyl, ITEM_ASSETS.crust, .001, .052, 0, .003, .019, .003, 0, 0, -.15);
    add(G.sph, ITEM_ASSETS.leaf, .016, .052, 0, .021, .003, .008, 0, 0, .35);
  }
  return p;
}

/* Dois ossos: convertemos a direção no mundo à rotação local do osso. Isso respeita
   os eixos diferentes do Rocketbox e do esqueleto procedural, inclusive sentado. */
const _ITEM = Object.fromEntries(['s', 'e', 'h', 'target', 'elbow', 'direction', 'bend', 'from', 'to', 'grip', 'offset'].map(k => [k, new THREE.Vector3()]));
Object.assign(_ITEM, { rootQ: new THREE.Quaternion(), parentQ: new THREE.Quaternion(), worldQ: new THREE.Quaternion(), deltaQ: new THREE.Quaternion(), propQ: new THREE.Quaternion(), tilt: new THREE.Quaternion(), axis: new THREE.Vector3(1, 0, 0) });
function restorePersonItemPose(P) {
  if (!P.itemRest?.active) return;
  P.itemRest.bones.forEach((bone, i) => { if (bone) bone.quaternion.copy(P.itemRest.quats[i]); });
  P.itemRest.active = false;
}
function disposePersonItem(P) {
  restorePersonItemPose(P);
  if (P.heldProp) P.heldProp.removeFromParent();
  P.heldProp = null; P.heldItem = ''; P.consumeUntil = 0; P.itemRest = null;
}
function setPersonItem(P, id, until = 0) {
  if (!P || !P.root) return;
  if (!CONSUMABLES[id]) { disposePersonItem(P); return; }
  if (P.heldItem !== id || !P.heldProp) {
    disposePersonItem(P); P.heldItem = id; P.heldProp = makeConsumableProp(id); P.root.add(P.heldProp);
  }
  P.consumeUntil = Number.isFinite(until) ? until : 0;
  if (P.cup) P.cup.visible = false;
}
function rotateItemBone(bone, child, destination) {
  bone.getWorldPosition(_ITEM.from); child.getWorldPosition(_ITEM.to);
  _ITEM.to.sub(_ITEM.from).normalize(); _ITEM.from.subVectors(destination, _ITEM.from).normalize();
  if (_ITEM.to.lengthSq() < .5 || _ITEM.from.lengthSq() < .5) return;
  _ITEM.deltaQ.setFromUnitVectors(_ITEM.to, _ITEM.from); bone.getWorldQuaternion(_ITEM.worldQ);
  bone.parent.getWorldQuaternion(_ITEM.parentQ);
  bone.quaternion.copy(_ITEM.parentQ.invert()).multiply(_ITEM.deltaQ).multiply(_ITEM.worldQ);
  bone.updateWorldMatrix(false, true);
}
function updatePersonItem(P, t) {
  const item = CONSUMABLES[P.heldItem];
  if (!item || !P.heldProp) return;
  P.heldProp.visible = !(P.smokingUntil > t);
  if (!P.heldProp.visible) return;
  const J = P.J, upper = J.rSh, fore = J.rEl, hand = J.rWr || P.hand;
  if (!upper || !fore || !hand) return;
  if (!P.itemRest) P.itemRest = { bones: [upper, fore], quats: [new THREE.Quaternion(), new THREE.Quaternion()], active: false };
  P.itemRest.bones.forEach((bone, i) => P.itemRest.quats[i].copy(bone.quaternion)); P.itemRest.active = true; P.itemRest.kind = 'item';
  P.root.updateWorldMatrix(true, true); P.root.getWorldQuaternion(_ITEM.rootQ);
  upper.getWorldPosition(_ITEM.s); fore.getWorldPosition(_ITEM.e); hand.getWorldPosition(_ITEM.h);
  const a = _ITEM.s.distanceTo(_ITEM.e), b = _ITEM.e.distanceTo(_ITEM.h);
  if (a < .001 || b < .001) return;
  /* Smooth rise, pause to sip/bite, and lower; a little arc keeps it natural. */
  const left = (P.consumeUntil || 0) - t, progress = clamp(1 - left / 2.4, 0, 1);
  let lift = left > 0 ? Math.sin(Math.PI * clamp(progress * 1.4, 0, 1)) : 0;
  if (left > 0 && progress > .35 && progress < .67) lift = 1;
  if (left > 0 && progress >= .67) lift = Math.cos((progress - .67) / .33 * Math.PI / 2);
  const sway = Math.sin(t * 1.8 + (P.spec?.ph || 0)) * (reduceMotion ? .002 : .008);
  _ITEM.offset.set(-.015 - .025 * lift, -.30 + sway, .235).applyQuaternion(_ITEM.rootQ);
  _ITEM.target.copy(_ITEM.s).add(_ITEM.offset);
  if (J.head && lift > 0) {
    J.head.getWorldPosition(_ITEM.grip);
    const rim = item.shape === 'wine' ? .105 : item.shape === 'mug' ? .045 : .06;
    const mouthY = P.isAvatar ? .055 : .075;
    _ITEM.offset.set(-.025, mouthY - .024 - (item.kind === 'drink' ? rim * Math.cos(.32) : .012),
      .11 - .024 + (item.kind === 'drink' ? rim * Math.sin(.32) : .01)).applyQuaternion(_ITEM.rootQ);
    _ITEM.grip.add(_ITEM.offset); _ITEM.target.lerp(_ITEM.grip, lift);
  }
  _ITEM.direction.subVectors(_ITEM.target, _ITEM.s); const distance = clamp(_ITEM.direction.length(), Math.abs(a - b) + .006, a + b - .006);
  _ITEM.direction.normalize(); _ITEM.target.copy(_ITEM.s).addScaledVector(_ITEM.direction, distance);
  _ITEM.bend.set(-1, -.25, -.3).applyQuaternion(_ITEM.rootQ);
  _ITEM.bend.addScaledVector(_ITEM.direction, -_ITEM.bend.dot(_ITEM.direction)).normalize();
  const along = (a * a - b * b + distance * distance) / (2 * distance);
  const perpendicular = Math.sqrt(Math.max(0, a * a - along * along));
  _ITEM.elbow.copy(_ITEM.s).addScaledVector(_ITEM.direction, along).addScaledVector(_ITEM.bend, perpendicular);
  rotateItemBone(upper, fore, _ITEM.elbow); rotateItemBone(fore, hand, _ITEM.target);
  hand.getWorldPosition(_ITEM.grip);
  /* The palm holds the side; a ring/tab/rim remains visible above the fingers. */
  _ITEM.offset.set(0, .024, .024).applyQuaternion(_ITEM.rootQ); _ITEM.grip.add(_ITEM.offset);
  P.root.worldToLocal(_ITEM.grip); P.heldProp.position.copy(_ITEM.grip);
  _ITEM.tilt.setFromAxisAngle(_ITEM.axis, item.kind === 'drink' ? -.32 * lift : -.13 * lift);
  _ITEM.propQ.copy(_ITEM.rootQ).multiply(_ITEM.tilt); P.root.getWorldQuaternion(_ITEM.parentQ);
  P.heldProp.quaternion.copy(_ITEM.parentQ.invert()).multiply(_ITEM.propQ);
  P.heldProp.userData.consuming = left > 0; P.heldProp.userData.lift = lift;
  P.heldProp.updateWorldMatrix(false, true);
}
function updatePersonSmokingPose(P, t, until = P.smokingUntil || 0) {
  const active = until > t;
  if (P.heldProp) P.heldProp.visible = !active;
  if (!active) { if (P.smokeRig) P.smokeRig.visible = false; if (P.itemRest?.kind === 'smoke') restorePersonItemPose(P); return; }
  const J = P.J, upper = J.rSh, fore = J.rEl, hand = J.rWr || P.hand;
  if (!upper || !fore || !hand || !J.head || typeof makeSmokingMouthpiece !== 'function') return;
  restorePersonItemPose(P);
  if (!P.itemRest) P.itemRest = { bones: [upper, fore], quats: [new THREE.Quaternion(), new THREE.Quaternion()], active: false };
  P.itemRest.bones.forEach((bone, i) => P.itemRest.quats[i].copy(bone.quaternion)); P.itemRest.active = true; P.itemRest.kind = 'smoke';
  P.root.updateWorldMatrix(true, true); P.root.getWorldQuaternion(_ITEM.rootQ);
  upper.getWorldPosition(_ITEM.s); fore.getWorldPosition(_ITEM.e); hand.getWorldPosition(_ITEM.h);
  const a = _ITEM.s.distanceTo(_ITEM.e), b = _ITEM.e.distanceTo(_ITEM.h);
  if (a < .001 || b < .001) return;
  const left = until - t, lift = clamp((5.5 - left) / .65, 0, 1) * clamp(left / .6, 0, 1);
  _ITEM.offset.set(-.015, -.30, .235).applyQuaternion(_ITEM.rootQ); _ITEM.target.copy(_ITEM.s).add(_ITEM.offset);
  J.head.getWorldPosition(_ITEM.grip);
  _ITEM.offset.set(-.025, P.isAvatar ? .031 : .051, .25).applyQuaternion(_ITEM.rootQ);
  _ITEM.grip.add(_ITEM.offset); _ITEM.target.lerp(_ITEM.grip, lift);
  _ITEM.direction.subVectors(_ITEM.target, _ITEM.s); const distance = clamp(_ITEM.direction.length(), Math.abs(a - b) + .006, a + b - .006);
  _ITEM.direction.normalize(); _ITEM.target.copy(_ITEM.s).addScaledVector(_ITEM.direction, distance);
  _ITEM.bend.set(-1, -.25, -.3).applyQuaternion(_ITEM.rootQ);
  _ITEM.bend.addScaledVector(_ITEM.direction, -_ITEM.bend.dot(_ITEM.direction)).normalize();
  const along = (a * a - b * b + distance * distance) / (2 * distance);
  _ITEM.elbow.copy(_ITEM.s).addScaledVector(_ITEM.direction, along).addScaledVector(_ITEM.bend, Math.sqrt(Math.max(0, a * a - along * along)));
  rotateItemBone(upper, fore, _ITEM.elbow); rotateItemBone(fore, hand, _ITEM.target);
  if (!P.smokeRig) { P.smokeRig = makeSmokingMouthpiece(); P.root.add(P.smokeRig); }
  if (P.smokeRig.parent !== P.root) P.root.add(P.smokeRig);
  P.smokeRig.visible = true; if (P.cup) P.cup.visible = false;
  hand.getWorldPosition(_ITEM.grip); _ITEM.offset.set(0, .024, .01).applyQuaternion(_ITEM.rootQ); _ITEM.grip.add(_ITEM.offset);
  P.root.worldToLocal(_ITEM.grip); P.smokeRig.position.copy(_ITEM.grip);
  P.root.getWorldQuaternion(_ITEM.parentQ); P.smokeRig.quaternion.copy(_ITEM.parentQ.invert()).multiply(_ITEM.rootQ);
  P.smokeRig.userData.lift = lift; P.smokeRig.updateWorldMatrix(false, true);
}
