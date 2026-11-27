# SPEC-005 · Limitar a duração da reserva

- **Situação:** aprovada
- **Dono:** coordenação do curso

## Problema
Hoje uma reserva pode ter qualquer duração, e uma única pessoa consegue bloquear uma das 3 salas por um dia inteiro ou mais,
deixando os outros professores sem horário. Falta confirmar com a secretaria com que frequência isso acontece.

## Quem usa
Professores (fazem a reserva) e secretaria (consulta a agenda). Cerca de 80 professores, 3 salas.

## Critérios de aceite
Salvo indicação, agora é `2026-11-30T08:00:00-03:00`, a sala está livre
e o `responsavel` é `Ana`.

- **Mensagem A:** `Reserva não realizada por período acima de 4 horas`
- **Mensagem B:** `Reserva não realizada: você já tem uma reserva nesta sala em seguida`

"Reserva encostada" é a que começa no instante exato em que outra termina, ou termina no instante em que outra começa.

- **CA-1** · Dado o lab-1 livre, quando peço de `2026-12-01T08:00:00-03:00` a `2026-12-01T12:00:00-03:00` (4h exatas),
  então a reserva é criada (201).
- **CA-2** · Dado o lab-1 livre, quando peço de `2026-12-01T08:00:00-03:00` a `2026-12-01T12:00:01-03:00` (4h e 1s),
  então recebo 400 com a mensagem A, e a reserva não aparece em `GET /reservas`.
- **CA-3** · Dado o lab-1 livre, quando peço de `2026-12-01T08:00:00-03:00` a `2026-12-01T15:00:00+00:00`
  (4h reais, apesar de a hora escrita sugerir 7h), então a reserva é criada (201).
- **CA-4** · Dado o lab-1 livre, quando peço de `2026-12-01T08:00:00-03:00` a `2026-12-01T11:00:00-05:00`
  (5h reais, apesar de a hora escrita sugerir 3h), então recebo 400 com a mensagem A.
- **CA-5** · Dado o lab-1 livre, quando peço de `2026-12-01T22:00:00-03:00` a `2026-12-02T02:00:00-03:00`
  (4h cruzando a meia-noite), então a reserva é criada (201).
- **CA-6** · Dado o lab-1 livre, quando peço de `2026-12-01T22:00:00-03:00` a `2026-12-02T03:00:00-03:00`
  (5h cruzando a meia-noite), então recebo 400 com a mensagem A.
- **CA-7** · Dado uma reserva no lab-1 das `2026-12-01T14:00:00-03:00` às `2026-12-01T15:00:00-03:00`, quando peço o lab-1
  de `2026-12-01T12:00:00-03:00` a `2026-12-01T17:00:00-03:00` (acima de 4h e sobreposto), então recebo 400 com a mensagem A, e não 409.
- **CA-8** · Dado uma reserva de `Ana` no lab-1 das `2026-12-01T08:00:00-03:00` às `2026-12-01T12:00:00-03:00`,
  quando `Ana` pede o lab-1 de `2026-12-01T12:00:00-03:00` a `2026-12-01T13:00:00-03:00` (soma 5h, depois),
  então recebe 409 com a mensagem B, e a nova reserva não aparece em `GET /reservas`.
- **CA-9** · Dado uma reserva de `Ana` no lab-1 das `2026-12-01T12:00:00-03:00` às `2026-12-01T16:00:00-03:00`,
  quando `Ana` pede o lab-1 de `2026-12-01T11:00:00-03:00` a `2026-12-01T12:00:00-03:00` (soma 5h, antes),
  então recebe 409 com a mensagem B, e a nova reserva não aparece em `GET /reservas`.
- **CA-10** · Dado uma reserva de `Ana` no lab-1 das `2026-12-01T08:00:00-03:00` às `2026-12-01T10:00:00-03:00`,
  quando `Ana` pede o lab-1 de `2026-12-01T10:00:00-03:00` a `2026-12-01T12:00:00-03:00` (soma 4h exatas),
  então a reserva é criada (201).
- **CA-11** · Dado uma reserva de `Ana` no lab-1 das `2026-12-01T08:00:00-03:00` às `2026-12-01T12:00:00-03:00`,
  quando `Bruno` pede o lab-1 de `2026-12-01T12:00:00-03:00` a `2026-12-01T13:00:00-03:00`, então a reserva é criada (201).
