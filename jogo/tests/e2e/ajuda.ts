import { expect, type Page } from '@playwright/test';

export interface Estado {
  pos: { x: number; y: number; z: number };
  velocidade: number;
  locomocao: string;
  clipe: string;
  pesos: Record<string, number>;
  tempos: Record<string, number>;
  yawCorpo: number;
  camera: { modo: string; yaw: number; pitch: number; zoom: number; dist: number; pos: { x: number; y: number; z: number } };
  porta: { aberta: boolean; angulo: number };
  ossos: Record<'cabeca' | 'peEsq' | 'peDir', { x: number; y: number; z: number }>;
  quadros: number;
  ui: { carregado: boolean; modoCamera: string; qualidade: string; dica: string | null; portaAberta: boolean; painel: string | null; toque: boolean; correndoToque: boolean };
}

declare global {
  interface Window {
    __jogo: {
      estado: () => Estado;
      teleportar: (x: number, z: number, yaw?: number) => void;
      definirCamera: (yaw: number, pitch: number) => void;
      estatisticas: () => Record<string, number>;
      avancar: (quadros: number, dt?: number) => void;
      loja: { getState: () => { versaoCena: number; setPreferencia: (k: string, v: unknown) => void; setPainel: (p: string | null) => void } };
    };
  }
}

/** Registra tudo o que aparece no console e os erros da página. */
export function vigiarConsole(page: Page) {
  const msgs: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') msgs.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => msgs.push(`pageerror: ${e.message}`));
  return msgs;
}

/** Abre o jogo. 'quadro' = o teste controla o tempo (avança quadro a quadro); qualidade econômica deixa o SwiftShader mais rápido. */
export async function abrir(page: Page, opcoes: { quadro?: boolean; qualidade?: string } = {}) {
  const qualidade = opcoes.qualidade ?? 'economico';
  await page.addInitScript((q) => {
    try {
      localStorage.setItem('sala-dos-robos:preferencias', JSON.stringify({ qualidade: q }));
    } catch {
      /* sem armazenamento */
    }
  }, qualidade);
  await page.goto(opcoes.quadro ? './?teste&gravar' : './?teste');
  await page.waitForFunction(() => window.__jogo?.estado().ui.carregado === true, undefined, { timeout: 180_000 });
  if (opcoes.quadro) await passos(page, 4);
}

export const estado = (page: Page) => page.evaluate(() => window.__jogo.estado());
export const passos = (page: Page, n: number) => page.evaluate((k) => window.__jogo.avancar(k, 1 / 30), n);

/** Segura uma tecla por N quadros de jogo (1/30 s cada). */
export async function segurar(page: Page, teclas: string[], quadros: number) {
  for (const t of teclas) await page.keyboard.down(t);
  await passos(page, quadros);
  for (const t of [...teclas].reverse()) await page.keyboard.up(t);
}

export async function posicionar(page: Page, x: number, z: number, yaw: number) {
  await page.evaluate(([a, b, c]) => window.__jogo.teleportar(a, b, c), [x, z, yaw]);
  await passos(page, 3);
  await page.evaluate((c) => window.__jogo.definirCamera(c + Math.PI, 0.22), yaw);
  await passos(page, 3);
}

export function perto(a: number, b: number, tol: number) {
  expect(Math.abs(a - b), `${a} ~ ${b} (±${tol})`).toBeLessThanOrEqual(tol);
}
