# SPEC-004 · Filtrar reservas por sala

- **Situação:** aprovada
- **Dono:** coordenação do curso (a confirmar)

## Problema
A secretaria consulta a agenda para saber o que está reservado em cada sala, mas `GET /reservas` devolve as reservas
das 3 salas misturadas. Para ver só o lab-1 é preciso separar à mão.

## Quem usa
Secretaria (consulta a agenda). Cerca de 80 professores e 3 salas.

## Critérios de aceite
- **CA-1** · Dado reservas no lab-1 e no auditório, quando peço `GET /reservas?sala=lab-1`, então recebo 200 só com as reservas do lab-1,
  cada uma com os mesmos campos de `GET /reservas` (id, sala, início, fim, responsável).
- **CA-2** · Dado uma sala que existe e não tem reservas (lab-2), quando peço `GET /reservas?sala=lab-2`, então recebo 200 com lista vazia `[]`.
  Sala sem reserva não é erro.
- **CA-3** · Dado a sala `sala-x`, que não existe, quando peço `GET /reservas?sala=sala-x`, então recebo 404 com a mensagem
  `Sala não encontrada: sala-x`, a mesma do pedido de reserva.
- **CA-4** · Dado reservas no lab-1 e no auditório, quando peço `GET /reservas` sem o parâmetro `sala`, então recebo 200 com as duas reservas.
- **CA-5** · Dado o parâmetro vazio, quando peço `GET /reservas?sala=`, então recebo 404 com `Sala não encontrada: `, e não a lista completa.
- **CA-6** · Dado a sala `lab-1`, quando peço `GET /reservas?sala=LAB-1`, então recebo 404. O id da sala é exato, igual ao pedido de reserva.
- **CA-7** · Dado o parâmetro repetido, quando peço `GET /reservas?sala=lab-1&sala=lab-2`, então recebo 400 com a mensagem
  `Informe uma única sala`.

## Fora de escopo
Filtrar por mais de uma sala ao mesmo tempo (`?sala=lab-1,lab-2`), filtrar por data, por responsável ou por reserva passada ou futura,
ordenação, paginação, cache, cancelamento (SPEC-002), persistência (SPEC-003).

## Riscos e perguntas
Decididas e confirmadas:
- `?sala=` vazio devolve 404 em vez de listar tudo, para que um erro de digitação não devolva todas as salas em silêncio.
- O id da sala é comparado de forma exata. Espaços antes ou depois (`lab-1%20`) fazem a sala não existir (404); nada é cortado.
- O filtro devolve também reservas já passadas: ele não olha o horário, só a sala.
- A ordem é a mesma de `GET /reservas` hoje (ordem de criação). Ordenar por horário fica para outra SPEC.
- Outros parâmetros desconhecidos (ex.: `?data=…`) são ignorados em silêncio, como hoje. O filtro só entende `sala`.
- O parâmetro `sala` em outros métodos (ex.: `POST /reservas?sala=lab-1`) é ignorado.
