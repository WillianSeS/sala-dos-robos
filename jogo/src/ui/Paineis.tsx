/* Painéis: menu principal, configurações (qualidade, câmera, sensibilidade, eixo Y, FPS e teclado),
   ajuda dos controles, mapa do prédio e painel do elevador. */
import { startTransition, useEffect, useState } from 'react';
import { capturaTecla } from '../controles/entrada';
import { NOME_ACAO, RESERVADAS, rotuloTecla, TECLAS_PADRAO, trocarTecla, type Acao } from '../controles/teclas';
import { useJogo, type Qualidade } from '../estado/jogo';
import { PRESETS } from '../motor/qualidade';
import { chamarElevador, voltarAoInicio } from '../mundo/navegacao';
import { Mapa } from './Mapa';
import { PainelElevador } from './PainelElevador';

function Menu() {
  const setPainel = useJogo((s) => s.setPainel);
  const nome = useJogo((s) => s.nome);
  const itens: { id: string; icone: string; titulo: string; texto: string; acao: () => void }[] = [
    { id: 'inicio', icone: '🏠', titulo: 'Início', texto: 'Volta à fachada e à tela de entrada', acao: voltarAoInicio },
    { id: 'elevador', icone: '🛗', titulo: 'Elevador', texto: 'Leva você à cabine, com o painel aberto', acao: chamarElevador },
    { id: 'ambientes', icone: '🏢', titulo: 'Ambientes', texto: 'Os cinco andares e como chegar', acao: () => setPainel('mapa') },
    { id: 'mapa', icone: '🗺️', titulo: 'Mapa', texto: 'Corte do prédio e onde você está', acao: () => setPainel('mapa') },
    { id: 'configuracoes', icone: '⚙️', titulo: 'Configurações', texto: 'Gráficos, câmera e teclado', acao: () => setPainel('configuracoes') },
    { id: 'ajuda', icone: '❔', titulo: 'Controles', texto: 'Teclado, mouse e toque', acao: () => setPainel('ajuda') },
  ];
  return (
    <>
      <h2>Menu</h2>
      <p className="ola">Olá, {nome || 'visitante'}.</p>
      <div className="menu-grade">
        {itens.map((i) => (
          <button key={i.id} type="button" className="menu-item" data-testid={`menu-${i.id}`} onClick={i.acao}>
            <span className="menu-icone" aria-hidden>{i.icone}</span>
            <strong>{i.titulo}</strong>
            <small>{i.texto}</small>
          </button>
        ))}
      </div>
      <p className="em-breve">Música, Cardápio, Conversar e Amigos chegam nas próximas fases (6 e 7), junto com as interações e o multiplayer.</p>
    </>
  );
}

function Teclado() {
  const teclas = useJogo((s) => s.teclas);
  const setPreferencia = useJogo((s) => s.setPreferencia);
  const [esperando, setEsperando] = useState<Acao | null>(null);
  useEffect(() => () => {
    capturaTecla.ouvinte = null;
  }, []);
  const pedir = (a: Acao) => {
    setEsperando(a);
    capturaTecla.ouvinte = (codigo) => {
      setEsperando(null);
      if (codigo === 'Escape' || RESERVADAS.has(codigo)) return;
      setPreferencia('teclas', trocarTecla(useJogo.getState().teclas, a, codigo));
    };
  };
  return (
    <section>
      <h3>Teclado</h3>
      <div className="lista-teclas">
        {(Object.keys(NOME_ACAO) as Acao[]).map((a) => (
          <div key={a} className="linha-tecla">
            <span>{NOME_ACAO[a]}</span>
            <button type="button" className={esperando === a ? 'esperando' : ''} data-testid={`tecla-${a}`} onClick={() => pedir(a)}>
              {esperando === a ? 'Aperte uma tecla…' : rotuloTecla(teclas[a])}
            </button>
          </div>
        ))}
      </div>
      <p className="nota">As setas sempre andam. Esc fica reservado para o menu.</p>
      <button type="button" className="botao-simples" data-testid="teclas-padrao" onClick={() => setPreferencia('teclas', TECLAS_PADRAO)}>
        Restaurar teclas padrão
      </button>
    </section>
  );
}

