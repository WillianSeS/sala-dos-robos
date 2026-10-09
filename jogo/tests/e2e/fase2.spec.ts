/* Fase 2 — estrutura do edifício: entrada cinematográfica, elevador funcional, os cinco andares, mapa, menus,
   sentar/levantar, vistas aérea e externa e teclas configuráveis. O tempo do jogo é controlado pelo teste
   (quadro a quadro), então o resultado não depende da velocidade do SwiftShader. */
import { expect, test, type Page } from '@playwright/test';
import { abrir, avancarAte, estado, naCabine, passos, perto, posicionar, segurar, vigiarConsole } from './ajuda';

test.use({ viewport: { width: 960, height: 540 } });
test.setTimeout(900_000);

async function foto(page: Page, nome: string) {
  await test.info().attach(nome, { body: await page.screenshot({ timeout: 240_000 }), contentType: 'image/png' });
}

/** Elevador parado e aberto no andar n, com o andar já carregado. */
const chegouEm = (n: number) => (e: Awaited<ReturnType<typeof estado>>) =>
  e.ui.elevador.fase === 'aberto' && e.ui.elevador.andar === n && e.ui.andarPronto === n && !e.ui.cortina;

test('1. entrada: nome com moderação, ENTRAR, voo até a porta e subida automática ao 40º andar', async ({ page }) => {
  const msgs = vigiarConsole(page);
  await abrir(page, { quadro: true, andar: null });
  await expect(page.getByTestId('entrada')).toBeVisible();
  await expect(page.getByTestId('progresso-entrada')).toContainText('Interior pronto', { timeout: 180_000 });
  await foto(page, 'entrada');
  // nome recusado (palavrão disfarçado) e nome reservado a personagem
  await page.getByTestId('campo-nome').fill('p0rra');
  await page.getByTestId('botao-entrar').click();
  await expect(page.getByTestId('erro-nome')).toBeVisible();
  await page.getByTestId('campo-nome').fill('Aurora');
  await page.getByTestId('botao-entrar').click();
  await expect(page.getByTestId('erro-nome')).toContainText('personagem');
  // nome válido: a câmera voa até a porta
  await page.getByTestId('campo-nome').fill('  Ana   Júlia ');
  await page.getByTestId('botao-entrar').click();
  await expect(page.getByTestId('boas-vindas')).toContainText('Ana Júlia');
  let e = await estado(page);
  expect(e.ui.etapa).toBe('chegando');
  const camInicio = e.camera.pos;
  await passos(page, 60);
  await foto(page, 'voo');
  e = await avancarAte(page, (s) => s.ui.etapa === 'jogo' && !s.ui.cortina, { max: 400, msg: 'entrar no prédio' });
  expect(Math.hypot(camInicio.x, camInicio.z)).toBeGreaterThan(100); // começou longe, na órbita da fachada
  // dentro da cabine, subindo do térreo
  expect(e.ui.nome).toBe('Ana Júlia');
  expect(e.ui.elevador.destino).toBe(40);
  expect(naCabine(e)).toBe(true);
  const indicadores = new Set<number>();
  e = await avancarAte(
    page,
    (s) => {
      indicadores.add(s.ui.elevador.indicador);
      return chegouEm(40)(s);
    },
    { max: 500, lote: 6, msg: 'chegar ao 40º' },
  );
  expect(indicadores.size).toBeGreaterThan(5); // o visor contou os andares na subida
  expect(e.ui.elevador.indicador).toBe(40);
  await foto(page, 'chegada-40');
  expect(msgs).toEqual([]);
});

