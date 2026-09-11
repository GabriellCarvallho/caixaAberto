# Modelo de dados

O schema canônico está em `backend/prisma/schema.prisma`. A primeira migração usa PostgreSQL 16 e
pode ser executada do zero com `npm run prisma:migrate:deploy -w backend`.

## Convenções

- Todas as chaves primárias são `BIGINT`, autoincrementadas por `IDENTITY`.
- Chaves estrangeiras usam `ON DELETE RESTRICT` e `ON UPDATE CASCADE`.
- Valores monetários usam `DECIMAL(12,2)` e são serializados como string na API.
- `DATE` representa datas civis; `TIMESTAMP(6)` representa instantes armazenados conforme o fuso da
  aplicação (`America/Fortaleza`).
- O seed deve fornecer todos os campos obrigatórios sem default.

## Entidades

### `USUARIO`

| Coluna         | Tipo           | Nulo | Default/constraint               |
| -------------- | -------------- | ---- | -------------------------------- |
| `id`           | `BIGINT`       | não  | identity, PK                     |
| `nome`         | `VARCHAR(150)` | não  | —                                |
| `email`        | `VARCHAR(150)` | não  | único                            |
| `senha`        | `VARCHAR(255)` | não  | hash produzido pela autenticação |
| `ativo`        | `BOOLEAN`      | não  | sem default                      |
| `data_criacao` | `TIMESTAMP(6)` | não  | sem default                      |

### `ORGANIZACAO`

| Coluna                | Tipo           | Nulo | Default/constraint      |
| --------------------- | -------------- | ---- | ----------------------- |
| `id`                  | `BIGINT`       | não  | identity, PK            |
| `nome`                | `VARCHAR(150)` | não  | —                       |
| `descricao`           | `TEXT`         | não  | —                       |
| `inicio_gestao`       | `DATE`         | não  | —                       |
| `fim_gestao`          | `DATE`         | não  | —                       |
| `link_publico`        | `VARCHAR(255)` | sim  | único quando preenchido |
| `transparencia_ativa` | `BOOLEAN`      | não  | `false`                 |

### `MEMBRO`

| Coluna           | Tipo          | Nulo | Default/constraint          |
| ---------------- | ------------- | ---- | --------------------------- |
| `id`             | `BIGINT`      | não  | identity, PK                |
| `usuario_id`     | `BIGINT`      | não  | FK `USUARIO.id`             |
| `organizacao_id` | `BIGINT`      | não  | FK `ORGANIZACAO.id`         |
| `papel`          | `VARCHAR(20)` | não  | `TESOUREIRO` ou `CONSULTOR` |
| `data_vinculo`   | `DATE`        | não  | —                           |
| `ativo`          | `BOOLEAN`     | não  | sem default                 |

Unicidade: (`usuario_id`, `organizacao_id`). Índice adicional: `organizacao_id`.

### `CATEGORIA`

| Coluna           | Tipo           | Nulo | Default/constraint   |
| ---------------- | -------------- | ---- | -------------------- |
| `id`             | `BIGINT`       | não  | identity, PK         |
| `organizacao_id` | `BIGINT`       | não  | FK `ORGANIZACAO.id`  |
| `nome`           | `VARCHAR(100)` | não  | —                    |
| `descricao`      | `TEXT`         | não  | —                    |
| `tipo`           | `VARCHAR(20)`  | não  | `ENTRADA` ou `SAIDA` |
| `ativa`          | `BOOLEAN`      | não  | sem default          |

Unicidade: (`organizacao_id`, `nome`, `tipo`).

### `LANCAMENTO`

| Coluna           | Tipo            | Nulo | Default/constraint           |
| ---------------- | --------------- | ---- | ---------------------------- |
| `id`             | `BIGINT`        | não  | identity, PK                 |
| `organizacao_id` | `BIGINT`        | não  | FK `ORGANIZACAO.id`          |
| `usuario_id`     | `BIGINT`        | não  | FK `USUARIO.id`, responsável |
| `categoria_id`   | `BIGINT`        | não  | FK `CATEGORIA.id`            |
| `valor`          | `DECIMAL(12,2)` | não  | maior que zero               |
| `data`           | `DATE`          | não  | —                            |
| `tipo`           | `VARCHAR(20)`   | não  | `ENTRADA` ou `SAIDA`         |
| `descricao`      | `TEXT`          | não  | —                            |
| `origem`         | `VARCHAR(150)`  | sim  | usado em entradas            |
| `destinatario`   | `VARCHAR(150)`  | sim  | usado em saídas              |
| `status`         | `VARCHAR(20)`   | não  | `ATIVO` ou `ESTORNADO`       |
| `data_criacao`   | `TIMESTAMP(6)`  | não  | sem default                  |
| `data_estorno`   | `TIMESTAMP(6)`  | sim  | preenchido no estorno        |

Índices:

- (`organizacao_id`, `data`)
- (`organizacao_id`, `categoria_id`)
- (`organizacao_id`, `status`)
- `usuario_id`
- `categoria_id`

### `COMPROVANTE`

| Coluna          | Tipo           | Nulo | Default/constraint        |
| --------------- | -------------- | ---- | ------------------------- |
| `id`            | `BIGINT`       | não  | identity, PK              |
| `lancamento_id` | `BIGINT`       | não  | FK `LANCAMENTO.id`, único |
| `nome_arquivo`  | `VARCHAR(255)` | não  | —                         |
| `tipo_arquivo`  | `VARCHAR(50)`  | não  | —                         |
| `tamanho`       | `BIGINT`       | não  | bytes                     |
| `url_arquivo`   | `VARCHAR(500)` | não  | —                         |
| `data_upload`   | `TIMESTAMP(6)` | não  | sem default               |

### `META`

| Coluna           | Tipo            | Nulo | Default/constraint  |
| ---------------- | --------------- | ---- | ------------------- |
| `id`             | `BIGINT`        | não  | identity, PK        |
| `organizacao_id` | `BIGINT`        | não  | FK `ORGANIZACAO.id` |
| `descricao`      | `VARCHAR(255)`  | não  | —                   |
| `valor_alvo`     | `DECIMAL(12,2)` | não  | —                   |
| `prazo`          | `DATE`          | não  | —                   |
| `data_criacao`   | `TIMESTAMP(6)`  | não  | sem default         |

Índice: `organizacao_id`.

## Valores controlados

| Campo               | Valores aceitos           |
| ------------------- | ------------------------- |
| `MEMBRO.papel`      | `TESOUREIRO`, `CONSULTOR` |
| `CATEGORIA.tipo`    | `ENTRADA`, `SAIDA`        |
| `LANCAMENTO.tipo`   | `ENTRADA`, `SAIDA`        |
| `LANCAMENTO.status` | `ATIVO`, `ESTORNADO`      |

Esses conjuntos são protegidos por `CHECK` constraints na migração. Como o tipo físico exigido é
`VARCHAR(20)`, eles não são enums nativos do PostgreSQL.
