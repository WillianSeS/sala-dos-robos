/* Fase 7: chat da sala (com histórico, moderação e silenciar), voz ao vivo, lista de quem está conectado e o
   indicador de pessoas online no HUD (só aparece com conexão real). */
import { useEffect, useRef, useState } from 'react';
import { useJogo } from '../estado/jogo';
import { INFO_ANDAR, type NumeroAndar } from '../mundo/andares';
import { conectar, enviarMensagem, totalOnline, useSala, VERSAO } from '../rede/sala';
import { entrarNaVoz, estadoVoz, sairDaVoz, vozSuportada } from '../rede/voz';

const STATUS = {
  desligado: 'Sala ao vivo desligada neste modo.',
  conectando: 'Conectando à sala ao vivo…',
  online: 'Conectado à sala ao vivo.',
  offline: 'Sem conexão com a sala ao vivo agora.',
} as const;

function BotaoVoz() {
  const [msg, setMsg] = useState('');
  const [ligada, setLigada] = useState(estadoVoz().ligada);
  if (!vozSuportada()) return null;
  return (
    <div className="linha">
      <button
        type="button"
        className={`botao-simples${ligada ? ' ligado' : ''}`}
        data-testid="voz"
        aria-pressed={ligada}
        onClick={async () => {
          if (ligada) {
            sairDaVoz();
            setLigada(false);
            setMsg('Voz desligada.');
          } else {
            setMsg('Ligando o microfone…');
            setMsg(await entrarNaVoz());
            setLigada(estadoVoz().ligada);
          }
        }}
      >
        🎙️ {ligada ? 'Sair da voz' : 'Entrar na voz'}
      </button>
      <small className="nota">{msg}</small>
    </div>
  );
}

export function PainelConversa() {
  const chat = useSala((s) => s.chat);
  const status = useSala((s) => s.status);
  const n = useSala(totalOnline);
  const nome = useJogo((s) => s.nome);
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState('');
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => {
    useSala.getState().setChatAberto(true);
    return () => useSala.getState().setChatAberto(false);
  }, []);
  useEffect(() => {
    log.current?.scrollTo(0, 1e6);
  }, [chat.length]);
  return (
    <>
      <h2>Conversar</h2>
      <p className="nota" data-testid="status-sala">
        {STATUS[status]} {status === 'online' ? `${n} ${n === 1 ? 'pessoa conectada (só você)' : 'pessoas conectadas'}.` : ''}
      </p>
      <label className="linha">
        Seu nome
        <input className="campo-texto" maxLength={24} value={nome} onChange={(e) => useJogo.getState().setPreferencia('nome', e.target.value.slice(0, 24))} aria-label="Seu nome no chat" />
      </label>
      <div className="chat-log" ref={log} data-testid="chat-log" aria-live="polite">
        {chat.length === 0 && <p className="nota">Nenhuma mensagem ainda.</p>}
        {chat.map((m) => (
          <p key={m.id} className={m.minha ? 'minha' : ''}>
            <b>{m.nome}:</b> {m.texto}
            {!m.minha && (
              <button type="button" className="silenciar" title={`Silenciar ${m.nome}`} onClick={() => useSala.getState().silenciar(m.nome, true)}>
                silenciar
              </button>
            )}
          </p>
        ))}
      </div>
      <form
        className="linha"
        onSubmit={(e) => {
          e.preventDefault();
          setErro(enviarMensagem(texto) ?? '');
          setTexto('');
        }}
      >
        <input className="campo-texto" data-testid="chat-texto" maxLength={200} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva uma mensagem" aria-label="Mensagem" />
        <button type="submit" className="botao-simples" data-testid="chat-enviar">
          Enviar
        </button>
      </form>
      {erro && <p className="nota">{erro}</p>}
      <BotaoVoz />
      <p className="nota">
        Privacidade: só o nome que você escolher aparece. Links, e-mails e telefones são escondidos, palavrões viram ***, e o histórico do chat é apagado
        depois de 7 dias. Personagens com “(robô)” no nome são do jogo, não pessoas.
      </p>
    </>
  );
}

export function PainelAmigos() {
  const pessoas = useSala((s) => s.pessoas);
  const silenciados = useSala((s) => s.silenciados);
  const status = useSala((s) => s.status);
  const falando = useSala((s) => s.falando);
  const lista = Object.entries(pessoas);
  return (
    <>
      <h2>Pessoas na sala</h2>
      <p className="nota">{status === 'online' ? `Conectados agora além de você: ${lista.length}.` : STATUS[status]}</p>
      {lista.length === 0 ? (
        <p className="nota" data-testid="amigos-vazio">
          Ninguém mais conectado agora. Mande o link do jogo para seus amigos!
        </p>
      ) : (
        <ul className="lista-pessoas" data-testid="lista-pessoas">
          {lista.map(([id, p]) => (
            <li key={id}>
              <strong>{p.nome}</strong>
              <small>
                {p.v !== VERSAO ? 'no jogo clássico' : p.andar && p.andar > 0 ? `${p.andar}º · ${INFO_ANDAR[p.andar as NumeroAndar]?.nome ?? ''}` : 'no elevador ou na entrada'}
                {p.vc ? ' · 🎙️ voz' : ''}
                {falando[id] ? ' · falando' : ''}
              </small>
              <button type="button" className="botao-simples" onClick={() => useSala.getState().silenciar(p.nome, !silenciados.includes(p.nome))}>
                {silenciados.includes(p.nome) ? 'Reativar' : 'Silenciar'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Liga a sala ao vivo ao entrar no prédio e mostra o contador real de pessoas. */
export function IndicadorOnline() {
  const etapa = useJogo((s) => s.etapa);
  const n = useSala(totalOnline);
  const naoLidas = useSala((s) => s.naoLidas);
  const painel = useJogo((s) => s.painel);
  useEffect(() => {
    if (etapa === 'jogo') void conectar();
  }, [etapa]);
  if (etapa !== 'jogo' || !n || painel) return null;
  return (
    <button type="button" className="indicador-online" data-testid="indicador-online" onClick={() => useJogo.getState().setPainel('conversar')} title="Conversar">
      <span className="ponto-verde" aria-hidden /> {n} online{naoLidas ? ` · 💬 ${naoLidas}` : ''}
    </button>
  );
}
