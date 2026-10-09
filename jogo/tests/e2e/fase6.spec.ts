/* Fase 6 — atendimento no bar, cardápio, item na mão (consumir/largar), copa e geladeira do 40º e painel de música. */
import { expect, test, type Page } from '@playwright/test';
import { abrir, avancarAte, passos, posicionar, vigiarConsole } from './ajuda';

test.use({ viewport: { width: 960, height: 540 } });
test.setTimeout(900_000);

const servico = (page: Page) => page.evaluate(() => {
  const s = window.__jogo.jogos.getState() as unknown as { naMao: string | null; consumo: number; consumindo: boolean; pedido: unknown };
  return { naMao: s.naMao, consumo: s.consumo, consumindo: s.consumindo, pedido: s.pedido };
});
async function foto(page: Page, nome: string) {
  await test.info().attach(nome, { body: await page.screenshot({ timeout: 300_000 }), contentType: 'image/png' });
}

test('bar do 41º: pede no cardápio, recebe na mão, bebe até o fim', async ({ page }) => {
  const msgs = vigiarConsole(page);
  await abrir(page, { quadro: true, andar: 41 });
  await posicionar(page, 4.3, -0.5, Math.PI / 2);
  await avancarAte(page, (s) => String(s.ui.dica).startsWith('Pedir no bar'), { max: 30, msg: 'dica do bar' });
  await page.keyboard.press('KeyE');
  await passos(page, 2);
  await expect(page.getByTestId('painel-cardapio')).toBeVisible();
  const primeiro = page.locator('[data-testid^="item-"]').first();
  const id = (await primeiro.getAttribute('data-testid'))!.slice(5);
  await primeiro.click();
  await expect(page.getByTestId('painel-cardapio')).toHaveCount(0);
  expect((await servico(page)).pedido).not.toBeNull();
  await passos(page, 120); // ~4 s de preparo
  let s = await servico(page);
  expect(s.pedido).toBeNull();
  expect(s.naMao).toBe(id);
  await expect(page.getByTestId('barra-item')).toBeVisible();
  await foto(page, 'item-na-mao');
  await page.getByTestId('consumir').click();
  await passos(page, 60);
  s = await servico(page);
  expect(s.consumindo).toBe(true);
  expect(s.consumo).toBeGreaterThan(0.1);
  await passos(page, 240);
  s = await servico(page);
  expect(s.naMao).toBeNull();
  await expect(page.getByTestId('barra-item')).toHaveCount(0);
  expect(msgs).toEqual([]);
});

test('copa do 40º: café e geladeira entregam na hora; largar solta o item', async ({ page }) => {
  const msgs = vigiarConsole(page);
  await abrir(page, { quadro: true, andar: 40 });
  await posicionar(page, 5.6, -2.5, Math.PI / 2);
  await avancarAte(page, (s) => s.ui.dica === 'Tirar um café', { max: 30, msg: 'dica do café' });
  await page.keyboard.press('KeyE');
  await passos(page, 2);
  await page.locator('[data-testid^="item-"]').first().click();
  expect((await servico(page)).naMao).not.toBeNull();
  await page.getByTestId('largar').click();
  expect((await servico(page)).naMao).toBeNull();
  await posicionar(page, 5.6, -4.4, Math.PI / 2);
  await avancarAte(page, (s) => s.ui.dica === 'Abrir a geladeira', { max: 30, msg: 'dica da geladeira' });
  await page.keyboard.press('KeyE');
  await passos(page, 2);
  await expect(page.getByTestId('painel-cardapio')).toBeVisible();
  const n = await page.locator('[data-testid^="item-"]').count();
  expect(n).toBeGreaterThan(1);
  await page.locator('[data-testid^="item-"]').last().click();
  expect((await servico(page)).naMao).not.toBeNull();
  expect(msgs).toEqual([]);
});

test('menu: música (rádio liga e desliga) e cardápio habilitados', async ({ page }) => {
  const msgs = vigiarConsole(page);
  await abrir(page, { quadro: true });
  await page.keyboard.press('Escape');
  await page.getByTestId('menu-musica').click();
  await page.getByTestId('estacao-lounge').click();
  await page.getByTestId('radio-tocar').click();
  await expect(page.getByText('Tocando:')).toBeVisible();
  await page.getByTestId('radio-parar').click();
  await expect(page.getByText('Rádio desligada.')).toBeVisible();
  await page.getByTestId('fechar-painel').click();
  await page.keyboard.press('Escape');
  await page.getByTestId('menu-cardapio').click();
  await expect(page.getByText('Peça no bar')).toBeVisible();
  expect(msgs).toEqual([]);
});
