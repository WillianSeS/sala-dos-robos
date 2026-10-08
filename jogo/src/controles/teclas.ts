/* Teclas configuráveis (Configurações → Teclado). As setas sempre andam, além das teclas escolhidas. */
export type Acao = 'frente' | 'tras' | 'esquerda' | 'direita' | 'correr' | 'interagir' | 'sentar' | 'camera' | 'aerea' | 'mapa';

export type MapaTeclas = Record<Acao, string>;

export const TECLAS_PADRAO: MapaTeclas = {
  frente: 'KeyW',
  tras: 'KeyS',
  esquerda: 'KeyA',
  direita: 'KeyD',
  correr: 'ShiftLeft',
  interagir: 'KeyE',
  sentar: 'KeyC',
  camera: 'KeyV',
  aerea: 'KeyB',
  mapa: 'KeyM',
};

export const NOME_ACAO: Record<Acao, string> = {
  frente: 'Andar para a frente',
  tras: 'Andar para trás',
  esquerda: 'Andar para a esquerda',
  direita: 'Andar para a direita',
  correr: 'Correr (segurar)',
  interagir: 'Interagir',
  sentar: 'Sentar / levantar',
  camera: '1ª / 3ª pessoa',
  aerea: 'Vista aérea',
  mapa: 'Mapa',
};

/** Teclas que não podem ser usadas: Esc abre o menu; Tab e F5/F11/F12 são do navegador. */
export const RESERVADAS = new Set(['Escape', 'Tab', 'F5', 'F11', 'F12', 'MetaLeft', 'MetaRight']);

/** Mesmo código físico de Shift/Ctrl/Alt nos dois lados do teclado. */
export function equivalentes(codigo: string): string[] {
  const m = codigo.match(/^(Shift|Control|Alt)(Left|Right)$/);
  return m ? [`${m[1]}Left`, `${m[1]}Right`] : [codigo];
}

/** Troca a tecla de uma ação; se outra ação já usava essa tecla, as duas trocam entre si. */
export function trocarTecla(mapa: MapaTeclas, acao: Acao, codigo: string): MapaTeclas {
  if (RESERVADAS.has(codigo)) return mapa;
  const novo = { ...mapa };
  const dona = (Object.keys(mapa) as Acao[]).find((a) => a !== acao && mapa[a] === codigo);
  if (dona) novo[dona] = mapa[acao];
  novo[acao] = codigo;
  return novo;
}

/** Nome legível da tecla: KeyW → W, ShiftLeft → Shift, ArrowUp → ↑. */
export function rotuloTecla(codigo: string): string {
  if (codigo.startsWith('Key')) return codigo.slice(3);
  if (codigo.startsWith('Digit')) return codigo.slice(5);
  if (codigo.startsWith('Numpad')) return 'Num ' + codigo.slice(6);
  const especiais: Record<string, string> = {
    ShiftLeft: 'Shift', ShiftRight: 'Shift', ControlLeft: 'Ctrl', ControlRight: 'Ctrl', AltLeft: 'Alt', AltRight: 'Alt',
    Space: 'Espaço', Enter: 'Enter', Backspace: '⌫', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    CapsLock: 'Caps', Semicolon: 'Ç', Quote: '~', Comma: ',', Period: '.', Slash: ';', Minus: '-', Equal: '=',
  };
  return especiais[codigo] ?? codigo;
}
