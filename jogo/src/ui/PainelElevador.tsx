/* Painel do elevador (aberto com E dentro da cabine ou pelo menu): visor, os cinco andares, abrir/fechar portas
   e atalho para o mapa. Os botões acendem também na cabine 3D. */
import { useJogo } from '../estado/jogo';
import { ANDARES, INFO_ANDAR, type NumeroAndar } from '../mundo/andares';
import { apertarAndar } from '../mundo/Elevador';
import { comandosElevador } from '../mundo/comandos';

const DE_CIMA = [...ANDARES].reverse();

export function PainelElevador() {
  const e = useJogo((s) => s.elevador);
  const setPainel = useJogo((s) => s.setPainel);
  const viajando = e.fase === 'viajando';
  const seta = viajando && e.destino !== null ? (e.destino > e.andar ? '▲' : '▼') : '';
  const escolher = (n: NumeroAndar) => {
    apertarAndar(n);
    if (n !== e.andar) setTimeout(() => useJogo.getState().setPainel(null), 350);
  };
  return (
    <div className="painel-elevador">
      <div className="visor" aria-live="polite" data-testid="visor-elevador">
        <span className="visor-seta">{seta}</span>
        <span className="visor-numero">{e.indicador === 0 ? 'T' : e.indicador}</span>
        <small>{viajando && e.destino !== null ? `para ${INFO_ANDAR[e.destino].nome}` : INFO_ANDAR[e.andar as NumeroAndar]?.nome ?? 'Térreo'}</small>
      </div>
      <div className="botoes-andar">
        {DE_CIMA.map((n) => (
          <button
            key={n}
            type="button"
            className={`botao-andar${e.destino === n ? ' aceso' : ''}${e.andar === n && !viajando ? ' aqui' : ''}`}
            data-testid={`painel-andar-${n}`}
            disabled={viajando}
            onClick={() => escolher(n)}
          >
            <span className="tecla" style={{ ['--cor' as string]: INFO_ANDAR[n].cor }}>{n}</span>
            <span className="nome">
              {INFO_ANDAR[n].icone} {INFO_ANDAR[n].nome}
            </span>
          </button>
        ))}
      </div>
      <div className="botoes-porta">
        <button type="button" data-testid="painel-abrir" onClick={() => (comandosElevador.abrir = true)} disabled={viajando}>
          <span aria-hidden>◀ ▶</span> Abrir
        </button>
        <button type="button" data-testid="painel-fechar" onClick={() => (comandosElevador.fechar = true)} disabled={viajando}>
          <span aria-hidden>▶ ◀</span> Fechar
        </button>
        <button type="button" data-testid="painel-mapa" onClick={() => setPainel('mapa')}>
          <span aria-hidden>🗺️</span> Mapa
        </button>
      </div>
    </div>
  );
}
