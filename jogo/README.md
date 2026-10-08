# Sala dos Robôs · Las Vegas Night — jogo 3D

Nova versão do jogo, em **TypeScript + React + Vite + Three.js + React Three Fiber + Drei + Rapier + Zustand**.

Estado atual: **Fase 1, prova de movimentação 3D**. Ela traz:
- uma sala com medidas reais (10 × 8 × 3,2 m);
- uma porta que abre;
- móveis com colisão;
- um personagem de corpo inteiro que anda, corre e fica parado respirando;
- câmeras em 3ª e 1ª pessoa;
- controles de computador e de celular.

O jogo antigo (pasta raiz do repositório) continua funcionando e publicado à parte.

## Como rodar

```bash
cd jogo
npm install          # também copia os decodificadores Draco/KTX2 para public/libs
npm run dev          # http://localhost:5173
npm run build        # verificação de tipos + build de produção em dist/
npm run preview      # serve o build em http://localhost:4173
```

Requer Node 22 ou mais novo.

## Controles

| Ação | Computador | Celular |
|---|---|---|
| Andar | W A S D ou setas | joystick à esquerda |
| Correr | Shift (segurar) | botão 🏃 (liga/desliga) |
| Girar a câmera | arrastar o mouse | arrastar o dedo na tela |
| Zoom (3ª pessoa) | roda do mouse | pinça |
| 1ª / 3ª pessoa | V ou botão 👁️ | botão 👁️ |
| Interagir (porta) | E | botão ✋ |
| Menu de configurações | Esc ou ⚙️ | ⚙️ |

As configurações são salvas no aparelho. Elas incluem:
- qualidade gráfica;
- sensibilidade da câmera;
- inverter o eixo vertical;
- mostrar o FPS.

## Qualidade gráfica

| Preset | Resolução | Sombras | Efeitos | Texturas |
|---|---|---|---|---|
| Econômico | 0,75–1× | não | nenhum | 1K |
| Equilibrado | 1–1,5× | sim (1024) | brilho (bloom) | 1K |
| Ultra | 1–2× | sim (2048) | oclusão de ambiente (N8AO), bloom, SMAA, vinheta | 2K |

Os reflexos vêm de um mapa capturado da própria sala por um CubeCamera. Antes dessa captura, o ambiente usa um HDRI noturno (Poly Haven, CC0).

## Testes

```bash
npm run check                                   # tsc + ESLint + Vitest (lógica de movimento, câmera e animação)
npx playwright test --project=computador        # testes 1–8 e 10 da Fase 1
npx playwright test --project=celular           # teste 9: controles de toque (Pixel 7, retrato e paisagem)
npx playwright test --project=video             # grava as sessões em vídeo (evidencias/*.mp4)
URL_JOGO=https://<prévia>/ npx playwright test  # roda contra uma URL publicada
```

Sem GPU, o Chromium desenha por software (SwiftShader), a poucos quadros por segundo. Por isso os testes de controle e os vídeos usam `?teste&gravar`. Nesse modo o jogo avança 1/30 s por quadro, comandado pelo teste, enquanto teclado, mouse e toque são enviados de verdade. Os testes 1, 2 e 10 rodam em tempo real.

O parâmetro `?teste` expõe `window.__jogo` (estado e telemetria) só para os testes.

## Estrutura

```
src/
  animacao/    máquina de estados da locomoção (parado/andando/correndo)
  ambientes/   sala (GLB do Blender), porta, luzes, cidade noturna
  camera/      matemática da câmera em 3ª/1ª pessoa
  controles/   teclado, mouse, toque e regras de movimento
  estado/      Zustand (preferências, câmera, interface)
  jogador/     corpo cinemático do Rapier + personagem animado + câmera
  motor/       Canvas, carregamento de modelos, qualidade, ambiente/reflexos, pós-processamento
  testes/      telemetria e ganchos para os testes automatizados
  ui/          HUD, controles de celular, carregamento, painéis
tests/e2e/     Playwright
ferramentas/   pipeline de modelos 3D (Blender, Rocketbox, glTF Transform)
public/        modelos GLB, HDRI e decodificadores
```

## Modelos 3D (como regenerar)

**Personagem.** Microsoft Rocketbox Male_Adult_07, licença MIT. Ele usa os clipes de parado, olhar em volta, caminhada e corrida.

```bash
# baixe do Rocketbox só os arquivos usados (ver ferramentas/avatares/LEIAME.md na raiz) e:
RB=<rocketbox> node ferramentas/personagem/converter.mjs Male_Adult_07 Adults m <tmp>
RB=<rocketbox> python3 ferramentas/personagem/texturas.py Male_Adult_07 Adults <tmp> <tmp>/jogador_1k.glb 1024
node ferramentas/otimizar.mjs <tmp>/jogador_1k.glb public/modelos/jogador.glb --geo meshopt --tex ktx2 --max 1024
```

O conversor mede a velocidade natural de cada passada (caminhada 1,01 m/s; corrida 2,88 m/s) e tira o deslocamento da raiz do clipe. Assim o pé não desliza quando o controlador de física move o personagem.

**Sala.** Ela é modelada por script no **Blender 5.2 (bpy)**, com texturas PBR geradas por código.

```bash
pip install bpy==5.2.2 numpy pillow   # Python 3.13
BPY_PYTHON=<python com bpy> ferramentas/gerar_sala.sh
```

No Blender, os objetos especiais seguem estas convenções:

| Prefixo | O que é |
|---|---|
| `COL_*` | colisores |
| `LUZ_*` | pontos de luz |
| `SPAWN_*` | ponto de partida |
| `PORTA_*` | folha da porta, com a origem na dobradiça |
| `TELA_*` | tela emissiva |

## Licenças dos recursos

- Personagem e animações: Microsoft Rocketbox (MIT).
- HDRIs: Poly Haven (CC0), via pacote `@pmndrs/assets`.
- Texturas da sala: geradas pelo próprio projeto (`ferramentas/texturas/gerar.py`).

Veja também [`docs/VIABILIDADE.md`](docs/VIABILIDADE.md), com as ferramentas verificadas, as versões e as substituições.
