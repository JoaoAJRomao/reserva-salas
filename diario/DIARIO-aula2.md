# Diário de bordo do grupo

Uma entrada por aula. Vale 20% da nota e é avaliado pela **honestidade**, não pela ausência de erro.
Quem não registra o erro, repete o erro.

- **Grupo:** João Arthur
- **Tema do projeto:** reserva-salas
- **Ferramenta(s):** Claude Code

---

## Entrada 2 · Aula 2 · 28/11/2026

SPEC-002 (cancelar reserva): da revisão do rascunho até a implementação e o PR #7. No fim, a skill
`escrever-mensagem-erro`.

**O que pedimos ao agente (os 3 prompts mais importantes, copiados):**
1. "O cancelamento é imediato. Professor já decidiu que vai cancelar. Talvez seja melhor alterar spec para professor ser dono? Professor quem decide se cancela reserva." (trecho)
2. "A seção 1 apresenta excelentes sugestões. Atualize a spec com elas nos campos indicados. Responsavel com espaço vazio não é permitido, pois não é permitido responsavel com nome em branco/vazio. Aceito sugestão sobre identificar reserva 1. Adiciona a seção Riscos Conhecidos o trecho sobre cancelamento depois de um reinicio."
3. "Crie uma nova branch para spec-02. Planeje a implementação da SPEC-002, começando pelos testes."

**3 acertos do agente:**
- Mostrou que cancelar uma reserva em andamento ou encerrada furaria o limite de 4h da SPEC-005 (ex.: usar das 08h às 12h, cancelar e reservar das 12h às 16h, somando 8h seguidas).
- Avisou de conflitos antes de escrever: a resposta 204 não permite a mensagem de sucesso, e recusar nome só com espaços na criação contrariava um trecho da SPEC-005 aprovada.
- Escreveu os testes antes do código: dos 122, 35 falharam e 87 passaram (os 86 antigos e o CA-21, previsto no plano). No fim, 124 de 124 passaram, sem remover linhas dos testes.

**Erros do agente (pelo menos 1, com evidência):**
- Redigiu na SPEC-002 critérios incompletos, que ele mesmo apontou na revisão seguinte (nota 8/10). O CA-6 e o CA-8 não diziam o que ia no corpo, e pela ordem das checagens a resposta poderia ser 400 em vez de 404. No CA-9, "texto vazio" era ambíguo. O CA-4 e o CA-11 não conferiam se a reserva sumia. O CA-16 não definia a reserva 2. Corrigidos a nosso pedido. → virou a lição `docs/licoes/L-02-agente-redigiu-criterios-incompletos-na-spec.md`
- Escreveu na SPEC que "a criação continua aceitando `responsavel` que não é texto", mas a criação já recusava `0`, `false` e `null`. Ele apontou na revisão seguinte, e a frase foi trocada. → não virou lição
- Deixou sem teste duas decisões da SPEC (`responsavel: null` e o erro 400 antes do 404). O subagente revisor apontou, e os 2 testes entraram depois, passando de primeira. → não virou lição

**O que nós decidimos (e o agente não podia decidir):**
- O cancelamento é imediato, só o professor dono decide, e não há confirmação da secretaria ou da coordenação.
- Pode cancelar até o instante exato do início; depois disso, não. O agente recomendava recusar no instante exato.
- Os status 403 e 404 das recusas e a base dos textos das mensagens. No sucesso, pedimos 204 com mensagem e, avisados do conflito, escolhemos 200.
- `responsavel` em branco é recusado no cancelamento e também na criação. O agente recomendava mudar só o cancelamento.
- `responsavel` que não é texto não cancela. Aceitamos as recomendações de responder 400 com texto próprio e de deixar o texto "123" cancelar a reserva criada com o número 123.
- Aceitando recomendações: id de reserva cancelada não é reaproveitado, o pedido é `DELETE /reservas/{id}` com o nome no corpo, e só o id exato identifica a reserva.
- Usar "responsável" com acento na mensagem, aprovar a SPEC-002, marcar a lista de conferência e pedir o commit, o push e o PR.

**Custo e tempo:** US$ 4,36 (estimado) · 88 minutos de sessão (wall: 1h28min), dos quais o tempo de API foi de 19min26s

**O que faríamos diferente:**
- Teríamos instigado mais os casos de borda.
