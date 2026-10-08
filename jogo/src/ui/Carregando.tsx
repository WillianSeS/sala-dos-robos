/* Indicador de carregamento real: progresso dos arquivos (modelos, texturas, HDRI) informado pelo three.js. */
import { useProgress } from '@react-three/drei';
import { useJogo } from '../estado/jogo';

export function Carregando() {
  const { progress, item, loaded, total } = useProgress();
  const carregado = useJogo((s) => s.carregado);
  if (carregado) return null;
  const ultimo = item?.split('/').pop()?.split('?')[0] ?? '';
  const nome = !item?.startsWith('blob:') && /\.\w{2,5}$/.test(ultimo) ? ultimo : '';
  return (
    <div className="carregando" data-testid="carregando" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
      <div className="carregando-caixa">
        <span className="coroa grande" aria-hidden>♛</span>
        <h1>SALA DOS ROBÔS</h1>
        <p className="sub">LAS VEGAS NIGHT</p>
        <p className="detalhe-topo">Preparando a fachada do prédio…</p>
        <div className="barra">
          <div style={{ width: `${progress}%` }} />
        </div>
        <p className="detalhe">
          {Math.round(progress)}% · {loaded}/{total || '…'} arquivos {nome ? `· ${nome}` : ''}
        </p>
      </div>
    </div>
  );
}
