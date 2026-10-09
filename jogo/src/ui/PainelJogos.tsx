/* Interface dos minijogos da Sala de Jogos: sinuca, dardos e Clube do 21. Fichas e troféus são de brincadeira. */
import { useState } from 'react';
import { comandosJogo, useJogos } from '../jogos/estado';
import { TROFEUS } from '../jogos/dardos';
import { APOSTA, distribuir, nomeCarta, novaMesa, parar, pedir, pontos, recarregar, type Carta, type Mesa21 } from '../jogos/vinteum';
import { ROBO_SINUCA } from '../jogos/Jogos41';
import { useJogo } from '../estado/jogo';

function BotaoSegurar({ rotulo, testid }: { rotulo: string; testid: string }) {
  return (
    <button
      type="button"
      className="botao-ouro segurar"
      data-testid={testid}
      onPointerDown={(e) => {
        e.preventDefault();
        comandosJogo.carregar = true;
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        comandosJogo.soltar = true;
      }}
      onPointerLeave={() => {
        comandosJogo.soltar = true;
      }}
    >
      {rotulo}
    </button>
  );
}

function Sair() {
  return (
    <button type="button" className="botao-simples" data-testid="sair-jogo" onClick={() => useJogos.getState().fechar()}>
      Sair do jogo
    </button>
  );
}

function PainelSinuca() {
  const h = useJogos((s) => s.hud);
  const toque = useJogo((s) => s.toque);
  return (
    <>
      <div className="jogo-topo" data-testid="painel-sinuca">
        <strong>🎱 Sinuca</strong>
        <span className={h.vez === 'voce' ? 'vez' : ''}>Você {h.voce ?? 0}</span>×
        <span className={h.vez === 'robo' ? 'vez' : ''}>
          {h.robo ?? 0} {ROBO_SINUCA} (robô)
        </span>
        <small>{h.restantes ?? 15} bolas na mesa</small>
      </div>
      <div className="jogo-base">
        <p aria-live="polite" data-testid="msg-sinuca">{String(h.msg ?? '')}</p>
        <div className="barra-forca" aria-label="Força da tacada">
          <div style={{ width: `${h.forca ?? 0}%` }} />
        </div>
        <p className="nota">{toque ? 'Arraste o dedo na mesa para mirar; segure o botão e solte para tacar.' : 'Mire com o mouse (ou ← →); segure o clique ou Espaço e solte para tacar. Esc sai.'}</p>
        <div className="jogo-botoes">
          {h.fase === 'fim' ? (
            <button type="button" className="botao-ouro" onClick={() => (comandosJogo.novaPartida = true)}>
              Jogar de novo
            </button>
          ) : (
            <BotaoSegurar rotulo="Segure para tacar" testid="tacar" />
          )}
          <Sair />
        </div>
      </div>
    </>
  );
}

function PainelDardos() {
  const h = useJogos((s) => s.hud);
  const trofeus = String(h.trofeus ?? '').split(',').filter(Boolean);
  const acabou = Number(h.lancados ?? 0) >= Number(h.total ?? 9);
  return (
    <>
      <div className="jogo-topo" data-testid="painel-dardos">
        <strong>🎯 Dardos</strong>
        <span>
          {h.pontos ?? 0} pontos · dardo {Math.min(Number(h.lancados ?? 0) + (acabou ? 0 : 1), Number(h.total ?? 9))}/{h.total ?? 9}
        </span>
        <small>Recorde {h.recorde ?? 0}</small>
      </div>
      <div className="jogo-base">
        <p aria-live="polite" data-testid="msg-dardos">{String(h.msg ?? '')}</p>
        {h.historico ? <p className="nota">{String(h.historico)}</p> : null}
        <div className="barra-forca" aria-label="Firmeza da mão">
          <div style={{ width: `${h.firmeza ?? 0}%` }} />
        </div>
        <div className="trofeus">
          {TROFEUS.map((t) => (
            <span key={t.id} className={trofeus.includes(t.id) ? 'ganho' : ''} title={t.nome}>
              {t.icone} {t.nome}
            </span>
          ))}
        </div>
        <div className="jogo-botoes">
          {acabou ? (
            <button type="button" className="botao-ouro" onClick={() => (comandosJogo.novaPartida = true)}>
              Jogar de novo
            </button>
          ) : (
            <BotaoSegurar rotulo="Segure e solte para lançar" testid="lancar" />
          )}
          <Sair />
        </div>
      </div>
    </>
  );
}

function CartaUi({ c, fechada }: { c: Carta; fechada?: boolean }) {
  const vermelha = c.naipe === '♥' || c.naipe === '♦';
  return (
    <span className={`carta${fechada ? ' fechada' : vermelha ? ' vermelha' : ''}`} aria-label={fechada ? 'Carta fechada' : `${nomeCarta(c)}${c.naipe}`}>
      {fechada ? '?' : `${nomeCarta(c)}${c.naipe}`}
    </span>
  );
}

function PainelVinteUm() {
  const [m, setM] = useState<Mesa21>(() => novaMesa());
  const agir = (f: (x: Mesa21) => void) => {
    const copia = structuredClone(m);
    f(copia);
    setM(copia);
  };
  const jogando = m.fase === 'jogando';
  return (
    <div className="painel-fundo">
      <div className="painel vinteum" role="dialog" aria-label="Clube do 21" data-testid="painel-vinteum">
        <h2>Clube do 21</h2>
        <p className="nota">Você contra a banca (Vega, crupiê robô). Cada rodada custa {APOSTA} fichas de brincadeira, sem valor real.</p>
        <div className="mao">
          <h3>Banca · {jogando ? 'carta fechada' : m.banca.length ? pontos(m.banca) : '—'}</h3>
          <div className="cartas">{m.banca.map((c, i) => <CartaUi key={i} c={c} fechada={jogando && i === 1} />)}</div>
        </div>
        <div className="mao">
          <h3>Você · {m.voce.length ? pontos(m.voce) : '—'}</h3>
          <div className="cartas" data-testid="cartas-voce">{m.voce.map((c, i) => <CartaUi key={i} c={c} />)}</div>
        </div>
        <p aria-live="polite" data-testid="msg-21">{m.msg}</p>
        <p className="fichas" data-testid="fichas">Fichas: {m.fichas}</p>
        <div className="jogo-botoes">
          <button type="button" className="botao-ouro" data-testid="21-rodada" disabled={jogando || m.fichas < APOSTA} onClick={() => agir((x) => distribuir(x))}>
            Nova rodada
          </button>
          <button type="button" className="botao-simples" data-testid="21-pedir" disabled={!jogando} onClick={() => agir(pedir)}>
            Pedir carta
          </button>
          <button type="button" className="botao-simples" data-testid="21-parar" disabled={!jogando} onClick={() => agir(parar)}>
            Parar
          </button>
          {!jogando && m.fichas < APOSTA && (
            <button type="button" className="botao-simples" onClick={() => agir(recarregar)}>
              Mais fichas
            </button>
          )}
          <Sair />
        </div>
      </div>
    </div>
  );
}

export function PainelJogos() {
  const ativo = useJogos((s) => s.ativo);
  if (ativo === 'sinuca') return <PainelSinuca />;
  if (ativo === 'dardos') return <PainelDardos />;
  if (ativo === 'vinteum') return <PainelVinteUm />;
  return null;
}
