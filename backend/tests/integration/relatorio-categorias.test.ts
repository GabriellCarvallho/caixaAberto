import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../src/app.js';
import {
  createCategory,
  createMembership,
  createOrganization,
  createTransaction,
  createUser,
} from '../factories/index.js';
import { createAuthorizationHeader } from '../helpers/auth.js';

const PERIODO = { dataInicio: '2026-09-01', dataFim: '2026-09-30' };

async function criarCenarioBase() {
  const user = await createUser();
  const organization = await createOrganization();
  await createMembership({ userId: user.id, organizationId: organization.id });

  return {
    user,
    organization,
    authorization: createAuthorizationHeader(user),
    base: { organizationId: organization.id, userId: user.id },
  };
}

describe('relatório por categoria', () => {
  it('Cenário 1 - totais por categoria no período', async () => {
    const { authorization, base, organization } = await criarCenarioBase();
    const material = await createCategory({
      organizationId: organization.id,
      name: 'Material',
      type: 'SAIDA',
    });
    const alimentacao = await createCategory({
      organizationId: organization.id,
      name: 'Alimentação',
      type: 'SAIDA',
    });

    await createTransaction({
      ...base,
      categoryId: material.id,
      type: 'SAIDA',
      amount: '200.00',
      date: new Date('2026-09-05T00:00:00.000Z'),
    });
    await createTransaction({
      ...base,
      categoryId: material.id,
      type: 'SAIDA',
      amount: '100.00',
      date: new Date('2026-09-15T00:00:00.000Z'),
    });
    await createTransaction({
      ...base,
      categoryId: alimentacao.id,
      type: 'SAIDA',
      amount: '120.00',
      date: new Date('2026-09-20T00:00:00.000Z'),
    });

    const response = await request(createApp())
      .get('/relatorios/categorias')
      .query(PERIODO)
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      dataInicio: '2026-09-01',
      dataFim: '2026-09-30',
      categorias: [
        { id: material.id.toString(), nome: 'Material', tipo: 'SAIDA', total: '300.00' },
        { id: alimentacao.id.toString(), nome: 'Alimentação', tipo: 'SAIDA', total: '120.00' },
      ],
      totais: { entradas: '0.00', saidas: '420.00' },
    });
  });

  it('Cenário 2 - período inválido não gera o relatório', async () => {
    const { authorization } = await criarCenarioBase();

    const response = await request(createApp())
      .get('/relatorios/categorias')
      .query({ dataInicio: '2026-09-30', dataFim: '2026-09-01' })
      .set('Authorization', authorization);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      erro: 'Dados inválidos',
      campos: { dataFim: 'dataFim não pode ser anterior a dataInicio' },
    });
  });

  it('ignora lançamento estornado no total da categoria', async () => {
    const { authorization, base, organization } = await criarCenarioBase();
    const material = await createCategory({
      organizationId: organization.id,
      name: 'Material',
      type: 'SAIDA',
    });

    await createTransaction({
      ...base,
      categoryId: material.id,
      type: 'SAIDA',
      amount: '80.00',
      date: new Date('2026-09-10T00:00:00.000Z'),
    });
    await createTransaction({
      ...base,
      categoryId: material.id,
      type: 'SAIDA',
      amount: '500.00',
      date: new Date('2026-09-11T00:00:00.000Z'),
      status: 'ESTORNADO',
      reversedAt: new Date('2026-09-12T10:00:00.000Z'),
    });

    const response = await request(createApp())
      .get('/relatorios/categorias')
      .query(PERIODO)
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect(response.body.categorias).toEqual([
      { id: material.id.toString(), nome: 'Material', tipo: 'SAIDA', total: '80.00' },
    ]);
    expect(response.body.totais).toEqual({ entradas: '0.00', saidas: '80.00' });
  });

  it('não mistura os totais de entrada e de saída', async () => {
    const { authorization, base, organization } = await criarCenarioBase();
    const mensalidades = await createCategory({
      organizationId: organization.id,
      name: 'Mensalidades',
      type: 'ENTRADA',
    });
    const material = await createCategory({
      organizationId: organization.id,
      name: 'Material',
      type: 'SAIDA',
    });

    await createTransaction({
      ...base,
      categoryId: mensalidades.id,
      type: 'ENTRADA',
      amount: '450.00',
      date: new Date('2026-09-03T00:00:00.000Z'),
    });
    await createTransaction({
      ...base,
      categoryId: material.id,
      type: 'SAIDA',
      amount: '70.00',
      date: new Date('2026-09-04T00:00:00.000Z'),
    });

    const response = await request(createApp())
      .get('/relatorios/categorias')
      .query(PERIODO)
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect(response.body.categorias).toEqual([
      { id: mensalidades.id.toString(), nome: 'Mensalidades', tipo: 'ENTRADA', total: '450.00' },
      { id: material.id.toString(), nome: 'Material', tipo: 'SAIDA', total: '70.00' },
    ]);
    expect(response.body.totais).toEqual({ entradas: '450.00', saidas: '70.00' });
  });

  it('inclui os lançamentos exatamente em dataInicio e em dataFim', async () => {
    const { authorization, base, organization } = await criarCenarioBase();
    const material = await createCategory({
      organizationId: organization.id,
      name: 'Material',
      type: 'SAIDA',
    });

    await createTransaction({
      ...base,
      categoryId: material.id,
      type: 'SAIDA',
      amount: '10.00',
      date: new Date('2026-09-01T00:00:00.000Z'),
    });
    await createTransaction({
      ...base,
      categoryId: material.id,
      type: 'SAIDA',
      amount: '20.00',
      date: new Date('2026-09-30T00:00:00.000Z'),
    });

    const response = await request(createApp())
      .get('/relatorios/categorias')
      .query(PERIODO)
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect(response.body.categorias[0].total).toBe('30.00');
  });

  it('não considera lançamento fora do período', async () => {
    const { authorization, base, organization } = await criarCenarioBase();
    const material = await createCategory({
      organizationId: organization.id,
      name: 'Material',
      type: 'SAIDA',
    });

    await createTransaction({
      ...base,
      categoryId: material.id,
      type: 'SAIDA',
      amount: '40.00',
      date: new Date('2026-09-15T00:00:00.000Z'),
    });
    await createTransaction({
      ...base,
      categoryId: material.id,
      type: 'SAIDA',
      amount: '900.00',
      date: new Date('2026-08-31T00:00:00.000Z'),
    });
    await createTransaction({
      ...base,
      categoryId: material.id,
      type: 'SAIDA',
      amount: '900.00',
      date: new Date('2026-10-01T00:00:00.000Z'),
    });

    const response = await request(createApp())
      .get('/relatorios/categorias')
      .query(PERIODO)
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect(response.body.categorias[0].total).toBe('40.00');
    expect(response.body.totais).toEqual({ entradas: '0.00', saidas: '40.00' });
  });

  it('devolve estrutura vazia coerente quando não há movimentação', async () => {
    const { authorization, organization } = await criarCenarioBase();
    await createCategory({ organizationId: organization.id, name: 'Material', type: 'SAIDA' });

    const response = await request(createApp())
      .get('/relatorios/categorias')
      .query(PERIODO)
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      dataInicio: '2026-09-01',
      dataFim: '2026-09-30',
      categorias: [],
      totais: { entradas: '0.00', saidas: '0.00' },
    });
  });

  it('não lista categoria ativa que não teve movimentação no período', async () => {
    const { authorization, base, organization } = await criarCenarioBase();
    const comMovimento = await createCategory({
      organizationId: organization.id,
      name: 'Material',
      type: 'SAIDA',
      active: true,
    });
    await createCategory({
      organizationId: organization.id,
      name: 'Transporte',
      type: 'SAIDA',
      active: true,
    });

    await createTransaction({
      ...base,
      categoryId: comMovimento.id,
      type: 'SAIDA',
      amount: '25.00',
      date: new Date('2026-09-08T00:00:00.000Z'),
    });

    const response = await request(createApp())
      .get('/relatorios/categorias')
      .query(PERIODO)
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect(response.body.categorias.map((item: { nome: string }) => item.nome)).toEqual([
      'Material',
    ]);
  });

  it('lista categoria inativa que teve movimentação no período', async () => {
    const { authorization, base, organization } = await criarCenarioBase();
    // Desativada depois de ter sido usada: precisa continuar no historico, senao o relatorio
    // deixa de bater com o extrato do mesmo periodo.
    const desativada = await createCategory({
      organizationId: organization.id,
      name: 'Material antigo',
      type: 'SAIDA',
      active: false,
    });

    await createTransaction({
      ...base,
      categoryId: desativada.id,
      type: 'SAIDA',
      amount: '60.00',
      date: new Date('2026-09-09T00:00:00.000Z'),
    });

    const response = await request(createApp())
      .get('/relatorios/categorias')
      .query(PERIODO)
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect(response.body.categorias).toEqual([
      { id: desativada.id.toString(), nome: 'Material antigo', tipo: 'SAIDA', total: '60.00' },
    ]);
    expect(response.body.totais).toEqual({ entradas: '0.00', saidas: '60.00' });
  });

  it('ordena por tipo, depois por total decrescente e por nome no empate', async () => {
    const { authorization, base, organization } = await criarCenarioBase();
    const entrada = await createCategory({
      organizationId: organization.id,
      name: 'Doações',
      type: 'ENTRADA',
    });
    const maior = await createCategory({
      organizationId: organization.id,
      name: 'Aluguel',
      type: 'SAIDA',
    });
    const empateB = await createCategory({
      organizationId: organization.id,
      name: 'Bolsas',
      type: 'SAIDA',
    });
    const empateA = await createCategory({
      organizationId: organization.id,
      name: 'Alimentação',
      type: 'SAIDA',
    });

    const saida = (categoryId: bigint, amount: string) =>
      createTransaction({
        ...base,
        categoryId,
        type: 'SAIDA',
        amount,
        date: new Date('2026-09-10T00:00:00.000Z'),
      });

    await createTransaction({
      ...base,
      categoryId: entrada.id,
      type: 'ENTRADA',
      amount: '5.00',
      date: new Date('2026-09-10T00:00:00.000Z'),
    });
    await saida(maior.id, '900.00');
    await saida(empateB.id, '50.00');
    await saida(empateA.id, '50.00');

    const response = await request(createApp())
      .get('/relatorios/categorias')
      .query(PERIODO)
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect(
      response.body.categorias.map((item: { nome: string; tipo: string; total: string }) => [
        item.tipo,
        item.total,
        item.nome,
      ]),
    ).toEqual([
      ['ENTRADA', '5.00', 'Doações'],
      ['SAIDA', '900.00', 'Aluguel'],
      ['SAIDA', '50.00', 'Alimentação'],
      ['SAIDA', '50.00', 'Bolsas'],
    ]);
  });

  it('rejeita requisição sem dataInicio', async () => {
    const { authorization } = await criarCenarioBase();

    const response = await request(createApp())
      .get('/relatorios/categorias')
      .query({ dataFim: '2026-09-30' })
      .set('Authorization', authorization);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      erro: 'Dados inválidos',
      campos: { dataInicio: 'Entrada inválida: esperava um texto, recebeu um valor "undefined"' },
    });
  });

  it('rejeita requisição sem dataFim', async () => {
    const { authorization } = await criarCenarioBase();

    const response = await request(createApp())
      .get('/relatorios/categorias')
      .query({ dataInicio: '2026-09-01' })
      .set('Authorization', authorization);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      erro: 'Dados inválidos',
      campos: { dataFim: 'Entrada inválida: esperava um texto, recebeu um valor "undefined"' },
    });
  });

  it('não soma categoria de mesmo nome de outra organização', async () => {
    const { authorization, base, organization } = await criarCenarioBase();
    const propria = await createCategory({
      organizationId: organization.id,
      name: 'Material',
      type: 'SAIDA',
    });
    await createTransaction({
      ...base,
      categoryId: propria.id,
      type: 'SAIDA',
      amount: '30.00',
      date: new Date('2026-09-12T00:00:00.000Z'),
    });

    const outraOrganizacao = await createOrganization();
    const outroUsuario = await createUser();
    await createMembership({ userId: outroUsuario.id, organizationId: outraOrganizacao.id });
    const homonima = await createCategory({
      organizationId: outraOrganizacao.id,
      name: 'Material',
      type: 'SAIDA',
    });
    await createTransaction({
      organizationId: outraOrganizacao.id,
      userId: outroUsuario.id,
      categoryId: homonima.id,
      type: 'SAIDA',
      amount: '7000.00',
      date: new Date('2026-09-12T00:00:00.000Z'),
    });

    const response = await request(createApp())
      .get('/relatorios/categorias')
      .query(PERIODO)
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect(response.body.categorias).toEqual([
      { id: propria.id.toString(), nome: 'Material', tipo: 'SAIDA', total: '30.00' },
    ]);
    expect(response.body.totais).toEqual({ entradas: '0.00', saidas: '30.00' });
  });

  it('permite que um consultor consulte o relatório', async () => {
    const consultor = await createUser();
    const organization = await createOrganization();
    await createMembership({
      userId: consultor.id,
      organizationId: organization.id,
      role: 'CONSULTOR',
    });
    const categoria = await createCategory({
      organizationId: organization.id,
      name: 'Mensalidades',
      type: 'ENTRADA',
    });
    await createTransaction({
      organizationId: organization.id,
      userId: consultor.id,
      categoryId: categoria.id,
      type: 'ENTRADA',
      amount: '90.00',
      date: new Date('2026-09-14T00:00:00.000Z'),
    });

    const response = await request(createApp())
      .get('/relatorios/categorias')
      .query(PERIODO)
      .set('Authorization', createAuthorizationHeader(consultor));

    expect(response.status).toBe(200);
    expect(response.body.categorias).toHaveLength(1);
    expect(response.body.totais).toEqual({ entradas: '90.00', saidas: '0.00' });
  });
});
