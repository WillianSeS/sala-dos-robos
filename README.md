# Sala dos Robôs

Sala de trading em 3D em Nova York. Cada robô aparece como um trader na mesa, com o resultado flutuando sobre a cabeça e um telão com a curva da carteira. Todos os dados são simulados.

**Abrir a sala:** https://willianses.github.io/sala-dos-robos/

## O que dá para fazer

- Entrar na sala em primeira pessoa: WASD e mouse no computador, joystick no celular.
- Sentar na mesa ou no sofá, abrir a geladeira e jogar sinuca com os traders.
- Jogar 21 contra os traders com fichas fictícias: use a mesa de cartas na **Sala de jogos** ou pergunte “Bora jogar 21?” na conversa. O robô fica reservado durante a partida.
- Visitar o **Smoking Lounge**, separado do escritório e ligado à sala de jogos: sofás, balcão, música e duas mesas de narguilé virtual com bocal na mão e fumaça leve.
- Pegar água, latas, suco, vinho, sanduíche ou maçã na geladeira. O **Cardápio** também oferece café e pizza: Caio (garçom) e Sofia (garçonete) caminham até você com bandejas para entregar.
- Segurar bebidas e comidas, tomar goles e dar mordidas pelo botão ou pela tecla **F**. Outros visitantes veem os objetos e os gestos. Robôs em pausa também comem e bebem.
- Ouvir música pelo botão **Música**: três estilos instrumentais gerados no navegador, volume e arquivo de áudio do aparelho. Cada visitante escolhe seu próprio som.
- Visitar a **Discoteca dos Robôs**: use o botão 🪩 Discoteca ou a passagem na área de lazer. A pista tem luzes suaves, globo espelhado, DJ, bancos, três danças e emojis. Convide os robôs disponíveis; visitantes veem as danças e reações uns dos outros.
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
