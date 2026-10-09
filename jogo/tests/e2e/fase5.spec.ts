/* Fases 4 e 5 — Sala de Jogos (41º): sinuca contra o robô, dardos com pontuação e troféus, Clube do 21. */
import { expect, test, type Page } from '@playwright/test';
import { abrir, avancarAte, passos, posicionar, vigiarConsole } from './ajuda';

test.use({ viewport: { width: 960, height: 540 } });
test.setTimeout(900_000);

const hud = (page: Page) => page.evaluate(() => window.__jogo.jogos.getState().hud);
async function foto(page: Page, nome: string) {
  await test.info().attach(nome, { body: await page.screenshot({ timeout: 300_000 }), contentType: 'image/png' });
}

test('sinuca: abre pela mesa, tacada move as bolas, regras e vez do robô', async ({ page }) => {
  const msgs = vigiarConsole(page);
  await abrir(page, { quadro: true, andar: 41 });
  await posicionar(page, 0.3, -1.6, Math.PI);
  await avancarAte(page, (s) => s.ui.dica === 'Jogar sinuca contra Orion', { max: 20, msg: 'dica da sinuca' });
  await page.keyboard.press('KeyE');
  await passos(page, 3);
  await expect(page.getByTestId('painel-sinuca')).toBeVisible();
  await passos(page, 40);
  // mira na direção do triângulo (para a direita da tela) e taca com força média
  await page.mouse.move(700, 250);
  await passos(page, 2);
  await page.getByTestId('tacar').dispatchEvent('pointerdown');
  await passos(page, 20);
  await page.getByTestId('tacar').dispatchEvent('pointerup');
  await passos(page, 2);
  expect((await hud(page)).fase).toBe('rolando');
  for (let i = 0; i < 60 && (await hud(page)).fase === 'rolando'; i++) await passos(page, 10);
  const h = await hud(page);
  expect(['mirar', 'roboPensa', 'roboMira', 'rolando', 'fim']).toContain(h.fase);
  expect(String(h.msg).length).toBeGreaterThan(5);
  await foto(page, 'sinuca');
  await page.getByTestId('sair-jogo').click();
  expect(await page.evaluate(() => window.__jogo.jogos.getState().ativo)).toBeNull();
  expect(msgs).toEqual([]);
});

test('dardos: 9 dardos no alvo, pontuação somada e fim de partida', async ({ page }) => {
  const msgs = vigiarConsole(page);
  await abrir(page, { quadro: true, andar: 41 });
  await posicionar(page, -4.2, 1.3, 0);
  await avancarAte(page, (s) => s.ui.dica === 'Jogar dardos', { max: 20, msg: 'dica dos dardos' });
  await page.keyboard.press('KeyE');
  await passos(page, 40);
  await expect(page.getByTestId('painel-dardos')).toBeVisible();
  await page.mouse.move(480, 270);
  for (let i = 0; i < 9; i++) {
    await page.getByTestId('lancar').dispatchEvent('pointerdown');
    await passos(page, 36); // segura ~1,2 s: mão firme
    await page.getByTestId('lancar').dispatchEvent('pointerup');
    await passos(page, 14);
  }
  const h = await hud(page);
  expect(h.lancados).toBe(9);
  expect(Number(h.pontos)).toBeGreaterThan(0);
  expect(String(h.msg)).toContain('Fim');
  await foto(page, 'dardos');
  expect(msgs).toEqual([]);
});

test('Clube do 21: rodada com aposta de fichas de brincadeira, pedir, parar e resultado', async ({ page }) => {
  const msgs = vigiarConsole(page);
  await abrir(page, { quadro: true, andar: 41 });
  await posicionar(page, -2.2, 2.7, Math.PI);
  await avancarAte(page, (s) => s.ui.dica === 'Jogar 21 com a crupiê Vega', { max: 20, msg: 'dica do 21' });
  await page.keyboard.press('KeyE');
  await passos(page, 3);
  await expect(page.getByTestId('painel-vinteum')).toBeVisible();
  await page.getByTestId('21-rodada').click();
  await expect(page.getByTestId('cartas-voce').locator('.carta')).toHaveCount(2);
  if (await page.getByTestId('21-parar').isEnabled()) await page.getByTestId('21-parar').click();
  await expect(page.getByTestId('21-rodada')).toBeEnabled();
  await expect(page.getByTestId('msg-21')).toHaveText(/venceu|Empate|passou|21/i);
  await expect(page.getByTestId('fichas')).toHaveText(/Fichas: (90|100|110|115)/);
  await foto(page, 'vinteum');
  expect(msgs).toEqual([]);
});

test('ambientes: dançar na discoteca (3 danças), narguilé virtual no lounge e aplausos no show', async ({ page }) => {
  const msgs = vigiarConsole(page);
  await abrir(page, { quadro: true, andar: 42 });
  await expect(page.getByTestId('barra-danca')).toBeVisible();
  for (const d of ['balanco', 'disco', 'festa']) {
    await page.getByTestId(`danca-${d}`).click();
    await passos(page, 20);
    expect(await page.evaluate(() => window.__jogo.jogos.getState().danca)).toBe(d);
  }
  await foto(page, 'dancando');
  // andar interrompe a dança
  await page.keyboard.down('KeyW');
  await passos(page, 10);
  await page.keyboard.up('KeyW');
  expect(await page.evaluate(() => window.__jogo.jogos.getState().danca)).toBeNull();
  expect(msgs).toEqual([]);
});

test('narguilé virtual e aplauso no show', async ({ page }) => {
  const msgs = vigiarConsole(page);
  await abrir(page, { quadro: true, andar: 43 });
  await posicionar(page, -3.0, -1.6, -2.4);
  await avancarAte(page, (s) => s.ui.dica === 'Usar o narguilé (virtual)', { max: 20, msg: 'narguilé perto' });
  await page.keyboard.press('KeyE');
  await avancarAte(page, (s) => !!s.ui.aviso && s.ui.aviso.includes('sem tabaco'), { max: 10, msg: 'aviso do narguilé' });
  await abrir(page, { quadro: true, andar: 44 });
  await posicionar(page, 0, -2.5, Math.PI);
  await avancarAte(page, (s) => s.ui.dica === 'Aplaudir o show', { max: 20, msg: 'perto do palco' });
  await page.keyboard.press('KeyE');
  await avancarAte(page, (s) => !!s.ui.aviso && s.ui.aviso.includes('aplaudiu'), { max: 10, msg: 'aplauso' });
  expect(msgs).toEqual([]);
});
