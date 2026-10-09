/* 9. Controles de celular (Pixel 7, tela de toque): joystick, olhar arrastando, pinça, correr, câmera e interação. */
import { expect, test } from '@playwright/test';
import { abrir, centro, estado, passos, perto, posicionar, semSobreposicao, toque, vigiarConsole } from './ajuda';

test('9. controles de celular: joystick, olhar, pinça, correr, câmera e interação', async ({ page }) => {
  const msgs = vigiarConsole(page);
  await abrir(page, { quadro: true });
  const cdp = await page.context().newCDPSession(page);
  expect((await estado(page)).ui.toque).toBe(true);
  for (const id of ['joystick', 'botao-correr', 'botao-camera-toque', 'botao-interagir', 'botao-sentar']) await expect(page.getByTestId(id)).toBeVisible();
  await semSobreposicao(page);
  await test.info().attach('celular-retrato', { body: await page.screenshot(), contentType: 'image/png' });

  // joystick: empurrar para cima anda para a frente da câmera
  await posicionar(page, 0.6, 2.0, Math.PI);
  const j = await centro(page.getByTestId('joystick'));
  const a = (await estado(page)).pos;
  await toque(cdp, 'touchStart', [{ ...j, id: 1 }]);
  await toque(cdp, 'touchMove', [{ x: j.x, y: j.y - 30, id: 1 }]);
  await toque(cdp, 'touchMove', [{ x: j.x, y: j.y - 60, id: 1 }]);
  await passos(page, 30);
  let st = await estado(page);
  expect(st.locomocao).toBe('andando');
  expect(a.z - st.pos.z).toBeGreaterThan(0.8);
  await toque(cdp, 'touchEnd', []);
  await passos(page, 20);
  expect((await estado(page)).locomocao).toBe('parado');

  // arrastar na tela gira a câmera
  const vp = page.viewportSize()!;
  const c0 = (await estado(page)).camera;
  await toque(cdp, 'touchStart', [{ x: vp.width * 0.6, y: vp.height * 0.35, id: 2 }]);
  for (let i = 1; i <= 5; i++) await toque(cdp, 'touchMove', [{ x: vp.width * 0.6 - i * 20, y: vp.height * 0.35, id: 2 }]);
  await toque(cdp, 'touchEnd', []);
  await passos(page, 2);
  const c1 = (await estado(page)).camera;
  expect(c1.yaw - c0.yaw).toBeGreaterThan(0.3); // dedo para a esquerda: vista gira para a esquerda

  // pinça afastando os dedos: aproxima a câmera
  await toque(cdp, 'touchStart', [{ x: vp.width * 0.5, y: vp.height * 0.3, id: 3 }, { x: vp.width * 0.6, y: vp.height * 0.3, id: 4 }]);
  for (let i = 1; i <= 5; i++)
    await toque(cdp, 'touchMove', [{ x: vp.width * 0.5 - i * 12, y: vp.height * 0.3, id: 3 }, { x: vp.width * 0.6 + i * 12, y: vp.height * 0.3, id: 4 }]);
  await toque(cdp, 'touchEnd', []);
  await passos(page, 2);
  expect((await estado(page)).camera.zoom).toBeLessThan(c1.zoom - 0.5);

  // botão de correr
  await posicionar(page, -1.5, 2.6, Math.PI / 2);
  await page.getByTestId('botao-correr').tap();
  expect((await estado(page)).ui.correndoToque).toBe(true);
  await toque(cdp, 'touchStart', [{ ...j, id: 5 }]);
  await toque(cdp, 'touchMove', [{ x: j.x, y: j.y - 60, id: 5 }]);
  await passos(page, 24);
  st = await estado(page);
  await toque(cdp, 'touchEnd', []);
  await passos(page, 4); // o navegador fecha o gesto do joystick antes do próximo toque
  expect(st.locomocao).toBe('correndo');
  expect(st.velocidade).toBeGreaterThan(2.6);
  await page.getByTestId('botao-correr').tap();
  expect((await estado(page)).ui.correndoToque).toBe(false);
  // segundo dedo no botão de correr enquanto o primeiro segura o joystick (gesto de vários dedos)
  const bc = await centro(page.getByTestId('botao-correr'));
  await toque(cdp, 'touchStart', [{ ...j, id: 7 }]);
  await toque(cdp, 'touchMove', [{ x: j.x, y: j.y - 60, id: 7 }]);
  await toque(cdp, 'touchStart', [{ x: j.x, y: j.y - 60, id: 7 }, { ...bc, id: 8 }]);
  await toque(cdp, 'touchEnd', [{ ...bc, id: 8 }]); // solta só o dedo do botão
  await passos(page, 2);
  expect((await estado(page)).ui.correndoToque).toBe(true);
  await toque(cdp, 'touchEnd', []);
  await passos(page, 4);
  await page.getByTestId('botao-correr').tap();
  expect((await estado(page)).ui.correndoToque).toBe(false);

  // botão de câmera
  await page.getByTestId('botao-camera-toque').tap();
  await passos(page, 2);
  expect((await estado(page)).ui.modoCamera).toBe('primeira');
  await page.getByTestId('botao-camera-toque').tap();
  await passos(page, 2);
  expect((await estado(page)).ui.modoCamera).toBe('terceira');

  // botão de interação: só fica ativo perto da porta e abre a porta
  await expect(page.getByTestId('botao-interagir')).toBeDisabled();
  await posicionar(page, 3.2, 3.2, 0);
  await passos(page, 2);
  await expect(page.getByTestId('botao-interagir')).toBeEnabled();
  await expect(page.getByTestId('botao-interagir')).toContainText('Abrir a porta');
  await page.getByTestId('botao-interagir').tap();
  await passos(page, 45);
  st = await estado(page);
  expect(st.porta.aberta).toBe(true);
  perto(st.porta.angulo, (-95 * Math.PI) / 180, 0.05);

  // paisagem: tudo continua na tela e sem sobreposição
  await page.setViewportSize({ width: 915, height: 412 });
  await page.waitForTimeout(600); // o canvas se redimensiona de forma assíncrona; só então desenha de novo
  await passos(page, 3);
  await semSobreposicao(page);
  await test.info().attach('celular-paisagem', { body: await page.screenshot(), contentType: 'image/png' });
  expect(msgs).toEqual([]);
});
