# Guia para continuar o projeto (para uma IA ou um programador)

Leia este arquivo inteiro antes de mudar qualquer coisa.

## 1. O que é

A **Sala dos Robôs** é uma sala de trading em 3D em Nova York, à noite.

- **Robôs e mercado:** 10 robôs operam pares de moedas (EURUSD, GBPUSD, USDJPY, USDCAD). Cada robô é uma pessoa 3D sentada numa mesa, com o resultado flutuando sobre a cabeça. O telão mostra a curva da carteira. Todos os dados são simulados no navegador.
- **O que o visitante faz:** entra em primeira pessoa, anda, senta (mesa e sofá), abre a geladeira, conversa com os traders e joga sinuca e 21 contra eles. Cada sala é um andar de um prédio, ligado só pelo elevador; o lounge tem atendimento, bebidas, comida e narguilé virtual. Pode alternar entre primeira e terceira pessoa (tecla V) e ouvir música pelo Spotify.
- **Outras pessoas:** quem está no site encontra os outros visitantes (avatares ao vivo), com chat de texto e chat de voz em 3D.

Links:
- Site: https://willianses.github.io/sala-dos-robos/
- Repositório: https://github.com/WillianSeS/sala-dos-robos
- Existe também uma versão no claude.ai (artefato). Ela usa `window.claude` em vez do Supabase (ver item 7).

## 2. Regras de trabalho do dono do projeto (Willian)

Siga estas regras em toda tarefa:

1. **Modo de execução:** faça um plano curto com etapas numeradas. Em cada etapa: auditar o estado, executar, auditar o resultado. Só depois siga para a próxima etapa.
2. **Teste de verdade:** não presuma que funciona. Só pare quando tiver certeza.
3. **Escopo:** altere só o que a tarefa pede. Não acrescente funções, telas ou melhorias que ninguém pediu.
4. **Sem pedidos:** a autorização já está dada. Não peça permissão nem confirmação, e não peça desculpas.
5. **Ambiguidade:** escolha a interpretação mais simples, siga em frente e avise no relatório.
6. **Modo econômico:** respostas curtas, sem repetir código que não mudou.
7. **Relatório final curto**, sempre com:
   - o que foi feito, etapa por etapa;
   - o que foi alterado;
   - o que foi testado e o resultado;
   - problemas e pendências;
   - estimativa de tempo e de tokens.

## 3. Estrutura

| Caminho | O que é |
|---|---|
| `index.html` | O site inteiro, **gerado** pelo `build.sh`. Nunca edite à mão. |
| `src/` | Código-fonte em partes. O `build.sh` junta tudo em ordem alfabética (veja a tabela abaixo). |
| `people/` | Pessoas 3D (glTF em JSON + texturas) e animações (`anim_m.json`, `anim_f.json`). |
| `build.sh` | Gera o `index.html` a partir de `src/`. |
| `supabase/migrations/` | SQL do banco (tabelas, RLS, função do ranking), já aplicado no projeto. |
| `testes/` | Testes no navegador com Playwright (item 5). |
| `ferramentas/avatares/` | Scripts que convertem as pessoas do Rocketbox (veja o `LEIAME.md` da pasta). |
| `.nojekyll` | Faz o GitHub Pages servir os arquivos como estão. |

Partes de `src/`:

