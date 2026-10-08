/* Atalhos da sala de jogos: viajam pelo elevador do prédio. */
const inGames = (x, z) => x > 4.2 && x < 11.8 && z > 6.4 && z < 13.8;
function goGames() { rideTo('games'); }
function exitGames() { rideTo('office'); }
$('gamesGo').addEventListener('click', goGames);
$('gamesBack').addEventListener('click', exitGames);
