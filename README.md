# Sala dos Robôs

Sala de trading em 3D em Nova York. Cada robô aparece como um trader na mesa, com o resultado flutuando sobre a cabeça e um telão com a curva da carteira. Todos os dados são simulados.

**Abrir a sala:** https://williansess.github.io/sala-dos-robos/

## O que dá para fazer

- Entrar na sala em primeira pessoa: WASD e mouse no computador, joystick no celular.
- Sentar na mesa ou no sofá, abrir a geladeira e jogar sinuca com os traders.
- Conversar com os traders usando as perguntas prontas.
- Encontrar outras pessoas que estão na sala e falar com elas:
  - chat de texto;
  - chat de voz em 3D, em que você ouve cada pessoa do lugar onde ela está.
- Ver o ranking de vitórias na sinuca, salvo no banco de dados.

## Como funciona

- **Página:** um único arquivo, `index.html`, feito com Three.js r160.
- **Tempo real e banco de dados:** Supabase.
  - Presença e broadcast mostram quem está na sala e onde.
  - As tabelas `chat_messages` e `pool_ranking` são protegidas por RLS.
  - A chave no código é a chave publicável, feita para ficar no navegador.
- **Voz:** WebRTC direto entre as pessoas que entraram na voz, com som posicional pela Web Audio API.
  - Precisa de HTTPS e da permissão do microfone.
  - Use fone de ouvido para não dar eco.
  - Não há servidor TURN, então algumas redes muito fechadas podem não conectar.

## Créditos

- Pessoas 3D: Microsoft Rocketbox, licença MIT (`people/LICENSE-Rocketbox.txt`).
- Os nomes dos traders são fictícios e a cidade é desenhada.
- É uma simulação e não é recomendação de investimento.
