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
  40: { numero: 40, nome: 'Escritório e Recepção', resumo: 'Recepção com a Aurora, dez traders, telão e lounge.', atividades: ['Conversar com a Aurora', 'Dez traders (mercado simulado)', 'Telão e lounge'], cor: '#f3d79a', icone: '💼' },
  41: { numero: 41, nome: 'Sala de Jogos', resumo: 'Sinuca, dardos e Clube do 21, com bar e poltronas.', atividades: ['Sinuca contra o robô Orion', 'Dardos com troféus', 'Clube do 21 (fichas de brincadeira)'], cor: '#4cff8a', icone: '🎱' },
  42: { numero: 42, nome: 'Discoteca', resumo: 'Pista de LED, DJ Nexus, pessoas dançando e três danças para você.', atividades: ['Dançar (Balanço, Disco, Festa)', 'DJ e pista de LED', 'Bar'], cor: '#b34dff', icone: '🪩' },
  43: { numero: 43, nome: 'Smoking Lounge', resumo: 'Lounge âmbar com couro, narguilé virtual e bar.', atividades: ['Narguilé virtual (só efeito visual)', 'Sofás de couro', 'Bar'], cor: '#ff9d3d', icone: '🥃' },
  44: { numero: 44, nome: 'Las Vegas Night', resumo: 'Clube com palco, show das artistas a cada 90 s e mesas.', atividades: ['Show no palco', 'Dançar e aplaudir', 'Mesas e bar'], cor: '#ff4d9a', icone: '🎭' },
};

/** Modelo 3D do andar (o 40º tem versão 2K para o preset Ultra). */
export function modeloAndar(n: NumeroAndar, ultra: boolean) {
  return n === 40 && ultra ? 'modelos/andar40_2k.glb' : `modelos/andar${n}.glb`;
}
