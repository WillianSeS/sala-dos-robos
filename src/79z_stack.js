/* ================= vista do prédio: um andar em cima do outro ================= */
/* As salas continuam lado a lado no plano do jogo (andar, colisão, robôs e rede não mudam).
   Só na vista de dentro do prédio cada andar é desenhado na sua altura, centralizado sobre o escritório:
   uma passada de desenho por andar, com a câmera deslocada e só os objetos daquele andar (camadas). */
const STACK = { on: false, keep: false, h: 5.2 };
const ROOM_CENTER = { office: [0, 0], games: [8, 10], disco: [0, 10], lounge: [8, 18], show: [0, 18] };
for (const f of FLOORS) { f.layer = 1 + f.n - 40; f.stackOffset = new THREE.Vector3(-ROOM_CENTER[f.key][0], (f.n - 40) * STACK.h, -ROOM_CENTER[f.key][1]); }
hemi.layers.enableAll();
const WALL_GROUP_FLOOR = new Map(Object.keys(WALL_INFO).map(k => [GROUPS[k], groupFloorKey(k)]));
const _stackV = new THREE.Vector3();
const STACK_PERSON_FLOOR = new WeakMap();
function stackPersonFloor(P) {
  if (!P || !P.root) return;
  const f = floorAt(P.root.position.x, P.root.position.z);
  STACK_PERSON_FLOOR.set(P.root, f);
  /* A caneca dos modelos importados acompanha a mão, mas fica fora do grupo do corpo. */
  if (P.cup) STACK_PERSON_FLOOR.set(P.cup, f);
}
/* Marca cada objeto com a camada do seu andar (a camada 0 continua, para sombras e vista normal). */
function floorOfObject(o) {
  for (let p = o; p; p = p.parent) {
    const person = STACK_PERSON_FLOOR.get(p); if (person) return person;
    if (p.userData.floor) return p.userData.floor;
    const g = WALL_GROUP_FLOOR.get(p); if (g) return g;
  }
  o.getWorldPosition(_stackV); return floorAt(_stackV.x, _stackV.z);
}
function assignLayers() {
  /* Braços, roupas e objetos na mão pertencem ao andar do corpo inteiro, inclusive junto à porta. */
  robots.forEach(r => stackPersonFloor(r.P));
  for (const member of STAFF.members) { stackPersonFloor(member.P); STACK_PERSON_FLOOR.set(member.tray, floorAt(member.P.root.position.x, member.P.root.position.z)); }
  stackPersonFloor(DISCO.player);
  for (const n of [...SHOW.dancers, ...SHOW.hosts]) stackPersonFloor(n.P);
  if (WELCOME.npc) stackPersonFloor(WELCOME.npc.P);
  for (const v of MP.vis.values()) stackPersonFloor(v.A);
  function visit(o) {
    /* traverse() não interrompe os descendentes: exclui o hotel e a câmera por inteiro. */
    if (o === EXT.group || o === camera) return;
    if ((o.isMesh || o.isSprite || o.isPoints || o.isLine || o.isLight) && !o.userData.floorFixed && o !== hemi) {
      o.layers.mask = 1 | (1 << FLOOR[floorOfObject(o)].layer);
    }
    for (const child of o.children) visit(child);
  }
  visit(scene);
}
function stackActive() {
  return (!inRoom && orbit.view === 'inside' && (mode === 'orbit' || mode === 'tween')) || (mode === 'tween' && STACK.keep);
}
/* Desloca um ponto do plano do jogo para onde ele aparece na vista do prédio. */
function stackShift(v, x, z) { if (STACK.on) v.add(FLOOR[floorAt(x, z)].stackOffset); return v; }
function renderStacked() {
  assignLayers();
  const base = camera.position.clone(), bg = scene.background, cameraMask = camera.layers.mask;
  const autoClear = renderer.autoClear, clearColor = renderer.getClearColor(new THREE.Color()), clearAlpha = renderer.getClearAlpha();
  const visibility = [skyFar, skyMid, ...TRAFFIC, ...Object.keys(WALL_INFO).map(k => GROUPS[k])].map(o => [o, o.visible]);
  const updateShadows = renderer.shadowMap.needsUpdate; let shadowsUpdated = false, completed = false;
  try {
    /* Fundo de cor única faria o three.js apagar a tela a cada passada: limpa uma vez com a cor dele. */
    if (bg && bg.isColor) renderer.setClearColor(bg, 1); scene.background = null;
    renderer.autoClear = false; renderer.clear();
    for (const f of FLOORS) {
      camera.position.copy(base).sub(f.stackOffset); camera.updateMatrixWorld();
      setWalls(false); camera.layers.set(f.layer);
      /* O three.js consome needsUpdate no primeiro desenho; os demais andares também precisam atualizar suas sombras. */
      renderer.shadowMap.needsUpdate = updateShadows;
      renderer.render(scene, camera);
      if (updateShadows && !renderer.shadowMap.needsUpdate) shadowsUpdated = true;
    }
    completed = true;
  } finally {
    camera.position.copy(base); camera.updateMatrixWorld(); camera.layers.mask = cameraMask;
    renderer.autoClear = autoClear; renderer.setClearColor(clearColor, clearAlpha); scene.background = bg;
    for (const [o, visible] of visibility) o.visible = visible;
    renderer.shadowMap.needsUpdate = updateShadows && (!completed || !shadowsUpdated);
  }
}
/* Placas com o número e o nome de cada andar, ao lado do corte do prédio. */
for (const f of FLOORS) { f.stackLabel = mkLabel('floor'); f.stackLabel.firstChild.textContent = f.n + 'º andar'; f.stackLabel.lastChild.textContent = f.name; }
const _stackL = new THREE.Vector3();
function updateStackLabels() {
  for (const f of FLOORS) {
    const el = f.stackLabel;
    if (!STACK.on) { el.style.opacity = '0'; continue; }
    const [cx, cz] = ROOM_CENTER[f.key], half = f.key === 'office' ? 8 : 4;
    _stackL.set(cx - half - 0.6, f.key === 'office' ? 0.2 : 1.4, cz).add(f.stackOffset).project(camera);
    if (!Number.isFinite(_stackL.x + _stackL.y + _stackL.z) || _stackL.z < -1 || _stackL.z > 1) { el.style.opacity = '0'; continue; }
    el.style.opacity = '1';
    el.style.transform = `translate(${(_stackL.x * 0.5 + 0.5) * innerWidth}px,${(-_stackL.y * 0.5 + 0.5) * innerHeight}px) translate(-100%,-50%)`;
  }
}
