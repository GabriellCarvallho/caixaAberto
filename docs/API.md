# Contrato da API — Sprint 1

Base local: `http://localhost:3000`. Conteúdo JSON usa UTF-8. Datas usam `YYYY-MM-DD`; timestamps
usam ISO 8601; dinheiro e IDs `BIGINT` são strings.

## Convenções comuns

Rotas autenticadas recebem o contexto preenchido pelo middleware JWT do Murilo:

```ts
req.contexto = {
  usuarioId: bigint,
  organizacaoId: bigint,
  papel: 'TESOUREIRO' | 'CONSULTOR',
};
```

Durante testes de integração, e somente com `NODE_ENV=test`, esse contexto pode ser injetado pelo
cabeçalho `X-Test-Context`:

```http
X-Test-Context: {"usuarioId":"1","organizacaoId":"2","papel":"TESOUREIRO"}
```

Erros seguem sempre:

```json
{
  "erro": "Mensagem em português",
  "campos": {
    "campo": "Motivo da rejeição"
  }
}
```

`campos` é opcional. Respostas nunca incluem stack trace. Recursos de outra organização são
tratados como inexistentes (`404`) para não revelar sua presença.

## Infraestrutura

### `GET /health` — inicialização, Francisco

Não exige autenticação.

```json
{ "status": "ok" }
```

## Autenticação — Murilo, US01 (contrato provisório)

As rotas abaixo são apenas contrato; não estão implementadas neste branch.

### `POST /auth/login`

Entrada:

```json
{ "email": "tesoureiro@exemplo.com", "senha": "senha" }
```

Sucesso `200`:

```json
{
  "token": "jwt",
  "usuario": { "id": "1", "nome": "Ana", "email": "tesoureiro@exemplo.com" },
  "organizacoes": [{ "id": "2", "nome": "Comissão", "papel": "TESOUREIRO" }]
}
```

Credenciais inválidas retornam `401`. A seleção da organização no JWT deve ser alinhada com o
contrato de `req.contexto` antes da implementação.

### `POST /auth/logout`

Autenticada. Sucesso `204`. A estratégia de invalidação do JWT pertence à US01.

## Categorias

### `GET /categorias` — Francisco, US17 #31262

Autenticada. Query opcional: `tipo=ENTRADA|SAIDA`. Retorna somente categorias ativas da organização
do contexto, ordenadas por nome.

```json
{
  "dados": [{ "id": "10", "nome": "Alimentação", "tipo": "SAIDA" }]
}
```

`tipo` inválido retorna `400`.

## Lançamentos

### `POST /lancamentos` — Murilo, US18/US19 (contrato provisório)

Autenticada, somente `TESOUREIRO`. Não implementada neste branch.

Entrada:

```json
{
  "categoriaId": "10",
  "valor": "200.00",
  "data": "2026-09-01",
  "tipo": "ENTRADA",
  "descricao": "Contribuições de setembro",
  "origem": "Turma 2026",
  "destinatario": null
}
```

Para `SAIDA`, `destinatario` é preenchido e `origem` é nulo. Sucesso `201` retorna o lançamento.
Categoria inexistente, inativa, de outro tipo ou de outra organização deve ser rejeitada sem revelar
dados de terceiros.

### `GET /lancamentos` — Francisco, US23 #31278

Autenticada. Queries opcionais: `dataInicio`, `dataFim`, `tipo`, `categoriaId`, `usuarioId`, `page`
(default `1`) e `pageSize` (default `20`, máximo `100`). Ordenação: `data DESC`, `id DESC`.

```json
{
  "dados": [
    {
      "id": "30",
      "data": "2026-09-02",
      "descricao": "Compra de material",
      "categoria": { "id": "10", "nome": "Material" },
      "valor": "50.00",
      "tipo": "SAIDA",
      "status": "ATIVO",
      "possuiComprovante": true
    }
  ],
  "paginacao": { "page": 1, "pageSize": 20, "total": 1, "totalPages": 1 }
}
```

Se `dataFim < dataInicio`, retorna `400` com `erro: "Período inválido"`.

### `GET /lancamentos/{id}` — Murilo, US24 (contrato provisório)

Autenticada. Retorna os dados completos do lançamento, responsável, categoria e metadados do
comprovante. Lançamento ausente ou de outra organização retorna `404`.

### `POST /lancamentos/{id}/comprovante` — Francisco, US22 #31275

