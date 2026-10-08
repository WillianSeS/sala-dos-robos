# Sala dos Robôs

Hotel **Las Vegas Night** em 3D, com uma sala de trading no 40º andar. Cada robô aparece como um trader na mesa, com o resultado flutuando sobre a cabeça e um telão com a curva da carteira. Todos os dados são simulados.

**Abrir a sala:** https://willianses.github.io/sala-dos-robos/

**Mapa dos andares e recursos atuais:** https://willianses.github.io/sala-dos-robos/mapa.html

## O que dá para fazer

- Entrar pela nova recepção visual do **Las Vegas Night**, com o hotel em 3D e a fachada **Sala dos Robôs · IA + Club**.
- Jogar **dardos** na sala de jogos: nove lançamentos, setores simples/duplos/triplos e centro. Mire e clique no computador, use Espaço ou toque no alvo e em **Lançar** no celular. Medalhas e recorde são virtuais e ficam neste navegador.
- Entrar na sala em primeira pessoa: WASD e mouse no computador. No celular, controles de jogo na tela: joystick fixo no canto esquerdo, arrastar à direita para olhar, botão 🏃 para correr, botão verde para interagir; os botões do topo e os atalhos viram ícones redondos e os painéis das salas abrem por ícone (funciona em pé e deitado). A caminhada é calma (1,25 m/s andando, 2,5 m/s correndo), acompanha a velocidade real (sem pés deslizando) e o corpo inclina ao correr. As danças são coreografias no ritmo da rádio: balanço, disco, comemoração e cancan. O botão **👤 3ª pessoa** (ou a tecla **V**) mostra o seu personagem andando, sentando, dançando, comendo e bebendo; ele vira para o lado em que anda, e a roda do mouse ou a pinça com dois dedos aproximam a câmera. No celular, o joystick empurrado até o fim corre.
- Entrar pela tela de **boas-vindas** (só o nome e o botão Entrar). Na recepção, a **Aurora**, recepcionista cyber, dá as boas-vindas pelo nome, por voz, e oferece uma bebida, o show ou a sala de jogos.
- Ver o **hotel por fora**: a página abre com a torre à noite, o letreiro **LAS VEGAS NIGHT** no topo, lâmpadas piscando em sequência, neon nos cantos e holofotes. O botão 🔍/🏨 alterna entre a vista de fora e o corte por dentro, que mostra os cinco andares empilhados (40º embaixo, 44º no alto), cada um com a sua placa.
- Andar pelo **prédio**: cada sala fica num andar (40º Escritório, 41º Sala de jogos, 42º Discoteca, 43º Lounge, 44º Las Vegas Night). As portas do elevador abrem quando você chega perto; entre na cabine (ou aperte **E** na porta), escolha o andar e veja o visor contar os andares até as portas abrirem no destino. Os atalhos também usam o elevador, e robôs e garçons viajam nele.
- Sentar na mesa ou no sofá, abrir a geladeira e jogar sinuca com os traders.
- Jogar 21 contra os traders com fichas fictícias: use a mesa de cartas na **Sala de jogos** ou pergunte “Bora jogar 21?” na conversa. O robô fica reservado durante a partida.
- Visitar o **Smoking Lounge**, no 43º andar: sofás, balcão, música e duas mesas de narguilé virtual com bocal na mão e fumaça leve.
- Pegar água, latas, suco, vinho, sanduíche ou maçã na geladeira. O **Cardápio** também oferece café e pizza: Caio (garçom) e Sofia (garçonete) caminham até você com bandejas para entregar.
- Segurar bebidas e comidas, tomar goles e dar mordidas pelo botão ou pela tecla **F**. Outros visitantes veem os objetos e os gestos. Robôs em pausa também comem e bebem.
- Ouvir a **📻 Rádio da sala** pelo botão **Música**: três estações instrumentais geradas no navegador. Ligar, desligar e trocar a estação vale para todos na sala, e todos ouvem a mesma nota ao mesmo tempo; cada um ajusta o próprio volume ou silencia a rádio só para si.
- Ouvir só para você um arquivo do aparelho ou o **Spotify** (cole o link de uma playlist, álbum, artista ou música). O player do Spotify continua tocando com o painel fechado; com a conta do Spotify aberta no navegador toca as músicas inteiras, sem conta só prévias de 30 s.
- Visitar a **Discoteca dos Robôs**: use o botão 🪩 Discoteca ou o elevador. O painel da pista fica fechado até você tocar em **🪩 Pista**. A pista tem luzes suaves, globo espelhado, DJ, bancos, quatro danças (incluindo cancan) e emojis. Convide os robôs disponíveis; visitantes veem as danças e reações uns dos outros.
- Ir ao **show do 44º andar (Las Vegas Night)**: palco com luzes, três showgirls (cocar de plumas, estola e saia de paetês) dançando cancan em sincronia, com confete no giro e nas gorjetas, mesas para sentar e assistir e balcão de drinques. As atendentes andam pelo bar e vêm oferecer uma bebida (vão ao balcão e trazem), dançar com você ou uma mesa para o show. Dá para dar gorjetas às dançarinas com as fichas de brincadeira do 21. Atendentes e dançarinas falam com a voz do navegador (botão 🔊 para desligar).
- Clima de festa na discoteca e no Las Vegas Night: fumaça leve no chão, máquina de fumaça que solta um jato de tempos em tempos, lâmpadas coloridas nas paredes e refletores piscando (no máximo 3 vezes por segundo, sem estrobo).
- Conversar com os traders usando as perguntas prontas.
- Encontrar outras pessoas que estão na sala e falar com elas:
  - chat de texto;
  - chat de voz em 3D, em que você ouve cada pessoa do lugar onde ela está.
- Ver o ranking de vitórias na sinuca, salvo no banco de dados.

## Como funciona

- **Página:** um único arquivo, `index.html`, feito com Three.js r160. Ele é gerado a partir das partes em `src/` pelo `build.sh`.
- **Tempo real e banco de dados:** Supabase.
  - Presença e broadcast mostram quem está na sala e onde.
  - As tabelas `chat_messages` e `pool_ranking` são protegidas por RLS.
  - A chave no código é a chave publicável, feita para ficar no navegador.
- **Voz:** WebRTC direto entre as pessoas que entraram na voz, com som posicional pela Web Audio API.
  - Precisa de HTTPS e da permissão do microfone.
  - Use fone de ouvido para não dar eco.
  - Não há servidor TURN, então algumas redes muito fechadas podem não conectar.

## Continuar o projeto

O guia completo está em [CONTINUAR.md](CONTINUAR.md): estrutura, como gerar e testar, banco, voz e as regras de trabalho.

## Créditos

- Pessoas 3D: Microsoft Rocketbox, licença MIT (`people/LICENSE-Rocketbox.txt`).
- Os nomes dos traders são fictícios e a cidade é desenhada.
- É uma simulação e não é recomendação de investimento.
