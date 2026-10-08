/* Interações por contexto: cada objeto interativo se candidata a cada quadro; vence o mais próximo dentro do
   alcance. A tecla E (ou o botão ✋) executa a ação do vencedor. */
export interface Candidato {
  id: string;
  rotulo: string;
  x: number;
  z: number;
  alcance: number;
  prioridade?: number;
  acao: () => void;
  tipo?: 'interagir' | 'sentar';
  /** false: mostra o aviso, mas E não faz nada (ex.: "Saia da frente da porta"). */
  ativo?: boolean;
}

const candidatos = new Map<string, Candidato>();

export function candidatar(c: Candidato) {
  candidatos.set(c.id, c);
}
export function retirar(id: string) {
  candidatos.delete(id);
}

export function escolher(px: number, pz: number, tipo?: Candidato['tipo']): Candidato | null {
  let melhor: Candidato | null = null;
  let melhorNota = Infinity;
  for (const c of candidatos.values()) {
    if (tipo && (c.tipo ?? 'interagir') !== tipo) continue;
    const d = Math.hypot(c.x - px, c.z - pz);
    if (d > c.alcance) continue;
    const nota = d - (c.prioridade ?? 0);
    if (nota < melhorNota) {
      melhorNota = nota;
      melhor = c;
    }
  }
  return melhor;
}

export function limparCandidatos() {
  candidatos.clear();
}
