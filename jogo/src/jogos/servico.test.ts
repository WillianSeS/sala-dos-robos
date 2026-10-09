import { describe, expect, it } from 'vitest';
import { item, ITENS, NA_GELADEIRA } from './itens';
import { frequencia, linkSpotify } from './musica';

describe('cardápio e música', () => {
  it('itens da geladeira existem no cardápio', () => {
    for (const id of NA_GELADEIRA) expect(item(id)).not.toBeNull();
    expect(ITENS.length).toBe(9);
  });
  it('lá 440 Hz e oitavas', () => {
    expect(frequencia(69)).toBeCloseTo(440);
    expect(frequencia(81)).toBeCloseTo(880);
  });
  it('links do Spotify viram o player oficial; outros são recusados', () => {
    expect(linkSpotify('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc')).toBe('https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator');
    expect(linkSpotify('spotify:track:4uLU6hMCjMI75M1A2tKUQC')).toContain('/embed/track/');
    expect(linkSpotify('https://exemplo.com/x')).toBe('');
  });
});
