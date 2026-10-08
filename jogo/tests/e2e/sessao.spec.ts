/* Evidência em vídeo: uma sessão jogável com entradas reais (teclado, mouse e toque), gravada quadro a quadro.
   Sem GPU no servidor o Chromium desenha por software (poucos quadros por segundo); por isso o jogo avança
   1/30 s por quadro, cada quadro vira uma imagem e o ffmpeg monta um vídeo de 30 FPS. */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { test, type Page } from '@playwright/test';
import { abrir, passos, posicionar } from './ajuda';

const SAIDA = path.resolve('evidencias');

interface Trecho {
  legenda: string;
  antes?: (page: Page) => Promise<void>;
  partes: { quadros: number; teclas?: string[]; arrastar?: [number, number]; roda?: number; tecla?: string; joystick?: [number, number] }[];
}

async function legenda(page: Page, texto: string) {
  await page.evaluate((t) => {
    let el = document.getElementById('legenda-video');
    if (!el) {
      el = document.createElement('div');
      el.id = 'legenda-video';
      el.style.cssText =
        'position:fixed;left:50%;top:76px;transform:translateX(-50%);z-index:50;padding:8px 18px;border-radius:999px;' +
        'background:rgba(10,11,20,.8);border:1px solid #d8b36a;color:#f3d79a;font:600 15px system-ui;letter-spacing:.04em';
      document.body.appendChild(el);
    }
    el.textContent = t;
  }, texto);
}