- **CA-12** · Dado uma reserva de `Ana` no lab-1 das `2026-12-01T08:00:00-03:00` às `2026-12-01T12:00:00-03:00`,
  quando `Ana` pede o lab-2 de `2026-12-01T12:00:00-03:00` a `2026-12-01T13:00:00-03:00`, então a reserva é criada (201).
- **CA-13** · Dado que agora é `2026-12-01T09:00:00-03:00`, quando peço o lab-1 de `2026-12-01T08:00:00-03:00` a
  `2026-12-01T13:00:00-03:00` (no passado e acima de 4h), então recebo 400 com a mensagem
  `A reserva não pode começar no passado: agora são 2026-12-01T09:00:00-03:00. Escolha um início a partir deste horário.`
  (SPEC-001, CA-3), e não a mensagem A.
- **CA-14** · Dado reservas de `Ana` no lab-1 em 01/12 das 08h às 10h e das 10h às 12h (`-03:00`), quando `Ana` pede o lab-1
  de `2026-12-01T12:00:00-03:00` a `2026-12-01T13:00:00-03:00` (a sequência soma 5h), então recebe 409 com a mensagem B,
  e a nova reserva não aparece em `GET /reservas`.
- **CA-15** · Dado reservas de `Ana` no lab-1 em 01/12 das 08h às 10h e das 12h às 13h (`-03:00`), quando `Ana` pede o lab-1
  de `2026-12-01T10:00:00-03:00` a `2026-12-01T12:00:00-03:00` (une as duas e soma 5h), então recebe 409 com a mensagem B,
  e a nova reserva não aparece em `GET /reservas`.
- **CA-16** · Dado uma reserva de `Ana` no lab-1 das `2026-12-01T08:00:00-03:00` às `2026-12-01T12:00:00-03:00`,
  quando o responsável `ana ` (minúsculo e com espaço no fim) pede o lab-1 de `2026-12-01T12:00:00-03:00` a
  `2026-12-01T13:00:00-03:00`, então recebe 409 com a mensagem B, e a nova reserva não aparece em `GET /reservas`.
- **CA-17** · Dado, no lab-1, uma reserva de `Ana` em 01/12 das 08h às 12h e uma de `Bruno` das 13h às 14h (`-03:00`),
  quando `Ana` pede o lab-1 de `2026-12-01T12:00:00-03:00` a `2026-12-01T13:30:00-03:00` (sobrepõe e encosta),
  então recebe 409 com a mensagem
  `Conflito: lab-1 já está reservada de 2026-12-01T13:00:00-03:00 até 2026-12-01T14:00:00-03:00` (SPEC-001, CA-2),
  e não a mensagem B.
- **CA-18** · Dado, no lab-1, uma reserva de `Ana` em 01/12 das 08h às 10h e uma de `Bruno` das 10h às 11h (`-03:00`),
  quando `Ana` pede o lab-1 de `2026-12-01T11:00:00-03:00` a `2026-12-01T14:00:00-03:00` (a reserva de `Bruno` interrompe
  a sequência), então a reserva é criada (201).
- **CA-19** · Dado reservas de `Ana` no lab-1 em 01/12 das 08h às 09h e das 11h às 12h (`-03:00`), quando `Ana` pede o lab-1
  de `2026-12-01T09:00:00-03:00` a `2026-12-01T11:00:00-03:00` (une as duas e soma 4h exatas), então a reserva é criada (201).
- **CA-20** · Dado uma reserva de `Ana` no lab-1 das `2026-12-01T08:00:00-03:00` às `2026-12-01T12:00:00-03:00`,
  quando `Ana` pede o lab-1 de `2026-12-01T15:00:00Z` a `2026-12-01T16:00:00Z` (encostada, escrita em outro fuso),
  então recebe 409 com a mensagem B, e a nova reserva não aparece em `GET /reservas`.
- **CA-21** · Dado o lab-1 livre, quando peço de `2026-12-01T08:00:00-03:00` a `2026-12-01T12:00:00.001-03:00`
  (4h e 1 milissegundo), então recebo 400 com a mensagem A, e a reserva não aparece em `GET /reservas`.
- **CA-22** · Dado uma reserva no lab-1 das `2026-12-01T08:00:00-03:00` às `2026-12-01T12:00:00-03:00` com `responsavel` igual ao
  número `123`, quando o mesmo número `123` pede o lab-1 de `2026-12-01T12:00:00-03:00` a `2026-12-01T13:00:00-03:00`,
  então recebe 409 com a mensagem B, e a nova reserva não aparece em `GET /reservas`.
