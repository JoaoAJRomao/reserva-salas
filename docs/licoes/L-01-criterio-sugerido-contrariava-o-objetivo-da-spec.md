# L-01 · O agente sugeriu um critério que contrariava o objetivo da SPEC sem avisar

- **Data e lab:** 27/11, Aula 1
- **Ferramenta e modelo:** Claude Code, Claude Sonnet 5.5

**O que aconteceu (com evidência):** Na revisão da SPEC-005 (`/revisar-spec`), o agente apontou que a decisão sobre
reservas longas já guardadas não tinha critério e sugeriu:

> **CA-18** · Dado uma reserva já guardada de `Ana` no lab-1 em 01/12 das 08h às 13h (5h, `-03:00`), quando `Ana` pede
> o lab-1 das 13h às 14h, então a reserva é criada (201).

Com isso, Ana ficaria 6h seguidas na sala, em uma SPEC que limita a 4h. O agente não avisou. Questionamos:
"A sugestão de reserva já guardada quebra o propósito de reserva com duração máxima de 4 horas. Consegue me explicar
o por que dessa sugestão?" O agente reconheceu o problema. Somada à nossa decisão de que a reserva antiga interrompia
a sequência, Ana ainda poderia pedir das 13h às 17h e ficar 9h seguidas. O agente então recomendou retirar a regra,
e aceitamos. O critério sugerido não entrou na SPEC (o CA-18 atual trata de outro caso).

**Esperado:** ao propor o critério, o agente deveria mostrar que o resultado contrariava o limite de 4h, questionar a
decisão que levava a isso e só então propor um teste.

**Por que aconteceu:** o agente transformou em teste a decisão já registrada ("reservas já guardadas ficam de fora"),
sem conferir o resultado contra o objetivo da SPEC. Também não tinha avaliado se esse caso podia acontecer: as reservas
ficam só na memória, e a SPEC-003 diz que não há dados antigos para migrar.

**Sugestão:** acrescentar ao `AGENTS.md`, em "Como trabalhar": "Antes de propor ou registrar um critério, compare o
resultado dele com o Problema da SPEC. Se contrariar o objetivo, avise e mostre um exemplo. Diga também se o caso pode
acontecer no sistema atual."

**Virou regra?** não
