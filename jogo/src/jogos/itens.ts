/* Cardápio virtual: bebidas e comidas de mentira (sem pagamento, sem valor real), servidas no bar, na copa e na geladeira. */
export interface Item {
  id: string;
  nome: string;
  emoji: string;
  tipo: 'bebida' | 'comida';
  forma: 'copo' | 'lata' | 'caneca' | 'taca' | 'sanduiche' | 'pizza' | 'fruta';
  cor?: string;
  rotulo?: string;
}

export const ITENS: Item[] = [
  { id: 'agua', nome: 'Água gelada', emoji: '💧', tipo: 'bebida', forma: 'copo', cor: '#b5dce8' },
  { id: 'refri', nome: 'Refrigerante em lata', emoji: '🥤', tipo: 'bebida', forma: 'lata', cor: '#ac2736', rotulo: 'COLA' },
  { id: 'suco', nome: 'Suco de laranja', emoji: '🍊', tipo: 'bebida', forma: 'copo', cor: '#ed9b22' },
  { id: 'cafe', nome: 'Café', emoji: '☕', tipo: 'bebida', forma: 'caneca', cor: '#352015' },
  { id: 'cerveja', nome: 'Cerveja em lata', emoji: '🍺', tipo: 'bebida', forma: 'lata', cor: '#c0983b', rotulo: 'MALTE' },
  { id: 'vinho', nome: 'Taça de vinho', emoji: '🍷', tipo: 'bebida', forma: 'taca', cor: '#641a29' },
  { id: 'sanduiche', nome: 'Sanduíche', emoji: '🥪', tipo: 'comida', forma: 'sanduiche' },
  { id: 'pizza', nome: 'Fatia de pizza', emoji: '🍕', tipo: 'comida', forma: 'pizza' },
  { id: 'maca', nome: 'Maçã', emoji: '🍎', tipo: 'comida', forma: 'fruta' },
];

export const item = (id: string | null | undefined) => ITENS.find((i) => i.id === id) ?? null;

/** Onde cada coisa é servida. */
export const NA_GELADEIRA = ['agua', 'refri', 'suco', 'maca'];
export const NA_COPA = ['cafe'];
export const NO_BAR = ITENS.map((i) => i.id);

/** Atendentes por andar (robôs de serviço, nunca apresentados como visitantes). */
export const ATENDENTES: Record<number, { nome: string; modelo: string }> = {
  41: { nome: 'Caio', modelo: 'Male_Adult_02' },
  42: { nome: 'Sofia', modelo: 'Female_Adult_09' },
  43: { nome: 'Caio', modelo: 'Male_Adult_02' },
  44: { nome: 'Sofia', modelo: 'Female_Adult_09' },
};

/** Tempo (s) para consumir um item. */
export const DURACAO_CONSUMO = 7;
