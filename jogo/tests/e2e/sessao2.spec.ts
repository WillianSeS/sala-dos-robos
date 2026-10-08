/* Evidência em vídeo da Fase 2: entrada no prédio, elevador entre andares, mapa, sentar, vistas e celular.
   Mesmo método da Fase 1 (sessao.spec.ts): o jogo avança 1/30 s por quadro, cada quadro vira imagem e o ffmpeg
   monta vídeos de 30 FPS. Cada trecho é um teste com o seu arquivo em evidencias/partes (retomável). */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { test, type Page } from '@playwright/test';
import { abrir, estado, passos, posicionar, type Estado } from './ajuda';

test.setTimeout(4 * 3600_000);

const SAIDA = path.resolve('evidencias');
const PARTES = path.join(SAIDA, 'partes');

interface Passo {
  quadros?: number;
  ate?: (e: Estado) => boolean;
  max?: number;
  acao?: (page: Page) => Promise<void>;
  tecla?: string;
  teclas?: string[];
  camera?: [number, number];
  arrastar?: [number, number];
  joystick?: [number, number];
  legenda?: string;
}
interface Trecho {
  nome: string;
  legenda: string;
  antes: (page: Page) => Promise<void>;
  passos: Passo[];
}

const chegouEm = (n: number) => (e: Estado) => e.ui.elevador.fase === 'aberto' && e.ui.elevador.andar === n && e.ui.andarPronto === n && !e.ui.cortina;

async function legenda(page: Page, texto: string) {
  await page.evaluate((t) => {
    let el = document.getElementById('legenda-video');
    if (!el) {
      el = document.createElement('div');
      el.id = 'legenda-video';
      el.style.cssText =
        'position:fixed;left:50%;bottom:22%;transform:translateX(-50%);z-index:50;padding:8px 18px;border-radius:999px;' +
        'background:rgba(10,11,20,.82);border:1px solid #d8b36a;color:#f3d79a;font:600 15px system-ui;letter-spacing:.03em;white-space:nowrap';
      document.body.appendChild(el);
    }
    el.textContent = t;
  }, texto);
}

