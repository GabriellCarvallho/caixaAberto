import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../src/app.js';
import {
  createCategory,
  createMembership,
  createOrganization,
  createReceipt,
  createTransaction,
  createUser,
} from '../factories/index.js';
import { createAuthorizationHeader } from '../helpers/auth.js';

async function createOrganizationWithTreasurer() {
  const user = await createUser();
  const organization = await createOrganization();
  await createMembership({ userId: user.id, organizationId: organization.id });

  return { user, organization, authorization: createAuthorizationHeader(user) };
}

describe('listagem de lançamentos', () => {
  it('Cenário 1 - filtrar por período e tipo', async () => {
    const { user, organization, authorization } = await createOrganizationWithTreasurer();
    const entradas = await createCategory({
      organizationId: organization.id,
      name: 'Doações',
      type: 'ENTRADA',
    });
    const saidas = await createCategory({
      organizationId: organization.id,
      name: 'Material',
      type: 'SAIDA',
    });

    const base = { organizationId: organization.id, userId: user.id };

    await createTransaction({
      ...base,
      categoryId: saidas.id,
      type: 'SAIDA',
      date: new Date('2026-08-20T00:00:00.000Z'),
      description: 'Saída de agosto',
      amount: '10.00',
    });
    await createTransaction({
      ...base,
      categoryId: entradas.id,
      type: 'ENTRADA',
      date: new Date('2026-09-10T00:00:00.000Z'),
      description: 'Entrada de setembro',
      amount: '80.00',
    });
    const compra = await createTransaction({
      ...base,
      categoryId: saidas.id,
      type: 'SAIDA',
      date: new Date('2026-09-05T00:00:00.000Z'),
      description: 'Compra de material',
      amount: '50.00',
    });
    const ultimoDia = await createTransaction({
      ...base,
      categoryId: saidas.id,
      type: 'SAIDA',
      date: new Date('2026-09-30T00:00:00.000Z'),
      description: 'Saída do último dia do período',
      amount: '25.50',
    });

    const response = await request(createApp())
      .get('/lancamentos')
      .query({ dataInicio: '2026-09-01', dataFim: '2026-09-30', tipo: 'SAIDA' })
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      dados: [
        {
          id: ultimoDia.id.toString(),
          data: '2026-09-30',
          descricao: 'Saída do último dia do período',
          categoria: { id: saidas.id.toString(), nome: 'Material' },
          valor: '25.50',
          tipo: 'SAIDA',
          status: 'ATIVO',
          possuiComprovante: false,
        },
        {
          id: compra.id.toString(),
          data: '2026-09-05',
          descricao: 'Compra de material',
          categoria: { id: saidas.id.toString(), nome: 'Material' },
          valor: '50.00',
          tipo: 'SAIDA',
          status: 'ATIVO',
          possuiComprovante: false,
        },
      ],
      paginacao: { pagina: 1, tamanhoPagina: 20, total: 2, totalPaginas: 1 },
    });
  });

  it('Cenário 2 - acesso ao detalhe', async () => {
    const { user, organization, authorization } = await createOrganizationWithTreasurer();
    const categoria = await createCategory({ organizationId: organization.id, type: 'SAIDA' });
    const base = { organizationId: organization.id, userId: user.id, categoryId: categoria.id };

    const maisAntigo = await createTransaction({
      ...base,
      date: new Date('2026-09-01T00:00:00.000Z'),
    });
    const intermediario = await createTransaction({
      ...base,
      date: new Date('2026-09-02T00:00:00.000Z'),
    });
    const maisRecente = await createTransaction({
      ...base,
      date: new Date('2026-09-03T00:00:00.000Z'),
    });

    const response = await request(createApp())
      .get('/lancamentos')
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect(response.body.dados.map((item: { id: string }) => item.id)).toEqual([
      maisRecente.id.toString(),
      intermediario.id.toString(),
      maisAntigo.id.toString(),
    ]);
  });

  it('lista lançamento estornado com status ESTORNADO', async () => {
    const { user, organization, authorization } = await createOrganizationWithTreasurer();
    const categoria = await createCategory({ organizationId: organization.id, type: 'SAIDA' });
    const base = { organizationId: organization.id, userId: user.id, categoryId: categoria.id };

    const ativo = await createTransaction({
      ...base,
      date: new Date('2026-09-01T00:00:00.000Z'),
      description: 'Lançamento ativo',
    });
    const estornado = await createTransaction({
      ...base,
      date: new Date('2026-09-02T00:00:00.000Z'),
      description: 'Lançamento estornado',
      status: 'ESTORNADO',
      reversedAt: new Date('2026-09-03T10:00:00.000Z'),
    });

    const response = await request(createApp())
      .get('/lancamentos')
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect(response.body.paginacao.total).toBe(2);
    expect(
      response.body.dados.map((item: { id: string; status: string }) => [item.id, item.status]),
    ).toEqual([
      [estornado.id.toString(), 'ESTORNADO'],
      [ativo.id.toString(), 'ATIVO'],
    ]);
  });

  it('marca possuiComprovante apenas para o lançamento que tem comprovante', async () => {
    const { user, organization, authorization } = await createOrganizationWithTreasurer();
    const categoria = await createCategory({ organizationId: organization.id, type: 'SAIDA' });
    const base = { organizationId: organization.id, userId: user.id, categoryId: categoria.id };

    const semComprovante = await createTransaction({
      ...base,
      date: new Date('2026-09-01T00:00:00.000Z'),
    });
    const comComprovante = await createTransaction({
      ...base,
      date: new Date('2026-09-02T00:00:00.000Z'),
    });
    await createReceipt({ transactionId: comComprovante.id });

    const response = await request(createApp())
      .get('/lancamentos')
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect(
      response.body.dados.map((item: { id: string; possuiComprovante: boolean }) => [
        item.id,
        item.possuiComprovante,
      ]),
    ).toEqual([
      [comComprovante.id.toString(), true],
      [semComprovante.id.toString(), false],
    ]);
  });

  it('filtra por categoriaId', async () => {
    const { user, organization, authorization } = await createOrganizationWithTreasurer();
    const material = await createCategory({
      organizationId: organization.id,
      name: 'Material',
      type: 'SAIDA',
    });
    const transporte = await createCategory({
      organizationId: organization.id,
      name: 'Transporte',
      type: 'SAIDA',
    });
    const base = { organizationId: organization.id, userId: user.id };

    const deMaterial = await createTransaction({ ...base, categoryId: material.id });
    await createTransaction({ ...base, categoryId: transporte.id });

    const response = await request(createApp())
      .get('/lancamentos')
      .query({ categoriaId: material.id.toString() })
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect(response.body.paginacao.total).toBe(1);
    expect(response.body.dados).toHaveLength(1);
    expect(response.body.dados[0].id).toBe(deMaterial.id.toString());
    expect(response.body.dados[0].categoria).toEqual({
      id: material.id.toString(),
      nome: 'Material',
    });
  });

  it('filtra por usuarioId', async () => {
    const { user, organization, authorization } = await createOrganizationWithTreasurer();
    const outroUsuario = await createUser();
    await createMembership({
      userId: outroUsuario.id,
      organizationId: organization.id,
      role: 'CONSULTOR',
    });
    const categoria = await createCategory({ organizationId: organization.id, type: 'SAIDA' });
    const base = { organizationId: organization.id, categoryId: categoria.id };

    await createTransaction({ ...base, userId: user.id });
    const doOutroUsuario = await createTransaction({ ...base, userId: outroUsuario.id });

    const response = await request(createApp())
      .get('/lancamentos')
      .query({ usuarioId: outroUsuario.id.toString() })
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect(response.body.paginacao.total).toBe(1);
    expect(response.body.dados).toHaveLength(1);
    expect(response.body.dados[0].id).toBe(doOutroUsuario.id.toString());
  });

  it('ordena por id decrescente quando a data empata', async () => {
    const { user, organization, authorization } = await createOrganizationWithTreasurer();
    const categoria = await createCategory({ organizationId: organization.id, type: 'SAIDA' });
    const mesmaData = new Date('2026-09-15T00:00:00.000Z');
    const base = {
      organizationId: organization.id,
      userId: user.id,
      categoryId: categoria.id,
      date: mesmaData,
    };

    const primeiro = await createTransaction({ ...base, description: 'Primeiro registrado' });
    const segundo = await createTransaction({ ...base, description: 'Segundo registrado' });

    const response = await request(createApp())
      .get('/lancamentos')
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect(segundo.id).toBeGreaterThan(primeiro.id);
    expect(response.body.dados.map((item: { id: string }) => item.id)).toEqual([
      segundo.id.toString(),
      primeiro.id.toString(),
    ]);
  });

  it('pagina o resultado sem repetir lançamentos entre as páginas', async () => {
    const { user, organization, authorization } = await createOrganizationWithTreasurer();
    const categoria = await createCategory({ organizationId: organization.id, type: 'SAIDA' });

    for (let dia = 1; dia <= 5; dia += 1) {
      await createTransaction({
        organizationId: organization.id,
        userId: user.id,
        categoryId: categoria.id,
        date: new Date(`2026-09-0${dia}T00:00:00.000Z`),
        description: `Lançamento do dia ${dia}`,
      });
    }

    const paginas = [];

    for (const pagina of [1, 2, 3]) {
      const response = await request(createApp())
        .get('/lancamentos')
        .query({ pagina: String(pagina), tamanhoPagina: '2' })
        .set('Authorization', authorization);

      expect(response.status).toBe(200);
      expect(response.body.paginacao).toEqual({
        pagina,
        tamanhoPagina: 2,
        total: 5,
        totalPaginas: 3,
      });

      paginas.push(response.body.dados.map((item: { id: string }) => item.id));
    }

    expect(paginas.map((pagina) => pagina.length)).toEqual([2, 2, 1]);

    const todosOsIds = paginas.flat();
    expect(new Set(todosOsIds).size).toBe(5);
  });

  it('rejeita tamanhoPagina acima de 100', async () => {
    const { authorization } = await createOrganizationWithTreasurer();

    const response = await request(createApp())
      .get('/lancamentos')
      .query({ tamanhoPagina: '101' })
      .set('Authorization', authorization);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      erro: 'Dados inválidos',
      campos: { tamanhoPagina: 'Grande demais: esperava que o número fosse <= 100' },
    });
  });

  it('rejeita dataFim anterior a dataInicio', async () => {
    const { authorization } = await createOrganizationWithTreasurer();

    const response = await request(createApp())
      .get('/lancamentos')
      .query({ dataInicio: '2026-09-30', dataFim: '2026-09-01' })
      .set('Authorization', authorization);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      erro: 'Dados inválidos',
      campos: { dataFim: 'dataFim não pode ser anterior a dataInicio' },
    });
  });

  it('não lista lançamentos de outra organização', async () => {
    const { user, organization, authorization } = await createOrganizationWithTreasurer();
    const categoria = await createCategory({ organizationId: organization.id, type: 'SAIDA' });
    const proprio = await createTransaction({
      organizationId: organization.id,
      userId: user.id,
      categoryId: categoria.id,
    });

    const outraOrganizacao = await createOrganization();
    const outroUsuario = await createUser();
    await createMembership({ userId: outroUsuario.id, organizationId: outraOrganizacao.id });
    const outraCategoria = await createCategory({
      organizationId: outraOrganizacao.id,
      type: 'SAIDA',
    });
    await createTransaction({
      organizationId: outraOrganizacao.id,
      userId: outroUsuario.id,
      categoryId: outraCategoria.id,
    });

    const response = await request(createApp())
      .get('/lancamentos')
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect(response.body.paginacao.total).toBe(1);
    expect(response.body.dados).toHaveLength(1);
    expect(response.body.dados[0].id).toBe(proprio.id.toString());
  });

  it('permite que um consultor liste os lançamentos', async () => {
    const consultor = await createUser();
    const organization = await createOrganization();
    await createMembership({
      userId: consultor.id,
      organizationId: organization.id,
      role: 'CONSULTOR',
    });
    const categoria = await createCategory({ organizationId: organization.id, type: 'SAIDA' });
    const lancamento = await createTransaction({
      organizationId: organization.id,
      userId: consultor.id,
      categoryId: categoria.id,
    });

    const response = await request(createApp())
      .get('/lancamentos')
      .set('Authorization', createAuthorizationHeader(consultor));

    expect(response.status).toBe(200);
    expect(response.body.paginacao.total).toBe(1);
    expect(response.body.dados[0].id).toBe(lancamento.id.toString());
  });
});
