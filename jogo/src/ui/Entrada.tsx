/* Abertura: fachada ao fundo (3D), letreiro, campo do nome do visitante, botão ENTRAR e o progresso real do
   carregamento do interior (andar 40, elevador e personagem). */
import { useProgress } from '@react-three/drei';
import { useState, type FormEvent } from 'react';
import { useJogo } from '../estado/jogo';
import { NOME_MAX, validarNome } from '../estado/nome';
import { entrar } from '../mundo/navegacao';

export function Entrada() {
  const etapa = useJogo((s) => s.etapa);
  const carregado = useJogo((s) => s.carregado);
  const nomeSalvo = useJogo((s) => s.nome);
  const [nome, setNome] = useState(nomeSalvo);
  const [erro, setErro] = useState<string | null>(null);
  const { progress, loaded, total, item } = useProgress();
  if (etapa === 'jogo' || !carregado) return null;

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const r = validarNome(nome);
    if (!r.ok) {
      setErro(r.erro);
      return;
    }
    setErro(null);
    entrar(r.nome);
  };

  const pronto = progress >= 100;
  // texturas de dentro dos GLB chegam como blob: sem nome útil; mostra só arquivos com extensão
  const ultimo = item?.split('/').pop()?.split('?')[0] ?? '';
  const arquivo = !item?.startsWith('blob:') && /\.\w{2,5}$/.test(ultimo) ? ultimo : '';
  if (etapa === 'chegando') {
    return (
      <div className="entrada-boas-vindas" role="status" data-testid="boas-vindas">
        Bem-vindo, <strong>{nomeSalvo}</strong>
      </div>
    );
  }
  return (
    <div className="entrada" data-testid="entrada">
      <form className="entrada-caixa" onSubmit={enviar}>
        <span className="coroa grande" aria-hidden>♛</span>
        <h1>SALA DOS ROBÔS</h1>
        <p className="sub">LAS VEGAS NIGHT</p>
        <p className="entrada-texto">Um arranha-céu com cinco andares de entretenimento. Diga seu nome para entrar.</p>
        <label className="campo">
          <span>Seu nome de visitante</span>
          <input
            type="text"
            value={nome}
            maxLength={NOME_MAX}
            autoComplete="nickname"
            enterKeyHint="go"
            placeholder="Ex.: Ana, Rafa, Jota"
            data-testid="campo-nome"
            aria-invalid={!!erro}
            onChange={(e) => {
              setNome(e.target.value);
              if (erro) setErro(null);
            }}
          />
        </label>
        {erro && (
          <p className="erro" role="alert" data-testid="erro-nome">
            {erro}
          </p>
        )}
        <button type="submit" className="botao-ouro grande" data-testid="botao-entrar">
          ENTRAR
        </button>
        <div className="entrada-progresso" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
          <div className="barra">
            <div style={{ width: `${progress}%` }} />
          </div>
          <small data-testid="progresso-entrada">
            {pronto ? 'Interior pronto · 40º andar carregado' : `Carregando o interior… ${Math.round(progress)}% · ${loaded}/${total || '…'} ${arquivo ? `· ${arquivo}` : ''}`}
          </small>
        </div>
        <p className="privacidade">Seu nome fica só neste aparelho e aparece sobre o seu avatar. Nesta versão nada é enviado a servidores.</p>
      </form>
    </div>
  );
}
