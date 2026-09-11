# Contribuindo

## Fluxo de trabalho

1. Atualize a `main` local sem reescrever o histórico remoto.
2. Crie uma branch por task: `feature/USxx-descricao-curta` ou
   `feature/DEVOPSxx-descricao-curta`.
3. Faça commits pequenos no padrão Conventional Commits, incluindo a história e o ID OpenProject.
4. Rode lint, verificação de formato, typecheck e testes.
5. Abra pull request para `main`, preencha o template e solicite ao menos um revisor.

Exemplo:

```bash
git switch main
git pull --ff-only
git switch -c feature/US17-get-categorias
git commit -m "feat(categorias): listar por tipo (US17 #31262)"
npm run lint
npm run format:check
npm run typecheck
npm test
git push -u origin feature/US17-get-categorias
```

## Regras do código

- Regras de negócio ficam em serviços; controllers traduzem HTTP e permanecem finos.
- Toda entrada externa é validada com Zod.
- IDs `BIGINT` e valores `Decimal` são strings na API.
- Toda operação autenticada filtra por `req.contexto.organizacaoId`.
- Nunca remova fisicamente lançamentos; o fluxo de cancelamento usa estorno.
- Não exponha dados pessoais na transparência pública nem stack traces em respostas.
- Dependências novas exigem justificativa em `docs/DECISIONS.md`.

## Testes

- Nomeie cenários de integração pelo comportamento especificado na task.
- Use PostgreSQL de teste; não aponte testes para o banco de desenvolvimento.
- Para cada endpoint que lê dados organizacionais, inclua isolamento entre organizações.
- O cabeçalho `X-Test-Context` existe apenas em `NODE_ENV=test`; veja `docs/API.md`.

## Pull requests

Todo PR deve referenciar a task do OpenProject, descrever como foi validado e indicar dependências de
integração. Alterações de schema incluem uma migração nova e atualização de `docs/DATA-MODEL.md`.
