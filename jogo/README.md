# Sala dos Robôs · Las Vegas Night — jogo 3D

Nova versão do jogo, em **TypeScript + React + Vite + Three.js + React Three Fiber + Drei + Rapier + Zustand**.

Estado atual: **Fase 3 em validação: Aurora e dez traders 3D no 40º andar.** Fases 1 e 2 estão validadas.

**Abrir a versão de teste:** https://willianses.github.io/sala-dos-robos/jogo3d/

Esta versão está sendo reconstruída por fases. A Fase 3 inclui dez traders Rocketbox com gestos sutis, etiquetas e resultados fictícios, além da recepcionista Aurora interativa. Os minijogos e o multiplayer da versão nova entram nas fases seguintes; o jogo antigo continua disponível em https://willianses.github.io/sala-dos-robos/.

O que a Fase 2 traz:
- **Entrada cinematográfica.**
  - Fachada 3D da torre de 44 andares, com letreiro, coroa dourada, rua com carros e cidade iluminada.
  - Campo do nome do visitante, com moderação básica, e botão ENTRAR.
  - Progresso real do carregamento do interior.
  - Voo da câmera até a porta e subida automática de elevador do térreo ao 40º andar (recepção).
- **Elevador funcional.**
  - Cabine 3D com portas deslizantes que têm colisão.
  - Botão de chamada no hall.
  - Painel com os cinco andares, que funciona como painel na tela e como botões 3D clicáveis/tocáveis.
  - Visores com número e seta, e tremor na viagem.
  - O andar de destino carrega durante a subida, e as portas só abrem quando ele está pronto.
- **Cinco andares**, cada um com seu modelo:
  - 40 Escritório e Recepção;
  - 41 Sala de Jogos;
  - 42 Discoteca, com pista de LED animada, globo espelhado e fachos coloridos;
  - 43 Smoking Lounge;
  - 44 Las Vegas Night, com palco e luzes.
- **Navegação.**
  - Sentar e levantar em sofás, poltronas, cadeiras e bancos, com animações de captura de movimento.
  - Vista aérea com as paredes cortadas.
  - Vista externa, com o andar atual pulsando na fachada.
  - Atalhos entre ambientes, sempre pelo elevador.
  - Mapa interativo do prédio, com miniaturas renderizadas.
  - Menu: Início, Elevador, Ambientes, Mapa, Configurações e Controles.
- **Controles configuráveis** no teclado, botão 🪑 no celular e crachá com o nome sobre o avatar (pode ser desligado em Privacidade).

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

| Ação | Computador (padrão, configurável) | Celular |
|---|---|---|
| Andar | W A S D ou setas | joystick à esquerda |
| Correr | Shift (segurar) | botão 🏃 (liga/desliga) |
| Girar a câmera | arrastar o mouse | arrastar o dedo na tela |
| Zoom | roda do mouse | pinça |
| 1ª / 3ª pessoa | V ou botão 👁️ | botão 👁️ |
| Interagir (porta, elevador, assentos) | E | botão ✋ |
| Sentar / levantar | C (ou E perto do assento) | botão 🪑 |
| Vista aérea | B ou botão 🛰️ | botão 🛰️ |
| Vista externa | botão 🏙️ | botão 🏙️ |
| Mapa | M ou botão 🗺️ | botão 🗺️ |
| Menu | Esc ou ☰ | ☰ |
| Botões do elevador | E dentro da cabine (painel) ou clique no botão 3D | ✋ (painel) ou toque no botão 3D |

As teclas são trocadas em Configurações → Teclado. Se a tecla escolhida já tem outra ação, as duas trocam de lugar; as setas sempre andam.

As preferências ficam salvas só no aparelho (`localStorage`):
- qualidade gráfica;
- sensibilidade da câmera;
- eixo vertical invertido;
- FPS;
- teclas;
- nome do visitante;
- mostrar o nome sobre o avatar.

