/* Os cinco andares do prédio: nome, atividades e cor de cada ambiente. */
export type NumeroAndar = 40 | 41 | 42 | 43 | 44;
export const ANDARES: NumeroAndar[] = [40, 41, 42, 43, 44];

export interface InfoAndar {
  numero: NumeroAndar;
  nome: string;
  resumo: string;
  atividades: string[];
  cor: string;
  icone: string;
}

export const INFO_ANDAR: Record<NumeroAndar, InfoAndar> = {
  40: { numero: 40, nome: 'Escritório e Recepção', resumo: 'Lounge da recepção, bar e mesa de trabalho.', atividades: ['Recepção', 'Bar', 'Sentar e conversar'], cor: '#f3d79a', icone: '💼' },
  41: { numero: 41, nome: 'Sala de Jogos', resumo: 'Salão de jogos com bar e poltronas de veludo.', atividades: ['Sinuca, 21 e dardos (Fase 4/5)', 'Bar', 'Sofás'], cor: '#4cff8a', icone: '🎱' },
  42: { numero: 42, nome: 'Discoteca', resumo: 'Pista de LED, globo espelhado e cabine de DJ.', atividades: ['Pista de dança', 'Bar', 'Sofás'], cor: '#b34dff', icone: '🪩' },
  43: { numero: 43, nome: 'Smoking Lounge', resumo: 'Lounge âmbar com couro, mesas baixas e bar.', atividades: ['Narguilé virtual (Fase 4)', 'Bar', 'Sofás de couro'], cor: '#ff9d3d', icone: '🥃' },
  44: { numero: 44, nome: 'Las Vegas Night', resumo: 'Clube com palco, cortinas vermelhas e mesas.', atividades: ['Show (Fase 4)', 'Mesas', 'Bar'], cor: '#ff4d9a', icone: '🎭' },
};

/** Modelo 3D do andar (o 40º tem versão 2K para o preset Ultra). */
export function modeloAndar(n: NumeroAndar, ultra: boolean) {
  return n === 40 && ultra ? 'modelos/andar40_2k.glb' : `modelos/andar${n}.glb`;
}