Autenticada, somente `TESOUREIRO`. `multipart/form-data`, campo `arquivo`. Formatos aceitos por
conteúdo real: JPEG, PNG, WebP e PDF; tamanho máximo configurado por `UPLOAD_MAX_BYTES` (5 MB por
default).

Sucesso `201`:

```json
{
  "id": "40",
  "lancamentoId": "30",
  "nomeArquivo": "nota.pdf",
  "tipoArquivo": "application/pdf",
  "tamanho": "1258291",
  "url": "/lancamentos/30/comprovante"
}
```

Formato ou tamanho inválido retorna `400` com
`erro: "Envie uma imagem ou PDF de até 5 MB"`, sem persistir arquivo ou registro. Lançamento de
outra organização retorna `404`.

### `GET /lancamentos/{id}/comprovante` — Francisco, US22 #31275

Autenticada. No driver local, devolve o conteúdo com `Content-Type` e `Content-Disposition` do
arquivo. Um driver remoto poderá responder com redirecionamento para uma URL temporária. Ausente ou
de outra organização retorna `404`.

## Extrato e painéis

### `GET /extrato` — Francisco, US28 #31284

Autenticada. `dataInicio` e `dataFim` são obrigatórios.

```json
{
  "dataInicio": "2026-09-01",
  "dataFim": "2026-09-30",
  "saldoAnterior": "0.00",
  "linhas": [
    {
      "id": "20",
      "data": "2026-09-01",
      "tipo": "ENTRADA",
      "valor": "200.00",
      "categoria": { "id": "4", "nome": "Mensalidades" },
      "descricao": "Contribuições",
      "status": "ATIVO",
      "saldoAcumulado": "200.00"
    }
  ],
  "saldoFinal": "200.00"
}
```

Linhas são ordenadas por `data ASC`, `id ASC`. Estornados aparecem, mas não alteram o saldo. Período
inválido retorna `400`.

### `GET /relatorios/categorias` — Francisco, US30 #31291

Autenticada. `dataInicio` e `dataFim` são obrigatórios. Ignora lançamentos estornados.

```json
{
  "dataInicio": "2026-09-01",
  "dataFim": "2026-09-30",
  "categorias": [{ "id": "10", "nome": "Material", "tipo": "SAIDA", "total": "300.00" }],
  "totais": { "entradas": "0.00", "saidas": "300.00" }
}
```

Se a data final anteceder a inicial, retorna `400` com `erro: "Período inválido"`.

### `GET /resumos/mensal` — Murilo, US29 (contrato provisório)

Autenticada. Query obrigatória `mes=YYYY-MM`. Retorna saldo inicial, entradas, saídas e saldo final
do mês, sempre isolados pela organização. Não implementada neste branch.

## Transparência pública

### `POST /organizacoes/atual/link-publico` — Francisco, US33 #31298

Autenticada, somente `TESOUREIRO`. Gera ou regenera token aleatório de pelo menos 32 bytes e ativa a
transparência.

```json
{ "token": "base64url-imprevisivel", "ativo": true }
```

### `PATCH /organizacoes/atual/link-publico` — Francisco, US33 #31298

Autenticada, somente `TESOUREIRO`.

```json
{ "ativo": false }
```

Sucesso `200`:

```json
{ "token": "base64url-imprevisivel", "ativo": false }
```

Consultor recebe `403`. Ativação sem token previamente gerado retorna `409`.

### `GET /publico/{token}` — Murilo, US32 (contrato provisório)

Pública, sem autenticação. Usa `buscarOrganizacaoPorTokenAtivo(token)`. Token inexistente ou
desativado retorna `404`. A resposta pode conter identificação da organização, saldos, totais e
lançamentos permitidos, mas nunca nome, e-mail ou responsável por lançamento. O formato final deve
ser fechado entre US32 e as telas públicas antes da implementação.

## Responsabilidades de integração

| Área                                  | Responsável    | Observação                                             |
| ------------------------------------- | -------------- | ------------------------------------------------------ |
| JWT e preenchimento de `req.contexto` | Murilo         | Deve usar o contrato comum desta página                |
| Escrita e detalhe de lançamento       | Murilo         | Deve respeitar os tipos e constraints do modelo        |
| Armazenamento remoto                  | Gabriel        | Implementará novo driver de `StorageService` na Fase 2 |
| Seed                                  | Gabriel        | Deve seguir defaults e unicidades de `DATA-MODEL.md`   |
| Telas e componentes                   | Gabriel/Felipe | Fora deste branch                                      |
| Testes de aceitação BDD com tela      | Gabriel/Felipe | Independentes dos testes de integração da API          |
