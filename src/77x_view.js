/* ================= terceira pessoa: o visitante vê o próprio personagem ================= */
/* O mesmo avatar da dança anda, senta, come, bebe e usa o narguilé atrás da câmera. Botão 👤 ou tecla V. */
const VIEW = { third: false, dist: 0 };
try { VIEW.third = localStorage.getItem('sala-view') === '3'; } catch (e) { }
const THIRD_MODES = ['fp', 'seat', 'menu', 'music', 'casino', 'elevator'];
function playerBody() {
  if (!DISCO.player) { DISCO.player = makePerson(10 + myLook); DISCO.player.root.visible = false; }
  if (!DISCO.player.isAvatar && AV.clips) loadDancer();
  return DISCO.player;
}
function setThirdPerson(on) {
  VIEW.third = !!on; VIEW.dist = 0.4;
  try { localStorage.setItem('sala-view', VIEW.third ? '3' : '1'); } catch (e) { }
  if (VIEW.third) playerBody();
  updateViewButton();
}
function updateViewButton() {
  const b = $('viewToggle'); b.textContent = VIEW.third ? '👁️ 1ª pessoa' : '👤 3ª pessoa';
  b.setAttribute('aria-pressed', String(VIEW.third)); b.title = VIEW.third ? 'Voltar para a primeira pessoa (V)' : 'Ver o seu personagem (V)';
}
function stepThirdCam(dt) {
  const s = seatState.s, x = s ? s.x : fp.pos.x, z = s ? s.z : fp.pos.z, headY = s ? s.eye + 0.15 : 1.75;
  const cp = Math.cos(fp.pitch), fx = -Math.sin(fp.yaw) * cp, fy = Math.sin(fp.pitch), fz = -Math.cos(fp.yaw) * cp;
  /* Afasta até 2,6 m atrás da cabeça, parando antes das paredes. */
  let want = 2.6;
  for (let d = 0.2; d <= 2.6; d += 0.1) if (wallBlocked(x - fx * d, z - fz * d, 0.15)) { want = Math.max(0.25, d - 0.15); break; }
  VIEW.dist = want < VIEW.dist ? want : damp(VIEW.dist, want, 4, dt);
  camera.position.set(x - fx * VIEW.dist, clamp(headY + 0.2 - fy * VIEW.dist, 0.4, RH - 0.2), z - fz * VIEW.dist);
  camera.quaternion.copy(fpQuat(fp.yaw, fp.pitch));
}
function stepPlayerBody(dt, t) {
  const show = inRoom && VIEW.third && !DISCO.dancing && THIRD_MODES.includes(mode);
  if (!show) { if (DISCO.player && !DISCO.dancing && DISCO.player.root.visible) DISCO.player.root.visible = false; return; }
  const A = playerBody(), s = seatState.s;
  A.root.visible = true;
  if (s) { A.root.position.set(s.x, 0, s.z); A.yaw = s.yaw + Math.PI; A.pose = 'sofa'; A.speed = 0; }
  else { A.root.position.set(fp.pos.x, 0, fp.pos.z); A.yaw = fp.yaw + Math.PI; A.pose = mode === 'casino' ? 'cross' : 'stand'; A.speed = mode === 'fp' ? Math.hypot(fp.vel.x, fp.vel.z) : 0; }
  A.smokingUntil = HOSP.smokingUntil;
  A.isAvatar ? A.update(dt, t) : animatePerson(A, dt, t);
  if (s && A.isAvatar) A.root.position.y = s.kind === 'desk' ? 0 : -0.03;
}
$('viewToggle').onclick = () => setThirdPerson(!VIEW.third);
updateViewButton();