| Arquivo | Conteúdo |
|---|---|
| `00_head.html` | Título, fontes, todo o CSS, o HTML da interface, o import map do Three.js e a abertura do `<script type="module">`. |
| `10_core.js` | Renderizador, utilidades (`rnd`, `clamp`, `damp`, `money`…), materiais, geometrias, junção de malhas estáticas, colisores. |
| `20_textures.js` | Texturas procedurais e a vista de Nova York (Empire State, Chrysler etc.). |
| `30_room.js` | Arquitetura e luzes. A sala principal tem x de -8 a 8, z de -6 a 6 e altura 3,2; a discoteca ocupa x de -4 a 4, z de 6 a 14; a sala de jogos ocupa x de 4 a 12, z de 6 a 14 (sinuca em (8; 9,4) e 21 em (8; 12,1)); o lounge ocupa x de 4 a 12, z de 14 a 22. Tudo fica no mesmo plano, mas as salas são andares diferentes: não há passagens entre elas (`wallBlocked` em `70_controls.js`). |
| `40_furniture.js` | Mesas (`STATIONS`, `SCREENS`), sofá, mesa de sinuca, café, geladeira (`FRIDGE`). |
| `42_disco_room.js` | Sala anexa: pista, luzes, DJ, globo espelhado e bancos. |
| `43_games_room.js` | Sala de jogos: paredes, iluminação, mesa do 21, placas e tacos. |
| `44_smoking_room.js` | Lounge: sofás, bar, mesas de narguilé, fumaça leve e `LOUNGE_LAYOUT` com posições/assentos. |
| `44e_elevator.js` | Cabine de cada andar atrás da parede (piso, teto iluminado, corrimão, botoeira e visor do andar), portas de aço e indicador acima da porta. Precisa vir antes do `45_walls.js`, que junta a geometria estática. A tabela `FLOORS`, `floorAt(x, z)`, `CAB` e `wallRuns` (paredes com o vão da porta) ficam no início de `30_room.js`. |
| `45_walls.js` | Telão, letreiro, relógios, placas. |
| `50_people.js` | Pessoa procedural, usada só como reserva enquanto os modelos carregam. |
| `55_avatars.js` | Pessoas Rocketbox: classe `Avatar`, poses e animações. `AV_FILES` lista os arquivos e `PERSON_NAMES` os nomes fictícios. |
| `56_consumables.js` | Nove bebidas/comidas 3D compartilhadas; IK da mão até a boca, fumar e limpeza de props. Tempos de animação em `performance.now()/1000`. |
| `60_sim.js` | Mercado simulado (`PAIRS`), robôs, operações e rotas pela sala (`NODES`, `EDGES`, `SPOTS`). |
| `65_screens.js` | Desenho dos monitores, do telão e do letreiro. Etiquetas de resultado. |
| `70_controls.js` | Modos de câmera (`orbit`, `tween`, `fp`, `seat`, `talk`, `pool`), teclado, mouse, joystick, colisão. |
| `75_interact.js` | Sentar e levantar (`SEATS`), geladeira, ação da tecla E. |
| `76_pool.js` | Sinuca: física 2D, regras, jogada do robô, HUD e câmera. |
| `77_chat.js` | Conversa com os traders: perguntas prontas; conversa livre só no claude.ai. |
| `77_leisure.js` | Clube do 21 contra os traders (fichas fictícias); rádio da sala compartilhada (`RADIO`, batida presa ao relógio); arquivo do aparelho e player do Spotify (link colado → `open.spotify.com/embed/…`), que tocam só para quem escolheu. |
| `77t_hospitality.js` | Cardápio, geladeira, mão em primeira pessoa, goles/mordidas, lounge, convites e smoking virtual. |
| `77u_service.js` | Caio/Sofia realistas, aventais, bandejas, rotas e pedidos com entrega/cancelamento. NPCs separados da lista de traders. |
| `77w_elevator.js` | Elevador do visitante: as portas abrem por sensor; painel de andares (E na porta ou dentro da cabine); viagem em etapas `in`, `close`, `move`, `open`, `out` (entra, fecha, conta os andares com leve balanço, abre e sai). Os atalhos (`goGames`, `goDisco`, `goLounge`…) chamam `rideTo(andar)`. `otherFloor()` esconde etiquetas de outros andares. |
| `77x_view.js` | Terceira pessoa: o avatar do visitante (o mesmo da dança) anda, senta, come, bebe e fuma, virado para `fp.body` (a direção em que anda); câmera atrás da cabeça sem atravessar paredes, com zoom (`VIEW.zoom`, roda do mouse ou pinça). Botão 👤 ou tecla V, lembrado no `localStorage`. |
| `77y_games.js` | Atalhos para a sala de jogos e o escritório (pelo elevador). |
| `77z_disco.js` | Acesso à discoteca, dança procedural e realista, reações, convites e câmera. |
| `78_multi.js` | Várias pessoas na sala: visitantes, chat de texto, ranking. Tem dois backends (item 7). |
| `78v_voice.js` | Chat de voz (WebRTC + som 3D). Também chama `mpInit()`. |
| `79_traffic.js` | Avenida e carros lá embaixo. |
| `80_main.js` | Pós-processamento, laço principal (`frame`), modo debug. |
| `99_tail.html` | Fecha o `</script>`. |