function Configuracoes() {
  const s = useJogo();
  return (
    <>
      <h2>Configurações</h2>
      <section>
        <h3>Qualidade gráfica</h3>
        <div className="opcoes" role="radiogroup" aria-label="Qualidade gráfica">
          {(Object.keys(PRESETS) as Qualidade[]).map((q) => (
            <button
              key={q}
              type="button"
              role="radio"
              aria-checked={s.qualidade === q}
              data-testid={`qualidade-${q}`}
              className={s.qualidade === q ? 'escolhido' : ''}
              onClick={() => startTransition(() => s.setPreferencia('qualidade', q))}
            >
              <strong>{PRESETS[q].nome}</strong>
              <small>{PRESETS[q].descricao}</small>
            </button>
          ))}
        </div>
      </section>
      <section>
        <h3>Câmera</h3>
        <div className="opcoes duas">
          <button type="button" className={s.modoCamera === 'terceira' ? 'escolhido' : ''} onClick={() => s.setModoCamera('terceira')}>
            <strong>Terceira pessoa</strong>
          </button>
          <button type="button" className={s.modoCamera === 'primeira' ? 'escolhido' : ''} onClick={() => s.setModoCamera('primeira')}>
            <strong>Primeira pessoa</strong>
          </button>
        </div>
        <label className="linha">
          Sensibilidade <output>{s.sensibilidade.toFixed(1)}</output>
          <input
            type="range"
            min={0.3}
            max={2.5}
            step={0.1}
            value={s.sensibilidade}
            data-testid="sensibilidade"
            onChange={(e) => s.setPreferencia('sensibilidade', Number(e.target.value))}
          />
        </label>
        <label className="linha caixa">
          <input type="checkbox" checked={s.inverterY} onChange={(e) => s.setPreferencia('inverterY', e.target.checked)} />
          Inverter o eixo vertical
        </label>
        <label className="linha caixa">
          <input type="checkbox" checked={s.mostrarFps} data-testid="mostrar-fps" onChange={(e) => s.setPreferencia('mostrarFps', e.target.checked)} />
          Mostrar FPS
        </label>
      </section>
      <section>
        <h3>Privacidade</h3>
        <label className="linha caixa">
          <input type="checkbox" checked={s.mostrarNome} data-testid="mostrar-nome" onChange={(e) => s.setPreferencia('mostrarNome', e.target.checked)} />
          Mostrar meu nome sobre o avatar
        </label>
        <p className="nota">Seu nome ({s.nome || 'visitante'}) fica guardado só neste aparelho. Nesta fase nada é enviado a servidores.</p>
      </section>
      {!s.toque && <Teclado />}
    </>
  );
}

function Ajuda() {
  const t = useJogo((s) => s.teclas);
  const k = (a: Acao) => <kbd>{rotuloTecla(t[a])}</kbd>;
  return (
    <>
      <h2>Controles</h2>
      <section className="tabela-controles">
        <h3>Computador</h3>
        <ul>
          <li>
            {k('frente')}
            {k('esquerda')}
            {k('tras')}
            {k('direita')} ou setas: andar · {k('correr')} segurado: correr
          </li>
          <li>Arrastar o mouse: girar a câmera · roda: aproximar/afastar</li>
          <li>{k('interagir')}: interagir (porta, elevador, assentos) · {k('sentar')}: sentar/levantar</li>
          <li>
            {k('camera')}: primeira/terceira pessoa · {k('aerea')}: vista aérea · {k('mapa')}: mapa
          </li>
          <li>
            <kbd>Esc</kbd>: menu · clique nos botões do elevador para apertá-los
          </li>
        </ul>
        <h3>Celular e tablet</h3>
        <ul>
          <li>Joystick à esquerda: andar (empurre até a borda para ir mais rápido)</li>
          <li>Arrastar na tela: girar a câmera · pinça: aproximar/afastar · toque nos botões 3D do elevador</li>
          <li>✋ interage · 🪑 senta/levanta · 🏃 liga/desliga a corrida · 👁️ troca a câmera</li>
        </ul>
      </section>
    </>
  );
}

const TITULO_VOLTAR: Record<string, string> = { elevador: 'Fechar o painel' };

export function Paineis() {
  const painel = useJogo((s) => s.painel);
  const setPainel = useJogo((s) => s.setPainel);
  const etapa = useJogo((s) => s.etapa);
  if (!painel || etapa !== 'jogo') return null;
  const largo = painel === 'mapa';
  return (
    <div className="painel-fundo" onClick={() => setPainel(null)}>
      <div className={`painel${largo ? ' largo' : ''}${painel === 'elevador' ? ' latao' : ''}`} role="dialog" aria-modal="true" data-testid={`painel-${painel}`} onClick={(e) => e.stopPropagation()}>
        {painel === 'menu' && <Menu />}
        {painel === 'configuracoes' && <Configuracoes />}
        {painel === 'ajuda' && <Ajuda />}
        {painel === 'mapa' && <Mapa />}
        {painel === 'elevador' && <PainelElevador />}
        <button type="button" className="botao-ouro" data-testid="fechar-painel" onClick={() => setPainel(null)}>
          {TITULO_VOLTAR[painel] ?? 'Voltar ao jogo'}
        </button>
      </div>
    </div>
  );
}
