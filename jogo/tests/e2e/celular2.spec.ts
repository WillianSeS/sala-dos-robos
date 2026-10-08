/* Fase 2 no celular (Pixel 7, toque): botão de sentar, ✋ no elevador (chamar e painel), viagem pelo painel,
   mapa pelo botão do topo e interface sem sobreposição em retrato e paisagem. */
import { expect, test } from '@playwright/test';
import { abrir, avancarAte, estado, naCabine, passos, posicionar, semSobreposicao, vigiarConsole } from './ajuda';

test.setTimeout(900_000);

test('celular: sentar pelo 🪑, elevador pelo ✋ e pelo painel de toque, mapa e orientação da tela', async ({ page }) => {
  const msgs = vigiarConsole(page);
  await abrir(page, { quadro: true });
  expect((await estado(page)).ui.toque).toBe(true);
  await semSobreposicao(page);
  await test.info().attach('retrato', { body: await page.screenshot({ timeout: 240_000 }), contentType: 'image/png' });

  // 🪑: só acende perto de um assento; senta e levanta
  await expect(page.getByTestId('botao-sentar')).toBeDisabled();
  await posicionar(page, -3.4, 0.05, -Math.PI / 2);
  await avancarAte(page, (s) => s.ui.podeSentar, { max: 20, msg: 'assento perto' });
  await expect(page.getByTestId('botao-sentar')).toBeEnabled();
  await page.getByTestId('botao-sentar').tap();
  await avancarAte(page, (s) => s.fase === 'sentado', { max: 200, msg: 'sentar pelo toque' });
  await expect(page.getByTestId('botao-sentar')).toContainText('Levantar');
  await test.info().attach('sentado', { body: await page.screenshot({ timeout: 240_000 }), contentType: 'image/png' });
  await page.getByTestId('botao-sentar').tap();
  await avancarAte(page, (s) => s.fase === 'livre', { max: 200, msg: 'levantar pelo toque' });

  // ✋ chama o elevador no hall
  await posicionar(page, 4.0, 9.2, 0);
  await avancarAte(page, (s) => s.ui.dica === 'Chamar o elevador', { max: 20, msg: 'perto do botão de chamada' });
  await expect(page.getByTestId('botao-interagir')).toContainText('Chamar o elevador');
  await page.getByTestId('botao-interagir').tap();
  await avancarAte(page, (s) => s.ui.elevador.fase === 'aberto', { max: 120, msg: 'portas abertas' });
  // dentro da cabine, ✋ abre o painel; toque no 41
  await posicionar(page, 3.2, 10.95, Math.PI);
  await avancarAte(page, (s) => naCabine(s) && s.ui.dica === 'Painel do elevador', { max: 20, msg: 'painel ao alcance' });
  await page.getByTestId('botao-interagir').tap();
  await avancarAte(page, (s) => s.ui.painel === 'elevador', { max: 10, msg: 'painel aberto' });
  await expect(page.getByTestId('painel-elevador')).toBeVisible();
  await semSobreposicaoPainel(page);
  await test.info().attach('painel-celular', { body: await page.screenshot({ timeout: 240_000 }), contentType: 'image/png' });
  await page.getByTestId('painel-andar-41').tap();
  await avancarAte(page, (s) => s.ui.elevador.fase === 'aberto' && s.ui.elevador.andar === 41 && s.ui.andarPronto === 41, { max: 500, msg: 'chegar ao 41º' });

  // mapa pelo botão do topo
  await page.getByTestId('botao-mapa').tap();
  await expect(page.getByTestId('painel-mapa')).toBeVisible();
  await page.getByTestId('mapa-andar-44').tap();
  await expect(page.getByTestId('detalhe-andar')).toContainText('Las Vegas Night');
  await test.info().attach('mapa-celular', { body: await page.screenshot({ timeout: 240_000 }), contentType: 'image/png' });
  await page.getByTestId('fechar-painel').tap();

  // paisagem
  await page.setViewportSize({ width: 915, height: 412 });
  await page.waitForTimeout(600);
  await passos(page, 3); // no modo gravar, o resize limpa o canvas e exige um novo quadro
  await semSobreposicao(page);
  await test.info().attach('paisagem', { body: await page.screenshot({ timeout: 240_000 }), contentType: 'image/png' });
  expect(msgs).toEqual([]);
});

/** O painel do elevador cabe na tela do celular (todos os botões visíveis, dentro da área). */
async function semSobreposicaoPainel(page: import('@playwright/test').Page) {
  const vp = page.viewportSize()!;
  for (const id of ['painel-andar-44', 'painel-andar-40', 'painel-abrir', 'painel-fechar', 'fechar-painel']) {
    const b = await page.getByTestId(id).boundingBox();
    expect(b, id).not.toBeNull();
    expect(b!.y + b!.height, id).toBeLessThanOrEqual(vp.height + 0.5);
    expect(b!.x + b!.width, id).toBeLessThanOrEqual(vp.width + 0.5);
  }
}