Tudo roda num único módulo JavaScript: uma parte enxerga as variáveis das outras. A ordem dos arquivos importa para `const` e `let`.

## 4. Como mudar e publicar

1. Edite os arquivos em `src/`.
2. Rode `./build.sh`, que recria o `index.html`.
3. Teste (item 5).
4. Faça commit e push na branch `main` (código-fonte) e atualize a branch `gh-pages` com a versão testada. O GitHub Pages está configurado para `gh-pages`, pasta `/`, e publica em cerca de 1 minuto.

Para o site funcionar, o GitHub Pages precisa estar ligado uma vez: em *Settings → Pages*, escolha *Deploy from a branch*, depois `gh-pages` e `/ (root)`.

## 5. Como testar

Instale uma vez:

```bash
pip install playwright && python3 -m playwright install chromium
# Se o Chromium já vier instalado, use a versão do Playwright que combina com ele
# (por exemplo, chromium-1194 → pip install playwright==1.56.0).
```

Na raiz do repositório, deixe um servidor rodando:

```bash
python3 -m http.server 8766
```

Testes:
- `python3 testes/teste_predio.py` valida paredes fechadas entre andares, cabine (portas por sensor, passagem só com porta aberta), viagem em etapas, atalhos sentado, garçom atravessando andares, etiquetas por andar, terceira pessoa (corpo virando, zoom), Spotify, rádio compartilhada entre dois visitantes e visitante trocando de andar no desktop/celular.
- `python3 testes/teste_hospitalidade.py` valida atendimento andando e bandeja, geladeira, itens/gestos, lounge, fumaça, música sentado, presença e limpeza no desktop/celular.
- `python3 testes/teste_sala_jogos.py` valida entradas, paredes, sinuca e 21 na sala separada, caminhos dos robôs, presença fora dos limites antigos e retorno no desktop/celular.
- `python3 testes/teste_discoteca.py` valida passagem e colisões, danças realistas, robôs andando à pista, emojis e dança entre visitantes, música e saída no desktop/celular.
- `python3 testes/teste_lazer.py` valida 21 (ás, vitória, derrota, empate, fichas e saída), música (estilos, volume, arquivo e parada) e interface em desktop/celular. Usa Supabase falso.
- `python3 testes/teste_multiplayer.py` testa duas pessoas na sala com um Supabase falso. Ele confere:
  - presença;
  - chat ao vivo e gravado;
  - voz conectada, áudio chegando e som saindo da cabeça do avatar;
  - sair da voz;
  - ranking;
  - histórico para quem chega depois.

  Deve terminar com `TUDO OK`.
- `python3 testes/teste_tela.py '[{"name":"foto","js":"__sala.enterRoom(); 1","wait":4000}]' 1280 760` tira fotos em `testes/saida/`. Variáveis:
  - `MOCK=1` simula o claude.ai;
  - `FAKESB=1` usa o Supabase falso;
  - `MOBILE=1` simula o celular.
- **Sem acesso ao CDN** (`cdn.jsdelivr.net`): baixe o three.js r160 (`git clone --depth 1 --branch r160 https://github.com/mrdoob/three.js`) e rode os testes com `THREE_DIR=/caminho/three.js`.

