/* Modo de teste: ?teste&andar=N começa direto no andar N (no ponto de nascimento dele), sem a entrada. */
import { useJogo } from '../estado/jogo';
import { modoTeste } from '../testes/telemetria';
import { ANDARES, type NumeroAndar } from './andares';
import { comandosElevador, comandosJogador } from './comandos';

export function aplicarInicioDaUrl() {
  if (!modoTeste || typeof location === 'undefined') return;
  const n = Number(new URLSearchParams(location.search).get('andar')) as NumeroAndar;
  if (!ANDARES.includes(n)) return;
  comandosJogador.nascerNoSpawn = true;
  comandosElevador.estado = null;
  comandosElevador.forcar = { andar: n, destino: null };
  useJogo.setState({ etapa: 'jogo', andar: n, nome: useJogo.getState().nome || 'Visitante' });
}
