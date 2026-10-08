/* Mapa interativo do prédio: corte da torre com os cinco andares (o elevador mostra onde a cabine está) e,
   para o andar escolhido, miniatura renderizada, número, nome, atividades e o botão de ir (pelo elevador). */
import { useState } from 'react';
import { useJogo } from '../estado/jogo';
import { ANDARES, INFO_ANDAR, type NumeroAndar } from '../mundo/andares';
import { caminho } from '../motor/carregar';
import { irPara } from '../mundo/navegacao';

const DE_CIMA = [...ANDARES].reverse();

function Miniatura({ n }: { n: NumeroAndar }) {
  const [falhou, setFalhou] = useState(false);
  const info = INFO_ANDAR[n];
  if (falhou)
    return (
      <div className="miniatura vazia" style={{ background: `radial-gradient(circle at 50% 40%, ${info.cor}55, #0b0b12 70%)` }}>
        <span aria-hidden>{info.icone}</span>
      </div>
    );
  return <img className="miniatura" src={caminho(`mapa/andar${n}.webp`)} alt={`Vista do ${n}º andar: ${info.nome}`} loading="lazy" onError={() => setFalhou(true)} />;
}

function BotaoIr({ n }: { n: NumeroAndar }) {
  const andar = useJogo((s) => s.andar);
  const aqui = andar === n;
  return (
    <button type="button" className="botao-ouro" disabled={aqui} data-testid={`ir-${n}`} onClick={() => irPara(n)}>
      {aqui ? 'Você está aqui' : `Ir para o ${n}º andar`}
    </button>
  );
}

export function Mapa() {
  const andar = useJogo((s) => s.andar);
  const elevador = useJogo((s) => s.elevador);
  const [escolhido, setEscolhido] = useState<NumeroAndar>(andar);
  const [modo, setModo] = useState<'predio' | 'ambientes'>('predio');
  const info = INFO_ANDAR[escolhido];
  // posição da cabine no poço (entre 40 e 44; no térreo, abaixo do 40)
  const nivel = Math.max(-0.6, Math.min(4, elevador.indicador - 40));

  return (
    <>
      <h2>Mapa do prédio</h2>
      <div className="abas" role="tablist">
        <button type="button" role="tab" aria-selected={modo === 'predio'} className={modo === 'predio' ? 'escolhido' : ''} onClick={() => setModo('predio')}>
          Prédio
        </button>
        <button type="button" role="tab" aria-selected={modo === 'ambientes'} className={modo === 'ambientes' ? 'escolhido' : ''} data-testid="aba-ambientes" onClick={() => setModo('ambientes')}>
          Ambientes
        </button>
      </div>
      {modo === 'predio' ? (
        <div className="mapa">
          <div className="torre" aria-label="Corte do prédio">
            <div className="torre-coroa" aria-hidden>♛</div>
            <div className="torre-andares">
              {DE_CIMA.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`torre-andar${n === escolhido ? ' escolhido' : ''}${n === andar ? ' atual' : ''}`}
                  style={{ ['--cor' as string]: INFO_ANDAR[n].cor }}
                  data-testid={`mapa-andar-${n}`}
                  onClick={() => setEscolhido(n)}
                >
                  <strong>{n}</strong>
                  <span>{INFO_ANDAR[n].nome}</span>
                  {n === andar && <em>você</em>}
                </button>
              ))}
              <div className="poco" aria-hidden>
                <div className="cabine-mapa" style={{ bottom: `${(nivel / 5) * 100 + 4}%` }} />
              </div>
            </div>
            <div className="torre-base" aria-hidden>
              <span>39 andares abaixo · térreo</span>
            </div>
          </div>
          <div className="detalhe-andar" data-testid="detalhe-andar">
            <Miniatura n={escolhido} />
            <h3>
              <span className="numero" style={{ color: info.cor }}>{escolhido}º andar</span> · {info.nome}
            </h3>
            <p>{info.resumo}</p>
            <ul>
              {info.atividades.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            <BotaoIr n={escolhido} />
          </div>
        </div>
      ) : (
        <div className="ambientes">
          {DE_CIMA.map((n) => (
            <article key={n} className={`ambiente${n === andar ? ' atual' : ''}`} style={{ ['--cor' as string]: INFO_ANDAR[n].cor }}>
              <Miniatura n={n} />
              <div>
                <h3>
                  <span className="numero">{n}º</span> {INFO_ANDAR[n].icone} {INFO_ANDAR[n].nome}
                </h3>
                <p>{INFO_ANDAR[n].atividades.join(' · ')}</p>
                <BotaoIr n={n} />
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
