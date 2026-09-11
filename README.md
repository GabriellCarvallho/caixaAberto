# Caixa Aberto

Sistema web de tesouraria e prestação de contas para pequenos grupos que administram recursos
coletivos. Entradas, saídas, comprovantes, saldos e transparência pública partem de uma única trilha
de lançamentos auditável.

## Arquitetura

O projeto é um monorepo npm:

```text
backend/   API REST em Node.js, TypeScript, Express, Prisma e PostgreSQL
frontend/  esqueleto React + TypeScript criado com a estrutura do Vite
docs/      decisões, modelo de dados e contrato da API
```

Nesta etapa, o frontend não possui telas ou componentes de produto. Autenticação, escrita de
lançamentos, seed, API pública e armazenamento remoto também pertencem a outras tasks.

## Requisitos

- Node.js 24 LTS e npm 11
- Docker com Docker Compose, ou PostgreSQL 16 instalado localmente

## Configuração local

```bash
git clone https://github.com/franciscovmn/caixaAberto.git
cd caixaAberto
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm install
docker compose up -d postgres postgres-test
npm run prisma:generate -w backend
npm run prisma:migrate:deploy -w backend
```

Inicie os aplicativos em terminais separados:

```bash
npm run dev:backend
npm run dev:frontend
```

A API responde em `http://localhost:3000/health`; o Vite usa `http://localhost:5173`.

## Banco e migrações

Crie uma migração após uma alteração deliberada do schema:

```bash
npm run prisma:migrate:dev -w backend -- --name descricao_da_mudanca
```

Aplique migrações versionadas sem gerar arquivos novos:

```bash
npm run prisma:migrate:deploy -w backend
```

O banco de teste fica na porta `5433`. Para aplicar migrações nele:

```bash
DATABASE_URL="postgresql://caixa_aberto:caixa_aberto@localhost:5433/caixa_aberto_test?schema=public" \
  npm run prisma:migrate:deploy -w backend
```

O modelo, constraints, defaults e orientações para o futuro seed estão em
[`docs/DATA-MODEL.md`](docs/DATA-MODEL.md).

## Qualidade e testes

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
```

Os testes de integração do backend usam Vitest e Supertest. Casos que acessam dados usam o
PostgreSQL de teste e devem definir `DATABASE_URL` a partir de `DATABASE_URL_TEST`.

## Fluxo de contribuição

O projeto usa Conventional Commits, uma branch por task e pull request obrigatório para `main` com
um revisor. Consulte [`CONTRIBUTING.md`](CONTRIBUTING.md) antes de enviar mudanças.

### Repositório GitHub e primeiro push

O repositório remoto já existe. A partir de uma cópia local ainda sem remoto:

```bash
git init
git remote add origin https://github.com/franciscovmn/caixaAberto.git
git switch -c feature/DEVOPS03-modelo-dados
git add .
git commit -m "feat(database): inicializar modelo de dados (DEVOPS03 #31402)"
git push -u origin feature/DEVOPS03-modelo-dados
```

Se fosse necessário criar novamente um repositório privado pelo GitHub CLI:

```bash
gh repo create franciscovmn/caixaAberto --private --source=. --remote=origin
git push -u origin feature/DEVOPS03-modelo-dados
```
