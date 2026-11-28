# SPEC-002 · Cancelar reserva

- **Situação:** aprovada
- **Dono:** Coordenação do curso

## Problema
Professores precisam cancelar uma reserva por algum contratempo e não conseguem, porque o sistema não tem um meio
de cancelar a reserva da sala.

## Quem usa
Professores (cancelam as próprias reservas; a decisão é só deles) e secretaria (consulta a agenda).
Cerca de 80 professores, 3 salas.

## Critérios de aceite
O pedido é `DELETE /reservas/{id}` com o corpo `{"responsavel": "..."}`. O cancelamento é imediato, sem confirmação.
Salvo indicação, agora é `2026-11-30T08:00:00-03:00` e a reserva 1, de `Carlos`, ocupa o lab-1 de
`2026-12-01T14:00:00-03:00` a `2026-12-01T16:00:00-03:00`.

- **Mensagem S:** `Reserva cancelada com sucesso.`
- **Mensagem D:** `Não é responsável pela reserva. Solicitação não realizada.`
- **Mensagem I:** `Reserva iniciada não permite ser cancelada.`
- **Mensagem N:** `Reserva não encontrada. Impossível cancelar.`

"Continua guardada" quer dizer que `GET /reservas` devolve a reserva com os mesmos dados.

- **CA-1** · Dado a reserva 1, quando `Carlos` pede o cancelamento, então recebe 200 com `{"mensagem": S}`,
  e ela não aparece em `GET /reservas` nem em `GET /reservas?sala=lab-1`.
- **CA-2** · Dado que a reserva 1 foi cancelada, quando `Bruno` pede o lab-1 no mesmo horário, então a reserva é criada (201).
- **CA-3** · Dado a reserva 1, quando `Ana` pede o cancelamento, então recebe 403 com a mensagem D, e a reserva continua guardada.
- **CA-4** · Dado a reserva 1, quando `carlos ` (minúsculo e com espaço no fim) pede o cancelamento, então recebe 200
  com a mensagem S, e a reserva 1 não aparece em `GET /reservas`.
- **CA-5** · Dado a reserva 2, de `João`, no lab-2, em 01/12 das 14h às 16h (`-03:00`), quando `Joao` (sem acento) pede o
  cancelamento dela, então recebe 403 com a mensagem D, e a reserva continua guardada.
- **CA-6** · Dado que não existe reserva com id 99, quando `Carlos` pede o cancelamento do id 99, então recebe 404
  com a mensagem N.
- **CA-7** · Dado que a reserva 1 já foi cancelada, quando `Carlos` pede o cancelamento de novo, então recebe 404
  com a mensagem N.
- **CA-8** · Dado a reserva 1, quando `Carlos` pede o cancelamento com o id `abc`, `0`, `-1`, `1.5`, `01`, `1.0` ou `+1`,
  então recebe 404 com a mensagem N, e a reserva 1 continua guardada.
- **CA-9** · Dado a reserva 1, quando peço o cancelamento sem corpo, com `{}`, com `{"responsavel": ""}` ou com
  `{"responsavel": "   "}` (só espaços), então recebo 400 com `Campos obrigatórios: responsavel`, e a reserva continua
  guardada.
- **CA-10** · Dado a reserva 1, quando envio um corpo que não é JSON válido, então recebo 400 com
  `JSON inválido no corpo da requisição`, e a reserva continua guardada.
- **CA-11** · Dado que agora é `2026-12-01T14:00:00-03:00` (instante exato do início), quando `Carlos` pede o
  cancelamento, então recebe 200 com a mensagem S, e a reserva 1 não aparece em `GET /reservas`.
- **CA-12** · Dado que agora é `2026-12-01T14:00:00.001-03:00`, quando `Carlos` pede o cancelamento, então recebe 403
  com a mensagem I, e a reserva continua guardada.
- **CA-13** · Dado que agora é `2026-12-01T17:00:00-03:00` (reserva encerrada), quando `Carlos` pede o cancelamento,
  então recebe 403 com a mensagem I, e a reserva continua guardada.
- **CA-14** · Dado que agora é `2026-12-01T15:00:00-03:00`, quando `Ana` pede o cancelamento da reserva 1 (iniciada e
  de outra pessoa), então recebe 403 com a mensagem D, e não a I.
- **CA-15** · Dado reservas de `Ana` no lab-1 em 01/12 das 08h às 09h, das 09h às 10h e das 10h às 12h (`-03:00`),
  além da reserva 1, quando `Ana` cancela a das 09h às 10h (200) e depois pede o lab-1 das 12h às 14h, então a nova
  reserva é criada (201): a sequência passa a somar 4h, das 10h às 14h. A reserva 1, de outro professor, não entra
  na soma.
- **CA-16** · Dado a reserva 1 e a reserva 2, de `Ana`, no lab-2, em 01/12 das 14h às 16h (`-03:00`), quando `Ana`
  cancela a reserva 2 e `Bruno` pede o mesmo horário no lab-2, então a reserva é criada (201) com id 3. O id de uma
  reserva cancelada nunca é reaproveitado.
