# SPEC-003 · Guardar as reservas de forma permanente

- **Situação:** rascunho
- **Dono:** coordenação do curso (a confirmar)

## Problema
Hoje as reservas ficam só na memória do servidor (`const reservas = []` em `src/app.js`). Sempre que o servidor
reinicia (atualização, queda, nova publicação na nuvem), **todas as reservas somem** e as salas voltam a parecer livres.
Isso recria o problema que a SPEC-001 resolve: duas turmas na mesma sala e no mesmo horário, desta vez sem aviso.
Os ids também voltam a 1 depois de cada reinício, então um id deixa de identificar a mesma reserva ao longo do tempo.

## Quem usa
Professores (fazem a reserva) e secretaria (consulta a agenda). Cerca de 80 professores e 3 salas: volume baixo,
mas a agenda precisa durar dias e semanas.

## Critérios de aceite
- **CA-1** · Dado uma reserva criada (201), quando o servidor é reiniciado, então `GET /reservas` ainda lista essa reserva,
  com os mesmos dados (sala, início, fim, responsável) e o mesmo id.
- **CA-2** · Dado uma reserva no lab-1 das 14h às 16h criada antes de um reinício, quando peço o lab-1 das 15h às 17h
  depois do reinício, então recebo 409. As regras da SPEC-001 continuam valendo sobre as reservas guardadas.
- **CA-3** · Dado duas requisições conflitantes (mesma sala, horários que se sobrepõem) enviadas ao mesmo tempo,
  quando o servidor as processa, então exatamente uma recebe 201 e a outra recebe 409.
- **CA-4** · Dado reservas com ids 1 e 2 guardadas, quando o servidor reinicia e uma nova reserva é criada,
  então ela recebe id 3. Um id nunca é reaproveitado para outra reserva.
- **CA-5** · Dado que o armazenamento está indisponível (não abre, sem permissão ou sem espaço), quando peço uma reserva,
  então recebo 503 com mensagem clara, e a reserva não fica pela metade nem aparece em `GET /reservas`.

## Fora de escopo
Cancelamento de reserva (SPEC-002), backup e restauração, mais de um servidor ao mesmo tempo, migração de dados antigos
(não existem, a memória começa vazia), login, relatórios e qualquer tela.

## Riscos e perguntas
Perguntas 1 a 3 bloqueiam a implementação.
1. **Qual armazenamento?** Decisão de arquitetura, ainda em aberto. O projeto não tem dependências (`AGENTS.md`), e instalar uma exige autorização.
   - *`node:sqlite`:* sem dependência nova e com transação. É experimental (emite `ExperimentalWarning`) e só existe a partir do Node 22.5, enquanto o `package.json` exige `>=20`. Seria preciso subir o requisito.
   - *Arquivo JSON:* sem dependência e simples, mas serve só para um servidor e exige que as gravações sejam feitas uma de cada vez.
   - *Banco com driver (SQLite ou Postgres):* o caminho mais comum para a nuvem. Pede dependência nova, e o Postgres pede infraestrutura.
2. **Quantos servidores vão rodar ao mesmo tempo?** Com mais de um, arquivo local ou SQLite local não servem (CA-3 deixa de valer).
3. **Onde os dados ficam na nuvem?** Em vários provedores o disco do servidor é descartado a cada publicação. Se o arquivo ficar nele, o CA-1 falha no ambiente real mesmo passando no teste.
4. **Conflito atômico:** a checagem de sobreposição e a gravação precisam acontecer como uma operação só (transação, ou gravações em fila). Sem isso, o CA-3 não é garantido.
5. **Segredos:** se houver string de conexão ou senha, ela vem de variável de ambiente (ver `.env.exemplo`), nunca de arquivo versionado.
6. **Testes:** precisam usar um armazenamento isolado (arquivo temporário ou em memória), nunca os dados reais.
7. **Ids:** a regra "maior id + 1" da SPEC-001 é provisória. Com armazenamento próprio, o id passa a vir dele (CA-4).

---
Conferência antes de aprovar (ou rode `/revisar-spec` no Claude Code):
- [ ] Todo critério vira um teste automático sem interpretação
- [ ] Há pelo menos um caso de erro e um caso de borda
- [x] "Fora de escopo" tem pelo menos um item
- [ ] Nenhuma pergunta aberta bloqueia o primeiro critério (as perguntas 1 a 3 bloqueiam)
