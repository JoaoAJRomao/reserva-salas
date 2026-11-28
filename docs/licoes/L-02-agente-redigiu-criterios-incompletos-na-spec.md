# L-02 · O agente redigiu critérios de aceite incompletos, que ainda exigiam interpretação para virar teste

- **Data e lab:** 28/11, Aula 2
- **Ferramenta e modelo:** Claude Code, Claude Sonnet 5.5

**O que aconteceu (com evidência):** Depois de responder às perguntas da revisão (nota 3/10), pedimos o ajuste da
SPEC-002. O agente redigiu os critérios, e aprovamos o plano com o texto completo. Entre eles:

> **CA-6** · Dado que não existe reserva com id 99, quando peço o cancelamento dela, então recebo 404 com a mensagem N.
>
> **CA-8** · Dado a reserva 1, quando peço o cancelamento com o id `abc`, `0`, `-1` ou `1.5`, então recebo 404
> com a mensagem N, e a reserva continua guardada.

Nenhum dos dois dizia o que ia no corpo do pedido. Pela ordem das checagens da própria SPEC, um pedido sem
`responsavel` receberia 400, e não 404. Havia outras lacunas:
- no CA-9, "texto vazio" podia ser o corpo ou o campo;
- o CA-4 e o CA-11 conferiam só a resposta, então passariam mesmo sem a reserva ser cancelada;
- o CA-5 não informava a sala nem o horário da reserva de `João`;
- o CA-16 não definia a reserva 2.

O problema apareceu quando rodamos `/revisar-spec` de novo. O próprio agente deu 8/10 e apontou os critérios CA-4,
6, 8, 9, 11 e 16 (e o CA-15, para explicitar dados). A falta de dados no CA-5 só foi apontada na revisão seguinte
(9/10). Corrigimos a SPEC antes da implementação.

**Esperado:** antes de mostrar o texto, o agente deveria conferir se cada critério vira teste sem interpretação: dados
existentes definidos, pedido completo, resposta exata e efeito observável. Também deveria conferir se o resultado
bate com a ordem das checagens.

**Por que aconteceu:** os critérios descreviam o comportamento que cada um queria provar e deixavam o resto do pedido
implícito. O agente não conferiu cada um contra a ordem das checagens definida na mesma SPEC. A verificação do plano
incluía o limite de 4h (lição L-01), mas não a completude dos critérios. Do nosso lado, aprovamos o texto sem notar
as lacunas e poderíamos ter instigado mais os casos de borda.

**Sugestão:** acrescentar ao `AGENTS.md`, em "Como trabalhar": "Antes de propor um critério de aceite, simule o teste:
diga os dados existentes, o pedido completo (URL e corpo), o status, a mensagem e o efeito observável. Confira o
resultado contra a ordem das checagens e liste os casos de borda para uma pessoa decidir."

**Virou regra?** não
