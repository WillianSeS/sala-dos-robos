/* Fase 1 — prova de movimentação 3D (computador). Os 10 testes obrigatórios do prompt; o 9 (celular) está em celular.spec.ts. */
import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import { abrir, estado, passos, perto, posicionar, segurar, vigiarConsole } from './ajuda';

test.describe('tempo real', () => {
  test('1. abre a cena no navegador (WebGL, carregamento real e laço rodando)', async ({ page }) => {
    const msgs = vigiarConsole(page);
    await page.goto('./?teste');
    await expect(page.getByTestId('carregando')).toBeVisible();
    await page.waitForFunction(() => window.__jogo?.estado().ui.carregado === true, undefined, { timeout: 180_000 });
    await expect(page.getByTestId('carregando')).toHaveCount(0);
    const webgl = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      return !!c && !!(c.getContext('webgl2') || c.getContext('webgl'));
    });
    expect(webgl).toBe(true);
    const q0 = (await estado(page)).quadros;
    await page.waitForTimeout(3000);
    expect((await estado(page)).quadros).toBeGreaterThan(q0);
    expect(msgs).toEqual([]);
  });

  test('2. a sala é renderizada (geometria, colisores e imagem com conteúdo)', async ({ page }) => {
    await abrir(page, { qualidade: 'equilibrado' });
    await page.waitForTimeout(2500);
    const st = await page.evaluate(() => window.__jogo.estatisticas());
    expect(st.malhas).toBeGreaterThan(30);
    expect(st.triangulos).toBeGreaterThan(20_000);
    expect(st.colisores).toBeGreaterThanOrEqual(29); // 27 da sala + porta + cápsula do jogador
    const png = await page.locator('canvas').screenshot();
    const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
    let soma = 0;
    let soma2 = 0;
    const n = info.width * info.height;
    for (let i = 0; i < data.length; i += info.channels) {
      const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      soma += l;
      soma2 += l * l;
    }
    const media = soma / n;
    const desvio = Math.sqrt(soma2 / n - media * media);
    test.info().annotations.push({ type: 'imagem', description: `luminância média ${media.toFixed(1)}, desvio ${desvio.toFixed(1)}` });
    expect(media).toBeGreaterThan(25); // não é um quadro preto
    expect(desvio).toBeGreaterThan(20); // não é um quadro vazio de uma cor só
    await test.info().attach('sala', { body: png, contentType: 'image/png' });
  });

  test('10. console sem erros nem avisos durante uma sessão (inclusive troca para Ultra)', async ({ page }) => {
    const msgs = vigiarConsole(page);
    await abrir(page, { qualidade: 'equilibrado' });
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(1500);
    await page.keyboard.up('KeyW');
    await page.keyboard.press('KeyV');
    await page.waitForTimeout(800);
    await page.keyboard.press('KeyV');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('painel-menu')).toBeVisible();
    await page.getByTestId('menu-configuracoes').click();
    await expect(page.getByTestId('painel-configuracoes')).toBeVisible();
    const versao = await page.evaluate(() => window.__jogo.loja.getState().versaoCena);
    await page.getByTestId('qualidade-ultra').click();
    await page.waitForFunction((v) => window.__jogo.loja.getState().versaoCena > v, versao, { timeout: 180_000 });
    await page.waitForTimeout(3000);
    await page.getByTestId('qualidade-equilibrado').click();
    await page.getByTestId('fechar-painel').click();
    await page.waitForTimeout(2000);
    expect(msgs).toEqual([]);
  });
});

