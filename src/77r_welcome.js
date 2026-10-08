/* ================= recepção: Aurora, a recepcionista cyber, dá as boas-vindas ================= */
/* Fica na entrada do escritório (40º andar). Ao chegar, o visitante ouve as boas-vindas e recebe ofertas. */
const WELCOME = { npc: null, greeted: false, open: false, x: 6.4, z: -3.25, rings: [] };
const cyberMat = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending });
function initAurora() {
  if (WELCOME.npc) return;
  const n = showPerson(5, 'Business_Female_02', 'Aurora', 'recepcionista', WELCOME.x, WELCOME.z, 0);
  n.el.classList.add('cyber'); WELCOME.npc = n;
  /* Anel holográfico no chão e auréola sobre a cabeça. */
  const base = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.012, 8, 48), cyberMat('#36f3ff', 0.9)); base.rotation.x = Math.PI / 2; base.position.set(WELCOME.x, 0.03, WELCOME.z);
  const base2 = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.36, 40), cyberMat('#ff3fd8', 0.25)); base2.rotation.x = -Math.PI / 2; base2.position.set(WELCOME.x, 0.02, WELCOME.z);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.008, 6, 36), cyberMat('#36f3ff', 0.85)); halo.rotation.x = Math.PI / 2;
  for (const m of [base, base2, halo]) GROUPS.main.add(m);
  WELCOME.rings = [base, base2]; WELCOME.halo = halo;
}
/* Visual cyber: brilho neon frio na roupa e na pele (materiais copiados, sem mudar os outros avatares). */
function cyberize(A) {
  if (A.cyber) return; A.cyber = true;
  A.root.traverse(o => {
    if (!o.isMesh) return;
    o.material = (Array.isArray(o.material) ? o.material : [o.material]).map(m => {
      const c = m.clone(); c.emissive = new THREE.Color('#1fb8ff'); c.emissiveIntensity = 0.1; if (c.color) c.color.lerp(new THREE.Color('#bcd4ff'), 0.08); return c;
    });
    if (o.material.length === 1) o.material = o.material[0];
  });
}
function greetGuest() {
  initAurora(); WELCOME.greeted = true; WELCOME.open = true;
  const name = (myName || '').split(' ')[0];
  $('welcomeLine').textContent = 'Olá' + (name ? ', ' + name : '') + '! Bem-vindo ao Las Vegas Night. Eu sou a Aurora. Posso te oferecer uma bebida ou levar você ao show no 44º andar?';
  $('welcome').hidden = false;
  showSay('Olá' + (name ? ', ' + name : '') + '! Bem-vindo ao Las Vegas Night. Eu sou a Aurora. Posso te oferecer uma bebida, ou levar você ao show no quadragésimo quarto andar?', 'office');
}
function closeWelcome() { WELCOME.open = false; $('welcome').hidden = true; }
function welcomeDrink() {
  closeWelcome(); deliverConsumable(SHOW_DRINKS[Math.floor(Math.random() * SHOW_DRINKS.length)], { name: 'Aurora' });
  showSay('Aqui está. Aproveite a noite!', 'office');
}
function welcomeRide(key) { closeWelcome(); showSay(key === 'show' ? 'Ótima escolha! O show está começando.' : 'Divirta-se na sala de jogos!', 'office'); rideTo(key); }
function stepWelcome(dt, t) {
  initAurora();
  const n = WELCOME.npc, P = n.P;
  if (AV.clips && !P.isAvatar) loadShowPerson(n);
  if (n.P.isAvatar) cyberize(n.P);
  const A = n.P, here = inRoom && playerFloor() === 'office';
  A.root.position.set(WELCOME.x, 0, WELCOME.z); A.pose = 'stand'; A.speed = 0;
  A.yaw = angDamp(A.yaw, here ? Math.atan2(fp.pos.x - WELCOME.x, fp.pos.z - WELCOME.z) : 0, 4, dt);
  A.isAvatar ? A.update(dt, t) : animatePerson(A, dt, t);
  const pulse = 0.5 + 0.5 * Math.sin(t * (reduceMotion ? 0.8 : 2.4));
  WELCOME.rings[0].material.opacity = 0.55 + 0.4 * pulse; WELCOME.rings[1].material.opacity = 0.15 + 0.2 * pulse; WELCOME.rings[1].rotation.z = t * 0.6;
  if (A.J.head) { A.J.head.getWorldPosition(WELCOME.halo.position); WELCOME.halo.position.y += 0.27; }
  /* Boas-vindas na primeira chegada; o painel fecha se o visitante se afasta ou abre outra coisa. */
  if (!WELCOME.greeted && here && mode === 'fp') greetGuest();
  if (WELCOME.open && (!here || mode !== 'fp' || Math.hypot(fp.pos.x - WELCOME.x, fp.pos.z - WELCOME.z) > 4.5)) closeWelcome();
}
$('welDrink').onclick = welcomeDrink; $('welShow').onclick = () => welcomeRide('show'); $('welGames').onclick = () => welcomeRide('games');
$('welNo').onclick = () => { showSay('Por nada! Estou aqui na recepção.', 'office'); closeWelcome(); };
