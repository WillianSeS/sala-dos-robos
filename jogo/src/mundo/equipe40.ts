/** Personagens da Fase 3: valores e operações são APENAS SIMULADOS, nunca dinheiro real. */
export interface Pessoa40 {
  id: string;
  nome: string;
  modelo: string;
  pos: readonly [number, number];
  yaw: number;
  funcao: 'aurora' | 'trader';
}
export const PESSOAS40: readonly Pessoa40[] = [
  { id: 'aurora', nome: 'Aurora', modelo: 'Business_Female_03', pos: [1.65, 2.9], yaw: 3.2, funcao: 'aurora' },
  { id: 'arthur', nome: 'Arthur Blackwell', modelo: 'Business_Male_01', pos: [-3.5, -2.7], yaw: 0.35, funcao: 'trader' },
  { id: 'helena', nome: 'Helena Prescott', modelo: 'Business_Female_01', pos: [-2.15, -2.65], yaw: 0.55, funcao: 'trader' },
  { id: 'rafael', nome: 'Rafael Monteiro', modelo: 'Business_Male_02', pos: [-0.8, -2.95], yaw: 0.2, funcao: 'trader' },
  { id: 'camila', nome: 'Camila Ferraz', modelo: 'Business_Female_02', pos: [1.9, -3.05], yaw: -0.55, funcao: 'trader' },
  { id: 'theo', nome: 'Theo Ashford', modelo: 'Business_Male_03', pos: [2.55, -1.8], yaw: -1.25, funcao: 'trader' },
  { id: 'leonardo', nome: 'Leonardo Prado', modelo: 'Business_Male_04', pos: [-3.6, 2.55], yaw: 2.6, funcao: 'trader' },
  { id: 'olivia', nome: 'Olivia Hartmann', modelo: 'Business_Female_04', pos: [-2.2, 2.55], yaw: 3.1, funcao: 'trader' },
  { id: 'henry', nome: 'Henry Whitlock', modelo: 'Business_Male_05', pos: [-0.85, 2.65], yaw: 3.15, funcao: 'trader' },
  { id: 'beatriz', nome: 'Beatriz Lacerda', modelo: 'Business_Female_03', pos: [0.25, 2.65], yaw: 3.5, funcao: 'trader' },
  { id: 'marcos', nome: 'Marcos Valença', modelo: 'Business_Male_06', pos: [2.55, 0.8], yaw: -1.45, funcao: 'trader' },
] as const;

export function resultadoSimulado(indice: number, segundos: number): number {
  const onda = Math.sin(segundos * 0.14 + indice * 2.17) * 24.6;
  const tendencia = Math.sin(segundos * 0.041 + indice * 0.73) * 18.2;
  return Math.round((onda + tendencia) * 100) / 100;
}
export function boasVindas40(nome: string): string {
  const apelido = nome.trim().slice(0, 24) || 'visitante';
  return `Boas-vindas, ${apelido}! Sou Aurora. Conheça os traders e use o elevador para explorar os andares.`;
}
