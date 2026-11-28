---
name: escrever-mensagem-erro
description: Como escrever mensagens de erro neste projeto (o que aconteceu e o que fazer). Use sempre que for criar, alterar ou revisar uma mensagem de erro, no código ou numa SPEC.
---
# Escrever mensagem de erro no padrão do projeto

## Regras
- Toda mensagem tem duas partes: **o que aconteceu** e **o que fazer**.
- O que aconteceu: diga a causa específica, com o dado que ajuda a corrigir (sala, horário, campo). Evite "Erro" ou
  "Pedido inválido".
- O que fazer: uma ação que a pessoa consegue realizar, começando por um verbo ("Escolha…", "Informe…",
  "Consulte…"). Se não houver como corrigir o pedido, diga isso com clareza, sem inventar uma saída.
- Só indique caminhos que existem no sistema ou que a SPEC define. Não mande "procurar a secretaria" por conta própria.
- A ação não pode ensinar a contornar uma regra (ex.: sugerir 1 minuto de intervalo para passar das 4 horas).
- Não revele o que protege uma regra nem detalhes internos. Sem login, o erro de "não é o dono" **nunca** mostra o nome
  do dono. Nada de pilha de erro, caminho de arquivo ou segredo.
- A causa informada precisa ser a real: um erro interno não pode aparecer como "JSON inválido".
- Português claro, com acentos e sem culpar a pessoa. Nomes de campos da API ficam como são (`responsavel`).
- Horários no fuso da faculdade (`-03:00`).

## A SPEC manda no texto
- Os testes comparam o texto exato. Mensagem que já está numa SPEC **não muda** só para seguir esta skill.
- Se um texto aprovado não seguir o padrão, avise, proponha o novo texto e pare. Só mude depois que o dono da SPEC
  aprovar e a SPEC for atualizada.
- Mensagem nova entra primeiro na SPEC, depois no teste (skill `escrever-teste`) e por último no código.
- A API devolve a recusa como `{ "erro": "..." }`. A regra fica em `src/reservas.js`.

## Modelo
`<O que aconteceu, com o dado útil>. <O que fazer>.`

Já segue o padrão (SPEC-001, CA-3):
> A reserva não pode começar no passado: agora são 2026-12-01T09:00:00-03:00. Escolha um início a partir deste horário.

Falta o que fazer (o texto "melhor" é só ilustração, não está aprovado):
> Hoje: `Sala não encontrada: sala-x`
> Melhor: `Sala não encontrada: sala-x. Consulte as salas disponíveis em GET /salas.`

## Antes de entregar
1. A mensagem diz o que aconteceu **e** o que fazer?
2. A pessoa consegue realizar a ação indicada no sistema atual?
3. A ação respeita o objetivo da SPEC, sem abrir um jeito de contornar a regra? (lição L-01)
4. Não aparece nome de outra pessoa, detalhe interno ou segredo?
5. O texto é idêntico na SPEC, no teste e no código? Nenhum teste antigo foi alterado para passar.
