/* Fase 7 — multiplayer: duas abas (duas pessoas) se veem no mesmo andar, conversam pelo chat com moderação,
   contador online real e lista de pessoas. O Supabase é substituído por um falso local (sem internet no teste). */
import { expect, test, type Page } from '@playwright/test';
import { abrir, passos, posicionar, vigiarConsole } from './ajuda';
import { instalarSupabaseFalso } from './supabase-falso';

test.use({ viewport: { width: 960, height: 540 } });
test.setTimeout(900_000);

type Sala = { status: string; pessoas: Record<string, { nome: string; andar: number; x: number; z: number; m: string }>; chat: { nome: string; texto: string }[] };
const sala = (p: Page) => p.evaluate(() => (window.__jogo as unknown as { sala: { getState: () => Sala } }).sala.getState());
const pessoas = async (p: Page) => Object.values((await sala(p)).pessoas);

async function entrarComo(p: Page, nome: string, andar = 41) {
  await p.addInitScript(instalarSupabaseFalso);
  await abrir(p, { quadro: true, andar });
  await p.evaluate((n) => window.__jogo.loja.getState().setPreferencia('nome', n), nome);
}
async function ate(p: Page, cond: () => Promise<boolean>, msg: string) {
  for (let i = 0; i < 80; i++) {
    if (await cond()) return;
    await passos(p, 6);
    await p.waitForTimeout(100);
  }
  throw new Error('não aconteceu: ' + msg);
}

test('duas pessoas: presença, avatar no mesmo andar, chat moderado e contador real', async ({ context }) => {
  const a = await context.newPage();
  const b = await context.newPage();
  const msgsA = vigiarConsole(a);
  const msgsB = vigiarConsole(b);
  await entrarComo(a, 'Ana');
  await posicionar(a, 0.3, 1.5, Math.PI);
  await entrarComo(b, 'Beto');
  await posicionar(b, 2.0, 2.5, -Math.PI / 2);
  // cada uma vê a outra, no 41º, com o nome escolhido e a posição certa
  await ate(a, async () => (await pessoas(a)).some((p) => p.nome === 'Beto' && p.andar === 41 && Math.abs(p.x - 2.0) < 0.3), 'Ana vê Beto');
  await ate(b, async () => (await pessoas(b)).some((p) => p.nome === 'Ana' && p.andar === 41), 'Beto vê Ana');
  await passos(a, 30);
  await expect(a.getByTestId('indicador-online')).toContainText('2 online');
  await posicionar(a, 1.6, 2.5, -Math.PI / 2);
  await passos(a, 40);
  await test.info().attach('ana-ve-beto', { body: await a.screenshot({ timeout: 300_000, path: test.info().outputPath('ana-ve-beto.png') }), contentType: 'image/png' });
  // Beto anda: Ana recebe a nova posição
  await posicionar(b, -2.0, 2.5, -Math.PI / 2);
  await ate(a, async () => (await pessoas(a)).some((p) => p.nome === 'Beto' && Math.abs(p.x + 2.0) < 0.3), 'posição nova de Beto');
  // chat: Ana escreve (com palavrão e link), Beto recebe moderado
  await a.getByTestId('indicador-online').click();
  await expect(a.getByTestId('painel-conversar')).toBeVisible();
  await expect(a.getByTestId('chat-log')).toContainText('mensagem antiga do histórico');
  await a.getByTestId('chat-texto').fill('oi Beto, que porra legal https://exemplo.com');
  await a.getByTestId('chat-enviar').click();
  await expect(a.getByTestId('chat-log')).toContainText('oi Beto');
  await ate(b, async () => (await sala(b)).chat.some((m) => m.nome === 'Ana' && m.texto.includes('oi Beto')), 'Beto recebe');
  const recebida = (await sala(b)).chat.find((m) => m.nome === 'Ana')!.texto;
  expect(recebida).not.toContain('porra');
  expect(recebida).toContain('[link removido]');
  const inserts = await a.evaluate(() => (window as unknown as { __fakeInserts: { body: string }[] }).__fakeInserts);
  expect(inserts.length).toBe(1);
  expect(JSON.stringify(inserts[0])).not.toContain('porra');
  // limite anti-spam
  // limite anti-spam: no máximo 5 mensagens em 15 s
  for (let i = 0; i < 6 && !(await a.getByText('Calma: espere').count()); i++) {
    await a.getByTestId('chat-texto').fill('de novo ' + i);
    await a.getByTestId('chat-enviar').click();
  }
  await expect(a.getByText('Calma: espere')).toBeVisible();
  // lista de pessoas e silenciar
  await b.keyboard.press('Escape');
  await b.getByTestId('menu-amigos').click();
  await expect(b.getByTestId('lista-pessoas')).toContainText('Ana');
  await expect(b.getByTestId('lista-pessoas')).toContainText('41º');
  await b.getByRole('button', { name: 'Silenciar' }).click();
  expect((await sala(b)).chat.some((m) => m.nome === 'Ana')).toBe(false);
  // Beto sai: Ana deixa de vê-lo e o contador volta a 1
  await b.close();
  await ate(a, async () => (await pessoas(a)).length === 0, 'Beto saiu');
  expect(msgsA).toEqual([]);
  expect(msgsB).toEqual([]);
});

test('sem servidor (modo de teste sem Supabase): nada de contador falso nem erro no console', async ({ page }) => {
  const msgs = vigiarConsole(page);
  await abrir(page, { quadro: true });
  await passos(page, 20);
  await expect(page.getByTestId('indicador-online')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.getByTestId('menu-conversar').click();
  await expect(page.getByTestId('status-sala')).toContainText('desligada');
  await page.getByTestId('chat-texto').fill('teste local');
  await page.getByTestId('chat-enviar').click();
  await expect(page.getByTestId('chat-log')).toContainText('teste local');
  await expect(page.getByText('fora da sala ao vivo')).toBeVisible();
  expect(msgs).toEqual([]);
});
