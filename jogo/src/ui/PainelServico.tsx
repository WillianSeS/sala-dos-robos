/* Cardápio (bar, copa, geladeira), item na mão (consumir ou largar) e painel de música. */
import { useState } from 'react';
import { useJogo } from '../estado/jogo';
import { useJogos } from '../jogos/estado';
import { item as itemDe, ITENS, NA_COPA, NA_GELADEIRA, NO_BAR } from '../jogos/itens';
import { ESTACOES, linkSpotify, radio, type Estacao } from '../jogos/musica';
import { relogioServico } from '../jogos/Servico';

const TITULO = { bar: 'Cardápio do bar', copa: 'Copa do escritório', geladeira: 'Geladeira' } as const;

export function PainelCardapio() {
  const c = useJogos((s) => s.cardapio);
  const naMao = useJogos((s) => s.naMao);
  if (!c) return null;
  const lista = c.onde === 'bar' ? NO_BAR : c.onde === 'copa' ? NA_COPA : NA_GELADEIRA;
  const fechar = () => useJogos.getState().setCardapio(null);
  const escolher = (id: string) => {
    const s = useJogos.getState();
    if (c.onde === 'bar') {
      s.setPedido({ id, prontoEm: relogioServico.t + 3 });
      useJogo.getState().avisar(`${c.atendente ?? 'O atendente'} está preparando: ${itemDe(id)?.nome}.`);
    } else s.setNaMao(id);
    fechar();
  };
  return (
    <div className="painel-fundo" onClick={fechar}>
      <div className="painel cardapio" role="dialog" aria-label={TITULO[c.onde]} data-testid="painel-cardapio" onClick={(e) => e.stopPropagation()}>
        <h2>{TITULO[c.onde]}</h2>
        <p className="nota">
          {c.onde === 'bar' ? `Atendimento: ${c.atendente} (robô). ` : ''}Tudo aqui é virtual e de graça: nada é cobrado e nenhum dado de pagamento é pedido.
          {naMao ? ' O item que está na sua mão será trocado.' : ''}
        </p>
        <div className="itens">
          {ITENS.filter((i) => lista.includes(i.id)).map((i) => (
            <button key={i.id} type="button" className="item-cardapio" data-testid={`item-${i.id}`} onClick={() => escolher(i.id)}>
              <span aria-hidden>{i.emoji}</span>
              <strong>{i.nome}</strong>
              <small>{i.tipo === 'bebida' ? 'Bebida' : 'Comida'}</small>
            </button>
          ))}
        </div>
        <button type="button" className="botao-ouro" onClick={fechar}>
          Fechar
        </button>
      </div>
    </div>
  );
}

export function BarraItem() {
  const id = useJogos((s) => s.naMao);
  const consumindo = useJogos((s) => s.consumindo);
  const consumo = useJogos((s) => s.consumo);
  const minijogo = useJogos((s) => s.ativo);
  const etapa = useJogo((s) => s.etapa);
  const i = itemDe(id);
  if (!i || etapa !== 'jogo' || minijogo) return null;
  return (
    <div className="barra-item" data-testid="barra-item">
      <span aria-hidden>{i.emoji}</span>
      <span>{i.nome}</span>
      <div className="barra-forca mini" aria-label="Quanto já consumiu">
        <div style={{ width: `${Math.round(consumo * 100)}%` }} />
      </div>
      <button type="button" className="botao-simples" data-testid="consumir" disabled={consumindo} onClick={() => useJogos.getState().setConsumo(useJogos.getState().consumo, true)}>
        {i.tipo === 'bebida' ? 'Beber' : 'Comer'}
      </button>
      <button type="button" className="botao-simples" data-testid="largar" onClick={() => useJogos.getState().setNaMao(null)}>
        Largar
      </button>
    </div>
  );
}

