/* Painéis: configurações (qualidade gráfica, câmera, sensibilidade, eixo Y, FPS) e ajuda dos controles. */
import { startTransition } from 'react';
import { useJogo, type Qualidade } from '../estado/jogo';
import { PRESETS } from '../motor/qualidade';

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
    </>
  );
}

function Ajuda() {
  return (
    <>
      <h2>Controles</h2>
      <section className="tabela-controles">
        <h3>Computador</h3>
        <ul>
          <li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> ou setas: andar</li>
          <li><kbd>Shift</kbd> segurado: correr</li>
          <li>Arrastar o mouse: girar a câmera · roda: aproximar/afastar</li>
          <li><kbd>V</kbd>: primeira/terceira pessoa</li>
          <li><kbd>E</kbd>: interagir (porta)</li>
          <li><kbd>Esc</kbd>: menu de configurações</li>
        </ul>
        <h3>Celular e tablet</h3>
        <ul>
          <li>Joystick à esquerda: andar (empurre até a borda para ir mais rápido)</li>
          <li>Arrastar na tela: girar a câmera · pinça: aproximar/afastar</li>
          <li>🏃 liga/desliga a corrida · 👁️ troca a câmera · ✋ interage</li>
        </ul>
      </section>
    </>
  );
}

export function Paineis() {
  const painel = useJogo((s) => s.painel);
  const setPainel = useJogo((s) => s.setPainel);
  if (!painel) return null;
  return (
    <div className="painel-fundo" onClick={() => setPainel(null)}>
      <div className="painel" role="dialog" aria-modal="true" data-testid={`painel-${painel}`} onClick={(e) => e.stopPropagation()}>
        {painel === 'configuracoes' ? <Configuracoes /> : <Ajuda />}
        <button type="button" className="botao-ouro" data-testid="fechar-painel" onClick={() => setPainel(null)}>
          Voltar ao jogo
        </button>
      </div>
    </div>
  );
}
