/* Acesso à sala de jogos sem interromper a simulação do escritório. */
const inGames = (x, z) => x > 4.2 && x < 11.8 && z > 6.4 && z < 13.8;
function goGames() {
  if (!inRoom || !['fp', 'seat'].includes(mode)) return;
  if (mode === 'seat') { standUp(goGames); return; }
  fp.vel.set(0, 0, 0);
  if (document.pointerLockElement) document.exitPointerLock();
  fp.pos.set(5.5, 0, 7.1); fp.yaw = -2.25; fp.pitch = 0;
  startTween(new THREE.Vector3(5.5, EYE, 7.1), fpQuat(fp.yaw, 0), reduceMotion ? 0.01 : 0.65, () => { mode = 'fp'; });
}
function exitGames() {
  if (mode !== 'fp') return;
  fp.vel.set(0, 0, 0);
  fp.pos.set(5.5, 0, 5.5); fp.yaw = 0; fp.pitch = 0;
  startTween(new THREE.Vector3(5.5, EYE, 5.5), fpQuat(0, 0), reduceMotion ? 0.01 : 0.65, () => { mode = 'fp'; });
}
$('gamesGo').addEventListener('click', goGames);
$('gamesBack').addEventListener('click', exitGames);
