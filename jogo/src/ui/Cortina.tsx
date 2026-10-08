/* Cortina preta das transições (entrada no prédio, atalhos, vistas): esconde os cortes de cena. */
import { useJogo } from '../estado/jogo';

export function Cortina() {
  const cortina = useJogo((s) => s.cortina);
  return <div className={`cortina${cortina ? ' fechada' : ''}`} data-testid="cortina" aria-hidden />;
}
