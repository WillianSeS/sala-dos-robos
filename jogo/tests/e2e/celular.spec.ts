/* 9. Controles de celular (Pixel 7, tela de toque): joystick, olhar arrastando, pinça, correr, câmera e interação. */
import { expect, test, type CDPSession, type Locator, type Page } from '@playwright/test';
import { abrir, estado, passos, perto, posicionar, vigiarConsole } from './ajuda';

type Ponto = { x: number; y: number; id: number };

async function toque(cdp: CDPSession, tipo: 'touchStart' | 'touchMove' | 'touchEnd', pontos: Ponto[]) {
  await cdp.send('Input.dispatchTouchEvent', { type: tipo, touchPoints: pontos.map((p) => ({ x: p.x, y: p.y, id: p.id })) });
}

async function centro(l: Locator) {
  const b = (await l.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

async function semSobreposicao(page: Page) {
  const ids = ['joystick', 'botao-interagir', 'botao-correr', 'botao-camera-toque', 'botao-camera', 'botao-ajuda', 'botao-config'];
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

test('9. controles de celular: joystick, olhar, pinça, correr, câmera e interação', async ({ page }) => {
  const msgs = vigiarConsole(page);
  await abrir(page, { quadro: true });
  const cdp = await page.context().newCDPSession(page);
  expect((await estado(page)).ui.toque).toBe(true);
  for (const id of ['joystick', 'botao-correr', 'botao-camera-toque', 'botao-interagir']) await expect(page.getByTestId(id)).toBeVisible();
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
  expect(st.locomocao).toBe('correndo');
  expect(st.velocidade).toBeGreaterThan(2.6);
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