test('2. elevador: portas com colisão, botão de chamada, painel e viagem ao 42º (discoteca)', async ({ page }) => {
  const msgs = vigiarConsole(page);
  await abrir(page, { quadro: true });
  // no hall, de frente para o elevador fechado: a porta bloqueia a passagem
  await posicionar(page, 3.2, 8.7, 0);
  let e = await estado(page);
  expect(e.ui.elevador.fase).toBe('fechado');
  await segurar(page, ['KeyW'], 45);
  e = await estado(page);
  expect(e.pos.z).toBeLessThan(9.65);
  // botão de chamada
  await posicionar(page, 4.0, 9.2, 0);
  await avancarAte(page, (s) => s.ui.dica === 'Chamar o elevador', { max: 30, msg: 'dica do botão de chamada' });
  await page.keyboard.press('KeyE');
  await avancarAte(page, (s) => s.ui.elevador.fase === 'aberto', { max: 120, msg: 'portas abertas' });
  // entra andando na cabine
  await posicionar(page, 3.2, 9.0, 0);
  await segurar(page, ['KeyW'], 45);
  e = await estado(page);
  expect(naCabine(e)).toBe(true);
  // painel: E dentro da cabine, escolhe o 42
  await avancarAte(page, (s) => s.ui.dica === 'Painel do elevador', { max: 30, msg: 'dica do painel' });
  await page.keyboard.press('KeyE');
  await passos(page, 3); // a interação é tratada no passo da física
  await expect(page.getByTestId('painel-elevador')).toBeVisible();
  await foto(page, 'painel-elevador');
  await page.getByTestId('painel-andar-42').click();
  await expect(page.getByTestId('painel-elevador')).toHaveCount(0);
  e = await avancarAte(page, (s) => s.ui.elevador.fase === 'viajando', { max: 120, msg: 'partir' });
  expect(e.ui.andar).toBe(42);
  await avancarAte(page, chegouEm(42), { max: 400, msg: 'chegar ao 42º' });
  // sai da cabine para o hall do 42º (vira a câmera para o hall)
  await page.evaluate(() => window.__jogo.definirCamera(0, 0.25));
  await passos(page, 3);
  await segurar(page, ['KeyW'], 60);
  e = await estado(page);
  expect(e.pos.z).toBeLessThan(9.4);
  await foto(page, 'hall-42');
  // dentro da discoteca
  await posicionar(page, 3.0, 1.5, Math.PI);
  await passos(page, 20);
  await foto(page, 'discoteca-42');
  expect(msgs).toEqual([]);
});

test('3. mapa interativo e atalhos: 41º, 43º e 44º pelo elevador', async ({ page }) => {
  const msgs = vigiarConsole(page);
  await abrir(page, { quadro: true });
  const colisores40 = (await page.evaluate(() => window.__jogo.estatisticas())).colisores;
  // M abre o mapa; escolher o 41 mostra o detalhe e o botão de ir
  await page.keyboard.press('KeyM');
  await expect(page.getByTestId('painel-mapa')).toBeVisible();
  await expect(page.getByTestId('ir-40')).toBeDisabled(); // "você está aqui"
  await page.getByTestId('mapa-andar-41').click();
  await expect(page.getByTestId('detalhe-andar')).toContainText('41º andar');
  await expect(page.getByTestId('detalhe-andar')).toContainText('Sala de Jogos');
  await foto(page, 'mapa');
  await page.getByTestId('ir-41').click();
  // a cortina leva o jogador à cabine, que viaja até o 41
  await avancarAte(page, (s) => s.ui.elevador.fase === 'viajando' && s.ui.andar === 41, { max: 200, msg: 'viajar ao 41' });
  let e = await avancarAte(page, chegouEm(41), { max: 400, msg: 'chegar ao 41º' });
  expect(naCabine(e)).toBe(true);
  await passos(page, 4);
  await page.waitForTimeout(400);
  const colisores41 = (await page.evaluate(() => window.__jogo.estatisticas())).colisores;
  expect(colisores41).not.toBe(colisores40); // outro andar montado
  await foto(page, 'chegada-41');
  // aba Ambientes: 43
  await page.getByTestId('botao-mapa').click();
  await page.getByTestId('aba-ambientes').click();
  await page.getByTestId('ir-43').click();
  await avancarAte(page, chegouEm(43), { max: 500, msg: 'chegar ao 43º' });
  await foto(page, 'chegada-43');
  // pelo menu: Ambientes -> 44
  await page.keyboard.press('Escape');
  await page.getByTestId('menu-ambientes').click();
  await page.getByTestId('aba-ambientes').click();
  await page.getByTestId('ir-44').click();
  e = await avancarAte(page, chegouEm(44), { max: 500, msg: 'chegar ao 44º' });
  expect(e.ui.andar).toBe(44);
  await posicionar(page, 3.0, 2.0, Math.PI);
  await passos(page, 20);
  await foto(page, 'las-vegas-night-44');
  expect(msgs).toEqual([]);
});