## Qualidade gráfica

| Preset | Resolução | Sombras | Efeitos | Texturas | Luzes |
|---|---|---|---|---|---|
| Econômico | 0,75–1× | não | nenhum | 1K | metade dos focos de teto |
| Equilibrado | 1–1,5× | sim (1024) | brilho (bloom) | 1K | todas as da sala |
| Ultra | 1–2× | sim (2048) | oclusão de ambiente (N8AO), bloom, SMAA, vinheta | 2K no 40º | todas, mais as do hall |

A sombra do personagem vem de uma luz direcional que acompanha o jogador. Os reflexos vêm de um mapa capturado do próprio ambiente (CubeCamera): a sala de cada andar, ou a praça na fachada.

## Testes

```bash
npm run check                                   # tsc + ESLint + Vitest
npx playwright test --project=computador        # Fase 1: testes 1–8 e 10
npx playwright test --project=celular           # Fase 1: teste 9 (toque, retrato e paisagem)
npx playwright test --project=fase2             # Fase 2: entrada, elevador, mapa, sentar, vistas, menu, teclas
npx playwright test --project=celular2          # Fase 2 no celular: 🪑, ✋ no elevador, painel, mapa
npx playwright test --project=video             # vídeos da Fase 1 (evidencias/*.mp4)
npx playwright test --project=video2            # vídeos da Fase 2
URL_JOGO=https://<prévia>/ npx playwright test  # roda contra uma URL publicada
```

O Vitest cobre:
- movimento e câmera;
- máquina de animação;
- máquina de estados do elevador (portas, sensor de presença, viagem, espera do carregamento);
- validação do nome;
- curva da raiz dos clipes de sentar.

**Testes sem GPU.** Sem GPU, o Chromium desenha por software (SwiftShader), a poucos quadros por segundo.
- **Modo `?teste&gravar`.** Os testes de controle e os vídeos usam esse modo: o jogo avança 1/30 s por quadro, comandado pelo teste, enquanto teclado, mouse e toque são enviados de verdade.
- **Lotes de quadros.** Num lote de quadros só o último é desenhado: física, animação e câmera rodam em todos. Os vídeos avançam de um em um.

**Parâmetros de URL (só para testes).**
- `?teste` expõe `window.__jogo` (estado e telemetria).
- `?teste&andar=N` começa direto no andar N, sem a entrada.

## Estrutura

```
src/
  animacao/    máquina de estados da locomoção (parado/andando/correndo)
  ambientes/   luzes por andar, porta, cidade noturna
  camera/      matemática da câmera em 3ª/1ª pessoa
  controles/   teclado (teclas configuráveis), mouse, toque e regras de movimento
  estado/      Zustand (preferências, etapa, andar, elevador, interface) e validação do nome
  jogador/     corpo cinemático do Rapier, personagem animado, câmera, sentar/levantar, crachá
  motor/       Canvas, carregamento e pré-carregamento de modelos, qualidade, reflexos, pós-processamento
  mundo/       andares, elevador (máquina de estados + 3D), fachada, carros, interações, navegação, mapa
  testes/      telemetria e ganchos para os testes automatizados
  ui/          entrada, HUD, menu, mapa, painel do elevador, controles de celular, cortina, painéis
tests/e2e/     Playwright
ferramentas/   pipeline de modelos 3D (Blender, Rocketbox, glTF Transform) e miniaturas do mapa
public/        modelos GLB, miniaturas do mapa, HDRI e decodificadores
```

## Modelos 3D (como regenerar)

**Personagem.** Microsoft Rocketbox Male_Adult_07, licença MIT. Ele usa estes clipes:
- parado;
- olhar em volta;
- caminhada;
- corrida;
- sentar;
- sentado;
- levantar;
- acenar;
- conversar.

