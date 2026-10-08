import { test, expect } from '@playwright/test';
import { abrir, passos, posicionar, estado } from './ajuda';

test('Aurora e dez traders reais carregam no 40º andar e respondem à interação', async ({ page }) => {
  test.setTimeout(420_000);
  await abrir(page, { quadro: true, andar: 40 });
  await page.waitForFunction(() => {
    const a = (window as unknown as { __equipe40?: { esperado: number; carregados: () => number } }).__equipe40;
    return !!a && a.esperado === 11 && a.carregados() === 11;
  }, undefined, { timeout: 210_000 });
  await posicionar(page, 1.65, 1.75, 0);
  await passos(page, 10);
  const before = await estado(page);
  expect(before.ui.dica).toContain('Aurora');
  await page.keyboard.press('KeyE');
  await passos(page, 2);
  const after = await estado(page);
  expect(after.ui.aviso).toContain('Aurora');
  expect(after.ui.aviso).toContain('elevador');
  await posicionar(page, -3.5, -2.3, 0);
  await passos(page, 8);
  expect((await estado(page)).ui.dica).toContain('Arthur');
});
