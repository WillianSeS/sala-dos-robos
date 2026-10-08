# Viabilidade das ferramentas e substituições

Verificado em 08/10/2026, no ambiente de desenvolvimento: container Linux sem GPU, com acesso de rede controlado. Cada item foi testado na prática, e nada aqui foi presumido.

Na coluna Situação:
- ✅ = em uso e verificado;
- 🔁 = substituído (motivo ao lado);
- ⏳ = fica para uma fase seguinte;
- ⛔ = indisponível.

## Programação

| Ferramenta | Situação | Versão / observação |
|---|---|---|
| TypeScript | 🔁 ✅ | **6.0.3**. O 7.0.2 já saiu, mas o typescript-eslint 8.71 ainda só aceita `<6.1`. |
| React + Vite | ✅ | React 19.3.0, Vite 8.3.3, @vitejs/plugin-react 6.1.2. |
| Three.js | 🔁 ✅ | **0.182.0**. Do 0.183 em diante o three avisa no console que `THREE.Clock` é obsoleto, e o R3F 9.8.1 ainda o usa. Fixar no 0.182 mantém o console limpo. |
| React Three Fiber | ✅ | 9.8.1. |
| Drei | ✅ | 10.7.9 (progresso de carregamento). Os GLB entram pelo carregador oficial do three (Draco, meshopt e KTX2 atuais) via `useLoader`. |
| Rapier (@react-three/rapier) | 🔁 ✅ | 2.2.0, com `@dimforge/rapier3d-compat` forçado para **0.21.0** (`overrides`). O 0.19.2 emite um aviso de inicialização obsoleta do WASM. A API usada pelo @react-three/rapier não mudou: só dois métodos de contato foram removidos, e ele não os usa. |
| Zustand | ✅ | 5.0.15. |

## Modelagem, materiais e animação

| Ferramenta | Situação | Observação |
|---|---|---|
| Blender | ✅ | **Blender 5.2.2 LTS como módulo Python** (`pip install bpy`, Python 3.13). O site blender.org está bloqueado, mas o PyPI não. Scripts: `sala_fase1.py` (Fase 1), `andar40.py`, `andares.py`, `elevador.py` e `predio.py` (Fase 2), sobre a biblioteca `comum.py`. `previa.py` renderiza prévias no Cycles, também usadas como miniaturas do mapa. |
| Python no Blender | ✅ | Geração procedural de geometria, UV em escala real, junção por material e exportação GLB. |
| GLTF/GLB | ✅ | Todos os modelos do jogo. |
| glTF Transform | ✅ | 4.5.1 (`ferramentas/otimizar.mjs`): dedup, prune, weld, quantize e compressão. |
| Draco | ✅ | Geometria estática da sala: 17 MB → 2,7 MB (com texturas). |
| Meshopt | ✅ | Personagem: comprime geometria **e animação**, o que o Draco não faz. |
| KTX2 | ✅ (parcial) | ETC1S nas texturas de cor e rugosidade, via `ktx2-encoder` 0.6 (WASM). O `toktx` não está instalado. Os mapas normais ficam em **WebP**: em ETC1S ficam com blocos, e em UASTC pesam cerca de 1 MB cada. |
| Texturas PBR | 🔁 ✅ | Poly Haven e AmbientCG estão bloqueados pela rede do ambiente. As texturas são **geradas por código** (`ferramentas/texturas/gerar.py`): mármore Nero Marquina, nogueira, gesso, couro, veludo, latão, tapete, quadro, livros, folhas e tela. Cada uma tem mapas de cor, ORM e normal. |
| HDRI | 🔁 ✅ | O CDN do Poly Haven está bloqueado. Os HDRIs CC0 do Poly Haven vêm do pacote npm `@pmndrs/assets`. Os reflexos finais são **capturados da própria sala** (CubeCamera + PMREM). |
| Pós-processamento | ✅ | @react-three/postprocessing 3.1.3 / postprocessing 6.39.5: Bloom, N8AO, SMAA, ToneMapping AgX e vinheta. |
| Mixamo | ⛔ 🔁 | Exige conta Adobe, e o domínio está bloqueado. **Substituído pelas animações do Microsoft Rocketbox** (MIT, mais de 400 clipes de captura de movimento). Em uso: parado, olhar em volta, caminhada, corrida, sentar, sentado e levantar. Já convertidos para as próximas fases: acenar e conversar. |
| Rigging no Blender | — | Não foi preciso: os personagens Rocketbox já vêm com esqueleto Biped. |
| AnimationMixer | ✅ | Com máquina de estados (histerese e transições). A velocidade do clipe acompanha a velocidade real, para não haver pé deslizando. |
| Navmesh e pathfinding | ⏳ | Fase 3 (NPCs). Candidatos: `recast-navigation-js` (WASM) ou `three-pathfinding`. A disponibilidade será verificada antes. |
| Expressões e sincronia labial | ⏳ | O Rocketbox tem variantes `_facial` com blendshapes, que serão avaliadas na Fase 3. |

## Multiplayer, dados e áudio