test('4. sentar e levantar num sofá (tecla C) e na poltrona (tecla E)', async ({ page }) => {
  const msgs = vigiarConsole(page);
  await abrir(page, { quadro: true });
  // sofá de couro do lounge do 40º: assento do meio em (-6.28, 0.6) virado para +x
  await posicionar(page, -5.4, 0.65, -Math.PI / 2);
  let e = await avancarAte(page, (s) => s.ui.podeSentar, { max: 20, msg: 'assento perto' });
  expect(e.ui.dica).toBe('Sentar');
  await page.keyboard.press('KeyC');
  e = await avancarAte(page, (s) => s.fase === 'sentado', { max: 200, msg: 'sentar' });
  expect(e.ui.sentado).toBe(true);
  perto(e.grupo.x, -6.28, 0.12);
  perto(e.grupo.z, 0.6, 0.12);
  await passos(page, 30);
  e = await estado(page);
  expect(e.pesos.sitIdle).toBeGreaterThan(0.9);
  expect(e.ossos.cabeca.y).toBeLessThan(1.35); // cabeça baixou: está sentado
  await page.evaluate(() => window.__jogo.definirCamera(-Math.PI / 2 + Math.PI + 0.6, 0.3));
  await passos(page, 6);
  await foto(page, 'sentado');
  // levantar com C
  await page.keyboard.press('KeyC');
  e = await avancarAte(page, (s) => s.fase === 'livre', { max: 200, msg: 'levantar' });
  expect(e.ui.sentado).toBe(false);
  // de pé à frente do sofá, com o personagem de volta sobre a cápsula (sem salto)
  expect(e.pos.x).toBeGreaterThan(-6.28 + 0.4);
  expect(e.pos.x).toBeLessThan(-6.28 + 0.9);
  perto(e.grupo.x, e.pos.x, 0.05);
  perto(e.grupo.z, e.pos.z, 0.05);
  await passos(page, 10);
  expect((await estado(page)).ossos.cabeca.y).toBeGreaterThan(1.45);
  // anda normalmente depois de levantar (para o sul, saindo do vão entre o sofá e a mesa de café)
  const antes = e.pos;
  await page.evaluate(() => window.__jogo.definirCamera(Math.PI, 0.25));
  await segurar(page, ['KeyW'], 40);
  e = await estado(page);
  expect(Math.hypot(e.pos.x - antes.x, e.pos.z - antes.z)).toBeGreaterThan(0.6);
  // poltrona, pela interação comum (E): aproxima pela frente, voltada para oeste.
  // O ponto atrás do encosto fica dentro do colisor e a física o empurra para fora do alcance.
  await posicionar(page, -4.1, -0.65, Math.PI / 2);
  await avancarAte(page, (s) => s.ui.dica === 'Sentar', { max: 20, msg: 'poltrona perto' });
  await page.keyboard.press('KeyE');
  await avancarAte(page, (s) => s.fase === 'sentado', { max: 200, msg: 'sentar na poltrona' });
  // andar levanta o personagem
  await segurar(page, ['KeyW'], 10);
  await avancarAte(page, (s) => s.fase === 'livre', { max: 200, msg: 'levantar andando' });
  expect(msgs).toEqual([]);
});

test('5. vistas: aérea (B) com corte das paredes e externa com o andar destacado', async ({ page }) => {
  const msgs = vigiarConsole(page);
  // Simula uma conexão lenta somente para a fachada desta página.
  let liberarModelo = () => {};
  let modeloPedido = false;
  const modeloLiberado = new Promise<void>((resolve) => {
    liberarModelo = resolve;
  });
  await page.route('**/modelos/predio.glb', async (rota) => {
    modeloPedido = true;
    await modeloLiberado;
    await rota.continue();
  });
  await abrir(page, { quadro: true });
  await page.keyboard.press('KeyB');
  await passos(page, 12);
  let e = await estado(page);
  expect(e.ui.vista).toBe('aerea');
  expect(e.camera.pos.y - e.pos.y).toBeGreaterThan(6);
  // continua andando na vista aérea
  await segurar(page, ['KeyW'], 20);
  e = await estado(page);
  expect(e.velocidade).toBeGreaterThan(0.5);
  await foto(page, 'vista-aerea');
  await page.keyboard.press('KeyB');
  await passos(page, 6);
  expect((await estado(page)).ui.vista).toBe('normal');
  // externa
  await page.getByTestId('botao-externa').click();
  try {
    await expect.poll(() => modeloPedido).toBe(true);
    await passos(page, 10);
    await page.waitForTimeout(600);
    const pendente = await estado(page);
    expect(pendente.ui.vista).toBe('externa');
    expect(pendente.ui.cortina).toBe(true); // não revela a cena anterior enquanto a fachada carrega
  } finally {
    liberarModelo();
  }
  await avancarAte(page, (s) => s.ui.vista === 'externa' && !s.ui.cortina, { max: 100, msg: 'vista externa' });
  await passos(page, 10);
  e = await estado(page);
  expect(Math.hypot(e.camera.pos.x, e.camera.pos.z)).toBeGreaterThan(80);
  expect(e.camera.pos.y).toBeGreaterThan(120); // à altura do 40º andar na fachada
  await expect(page.getByTestId('barra-externa')).toContainText('40º andar');
  await foto(page, 'vista-externa');
  await page.getByTestId('voltar-dentro').click();
  await avancarAte(page, (s) => s.ui.vista === 'normal' && !s.ui.cortina, { max: 100, msg: 'voltar para dentro' });
  await passos(page, 6);
  e = await estado(page);
  expect(Math.hypot(e.camera.pos.x - e.pos.x, e.camera.pos.z - e.pos.z)).toBeLessThan(4);
  expect(msgs).toEqual([]);
});

