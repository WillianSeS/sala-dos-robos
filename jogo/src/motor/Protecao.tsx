/* Barreira de erro para partes opcionais da cena (personagens, efeitos): se um arquivo falhar, o resto do andar
   continua funcionando e o erro fica registrado uma vez no console. */
import { Component, type ReactNode } from 'react';

export class Protecao extends Component<{ nome: string; children: ReactNode }, { falhou: boolean }> {
  state = { falhou: false };
  static getDerivedStateFromError() {
    return { falhou: true };
  }
  componentDidCatch(erro: unknown) {
    console.error(`[${this.props.nome}] não carregou:`, erro instanceof Error ? erro.message : erro);
  }
  render() {
    return this.state.falhou ? null : this.props.children;
  }
}