- **CA-23** · Dado uma reserva de `Ana` no lab-1 das `2026-12-01T08:00:00-03:00` às `2026-12-01T12:00:00-03:00`,
  quando o responsável ` Ana` (com espaço no início) pede o lab-1 de `2026-12-01T12:00:00-03:00` a
  `2026-12-01T13:00:00-03:00`, então recebe 409 com a mensagem B, e a nova reserva não aparece em `GET /reservas`.
- **CA-24** · Dado uma reserva de `João` no lab-1 das `2026-12-01T08:00:00-03:00` às `2026-12-01T12:00:00-03:00`,
  quando `Joao` (sem acento) pede o lab-1 de `2026-12-01T12:00:00-03:00` a `2026-12-01T13:00:00-03:00`,
  então a reserva é criada (201).
- **CA-25** · Dado o lab-1 livre, quando peço de `2026-12-01T08:00:00-03:00` a `2026-12-01T12:00:00.0001-03:00`
  (fração abaixo de 1 milissegundo, ignorada), então a reserva é criada (201).
- **CA-26** · Dado uma reserva de `Ana` no lab-1 das `2026-12-01T21:00:00-03:00` às `2026-12-02T00:00:00-03:00`,
  quando `Ana` pede o lab-1 de `2026-12-02T00:00:00-03:00` a `2026-12-02T02:00:00-03:00` (soma 5h na virada do dia),
  então recebe 409 com a mensagem B, e a nova reserva não aparece em `GET /reservas`.

## Fora de escopo
Limite por dia ou por semana para horários com intervalo entre si, limite diferente por sala ou perfil, limite configurável,
exceções para a secretaria, duração mínima, login ou cadastro de professor (SPEC futura).

## Riscos e perguntas
Decididas:
- Reserva de exatamente 4 horas é aceita.
- O limite de 4 horas vale para cada reserva e para a sequência encostada do mesmo professor na mesma sala.
- O mesmo professor não pode pedir a mesma sala em seguida (reserva encostada) quando a soma passa de 4 horas.
  Se a soma for de até 4 horas, é aceita.
- A recusa da reserva encostada é 409, com texto próprio (mensagem B).
- Uma reserva acima de 4 horas recebe 400 com a mensagem A.
- Os textos das mensagens A e B são os que estão no início dos critérios.
- Pedido no passado recebe o erro do passado, mesmo que também passe de 4 horas.
- Ordem das checagens: primeiro as validações que já existem, na ordem atual (campos obrigatórios, sala, datas,
  fim depois do início); depois passado, duração, sobreposição (SPEC-001) e reserva encostada.
- Com três ou mais reservas encostadas do mesmo professor, soma-se a sequência inteira, inclusive quando o novo pedido
  une duas reservas. A reserva de outro professor interrompe a sequência.
- Mesmo professor: a comparação de `responsavel` ignora maiúsculas e espaços no início e no fim (`Ana`, `ana` e `Ana `
  são a mesma pessoa). Acentos continuam diferenciando, e o valor guardado não muda.
- Exceção à SPEC-001 CA-2: horário encostado continua não sendo sobreposição, mas esta SPEC recusa o pedido do mesmo
  professor quando a soma passa de 4 horas. Ex.: com `Ana` no lab-1 das 08h às 12h, o pedido das 12h às 13h é aceito
  se for de `Bruno` e recusado se for de `Ana`.
- Não há reservas longas (acima de 4 horas) antigas a tratar, **desde que** este limite entre antes da persistência
  (SPEC-003) ou junto com ela. Hoje as reservas ficam só na memória e se perdem quando o servidor reinicia.
- Ainda não há login, que terá uma SPEC própria. Até lá, o professor é identificado pelo texto de `responsavel`.

Pendência para a SPEC de login (não bloqueia nenhum critério): `responsavel` que não é texto (ex.: `123`) ou que tem só
espaços continua aceito, como hoje. A comparação trata o valor como texto, e um número não pode causar erro.

Precisão: a duração é medida em milissegundos. Frações menores são ignoradas, então um fim em `12:00:00.0001` é lido
como `12:00:00` (4h exatas) e aceito.

Risco conhecido: com 1 minuto de intervalo as reservas deixam de ser encostadas, e o mesmo professor passa de 4 horas no total.

---
Conferência antes de aprovar (ou rode `/revisar-spec` no Claude Code):
- [x] Todo critério vira um teste automático sem interpretação
- [x] Há pelo menos um caso de erro e um caso de borda
- [x] "Fora de escopo" tem pelo menos um item
- [x] Nenhuma pergunta aberta bloqueia o primeiro critério