async function gravar(page: Page, trechos: Trecho[], nome: string) {
  const pasta = test.info().outputPath('quadros');
  fs.mkdirSync(pasta, { recursive: true });
  let n = 0;
  const quadro = async () => {
    await passos(page, 1);
    await page.screenshot({ path: path.join(pasta, `q${String(n++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 88 });
  };
  const cdp = await page.context().newCDPSession(page).catch(() => null);
  for (const t of trechos) {
    if (t.antes) await t.antes(page);
    await legenda(page, t.legenda);
    for (const p of t.partes) {
      for (const k of p.teclas ?? []) await page.keyboard.down(k);
      if (p.tecla) await page.keyboard.press(p.tecla);
      const vp = page.viewportSize()!;
      if (p.arrastar) {
        await page.mouse.move(vp.width / 2, vp.height / 2);
        await page.mouse.down();
      }
      const joy = p.joystick ? (await page.getByTestId('joystick').boundingBox())! : null;
      if (joy && cdp) {
        const c = { x: joy.x + joy.width / 2, y: joy.y + joy.height / 2 };
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y, id: 9 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: c.x + p.joystick![0], y: c.y + p.joystick![1], id: 9 }] });
      }
      for (let i = 1; i <= p.quadros; i++) {
        if (p.arrastar) await page.mouse.move(vp.width / 2 + i * p.arrastar[0], vp.height / 2 + i * p.arrastar[1]);
        if (p.roda) await page.mouse.wheel(0, p.roda);
        await quadro();
      }
      if (joy && cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      if (p.arrastar) await page.mouse.up();
      for (const k of [...(p.teclas ?? [])].reverse()) await page.keyboard.up(k);
    }
  }
  fs.mkdirSync(SAIDA, { recursive: true });
  const destino = path.join(SAIDA, nome);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', path.join(pasta, 'q%05d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', '-movflags', '+faststart', destino]);
  test.info().annotations.push({ type: 'video', description: `${destino} (${n} quadros, ${(n / 30).toFixed(1)} s)` });
}

test('sessão jogável no computador (vídeo)', async ({ page }) => {
  test.setTimeout(3 * 60 * 60 * 1000);
  await abrir(page, { quadro: true, qualidade: 'equilibrado' });
  await gravar(
    page,
    [
      {
        legenda: 'Parado: animação de respiração · câmera girando com o mouse',
        antes: (p) => posicionar(p, 0.2, 0.6, Math.PI),
        partes: [{ quadros: 50, arrastar: [6, 0] }, { quadros: 25, arrastar: [-9, -1] }],
      },
      {
        legenda: 'Andando para a frente (W)',
        antes: (p) => posicionar(p, -0.5, 2.6, Math.PI),
        partes: [{ quadros: 70, teclas: ['KeyW'] }],
      },
      {
        legenda: 'Para os lados e para trás (D, A, S)',
        partes: [{ quadros: 30, teclas: ['KeyD'] }, { quadros: 30, teclas: ['KeyA'] }, { quadros: 35, teclas: ['KeyS'] }, { quadros: 20 }],
      },
      {
        legenda: 'Correndo (Shift + W)',
        antes: (p) => posicionar(p, -3.4, 2.6, Math.PI / 2),
        partes: [{ quadros: 62, teclas: ['ShiftLeft', 'KeyW'] }, { quadros: 25 }],
      },
      {
        legenda: 'Colisão: o sofá e a janela bloqueiam a passagem',
        antes: (p) => posicionar(p, -4.4, 2.6, Math.PI),
        partes: [{ quadros: 55, teclas: ['KeyW'] }, { quadros: 25, arrastar: [-10, 0] }],
      },
      {
        legenda: 'Colisão: o sofá e a janela bloqueiam a passagem',
        antes: (p) => posicionar(p, -2.8, -2.4, Math.PI),
        partes: [{ quadros: 60, teclas: ['KeyW'] }],
      },
      {
        legenda: 'Porta: fechada bloqueia · E para abrir · corredor',
        antes: (p) => posicionar(p, 3.2, 2.0, 0),
        partes: [{ quadros: 45, teclas: ['KeyW'] }, { quadros: 40, tecla: 'KeyE' }, { quadros: 65, teclas: ['KeyW'] }, { quadros: 40, arrastar: [-19, 0] }],
      },
      {
        legenda: 'Primeira pessoa (V) · olhando a cidade',
        antes: (p) => posicionar(p, 0.2, 1.4, Math.PI),
        partes: [{ quadros: 15, tecla: 'KeyV' }, { quadros: 45, arrastar: [7, -1] }, { quadros: 45, arrastar: [-7, 1] }, { quadros: 45, teclas: ['KeyW'] }],
      },
      {
        legenda: 'Terceira pessoa (V) · zoom com a roda do mouse',
        partes: [{ quadros: 15, tecla: 'KeyV' }, { quadros: 25, roda: 40 }, { quadros: 25, roda: -60 }, { quadros: 20 }],
      },
    ],
    'fase1-sessao-computador.mp4',
  );
});

test.describe('celular', () => {
  test.use({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  test('sessão jogável no celular, paisagem (vídeo)', async ({ page }) => {
    test.setTimeout(2 * 60 * 60 * 1000);
    await abrir(page, { quadro: true, qualidade: 'equilibrado' });
    await gravar(
      page,
      [
        {
          legenda: 'Celular: joystick virtual para andar',
          antes: (p) => posicionar(p, -0.5, 2.6, Math.PI),
          partes: [{ quadros: 60, joystick: [0, -50] }, { quadros: 40, joystick: [45, -20] }, { quadros: 15 }],
        },
        {
          legenda: 'Celular: botão 🏃 liga a corrida',
          antes: async (p) => {
            await posicionar(p, -3.4, 2.6, Math.PI / 2);
            await p.getByTestId('botao-correr').tap();
          },
          partes: [{ quadros: 55, joystick: [0, -55] }, { quadros: 15 }],
        },
        {
          legenda: 'Celular: ✋ interage com a porta',
          antes: async (p) => {
            await p.getByTestId('botao-correr').tap();
            await posicionar(p, 3.2, 3.0, 0);
            await passos(p, 2);
            await p.getByTestId('botao-interagir').tap();
          },
          partes: [{ quadros: 40 }, { quadros: 45, joystick: [0, -50] }],
        },
      ],
      'fase1-sessao-celular.mp4',
    );
  });
});