**Modo debug:** abra `index.html#debug`. O objeto `window.__sala` expõe:
- cena e câmera;
- robôs e simulação: `robots`, `fast(seg)`, `openTrade`, `closeTrade`;
- movimento: `enterRoom`, `setFP(x, z, yaw)`;
- interações: `sitDown`, `standUp`, `startPool`, `shoot`, `openTalk`, `ask`;
- prédio e câmera: `FLOORS`, `CAB`, `floorAt`, `playerFloor`, `inCab`, `rideTo`, `openElevator`, `closeElevator`, `ELEV`, `VIEW`, `setThirdPerson`;
- música: `RADIO`, `setRadio`, `SPOTIFY`, `spotifyEmbedUrl`, `spotifyLoad`, `spotifyClose`;
- lounge e atendimento: `HOSP`, `STAFF`, `CONSUMABLES`, `goLounge`, `openHospitality`, `requestService`, `consumeHeld`, `startSmoking`, `stopSmoking`;
- lazer: `CASINO`, `startCasino`, `exitCasino`, `casinoDeal`, `casinoHit`, `casinoStand`, `handValue`, `MUSIC`, `openMusic`, `closeMusic`;
- discoteca: `DISCO`, `goDisco`, `exitDisco`, `startDance`, `stopDance`, `inviteDancers`, `sendDiscoEmoji`;
- multiplayer: `MP`, `VOICE`, `voiceJoin`, `voiceLeave`, `saveRanking`, `myId`.

O ambiente de teste não tem placa de vídeo, então roda a 1–2 quadros por segundo e os avatares andam devagar. Isso não é erro.

## 6. Supabase (tempo real e banco)

- **Projeto:** `sala-dos-robos`, ref `qhedllguoknhotovycqf`, região São Paulo, plano grátis. Pertence à conta do Willian.
- **Conexão:** URL `https://qhedllguoknhotovycqf.supabase.co`. A chave publicável está em `src/78_multi.js` (`SUPA`). Ela é pública por design; a proteção vem das regras RLS.
- **Biblioteca:** `@supabase/supabase-js@2.116.0`, carregada do jsdelivr só quando a página não está no claude.ai.

**Tabelas** (SQL em `supabase/migrations/`):
- `chat_messages` (id, name, body, created_at):
  - qualquer visitante lê e insere, com limites de tamanho;
  - um gatilho apaga mensagens com mais de 7 dias.
- `pool_ranking` (slug, name, wins, losses, draws, updated_at):
  - leitura pública;
  - a escrita só acontece pela função `record_pool_result(p_name, p_result)`, que soma +1 em `win`, `loss` ou `draw`.

**Canal em tempo real** `sala-dos-robos` (público):
- **Presença:** a chave é um id aleatório por aba (`myId`). O conteúdo é `{v:1, n, a, x, z, yaw, m, sy, vc, ds, em, ei, et, it, ct, hs, ht}`:
  - `n`: nome;
  - `a`: aparência, de 0 a 3;
  - `m`: `w` em pé ou andando, `s` sentado, `t` conversando, `d` dançando;
  - `sy`: altura do assento;
  - `vc`: 1 se está na voz;
  - `ds`: estilo de dança (`groove`, `disco`, `party`);
  - `it`: id de bebida/comida do catálogo; `ct`: fim da animação em milissegundos de `Date.now()`.
  - `hs`: índice da mesa de narguilé (0/1, -1 inativo); `ht`: fim do gesto em milissegundos. IDs e durações recebidas são validados. A recepção converte para relógio monotônico local. Esses estados são transitórios, sem novos registros/tabelas.
  - `ro`, `rs`, `rt`: rádio da sala ligada (1/0), estação (`lofi`, `lounge`, `electro`) e momento da última mudança (`Date.now()`). Cada visitante adota o estado com `rt` mais recente; `rt` no futuro é ignorado.
  - `em`, `ei`, `et`: emoji permitido, identificador e expiração da reação. Reações duram poucos segundos e não são gravadas no banco.

  A presença é atualizada no máximo a cada 4 s e serve para quem chega depois.
- **Broadcast `pos`:** o mesmo conteúdo mais o `id`, enviado só quando muda.
- **Broadcast `chat`:** `{id, from, n, s, t}`.
- **Broadcast `rtc`:** sinalização da voz, `{to, from, k: offer|answer|bye, sdp}`.

**Limites do plano grátis:**
- 200 conexões e cerca de 100 mensagens por segundo no projeto todo. Por isso o intervalo de envio da posição é `max(0,2 s, n²/80 s)`, em que `n` é o número de pessoas no canal.
- Projetos grátis pausam após um tempo sem uso. Reative no painel do Supabase.