- **CA-17** · Dado o lab-1 livre, quando peço uma reserva (`POST /reservas`) com os demais dados válidos e
  `responsavel` igual a `"   "` (só espaços), então recebo 400 com `Campos obrigatórios: responsavel`, e a reserva
  não aparece em `GET /reservas`.
- **CA-18** · Dado uma reserva criada com `responsavel` igual ao número `123`, quando peço o cancelamento com
  `responsavel` igual a `123` (número), `0`, `false`, `["123"]` ou `{"nome": "123"}`, então recebo 400 com
  `O campo responsavel precisa ser um texto.`, e a reserva continua guardada.
- **CA-19** · Dado uma reserva criada com `responsavel` igual ao número `123`, quando peço o cancelamento com
  `responsavel` igual ao texto `"123"`, então recebo 200 com a mensagem S, e a reserva não aparece em `GET /reservas`.
- **CA-20** · Dado uma reserva criada com `responsavel` igual a `true` ou à lista `["Ana"]`, quando peço o cancelamento
  dela com o texto correspondente (`"true"` ou `"[\"Ana\"]"`), então recebo 200 com a mensagem S, e a reserva não
  aparece em `GET /reservas`.
- **CA-21** · Dado a reserva 1, quando `Carlos` envia `DELETE /reservas`, `DELETE /reservas/` ou `DELETE /reservas/1/`,
  então recebe 404 com `Rota não encontrada`, e a reserva 1 continua guardada.

## Fora de escopo
Notificação por e-mail, login, confirmação ou aprovação do cancelamento, cancelamento pela secretaria ou coordenação
em nome do professor, remarcação ou edição, cancelamento em lote ou de reserva recorrente, antecedência mínima,
consulta de canceladas, motivo do cancelamento, desfazer o cancelamento, persistência (SPEC-003).

## Riscos e perguntas
Decididas:
- O cancelamento é imediato, e só o professor que fez a reserva decide.
- Sucesso é 200, e não 204, porque a resposta 204 não permite corpo com a mensagem.
- Pode cancelar se `agora <= inicio`. Só é recusado se `agora > inicio`, inclusive depois do fim.
- Ordem das checagens: dados do pedido (400), reserva existe (404), é o dono (403), ainda não passou do início (403).
- Aproveitado da SPEC-005: a comparação de `responsavel` ignora maiúsculas e espaços no início e no fim, e diferencia
  acentos. A ordem das checagens é fixa.
- A reserva cancelada deixa de contar nos conflitos (SPEC-001, CA-2) e na soma de 4 horas (SPEC-005).
- Recusar o cancelamento depois do início impede liberar um horário já usado para ultrapassar as 4 horas da SPEC-005.
- `responsavel` vazio ou só com espaços não é permitido, na criação e no cancelamento. Vale como campo ausente (400),
  na primeira etapa das checagens. Isto substitui, na SPEC-005, o trecho que continuava aceitando nome só com espaços.
- No cancelamento, `responsavel` que não é texto é recusado com 400, na primeira etapa das checagens, antes de procurar
  a reserva. `null` vale como campo ausente (`Campos obrigatórios: responsavel`).
- Esta SPEC não muda como a criação trata um `responsavel` que não é texto.
- Uma reserva guardada com `responsavel` que não é texto pode ser cancelada com o texto correspondente ao valor escrito
  em JSON, como na comparação da SPEC-005: `123` vira `"123"`, `true` vira `"true"` e `["Ana"]` vira `["Ana"]`.
  Vale para valores comuns; estruturas aninhadas em milhares de níveis ficam para a SPEC de login.
- A mensagem N vale para um id informado em `/reservas/{id}`. `DELETE /reservas`, `/reservas/` e `/reservas/1/` são
  rotas inexistentes (404 `Rota não encontrada`).
- No cancelamento, só o id escrito exatamente identifica a reserva: `1` vale; `01`, `1.0` e `+1` recebem 404.

Riscos conhecidos:
- Sem login, quem souber o nome do dono consegue cancelar a reserva.
- Na criação, `responsavel` que não é texto segue a pendência da SPEC-005 para a SPEC de login.
- A SPEC-003 (rascunho) deixa o cancelamento fora de escopo. Quando a persistência entrar, falta definir em qual SPEC
  fica a garantia de que a reserva cancelada não volta e de que o id não é reaproveitado após um reinício.
  Isso não bloqueia esta entrega, com dados em memória, mas precisa estar definido antes de aprovar a SPEC-003.

---
Conferência antes de aprovar (ou rode `/revisar-spec` no Claude Code):
- [x] Todo critério vira um teste automático sem interpretação
- [x] Há pelo menos um caso de erro e um caso de borda
- [x] "Fora de escopo" tem pelo menos um item
- [x] Nenhuma pergunta aberta bloqueia o primeiro critério
