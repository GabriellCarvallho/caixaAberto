# Decisões técnicas

Este arquivo registra escolhas necessárias quando o enunciado não determina uma única solução.

## 2026-09-11 — Identificadores e nomes físicos

- Identificadores TypeScript e modelos Prisma usam inglês.
- Rotas, propriedades públicas da API, mensagens e nomes físicos do banco seguem português.
- As tabelas são mapeadas exatamente para os nomes do DER (`USUARIO`, `ORGANIZACAO`,
  `MEMBRO`, `CATEGORIA`, `LANCAMENTO`, `COMPROVANTE` e `META`).

Motivo: manter o código consistente com a orientação inicial sem alterar o contrato de domínio ou o
DER compartilhado pela equipe.

## 2026-09-11 — Prisma 7 e acesso ao PostgreSQL

Foi adotado Prisma 7.10.0, versão estável consultada durante a inicialização. Nessa versão, conexões
diretas exigem um driver adapter. Por isso, `@prisma/adapter-pg`, `pg` e `dotenv` foram adicionados
além dos pacotes citados nominalmente no enunciado. Eles são infraestrutura obrigatória para o
Prisma 7 acessar o PostgreSQL e carregar a configuração local.

O TypeScript foi fixado em 5.9.3 porque é a versão estável compatível com a faixa declarada pelo
`typescript-eslint` usado no projeto. `tsx`, plugins ESLint para React e o plugin React do Vite são
dependências de desenvolvimento necessárias aos scripts e ao esqueleto solicitado.

## 2026-09-11 — Valores enumerados como `VARCHAR`

`papel`, `tipo` e `status` permanecem `VARCHAR(20)`, conforme o DER. A migração adiciona `CHECK`
constraints para os conjuntos permitidos em vez de criar enums nativos do PostgreSQL, que mudariam
o tipo físico solicitado. O Prisma representa esses campos como `String`; constantes TypeScript
fornecem tipagem nos limites da aplicação.

## 2026-09-11 — Defaults e campos opcionais

- Apenas `ORGANIZACAO.transparencia_ativa` recebe default no banco (`false`), porque este é o único
  default definido pelo modelo fornecido.
- Campos de criação, status e indicadores de atividade devem ser fornecidos pelo caso de uso que
  grava a entidade ou pelo futuro seed.
- `LANCAMENTO.origem` e `LANCAMENTO.destinatario` são opcionais no banco, pois cada um se aplica a
  apenas um tipo de lançamento. A validação condicional pertence aos serviços de escrita do Murilo.
- `COMPROVANTE.lancamento_id` é único. O contrato usa comprovante no singular e define um único
  anexo por lançamento; uma substituição futura deve atualizar esse vínculo de forma explícita.

## 2026-09-11 — Integridade referencial e datas

- Todas as exclusões de entidades relacionadas usam `RESTRICT`; registros financeiros e seus
  vínculos não são removidos em cascata.
- Datas civis usam `DATE`. Os timestamps seguem `TIMESTAMP(6)` sem fuso, exatamente como o DER, e a
  aplicação opera com `America/Fortaleza`.
- IDs `BIGINT` são enviados como strings em JSON para evitar perda de precisão no JavaScript.

## 2026-09-11 — Contexto usado nos testes de integração

Em `NODE_ENV=test`, o cabeçalho `X-Test-Context` aceita JSON com IDs em string e papel válido, por
exemplo:

```json
{ "usuarioId": "1", "organizacaoId": "2", "papel": "TESOUREIRO" }
```

Fora de teste, o cabeçalho é ignorado. O middleware JWT do Murilo preencherá o mesmo contrato em
produção.

## 2026-09-11 — Contratos provisórios dos demais integrantes

Os caminhos e formatos não especificados para autenticação, resumo mensal e transparência pública
foram documentados em `docs/API.md` como provisórios, sem implementação. A opção mais simples foi
registrada para permitir alinhamento antes das respectivas tasks.

## 2026-09-11 — Ativação de transparência sem token

O contrato retorna `409` quando alguém tenta ativar a transparência antes de gerar o token. A
alternativa de gerar um token implicitamente no `PATCH` duplicaria a responsabilidade do `POST` e
tornaria a rotação acidental. Esta regra será confirmada na Fase 4 antes da implementação.
