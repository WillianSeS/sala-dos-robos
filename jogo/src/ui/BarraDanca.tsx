/* Botões de dança na discoteca (42º) e no Las Vegas Night (44º): três danças e parar. Andar também para. */
import { useJogo } from '../estado/jogo';
import { ESTILOS } from '../jogos/danca';
import { useJogos } from '../jogos/estado';

export function BarraDanca() {
  const andar = useJogo((s) => s.andar);
  const etapa = useJogo((s) => s.etapa);
  const painel = useJogo((s) => s.painel);
  const vista = useJogo((s) => s.vista);
  const danca = useJogos((s) => s.danca);
  const minijogo = useJogos((s) => s.ativo);
  const setDanca = useJogos((s) => s.setDanca);
  if (etapa !== 'jogo' || painel || minijogo || vista === 'externa' || (andar !== 42 && andar !== 44)) return null;
  return (
    <div className="barra-danca" role="group" aria-label="Danças" data-testid="barra-danca">
      {ESTILOS.map((e) => (
        <button key={e.id} type="button" className={`botao-vidro${danca === e.id ? ' ligado' : ''}`} data-testid={`danca-${e.id}`} aria-pressed={danca === e.id} onClick={() => setDanca(danca === e.id ? null : e.id)}>
          <span aria-hidden>{e.icone}</span>
          <span className="rotulo">{e.nome}</span>
        </button>
      ))}
    </div>
  );
}
