# Diário de bordo do grupo

Uma entrada por aula. Vale 20% da nota e é avaliado pela **honestidade**, não pela ausência de erro.
Quem não registra o erro, repete o erro.

- **Grupo:** João Arthur
- **Tema do projeto:** reserva-salas
- **Ferramenta(s):** Claude Code

---

## Entrada 1 · Aula 1 · 19/11/2026

Inclui o trabalho na SPEC-005, feito com o agente em 26 e 27/11/2026.

**O que pedimos ao agente (os 3 prompts mais importantes, copiados):**
1. "O limite é por reserva. O mesmo professor nao pode solicitar a mesma sala em seguida (reserva enconstrada). Quando der 400, o texto deve ser 'Reserva não realizada por periodo acima de 4 horas'. Se pedido de reserva estiver no passado, o erro é a do passado. Não levar em conta reservas longas já guardadas. Ajusta spec com esses essas respostas para a seção riscos e perguntas?"
2. "A sugestão de reserva já guardada quebra o propósito de reserva com duração máxima de 4 horas. Consegue me explicar o por que dessa sugestão?" (trecho)
3. "inicia implementação da @docs/specs/SPEC-005-limitar-duracao-da-reserva.md"

**3 acertos do agente:**
- Avisou que recusar reservas encostadas criava uma exceção à SPEC-001 CA-2.
- Escreveu os testes antes do código: 25 falharam antes e os 86 passaram depois.
- Conferiu os exemplos de datas com node e achou um erro no CA-4 que ele mesmo tinha escrito.

**Erros do agente (pelo menos 1, com evidência):**
- Sugeriu um CA-18 para reservas longas antigas sem avisar que ele permitiria 6h seguidas na sala (08h–13h antiga + 13h–14h nova). Questionamos, e a regra das reservas antigas foi retirada. → virou a lição `docs/licoes/L-01-criterio-sugerido-contrariava-o-objetivo-da-spec.md`
- Escreveu no CA-4 que o exemplo durava 7h, mas durava 4h. Corrigido após conferência com node.
- Escreveu em um comentário do código que JSON.stringify não quebrava com nenhum valor vindo de JSON. O subagente revisor mostrou que era falso com listas muito aninhadas. O comentário foi corrigido; o erro com essas listas continua.

**O que nós decidimos (e o agente não podia decidir):**
- 4h exatas são aceitas.
- Reservas encostadas do mesmo professor na mesma sala só são recusadas se a soma passar de 4h, contando a sequência inteira.
- "Ana", "ana" e "Ana " são a mesma pessoa.
- Os textos das mensagens de erro e a exceção à SPEC-001 CA-2.
- Retirar a regra das reservas antigas (aceitando a recomendação feita após nosso questionamento).
- Login fica para outra SPEC.

**Custo e tempo:** US$ 3,99 (/cost) · 160 minutos de sessão (wall: 2h40min), dos quais o tempo de API foi de 16min31s

**O que faríamos diferente:**
- Dar exemplos de casos poderia ter facilitado o trabalho no momento de criar o casos de aceite.