test.describe('controles (quadro a quadro, entradas reais de teclado e mouse)', () => {
  test.use({ viewport: { width: 960, height: 540 } }); // menos pixels por quadro: o SwiftShader desenha mais rápido
  test.beforeEach(async ({ page }) => {
    await abrir(page, { quadro: true });
  });

  test('3. caminha para frente, para trás e para os lados', async ({ page }) => {
    const casos: [string, number, number][] = [
      ['KeyW', 0, -1],
      ['KeyS', 0, 1],
      ['KeyA', -1, 0],
      ['KeyD', 1, 0],
    ];
    for (const [tecla, dx, dz] of casos) {
      await posicionar(page, 0.6, 2.0, Math.PI); // olhando para a janela (norte); câmera atrás
      const a = (await estado(page)).pos;
      await page.keyboard.down(tecla);
      await passos(page, 15);
      const meio = await estado(page);
      await passos(page, 15);
      await page.keyboard.up(tecla);
      const b = (await estado(page)).pos;
      const mx = b.x - a.x;
      const mz = b.z - a.z;
      expect(meio.locomocao, tecla).toBe('andando');
      expect(meio.pesos.walk, tecla).toBeGreaterThan(0.5);
      perto(meio.velocidade, 1.25, 0.2);
      if (dx) {
        expect(mx * dx, tecla).toBeGreaterThan(0.8);
        expect(Math.abs(mz), tecla).toBeLessThan(0.15);
      } else {
        expect(mz * dz, tecla).toBeGreaterThan(0.8);
        expect(Math.abs(mx), tecla).toBeLessThan(0.15);
      }
    }
  });

  test('4. gira a câmera com o mouse e aproxima com a roda', async ({ page }) => {
    await posicionar(page, 0.6, 0, Math.PI / 2);
    const a = (await estado(page)).camera;
    await page.mouse.move(480, 270);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(480 + i * 20, 270 + i * 8);
    await page.mouse.up();
    await passos(page, 2);
    const b = (await estado(page)).camera;
    perto(b.yaw - a.yaw, -200 * 0.0042, 0.12);
    perto(b.pitch - a.pitch, 80 * 0.0042, 0.08);
    await page.mouse.wheel(0, 120);
    await passos(page, 2);
    const c = (await estado(page)).camera;
    expect(c.zoom).toBeGreaterThan(b.zoom + 0.3);
    // a câmera continua olhando para o personagem
    const st = await estado(page);
    expect(Math.hypot(st.camera.pos.x - st.pos.x, st.camera.pos.z - st.pos.z)).toBeGreaterThan(1);
  });

  test('5. corre com Shift (animação de corrida e velocidade maior)', async ({ page }) => {
    await posicionar(page, -1.5, 2.6, Math.PI / 2); // olhando para o leste
    await page.keyboard.down('ShiftLeft');
    await page.keyboard.down('KeyW');
    await passos(page, 24);
    const st = await estado(page);
    await page.keyboard.up('KeyW');
    await page.keyboard.up('ShiftLeft');
    expect(st.locomocao).toBe('correndo');
    expect(st.velocidade).toBeGreaterThan(2.6);
    expect(st.pesos.run).toBeGreaterThan(0.9);
    expect(st.pos.x).toBeGreaterThan(-1.5 + 1.6);
  });

  test('6. para e volta à animação de descanso (respiração)', async ({ page }) => {
    await posicionar(page, 0.6, 2.0, Math.PI);
    await segurar(page, ['KeyW'], 20);
    await passos(page, 25);
    const a = await estado(page);
    expect(a.locomocao).toBe('parado');
    expect(a.velocidade).toBeLessThan(0.05);
    expect(a.pesos.idle).toBeGreaterThan(0.9);
    await passos(page, 30);
    const b = await estado(page);
    const dur = 2.733;
    const avancou = (((b.tempos.idle - a.tempos.idle) % dur) + dur) % dur;
    perto(avancou, 1.0, 0.15); // o clipe de descanso continua tocando
    const mexeu = Math.hypot(b.ossos.cabeca.x - a.ossos.cabeca.x, b.ossos.cabeca.y - a.ossos.cabeca.y, b.ossos.cabeca.z - a.ossos.cabeca.z);
    expect(mexeu).toBeGreaterThan(0.0005); // corpo vivo, não uma estátua
    perto(b.pos.x, a.pos.x, 0.001);
    perto(b.pos.z, a.pos.z, 0.001);
  });

  test('7. não atravessa paredes nem móveis; a porta fechada bloqueia e abre com E', async ({ page }) => {
    test.setTimeout(900_000);
    // janela (parede norte, face interna em z = -4)
    await posicionar(page, -2.8, -2.5, Math.PI);
    await segurar(page, ['KeyW'], 90);
    let p = (await estado(page)).pos;
    expect(p.z).toBeGreaterThan(-3.75);
    expect(p.z).toBeLessThan(-3.5);
    // parede leste (x = 5)
    await posicionar(page, 2.0, 3.0, Math.PI / 2);
    await segurar(page, ['KeyW'], 90);
    p = (await estado(page)).pos;
    expect(p.x).toBeLessThan(4.75);
    expect(p.x).toBeGreaterThan(4.5);
    // sofá (frente sul do colisor em z = 1,24)
    await posicionar(page, -4.4, 2.6, Math.PI);
    await segurar(page, ['KeyW'], 75);
    p = (await estado(page)).pos;
    expect(p.z).toBeGreaterThan(1.45);
    // porta fechada (folha em z ≈ 4,1)
    await posicionar(page, 3.2, 2.6, 0);
    await segurar(page, ['KeyW'], 75);
    p = (await estado(page)).pos;
    expect(p.z).toBeLessThan(3.85);
    expect((await estado(page)).ui.dica).toBe('Abrir a porta');
    await page.keyboard.press('KeyE');
    await passos(page, 45);
    const porta = (await estado(page)).porta;
    expect(porta.aberta).toBe(true);
    perto(porta.angulo, (-95 * Math.PI) / 180, 0.05);
    await segurar(page, ['KeyW'], 75);
    p = (await estado(page)).pos;
    expect(p.z).toBeGreaterThan(4.6); // passou para o corredor
    await segurar(page, ['KeyW'], 75);
    const hall = await estado(page);
    p = hall.pos;
    // Na Fase 2 o corredor abre no hall: a próxima barreira é o elevador fechado.
    expect(p.z).toBeGreaterThanOrEqual(9.4);
    expect(p.z).toBeLessThan(9.65);
    expect(hall.ui.elevador.fase).toBe('fechado');
  });

  test('8. alterna entre primeira e terceira pessoa (tecla V e botão)', async ({ page }) => {
    await posicionar(page, 0.6, 1.0, Math.PI);
    await page.keyboard.press('KeyV');
    await passos(page, 3);
    let st = await estado(page);
    expect(st.ui.modoCamera).toBe('primeira');
    const olho = Math.hypot(st.camera.pos.x - st.ossos.cabeca.x, st.camera.pos.y - st.ossos.cabeca.y, st.camera.pos.z - st.ossos.cabeca.z);
    expect(olho).toBeLessThan(0.3);
    perto(st.camera.pos.y, 1.68, 0.12);
    // em primeira pessoa o corpo acompanha a câmera
    await page.mouse.move(480, 270);
    await page.mouse.down();
    await page.mouse.move(600, 270, { steps: 6 });
    await page.mouse.up();
    await passos(page, 3);
    st = await estado(page);
    perto(Math.atan2(Math.sin(st.yawCorpo - st.camera.yaw - Math.PI), Math.cos(st.yawCorpo - st.camera.yaw - Math.PI)), 0, 0.02);
    await page.getByTestId('botao-camera').click();
    await passos(page, 3);
    st = await estado(page);
    expect(st.ui.modoCamera).toBe('terceira');
    expect(st.camera.dist).toBeGreaterThan(1);
  });
});