```bash
# baixe do Rocketbox só os arquivos usados (ver ferramentas/avatares/LEIAME.md na raiz) e:
RB=<rocketbox> node ferramentas/personagem/converter.mjs Male_Adult_07 Adults m <tmp>
RB=<rocketbox> python3 ferramentas/personagem/texturas.py Male_Adult_07 Adults <tmp> <tmp>/jogador_1k.glb 1024
node ferramentas/otimizar.mjs <tmp>/jogador_1k.glb public/modelos/jogador.glb --geo meshopt --tex ktx2 --max 1024
```

O conversor cuida do deslocamento da raiz de cada clipe:
- **Locomoção.** Mede a velocidade natural de cada passada (caminhada 1,01 m/s; corrida 2,88 m/s) e tira o deslocamento da raiz, para o pé não deslizar.
- **Sentar e levantar.** Guarda onde a raiz começa ou termina. No jogo, esse deslocamento sai do clipe e passa a mover o personagem, para as transições ficarem suaves.

**Prédio e andares.** Modelados por script no **Blender 5.2 (bpy)**, com texturas PBR geradas por código.

```bash
pip install bpy==5.2.2 numpy pillow   # Python 3.13
BPY_PYTHON=<python com bpy> ferramentas/gerar_predio.sh           # andares 40–44, elevador e fachada
BPY_PYTHON=<python com bpy> ferramentas/gerar_miniaturas.sh       # miniaturas do mapa (Cycles) em public/mapa
```

| Script | Gera |
|---|---|
| `blender/comum.py` | biblioteca: paredes com vãos, móveis, assentos, hall do elevador |
| `blender/andar40.py` | sala da Fase 1 + corredor + hall do elevador (recepção) |
| `blender/andares.py N` | andares 41–44 com o tema de cada ambiente |
| `blender/elevador.py` | cabine, painel, visores e quatro folhas de porta |
| `blender/predio.py` | torre de 44 andares, letreiro, coroa, marquise, praça e rua |

No Blender, os objetos especiais seguem estas convenções:

| Prefixo | O que é |
|---|---|
| `COL_*` | colisores (a escala do vazio é a meia-medida da caixa) |
| `LUZ_*` | pontos de luz |
| `SPAWN_*`, `PONTO_*`, `MIRA_*` | pontos de partida e da câmera |
| `SENTAR_*` | assentos (posição e direção de quem senta) |
| `PORTA_*` | folhas de porta (origem na dobradiça ou na posição fechada) |
| `BOTAO_*` | botões (elevador) |
| `TELA_*` | telas e visores emissivos |
| `VIDRO_*`, `MOVEL_*` | vidros e peças animadas (globo) |

As janelas da torre são desenhadas no shader (`src/mundo/fachada.ts`), a partir da posição no mundo. Assim ficam nítidas a qualquer distância.

## Licenças dos recursos

- Personagem e animações: Microsoft Rocketbox (MIT).
- HDRIs: Poly Haven (CC0), via pacote `@pmndrs/assets`.
- Texturas: geradas pelo próprio projeto (`ferramentas/texturas/gerar.py`).
- Fontes usadas nos letreiros 3D: DejaVu Serif (licença livre DejaVu/Bitstream Vera) e Inter (SIL OFL 1.1). Os textos das licenças estão em `ferramentas/fontes/`.

Veja também [`docs/VIABILIDADE.md`](docs/VIABILIDADE.md), com as ferramentas verificadas, as versões, as substituições e as limitações conhecidas.

## Fase 3: recepção e traders (em validação)

No 40º andar, Aurora e dez traders aparecem como modelos Rocketbox. Use **E** ou **✋** perto deles para conversar. Aurora fala pelo sintetizador de voz do navegador quando disponível. O valor em cada crachá é **simulado, não é cotação nem dinheiro real**. Atores respiram e movem cabeça e braços; caminhada autônoma e novas estações de trabalho permanecem pendentes. Teste automático: `npm run check && npm run build`, seguido do teste Playwright de fase 3.

