---
name: entregar
description: Organiza as alterações em commits, faz o push e abre o PR, com confirmação a cada etapa. Use somente quando a pessoa pedir.
argument-hint: "[o que entra nesta entrega]"
disable-model-invocation: true
---
# Entregar: commit, push e PR no padrão do projeto

O que entra nesta entrega, se a pessoa informou: $ARGUMENTS

São **três confirmações**: antes do commit, antes do push e antes de abrir ou editar o PR. Cada uma vale só para a
sua etapa, e só para o que foi mostrado: se algo mudar depois, confirme de novo. Se a resposta for "não", pare e diga
o que já foi feito.

## Nunca
- Usar `--no-verify` ou `--force`, fazer commit ou push na `main`, ou fazer merge de PR.
- Usar `git reset --hard` ou descartar alterações.
- Alterar ou apagar teste, ou mudar código, para o hook passar.
- Se o hook, os testes ou a procura de segredo falharem, pare e relate a saída.

## 1. Diagnóstico (só leitura)
1. Rode `git fetch`, `git status -sb --untracked-files=all`, `git diff HEAD` e `git log origin/main..HEAD`.
   Leia também o conteúdo dos arquivos novos: eles não aparecem no `git diff`.
2. Veja o PR da branch: `gh pr list --head <branch> --state all`.

| Situação | O que fazer |
|---|---|
| Na `main` | Propor branch nova `tipo/descricao` |
| PR aberto | Se a mudança é do mesmo assunto, atualizar esse PR |
| PR mergeado ou fechado, sem outro aberto | Não enviar para essa branch; propor outra a partir da `origin/main` |
| Sem PR | Seguir nesta branch, se o assunto combina, e abrir o PR no fim |

3. Separe o que **não é do mesmo assunto** da entrega, da branch ou do PR e pergunte o destino. Nunca inclua sem
   avisar. Se trocar de branch puser alguma alteração em risco, pare e pergunte.
4. Branch nova nasce com `git switch --no-track -c <branch> origin/main`, para não ficar ligada à `main`. Só a crie
   depois da confirmação 1. Commits locais que não estão na `origin/main` não vão junto: avise se houver.
5. Sem nada para commitar, mas com commits ainda não enviados: vá para o passo 5. Sem nada para enviar: vá para o
   passo 6 se faltar o PR; senão, avise e encerre.

## 2. Revisão (se a entrega muda `src/` ou `test/`)
- Chame o subagente `revisor` **antes do `git add`**. Só dispense se ele já respondeu APROVADO nesta conversa e o código
  não mudou depois.
- No pedido, mande ler `git diff origin/main...HEAD` (a `main` local pode estar atrasada), `git diff HEAD` e **os arquivos novos**, citados pelo nome. Sem isso,
  ele pode aprovar sem ver a mudança.
- Se a resposta for **BLOQUEADO**, pare e mostre os achados.
- Em `test/`, confira se alguma linha antiga foi removida ou afrouxada. Se foi, pare e pergunte.

## 3. Organizar os commits (confirmação 1)
- Um commit por assunto. A divisão é uma **proposta**: a aprovação de uma SPEC, por exemplo, pode ir separada do
  código ou junto com ele.
- Mensagem em português: `tipo(escopo): verbo no presente …`, citando a SPEC quando houver. Corpo curto com o porquê,
  quando não for óbvio.

| O que mudou | Prefixo usual |
|---|---|
| `docs/specs/` | `docs(spec)` |
| `diario/` e `docs/licoes/` | `docs(diario)` |
| `.claude/skills/` | `docs(skill)` |
| `CLAUDE.md` | `docs(claude)` |
| Regra de negócio em `src/`, com os testes dela | `feat(reservas)` ou `fix(reservas)` |
| Só testes | `test(app)` ou `test(reservas)` |
| Outros | `chore` ou o tipo e o escopo que descrevam a mudança |

- Termine cada mensagem com as linhas de atribuição que a sessão atual indicar, se houver.
- Mostre a branch (e se ela será criada), os arquivos e a mensagem completa de cada commit, e o que fica de fora.
- Avise em destaque se entrar algo de `.github/` ou o `.claude/settings.json`: o `AGENTS.md` exige pedido para mexer
  neles.
- **Espere o OK.**

## 4. Commit
- Use `git add` com os caminhos de cada commit, nunca `-A` nem `.`. Se já houver em stage algo fora do plano, avise
  antes de continuar.
- Grave cada mensagem num arquivo temporário fora do repositório e use `git commit -F <arquivo>`. **Nunca use o mesmo
  arquivo para a mensagem do commit e para o texto do PR.**
- Se `git config core.hooksPath` não for `.githooks`, o hook está desligado: antes de cada commit, rode
  `node scripts/bloqueia-segredo.js --git` e `npm test`.
- Depois dos commits, rode `npm run segredos` e `npm test`, e confira as mensagens com `git log origin/main..HEAD`.
- Os testes rodam na pasta de trabalho, não só no que foi commitado. Se ficou algo de fora, registre essa ressalva na
  seção "Verificação" do PR.

## 5. Push (confirmação 2)
- Mostre o que vai subir com `git log --stat origin/<branch>..HEAD` (branch nova: `origin/main..HEAD`).
- Se a branch já tem PR aberto, avise que o push **atualiza o PR na hora**.
- **Espere o OK.** Depois, rode `git push -u origin <branch>`. Se for rejeitado, pare e explique.

## 6. PR (confirmação 3)
- Título no mesmo estilo da mensagem de commit.
- O texto cobre **todos** os commits da branch (`git log origin/main..HEAD`), com estas seções:
  - `## O que muda`
  - `## Verificação`: só o que foi **realmente rodado**, com o resultado, e o que não foi testado.
  - `## Limitações conhecidas`: em funcionalidade nova.
  - `## Pendências`
- Termine com a linha de atribuição para PR que a sessão atual indicar, se houver.
- Mostre o título e o texto e **espere o OK**.
- Sem PR aberto: `gh pr create --base main --title "<título>" --body-file <arquivo>`.
- Com PR aberto: proponha o novo texto, mantendo o que já estava escrito e ainda vale. Só rode `gh pr edit` depois do OK.

## No fim
Entregue o link do PR, resuma os commits, diga o que ficou de fora e lembre que o merge depende do CI verde e da
aprovação de uma pessoa.