## 7. Dois modos de funcionamento

O `mpInit()`, em `78_multi.js`, escolhe o modo:

- **Com `window.claude`** (versão no claude.ai):
  - presença por `window.claude.use('room')`;
  - banco da página por `window.claude.use('db')`;
  - conversa livre com os traders por `window.claude.use('sample')`.
  - Não há voz.
- **Sem `window.claude`** (site): o `sbInit()` cria um adaptador com a mesma interface de `MP.room` (`presence`, `peers`, `onPeers`) usando o Supabase.
  - A conversa com os traders fica só nas perguntas prontas.
  - Conversa livre exigiria um servidor com uma chave de IA paga, o que não foi feito.

## 8. Voz (`78v_voice.js`)

- **Rede:** malha WebRTC só entre quem clicou em "Entrar na voz". Quem tem o `myId` menor faz a chamada.
  - A descrição vai completa, sem troca de candidatos um a um; a espera pelos candidatos é de no máximo 2,5 s.
  - STUN do Google, sem TURN.
  - Se a conexão não abrir em 15 s, tenta de novo em 10 s.
- **Som 3D:** a Web Audio API usa um `PannerNode` HRTF (inverse, ref 2,5, rolloff 0,5) na cabeça de cada avatar; quem ouve é a câmera.
  - No Chrome, o áudio da chamada precisa também estar num `<audio>` mudo para chegar ao Web Audio.
- **Indicadores:** "falando…" aparece quando o nível RMS passa de 0,01 e fica por 0,35 s. O ponto verde no botão mostra a sua própria voz.

## 9. Limitações e pendências conhecidas

- O GitHub Pages está ativo na branch `gh-pages`, pasta `/` (item 4).
- O teste real, com o Supabase e a voz entre dois aparelhos diferentes, ainda precisa ser feito no site publicado.
- Sem servidor TURN, algumas redes muito fechadas não conectam a voz.
- Com alto-falante pode haver eco. O recomendado é fone de ouvido.
- Robôs e garçons viajam de elevador entre andares: andam até a porta (que abre), somem por 1,6 a 2,5 s e aparecem na porta do outro andar (nós `elev_*` em `NODES`). Eles não entram na cabine.
- A rádio da sala depende de o relógio dos aparelhos estar certo (sincronização automática de hora); com o relógio muito errado, a batida sai deslocada. Se todos saírem da sala, a rádio volta desligada para quem chegar depois.
- O Spotify toca pelo player oficial incorporado. Para tocar as músicas inteiras, a pessoa precisa estar logada no Spotify no mesmo navegador; sem login, só prévias de 30 s. Controle total (tocar sem o player, sincronizar entre visitantes) exigiria o Web Playback SDK, conta Premium e um app registrado no painel de desenvolvedor do Spotify, o que não foi feito.

## 10. Créditos

- Pessoas 3D: Microsoft Rocketbox, licença MIT (`people/LICENSE-Rocketbox.txt`).
- Three.js r160 (MIT).
- As fichas do 21 são fictícias e ficam apenas na sessão aberta. A música toca localmente, sem sincronização entre visitantes.
- Os nomes dos traders são fictícios e a cidade é desenhada.
- É uma simulação, não é recomendação de investimento.

## 11. Referências consultadas para objetos e atendimento

- [Three.js r160 — Bone](https://github.com/mrdoob/three.js/blob/r160/docs/api/en/objects/Bone.html): vínculo dos objetos aos ossos e conversão de rotação local/mundial.
- [Three.js r160 — SkeletonUtils](https://github.com/mrdoob/three.js/blob/r160/docs/examples/en/utils/SkeletonUtils.html): clones independentes de esqueleto para Caio e Sofia, reutilizando geometrias/texturas.
- [Three.js r160 — TubeGeometry](https://github.com/mrdoob/three.js/blob/r160/docs/api/en/geometries/TubeGeometry.html): mangueiras curvas.
- [Supabase — Presence](https://supabase.com/docs/guides/realtime/presence): bebidas/gestos acrescentados ao payload existente, mantendo os limites de envio.
