import { expect, type CDPSession, type Locator, type Page } from '@playwright/test';

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
  fase: string;
  grupo: { x: number; y: number; z: number };
  ui: {
    carregado: boolean;
    modoCamera: string;
    qualidade: string;
    dica: string | null;
    portaAberta: boolean;
    painel: string | null;
    toque: boolean;
    correndoToque: boolean;
    etapa: string;
    vista: string;
    andar: number;
    andarPronto: number | null;
    elevador: { fase: string; andar: number; indicador: number; destino: number | null };
    sentado: boolean;
    podeSentar: boolean;
    cortina: boolean;
    nome: string;
    aviso: string | null;
  };
}

declare global {
  interface Window {
    __jogo: {
      estado: () => Estado;
      teleportar: (x: number, z: number, yaw?: number) => void;
      definirCamera: (yaw: number, pitch: number) => void;
      estatisticas: () => Record<string, number>;
      avancar: (quadros: number, dt?: number) => void;
      loja: { getState: () => { versaoCena: number; teclas: Record<string, string>; setPreferencia: (k: string, v: unknown) => void; setPainel: (p: string | null) => void } };
      jogos: { getState: () => { ativo: string | null; hud: Record<string, string | number | boolean> } };
      navegar: {
        irPara?: (n: number) => void;
        chamarElevador?: () => void;
        vistaExterna?: (ligar: boolean) => void;
        apertar?: (botao: string) => void;
        projetar?: (nome: string) => { x: number; y: number; frente: boolean } | null;
      };
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

/** Abre o jogo direto num andar (sem a entrada). 'quadro' = o teste controla o tempo (avança quadro a quadro);
    qualidade econômica deixa o SwiftShader mais rápido. andar: null abre na tela de entrada. */
export async function abrir(page: Page, opcoes: { quadro?: boolean; qualidade?: string; andar?: number | null } = {}) {
  const qualidade = opcoes.qualidade ?? 'economico';
  await page.addInitScript((q) => {
    try {
      localStorage.setItem('sala-dos-robos:preferencias', JSON.stringify({ qualidade: q }));
    } catch {
      /* sem armazenamento */
    }
  }, qualidade);
  const andar = opcoes.andar === undefined ? 40 : opcoes.andar;
  await page.goto(`./?teste${opcoes.quadro ? '&gravar' : ''}${andar ? `&andar=${andar}` : ''}`);
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

/** Avança o jogo (de 'lote' em 'lote' quadros) até a condição valer; também dá tempo real para timers e carregamentos. */
export async function avancarAte(page: Page, cond: (e: Estado) => boolean, opcoes: { max?: number; lote?: number; msg?: string } = {}) {
  const max = opcoes.max ?? 600;
  const lote = opcoes.lote ?? 5;
  for (let q = 0; q < max; q += lote) {
    const e = await estado(page);
    if (cond(e)) return e;
    await passos(page, lote);
    await page.waitForTimeout(20);
  }
  const e = await estado(page);
  expect(cond(e), `${opcoes.msg ?? 'condição'} não aconteceu em ${max} quadros: ${JSON.stringify(e.ui)}`).toBe(true);
  return e;
}

/** Dentro da cabine do elevador (mesmos limites de comandos.ts). */
export const naCabine = (e: Estado) => e.pos.x > 2.1 && e.pos.x < 4.3 && e.pos.z > 9.98 && e.pos.z < 12.2;

/* Toque na tela (CDP) e checagem de sobreposição dos controles no celular. */
export type Ponto = { x: number; y: number; id: number };

export async function toque(cdp: CDPSession, tipo: 'touchStart' | 'touchMove' | 'touchEnd', pontos: Ponto[]) {
  await cdp.send('Input.dispatchTouchEvent', { type: tipo, touchPoints: pontos.map((p) => ({ x: p.x, y: p.y, id: p.id })) });
}

export async function centro(l: Locator) {
  const b = (await l.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

export async function semSobreposicao(page: Page) {
  const ids = ['joystick', 'botao-interagir', 'botao-sentar', 'botao-correr', 'botao-camera-toque', 'botao-menu', 'botao-mapa', 'botao-aerea', 'botao-externa', 'botao-camera', 'andar-atual'];
  const caixas = [];
  for (const id of ids) {
    const b = await page.getByTestId(id).boundingBox();
    expect(b, id).not.toBeNull();
    caixas.push({ id, ...b! });
  }
  const vp = page.viewportSize()!;
  for (const c of caixas) {
    expect(c.x, c.id).toBeGreaterThanOrEqual(0);
    expect(c.y, c.id).toBeGreaterThanOrEqual(0);
    expect(c.x + c.width, c.id).toBeLessThanOrEqual(vp.width + 0.5);
    expect(c.y + c.height, c.id).toBeLessThanOrEqual(vp.height + 0.5);
  }
  for (let i = 0; i < caixas.length; i++)
    for (let j = i + 1; j < caixas.length; j++) {
      const a = caixas[i];
      const b = caixas[j];
      const sobrepoe = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
      expect(sobrepoe, `${a.id} x ${b.id}`).toBe(false);
    }
}

