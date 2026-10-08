import { defineConfig, devices } from '@playwright/test';

/* Os testes rodam no build de produção (vite preview) ou numa URL real (URL_JOGO=https://...).
   Sem GPU no servidor, o Chromium usa o SwiftShader (WebGL por software). */
const URL_JOGO = process.env.URL_JOGO;
const flagsWebGL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 240_000,
  expect: { timeout: 60_000 },
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: URL_JOGO ?? 'http://localhost:4173/',
    launchOptions: { args: flagsWebGL },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'computador', testMatch: /fase1\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
    { name: 'celular', testMatch: /celular\.spec\.ts/, use: { ...devices['Pixel 7'] } },
    { name: 'video', testMatch: /sessao\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
  ],
  webServer: URL_JOGO
    ? undefined
    : { command: 'npm run preview', url: 'http://localhost:4173/', reuseExistingServer: true, timeout: 120_000 },
});
