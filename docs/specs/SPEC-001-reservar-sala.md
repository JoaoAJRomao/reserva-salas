# SPEC-001 · Reservar sala

- **Situação:** aprovada · CA-1 pronto · CA-3 no Lab 1 · CA-2 no Lab 3
- **Dono:** coordenação do curso

## Problema
Professores reservam salas por e-mail com a secretaria. Toda semana há duas turmas marcadas
na mesma sala e no mesmo horário, e a aula começa com 15 minutos de improviso.

## Quem usa
Professores (fazem a reserva) e secretaria (consulta a agenda). Cerca de 80 professores, 3 salas.

## Critérios de aceite
- **CA-1** · Dado uma sala livre, quando reservo das 14h às 16h, então a reserva é criada (201).
- **CA-2** · Dado uma reserva no lab-1 das 14h às 16h, quando outra pessoa pede o lab-1 das 15h às 17h,
  então recebe 409 com a mensagem do conflito. Horário encostado (16h às 18h) **não** é conflito.
  Outra sala no mesmo horário **não** é conflito. A mensagem do conflito mostra o horário da reserva
  existente no fuso da faculdade (`-03:00`), ex.: `2026-12-01T14:00:00-03:00`.
- **CA-3** · Dado o horário atual, quando peço uma reserva que começa no passado, então recebo 400.
- **CA-4** · Dado um pedido com data sem fuso (ex.: `2026-12-01T14:00:00`), quando tento reservar, então recebo 400.
- **CA-5** · Dado um pedido com data que não existe no calendário (ex.: 30 de fevereiro, 31 de abril, `24:00`),
  quando tento reservar, então recebo 400. A data não é "corrigida" para outro dia. 29 de fevereiro só existe em ano bissexto.

## Fora de escopo
Cancelamento (SPEC-002), reserva recorrente, aprovação, notificação por e-mail, login.

## Riscos e perguntas
- Fuso horário: todas as datas em ISO 8601 com fuso (ex.: `-03:00`).
  (Decidido: data sem fuso é recusada com 400, não assumida. O fuso da faculdade só é usado para exibir mensagens.)
- Reserva que começa agora, neste minuto, é passado? (Decidido: só é passado se `inicio < agora`.)