export function PainelMusica() {
  const [estacao, setEstacao] = useState<Estacao>(radio.estacao);
  const [tocando, setTocando] = useState(radio.tocando);
  const [volume, setVolume] = useState(radio.volume);
  const [arquivo, setArquivo] = useState<string | null>(null);
  const [spotify, setSpotify] = useState(() => {
    try {
      return localStorage.getItem('sala-dos-robos:spotify') ?? '';
    } catch {
      return '';
    }
  });
  const [msg, setMsg] = useState('A rádio é gerada aqui no navegador (sem músicas de terceiros).');
  const embed = useJogos((s) => s.hud.spotify as string | undefined);
  return (
    <>
      <h2>Música</h2>
      <section>
        <h3>Rádio da sala</h3>
        <div className="opcoes">
          {ESTACOES.map((e) => (
            <button key={e.id} type="button" className={estacao === e.id ? 'escolhido' : ''} data-testid={`estacao-${e.id}`} onClick={() => {
              setEstacao(e.id);
              if (tocando) radio.ligar(e.id);
            }}>
              <strong>{e.nome}</strong>
            </button>
          ))}
        </div>
        <div className="jogo-botoes">
          <button type="button" className="botao-ouro" data-testid="radio-tocar" onClick={() => {
            const ok = radio.ligar(estacao);
            setTocando(ok);
            setMsg(ok ? `Tocando: ${ESTACOES.find((e) => e.id === estacao)?.nome}.` : 'Este navegador não tem Web Audio.');
          }}>
            {tocando ? 'Recomeçar' : 'Reproduzir'}
          </button>
          <button type="button" className="botao-simples" data-testid="radio-parar" onClick={() => {
            radio.desligar();
            setTocando(false);
            setMsg('Rádio desligada.');
          }}>
            Parar
          </button>
        </div>
        <label className="linha">
          Volume
          <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => {
            const v = Number(e.target.value);
            setVolume(v);
            radio.setVolume(v);
          }} />
        </label>
      </section>
      <section>
        <h3>Arquivo do seu aparelho</h3>
        <input type="file" accept="audio/*" aria-label="Escolher arquivo de áudio" onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const a = document.getElementById('audio-local') as HTMLAudioElement | null;
          if (!a) return;
          a.src = URL.createObjectURL(f);
          a.volume = volume;
          void a.play().then(() => setArquivo(f.name)).catch(() => setMsg('Não consegui tocar esse arquivo.'));
          radio.desligar();
          setTocando(false);
        }} />
        {arquivo && <p className="nota">Tocando só para você: {arquivo}</p>}
      </section>
      <section>
        <h3>Spotify (player oficial)</h3>
        <div className="linha">
          <input type="url" className="campo-texto" placeholder="https://open.spotify.com/playlist/…" value={spotify} onChange={(e) => setSpotify(e.target.value)} aria-label="Link do Spotify" />
          <button type="button" className="botao-simples" onClick={() => {
            const u = linkSpotify(spotify);
            if (!u) return setMsg('Cole um link do Spotify, como https://open.spotify.com/playlist/…');
            try {
              localStorage.setItem('sala-dos-robos:spotify', spotify.trim());
            } catch {
              /* sem armazenamento */
            }
            useJogos.getState().atualizar({ spotify: u });
            setMsg('Spotify aberto no canto da tela. Entre na sua conta do Spotify neste navegador para ouvir as músicas inteiras.');
          }}>
            Abrir
          </button>
        </div>
        {embed ? <p className="nota">Player do Spotify aberto no canto da tela.</p> : null}
      </section>
      <p className="nota" aria-live="polite">{msg}</p>
    </>
  );
}

/** Player do Spotify flutuante (continua tocando com o menu fechado). */
export function DocaSpotify() {
  const url = useJogos((s) => s.hud.spotify as string | undefined);
  const [min, setMin] = useState(false);
  if (!url) return null;
  return (
    <div className={`doca-spotify${min ? ' min' : ''}`}>
      <div className="doca-barra">
        <span>Spotify</span>
        <button type="button" onClick={() => setMin(!min)}>{min ? 'Mostrar' : 'Minimizar'}</button>
        <button type="button" onClick={() => useJogos.getState().atualizar({ spotify: '' })}>Fechar</button>
      </div>
      {!min && <iframe title="Player do Spotify" src={url} loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" />}
    </div>
  );
}