test('6. menu (Esc): Elevador leva à cabine com o painel; clique no botão 3D; Início volta à fachada', async ({ page }) => {
  const msgs = vigiarConsole(page);
  await abrir(page, { quadro: true });
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('painel-menu')).toBeVisible();
  await foto(page, 'menu');
  await page.getByTestId('menu-elevador').click();
  await expect(page.getByTestId('painel-elevador')).toBeVisible({ timeout: 30_000 });
  await avancarAte(page, (s) => naCabine(s) && s.ui.elevador.fase === 'aberto', { max: 60, msg: 'na cabine, portas abertas' });
  await page.getByTestId('fechar-painel').click();
  // primeira pessoa olhando para o painel (leste) e clique no botão 3D do 43
  await page.keyboard.press('KeyV');
  await page.evaluate(() => window.__jogo.definirCamera(Math.PI / 2 + Math.PI, 0.32));
  await passos(page, 10);
  const alvo = await page.evaluate(() => window.__jogo.navegar.projetar?.('BOTAO_43'));
  expect(alvo?.frente).toBe(true);
  await foto(page, 'painel-3d');
  await page.mouse.click(alvo!.x, alvo!.y);
  await avancarAte(page, (s) => s.ui.elevador.destino === 43 || s.ui.elevador.andar === 43, { max: 30, msg: 'botão 3D apertado' });
  await avancarAte(page, chegouEm(43), { max: 500, msg: 'chegar ao 43º pelo botão 3D' });
  await page.keyboard.press('KeyV');
  // Início: volta à fachada (tela de entrada)
  await page.keyboard.press('Escape');
  await page.getByTestId('menu-inicio').click();
  await avancarAte(page, (s) => s.ui.etapa === 'entrada' && !s.ui.cortina, { max: 100, msg: 'voltar ao início' });
  await expect(page.getByTestId('entrada')).toBeVisible();
  expect(msgs).toEqual([]);
});

test('7. teclas configuráveis: interagir passa para F e abre a porta', async ({ page }) => {
  const msgs = vigiarConsole(page);
  await abrir(page, { quadro: true });
  await page.keyboard.press('Escape');
  await page.getByTestId('menu-configuracoes').click();
  await page.getByTestId('tecla-interagir').click();
  await expect(page.getByTestId('tecla-interagir')).toContainText('Aperte');
  await page.keyboard.press('KeyF');
  await expect(page.getByTestId('tecla-interagir')).toHaveText('F');
  await foto(page, 'teclas');
  await page.getByTestId('fechar-painel').click();
  expect(await page.evaluate(() => window.__jogo.loja.getState().teclas.interagir)).toBe('KeyF');
  // perto da porta: E não faz mais nada, F abre
  await posicionar(page, 3.3, 3.2, 0);
  await avancarAte(page, (s) => s.ui.dica === 'Abrir a porta', { max: 20, msg: 'perto da porta' });
  await page.keyboard.press('KeyE');
  await passos(page, 10);
  expect((await estado(page)).ui.portaAberta).toBe(false);
  await page.keyboard.press('KeyF');
  await avancarAte(page, (s) => s.ui.portaAberta, { max: 20, msg: 'porta aberta com F' });
  // a escolha fica salva; restaurar o padrão
  await page.keyboard.press('Escape');
  await page.getByTestId('menu-configuracoes').click();
  await page.getByTestId('teclas-padrao').click();
  expect(await page.evaluate(() => window.__jogo.loja.getState().teclas.interagir)).toBe('KeyE');
  expect(msgs).toEqual([]);
});
