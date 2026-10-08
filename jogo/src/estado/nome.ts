/* Nome do visitante: limpeza, tamanho e moderação básica (palavrões, ofensas e nomes reservados aos personagens). */
export const NOME_MIN = 2;
export const NOME_MAX = 20;

/** Nomes reservados: personagens do prédio e cargos (ninguém se passa por funcionário ou NPC). */
const RESERVADOS = [
  'aurora', 'caio', 'sofia', 'alpha', 'sigma', 'orion', 'zeus', 'ares', 'icaro', 'nexus', 'titan', 'apollo', 'vega',
  'admin', 'administrador', 'moderador', 'moderacao', 'suporte', 'sistema', 'staff', 'gerente', 'seguranca',
];

/** Raízes ofensivas procuradas dentro do nome (já sem acentos e sem truques como 0 → o). */
const RAIZES = [
  'caralh', 'buceta', 'boceta', 'arromb', 'piroca', 'xoxota', 'porra', 'merda', 'cacete', 'estupr', 'pedofil', 'hitler',
  'nazis', 'retardad', 'imbecil', 'vagabund', 'fuck', 'shit', 'bitch', 'cunt', 'nigg', 'whore', 'pussy', 'rapist',
];
/** Palavras curtas que só contam como palavra inteira (para não barrar nomes como "Cunha" ou "Computador"). */
const PALAVRAS = new Set([
  'cu', 'fdp', 'pqp', 'vsf', 'tnc', 'puta', 'puto', 'putas', 'viado', 'corno', 'foda', 'fodase', 'bosta', 'otario', 'babaca',
  'idiota', 'xota', 'rola', 'pau', 'dick', 'fag', 'slut', 'rape', 'nazi', 'kkk',
]);

function normalizar(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't')
    .replace(/@/g, 'a').replace(/\$/g, 's');
}

export type ResultadoNome = { ok: true; nome: string } | { ok: false; erro: string };

export function validarNome(bruto: string): ResultadoNome {
  const nome = bruto.replace(/\s+/g, ' ').trim();
  if (nome.length < NOME_MIN) return { ok: false, erro: `Digite um nome com pelo menos ${NOME_MIN} letras.` };
  if (nome.length > NOME_MAX) return { ok: false, erro: `Use no máximo ${NOME_MAX} caracteres.` };
  if (!/^[\p{L}\p{N}][\p{L}\p{N} ._'-]*$/u.test(nome)) return { ok: false, erro: 'Use apenas letras, números, espaço, ponto, hífen ou sublinhado.' };
  if (!/\p{L}/u.test(nome)) return { ok: false, erro: 'O nome precisa ter pelo menos uma letra.' };
  const n = normalizar(nome);
  const palavras = n.split(/[\s._'-]+/).filter(Boolean);
  const junto = palavras.join('');
  if (palavras.some((p) => RESERVADOS.includes(p)) || RESERVADOS.includes(junto))
    return { ok: false, erro: 'Esse nome é de um personagem ou da equipe do prédio. Escolha outro.' };
  if (palavras.some((p) => PALAVRAS.has(p)) || RAIZES.some((r) => junto.includes(r)))
    return { ok: false, erro: 'Esse nome não é permitido. Escolha outro.' };
  return { ok: true, nome };
}
