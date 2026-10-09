/* Moderação básica do chat no navegador (o banco também limita tamanho e guarda só 7 dias). */
const PROIBIDAS = ['porra', 'caralho', 'merda', 'puta', 'fdp', 'viado', 'buceta', 'cuzao', 'arrombado', 'vagabunda', 'desgraçado', 'otario', 'idiota', 'retardado'];

const tira = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Troca palavrões por asteriscos e esconde links, e-mails e números longos (telefone, documento). */
export function moderar(texto: string): string {
  let s = texto.replace(/\s+/g, ' ').trim().slice(0, 200);
  s = s.replace(/\b(https?:\/\/|www\.)\S+/gi, '[link removido]');
  s = s.replace(/\S+@\S+\.\S+/g, '[e-mail removido]');
  s = s.replace(/(\d[\s.-]?){8,}/g, '[número removido]');
  return s
    .split(/(\s+)/)
    .map((p) => (PROIBIDAS.some((w) => tira(p).replace(/[^a-z]/g, '').includes(w)) ? '*'.repeat(Math.max(3, p.length)) : p))
    .join('');
}

/** Nome visível: 1 a 24 caracteres, sem links nem palavrões. */
export function nomeSeguro(n: string): string {
  const s = moderar(n).replace(/\[.*?\]/g, '').slice(0, 24).trim();
  return s || 'Visitante';
}

/** Limite anti-spam: no máximo 5 mensagens a cada 15 s e 1 por segundo. */
export function criarLimite(max = 5, janela = 15_000, minimo = 1000) {
  const envios: number[] = [];
  return (agora: number) => {
    while (envios.length && agora - envios[0] > janela) envios.shift();
    if (envios.length >= max || (envios.length && agora - envios[envios.length - 1] < minimo)) return false;
    envios.push(agora);
    return true;
  };
}