async function gravarTrecho(page: Page, t: Trecho, destino: string) {
  const pasta = test.info().outputPath('quadros');
  fs.mkdirSync(pasta, { recursive: true });
  let n = 0;
  const quadro = async () => {
    await passos(page, 1);
    await page.screenshot({ path: path.join(pasta, `q${String(n++).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 86, timeout: 600_000 });
  };
  const cdp = await page.context().newCDPSession(page).catch(() => null);
  await t.antes(page);
  await legenda(page, t.legenda);
  for (const p of t.passos) {
    if (p.legenda) await legenda(page, p.legenda);
    if (p.camera) await page.evaluate(([y, pi]) => window.__jogo.definirCamera(y, pi), p.camera);
    if (p.acao) await p.acao(page);
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
    const max = p.ate ? (p.max ?? 300) : (p.quadros ?? 1);
    for (let i = 1; i <= max; i++) {
      if (p.arrastar) await page.mouse.move(vp.width / 2 + i * p.arrastar[0], vp.height / 2 + i * p.arrastar[1]);
      await quadro();
      if (p.ate) {
        await page.waitForTimeout(30); // timers reais (cortina) e carregamentos
        if (p.ate(await estado(page))) break;
      }
    }
    if (joy && cdp) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    if (p.arrastar) await page.mouse.up();
    for (const k of [...(p.teclas ?? [])].reverse()) await page.keyboard.up(k);
  }
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  const tmp = `${destino}.tmp.mp4`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', path.join(pasta, 'q%05d.jpg'), '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', '-r', '30', tmp]);
  fs.renameSync(tmp, destino);
  test.info().annotations.push({ type: 'trecho', description: `${destino} (${n} quadros)` });
}

function juntar(arquivos: string[], destino: string) {
  const lista = path.join(PARTES, `${path.basename(destino)}.txt`);
  fs.writeFileSync(lista, arquivos.map((a) => `file '${a}'`).join('\n'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', '-movflags', '+faststart', destino]);
}

function grupo(prefixo: string, trechos: Trecho[], final: string) {
  const arquivos = trechos.map((t, i) => path.join(PARTES, `${prefixo}-${String(i + 1).padStart(2, '0')}-${t.nome}.mp4`));
  trechos.forEach((t, i) => {
    test(`${prefixo} ${i + 1}: ${t.legenda}`, async ({ page }) => {
      test.skip(fs.existsSync(arquivos[i]), 'trecho já gravado');
      await gravarTrecho(page, t, arquivos[i]);
    });
  });
  test(`${prefixo}: juntar`, async () => {
    for (const a of arquivos) if (!fs.existsSync(a)) throw new Error(`falta o trecho ${a}`);
    juntar(arquivos, path.join(SAIDA, final));
  });
}

const clicar = (id: string) => async (page: Page) => {
  await page.getByTestId(id).click();
};
const tocar = (id: string) => async (page: Page) => {
  await page.getByTestId(id).tap();
};
const pc = { quadro: true, qualidade: 'equilibrado' } as const;
// do botão de chamada (4.0, 9.2) até o meio da cabine (3.2, 10.9): câmera virada para esse rumo
const RUMO_CABINE = Math.PI - Math.atan2(0.8, 1.7);

const COMPUTADOR: Trecho[] = [
  {
    nome: 'entrada',
    legenda: 'Entrada: fachada, nome do visitante e ENTRAR',
    antes: async (page) => {
      await abrir(page, { ...pc, andar: null });
      await page.getByTestId('progresso-entrada').filter({ hasText: 'Interior pronto' }).waitFor({ timeout: 240_000 });
    },
    passos: [
      { quadros: 60 },
      {
        acao: async (page) => {
          await page.getByTestId('campo-nome').fill('Visitante');
          await page.getByTestId('botao-entrar').click();
        },
        legenda: 'Voo da câmera até a porta (carregamento real já feito)',
        ate: (e) => e.ui.etapa === 'jogo' && !e.ui.cortina,
        max: 260,
      },
      { legenda: 'Cabine: sobe do térreo ao 40º, o visor conta os andares', ate: chegouEm(40), max: 260 },
      { quadros: 15, legenda: 'Portas abrem na recepção do 40º' },
      { camera: [0, 0.25], teclas: ['KeyW'], quadros: 50 },
      { quadros: 15 },
    ],
  },
  {
    nome: 'elevador-42',
    legenda: 'Hall: E chama o elevador',
    antes: async (page) => {
      await abrir(page, pc);
      await posicionar(page, 4.0, 9.2, 0);
    },
    passos: [
      { quadros: 10 },
      { tecla: 'KeyE', ate: (e) => e.ui.elevador.fase === 'aberto', max: 60 },
      { legenda: 'Entrando na cabine (as portas têm colisão)', camera: [RUMO_CABINE, 0.25], teclas: ['KeyW'], quadros: 44 },
      { quadros: 8 },
      { legenda: 'E abre o painel: escolher o 42º', tecla: 'KeyE', quadros: 18 },
      { acao: clicar('painel-andar-42'), quadros: 12 },
      { legenda: 'Viagem ao 42º: tremor da cabine e visor', ate: chegouEm(42), max: 220 },
      { legenda: '42º: Discoteca', camera: [0, 0.25], teclas: ['KeyW', 'ShiftLeft'], quadros: 85 },
      { quadros: 25 },
      { legenda: 'Pista de LED, globo espelhado e fachos coloridos', arrastar: [-6, 0], quadros: 45 },
    ],
  },
  {
    nome: 'mapa-44',
    legenda: 'M abre o mapa do prédio',
    antes: async (page) => {
      await abrir(page, pc);
      await posicionar(page, 1.5, 1.5, 0);
    },
    passos: [
      { quadros: 8 },
      { tecla: 'KeyM', quadros: 25 },
      { acao: clicar('mapa-andar-44'), quadros: 25, legenda: 'Cada andar: miniatura, atividades e botão de ir' },
      { acao: clicar('ir-44'), legenda: 'Atalho: a cortina leva à cabine e o elevador sobe', ate: chegouEm(44), max: 260 },
      { legenda: '44º: Las Vegas Night', camera: [0, 0.25], teclas: ['KeyW', 'ShiftLeft'], quadros: 85 },
      { quadros: 20 },
      { arrastar: [5, 0], quadros: 45 },
    ],
  },
  {
    nome: 'sentar',
    legenda: 'C senta no sofá (anda até ele e vira de costas)',
    antes: async (page) => {
      await abrir(page, pc);
      await posicionar(page, -2.7, 0.4, -Math.PI / 2);
    },
    passos: [
      { quadros: 10 },
      { tecla: 'KeyC', ate: (e) => e.fase === 'sentado', max: 160 },
      { legenda: 'Sentado (animação de captura de movimento)', arrastar: [4, -0.6], quadros: 50 },
      { legenda: 'C de novo: levanta', tecla: 'KeyC', ate: (e) => e.fase === 'livre', max: 160 },
      { quadros: 20 },
    ],
  },
  {
    nome: 'vistas',
    legenda: 'B: vista aérea (paredes cortadas)',
    antes: async (page) => {
      await abrir(page, pc);
    },
    passos: [
      { tecla: 'KeyB', quadros: 20 },
      { teclas: ['KeyW'], quadros: 45 },
      { arrastar: [4, 0], quadros: 30 },
      { tecla: 'KeyB', quadros: 12 },
      { acao: clicar('botao-externa'), legenda: 'Vista externa: o andar atual pulsa na fachada', ate: (e) => e.ui.vista === 'externa' && !e.ui.cortina, max: 60 },
      { arrastar: [-5, -0.3], quadros: 70 },
      { acao: clicar('voltar-dentro'), legenda: 'Volta para dentro', ate: (e) => e.ui.vista === 'normal' && !e.ui.cortina, max: 60 },
      { quadros: 15 },
    ],
  },
];

const CELULAR: Trecho[] = [
  {
    nome: 'celular',
    legenda: 'Celular: 🪑 senta e levanta',
    antes: async (page) => {
      await abrir(page, { quadro: true, qualidade: 'economico' });
      await posicionar(page, -3.2, 0.25, -Math.PI / 2);
    },
    passos: [
      { quadros: 8 },
      { acao: tocar('botao-sentar'), ate: (e) => e.fase === 'sentado', max: 160 },
      { quadros: 20 },
      { acao: tocar('botao-sentar'), ate: (e) => e.fase === 'livre', max: 160 },
      {
        legenda: 'Celular: ✋ chama o elevador',
        acao: async (page) => {
          await posicionar(page, 4.0, 9.2, 0);
          await page.getByTestId('botao-interagir').tap();
        },
        ate: (e) => e.ui.elevador.fase === 'aberto',
        max: 60,
      },
      { legenda: 'Joystick até a cabine', joystick: [22, -47], quadros: 46 },
      { legenda: '✋ abre o painel; toque no 41º', acao: tocar('botao-interagir'), quadros: 15 },
      { acao: tocar('painel-andar-41'), ate: chegouEm(41), max: 220 },
      { joystick: [0, 55], quadros: 40 },
    ],
  },
];

test.describe('computador', () => grupo('f2pc', COMPUTADOR, 'fase2-sessao-computador.mp4'));
test.describe('celular', () => {
  test.use({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  grupo('f2cel', CELULAR, 'fase2-sessao-celular.mp4');
});