| Ferramenta | Situação | Observação |
|---|---|---|
| Supabase | ✅ (verificado) | Projeto `sala-dos-robos` (sa-east-1) **ACTIVE_HEALTHY**, conferido pelo MCP. Já é usado pelo jogo atual (presença e chat com RLS). Entra no jogo novo nas Fases 2 e 7. |
| Colyseus / WebSockets | ⏳ | O Colyseus precisa de um servidor Node com conexão persistente. Vercel e páginas estáticas não mantêm WebSocket. Hospedar exige conta ou serviço (Colyseus Cloud, Fly.io, Render...), o que **depende de autorização do responsável**. Até lá, a alternativa gratuita já em uso é o Supabase Realtime (WebSocket gerenciado), com validação no banco (RLS e funções). |
| LiveKit | ⏳ | Exige conta no LiveKit Cloud e emissão de token no servidor (por exemplo, numa Edge Function do Supabase). **Depende de cadastro e autorização.** O jogo atual usa voz WebRTC P2P com sinalização pelo Supabase. |
| Web Audio / áudio espacial | ⏳ | Fase 6. |
| Spotify | ⏳ | Só pelo player oficial incorporado, como no jogo atual. |

## Qualidade e publicação

| Ferramenta | Situação | Observação |
|---|---|---|
| Playwright | ✅ | **1.56.0**, que casa com o Chromium 1194 já instalado no ambiente. O 1.64 exigiria baixar outro navegador. O **Playwright MCP não está disponível**, então a CLI é usada diretamente. |
| Vitest | ✅ | 5.0.3: lógica de movimento, câmera e máquina de animação. |
| ESLint | ✅ | 10.12 + typescript-eslint 8.71 + react-hooks 7.1. |
| tsc | ✅ | `tsc --noEmit` no build. |
| Lighthouse | ⏳ | Para a fase de otimização (o jogo é WebGL pesado; as métricas de página tradicional servem só como referência). |
| Git/GitHub | ✅ | Branch de desenvolvimento `dev/fase-1-movimento`. A `main` e o `gh-pages` (produção) não são alterados sem autorização. |
| Netlify | ✅ conectado, não usado | O MCP está conectado (11 sites de outros projetos), mas **o responsável pediu para não usar o Netlify**. As prévias vão para o **Vercel**. |
| Vercel | ⏳ (verificado; falta um passo do responsável) | MCP conectado (conta pessoal). O projeto **sala-dos-robos-jogo** foi criado (raiz `jogo/`). O deploy a partir do GitHub falhou com `git_info_fail` porque a conta Vercel **não tem conexão de login com o GitHub**. Depois de conectar (Vercel → Account Settings → Authentication → GitHub), cada push num branch de desenvolvimento gera uma prévia automaticamente. A `main` e o `gh-pages` não publicam (`vercel.json`). |
| PWA | ⏳ | `vite-plugin-pwa` 2.0.0 disponível, para as Fases 8 e 9. |

## MCPs verificados

| MCP | Situação |
|---|---|
| GitHub | ✅ em uso nesta sessão |
| Supabase | ✅ verificado |
| Vercel | ✅ verificado |
| Netlify | ✅ verificado, não usado por decisão do responsável |
| Canva | disponível, sem uso neste projeto |
| Playwright MCP | ⛔ não disponível |
| Blender MCP | ⛔ não disponível (o Blender é usado direto, como módulo Python) |

## Limitações conhecidas da Fase 1

- **Personagem.** O modelo Rocketbox tem cerca de 7,6 mil triângulos e texturas de 2K. É realista, mas não é um modelo de cinema. Personagens com mais detalhe (rosto, cabelo, roupas) dependem de fontes externas de modelos.
- **Teste sem GPU.** No ambiente de teste não há GPU: a renderização por software roda a 2–5 FPS. Por isso os vídeos de evidência são gerados quadro a quadro, a 30 FPS de tempo de jogo. Em aparelhos com GPU o jogo roda em tempo real.
- **Tamanho do JavaScript.** O pacote JS tem cerca de 2,3 MB comprimido (o WASM do Rapier vai embutido). A divisão em partes e o carregamento progressivo ficam para a Fase 8.

## Limitações conhecidas da Fase 2

- **Andares 41–44 ainda vazios de atividades.** A arquitetura, os móveis principais, as luzes e os assentos já existem. As mesas de jogo, o DJ, o narguilé virtual e o show são da Fase 4; os minijogos, da Fase 5.
- **Menus das fases seguintes.** Música, Cardápio, Conversar e Amigos aparecem no menu só como aviso de fase futura (Fases 6 e 7). Não há botão sem ação.
- **Elevador de um jogador só.** A cabine está sempre no andar do jogador. Com o multiplayer (Fase 7), a posição da cabine passa a ser compartilhada e validada no servidor.
- **Atalhos (mapa e menu).** Eles usam uma cortina preta para levar o jogador até a cabine. A viagem em si é sempre feita pelo elevador.
- **Luzes por andar.** Um andar tem até cerca de 16 luzes dinâmicas no Equilibrado. Luz pré-calculada (lightmaps) e carregamento mais leve no celular ficam para a Fase 8.
- **Tamanho dos arquivos.**
  - Cada andar baixa de 2,6 a 3,2 MB, e as texturas repetidas entre os andares ainda não são compartilhadas.
  - O JavaScript tem cerca de 2,3 MB comprimido.
  - As duas coisas ficam para a Fase 8.
- **Sentar.** O colisor do sofá impede a cápsula de chegar exatamente ao ponto inicial do clipe. A diferença (até cerca de 25 cm) é compensada aos poucos no começo do sentar e no fim do levantar.
- **Sem GPU no ambiente de teste.** Os vídeos são gerados quadro a quadro (30 FPS de tempo de jogo), como na Fase 1.
