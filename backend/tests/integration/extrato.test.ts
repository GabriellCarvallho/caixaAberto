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
  const entradas = await createCategory({
    organizationId: organization.id,
    name: 'Mensalidades',
    type: 'ENTRADA',
  });
  const saidas = await createCategory({
    organizationId: organization.id,
    name: 'Material',
    type: 'SAIDA',
  });

  return {
    user,
    organization,
    entradas,
    saidas,
    authorization: createAuthorizationHeader(user),
    base: { organizationId: organization.id, userId: user.id },
  };
}

describe('extrato com saldo acumulado', () => {
  it('Cenário 1 - extrato com saldo acumulado', async () => {
    const { authorization, base, entradas, saidas } = await criarCenarioBase();

    const entrada = await createTransaction({
      ...base,
      categoryId: entradas.id,
      type: 'ENTRADA',
      amount: '200.00',
      date: new Date('2026-09-01T00:00:00.000Z'),
      description: 'Contribuições',
    });
    const saida = await createTransaction({
      ...base,
      categoryId: saidas.id,
      type: 'SAIDA',
      amount: '50.00',
      date: new Date('2026-09-02T00:00:00.000Z'),
      description: 'Compra de material',
    });

    const response = await request(createApp())
      .get('/extrato')
      .query(PERIODO)
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      dataInicio: '2026-09-01',
      dataFim: '2026-09-30',
      saldoAnterior: '0.00',
      linhas: [
        {
          id: entrada.id.toString(),
          data: '2026-09-01',
          tipo: 'ENTRADA',
          valor: '200.00',
          categoria: { id: entradas.id.toString(), nome: 'Mensalidades' },
          descricao: 'Contribuições',
          status: 'ATIVO',
          saldoAcumulado: '200.00',
        },
        {
          id: saida.id.toString(),
          data: '2026-09-02',
          tipo: 'SAIDA',
          valor: '50.00',
          categoria: { id: saidas.id.toString(), nome: 'Material' },
          descricao: 'Compra de material',
          status: 'ATIVO',
          saldoAcumulado: '150.00',
        },
      ],
      saldoFinal: '150.00',
    });
  });

  it('Cenário 2 - lançamento estornado não afeta o saldo', async () => {
    const { authorization, base, entradas, saidas } = await criarCenarioBase();

    await createTransaction({
      ...base,
      categoryId: entradas.id,
      type: 'ENTRADA',
      amount: '200.00',
      date: new Date('2026-09-01T00:00:00.000Z'),
    });
    const estornada = await createTransaction({
      ...base,
      categoryId: saidas.id,
      type: 'SAIDA',
      amount: '50.00',
      date: new Date('2026-09-02T00:00:00.000Z'),
      status: 'ESTORNADO',
      reversedAt: new Date('2026-09-03T10:00:00.000Z'),
    });

    const response = await request(createApp())
      .get('/extrato')
      .query(PERIODO)
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect(response.body.linhas).toHaveLength(2);
    expect(response.body.linhas[1]).toMatchObject({
      id: estornada.id.toString(),
      status: 'ESTORNADO',
      valor: '50.00',
      saldoAcumulado: '200.00',
    });
    expect(response.body.saldoFinal).toBe('200.00');
  });

  it('deriva o saldo anterior dos lançamentos anteriores ao período', async () => {
    const { authorization, base, entradas, saidas } = await criarCenarioBase();

    await createTransaction({
      ...base,
      categoryId: entradas.id,
      type: 'ENTRADA',
      amount: '500.00',
      date: new Date('2026-08-10T00:00:00.000Z'),
    });
    await createTransaction({
      ...base,
      categoryId: saidas.id,
      type: 'SAIDA',
      amount: '120.00',
      date: new Date('2026-08-20T00:00:00.000Z'),
    });
    // Estornado antes do periodo tambem nao entra no saldo anterior.
    await createTransaction({
      ...base,
      categoryId: saidas.id,
      type: 'SAIDA',
      amount: '999.00',
      date: new Date('2026-08-25T00:00:00.000Z'),
      status: 'ESTORNADO',
      reversedAt: new Date('2026-08-26T10:00:00.000Z'),
    });
    const doPeriodo = await createTransaction({
      ...base,
      categoryId: entradas.id,
      type: 'ENTRADA',
      amount: '30.00',
      date: new Date('2026-09-05T00:00:00.000Z'),
    });

    const response = await request(createApp())
      .get('/extrato')
      .query(PERIODO)
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect(response.body.saldoAnterior).toBe('380.00');
    expect(response.body.linhas.map((linha: { id: string }) => linha.id)).toEqual([
      doPeriodo.id.toString(),
    ]);
    expect(response.body.linhas[0].saldoAcumulado).toBe('410.00');
    expect(response.body.saldoFinal).toBe('410.00');
  });

  it('conta uma única vez o lançamento que cai exatamente em dataInicio', async () => {
    const { authorization, base, entradas } = await criarCenarioBase();

    // Saldo anterior diferente de zero, para que uma contagem dupla nao se esconda atras do zero.
    await createTransaction({
      ...base,
      categoryId: entradas.id,
      type: 'ENTRADA',
      amount: '100.00',
      date: new Date('2026-08-31T00:00:00.000Z'),
    });
    const noLimite = await createTransaction({
      ...base,
      categoryId: entradas.id,
      type: 'ENTRADA',
      amount: '70.00',
      date: new Date('2026-09-01T00:00:00.000Z'),
    });

    const response = await request(createApp())
      .get('/extrato')
      .query(PERIODO)
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    // O corte do saldo anterior e estrito: o lancamento em dataInicio nao pode estar aqui.
    expect(response.body.saldoAnterior).toBe('100.00');
    // E ele aparece nas linhas, contado uma vez so. Um lte no agregado daria 170.00 e 240.00.
    expect(response.body.linhas.map((linha: { id: string }) => linha.id)).toEqual([
      noLimite.id.toString(),
    ]);
    expect(response.body.linhas[0].saldoAcumulado).toBe('170.00');
    expect(response.body.saldoFinal).toBe('170.00');
  });

  it('devolve período vazio sem erro, com saldo final igual ao anterior', async () => {
    const { authorization, base, entradas } = await criarCenarioBase();

    await createTransaction({
      ...base,
      categoryId: entradas.id,
      type: 'ENTRADA',
      amount: '75.00',
      date: new Date('2026-08-15T00:00:00.000Z'),
    });

    const response = await request(createApp())
      .get('/extrato')
      .query(PERIODO)
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      dataInicio: '2026-09-01',
      dataFim: '2026-09-30',
      saldoAnterior: '75.00',
      linhas: [],
      saldoFinal: '75.00',
    });
  });

  it('ordena por id crescente quando a data empata', async () => {
    const { authorization, base, entradas } = await criarCenarioBase();
    const mesmaData = new Date('2026-09-10T00:00:00.000Z');

    const primeiro = await createTransaction({
      ...base,
      categoryId: entradas.id,
      type: 'ENTRADA',
      amount: '10.00',
      date: mesmaData,
    });
    const segundo = await createTransaction({
      ...base,
      categoryId: entradas.id,
      type: 'ENTRADA',
      amount: '5.00',
      date: mesmaData,
    });

    const response = await request(createApp())
      .get('/extrato')
      .query(PERIODO)
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect(segundo.id).toBeGreaterThan(primeiro.id);
    expect(
      response.body.linhas.map((linha: { id: string; saldoAcumulado: string }) => [
        linha.id,
        linha.saldoAcumulado,
      ]),
    ).toEqual([
      [primeiro.id.toString(), '10.00'],
      [segundo.id.toString(), '15.00'],
    ]);
  });

  it('acumula saldo negativo quando as saídas superam as entradas', async () => {
    const { authorization, base, entradas, saidas } = await criarCenarioBase();

    await createTransaction({
      ...base,
      categoryId: entradas.id,
      type: 'ENTRADA',
      amount: '40.00',
      date: new Date('2026-09-01T00:00:00.000Z'),
    });
    await createTransaction({
      ...base,
      categoryId: saidas.id,
      type: 'SAIDA',
      amount: '100.00',
      date: new Date('2026-09-02T00:00:00.000Z'),
    });

    const response = await request(createApp())
      .get('/extrato')
      .query(PERIODO)
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect(
      response.body.linhas.map((linha: { saldoAcumulado: string }) => linha.saldoAcumulado),
    ).toEqual(['40.00', '-60.00']);
    expect(response.body.saldoFinal).toBe('-60.00');
  });

  it('inclui os lançamentos exatamente em dataInicio e em dataFim', async () => {
    const { authorization, base, entradas } = await criarCenarioBase();

    const noInicio = await createTransaction({
      ...base,
      categoryId: entradas.id,
      type: 'ENTRADA',
      amount: '10.00',
      date: new Date('2026-09-01T00:00:00.000Z'),
    });
    const noFim = await createTransaction({
      ...base,
      categoryId: entradas.id,
      type: 'ENTRADA',
      amount: '20.00',
      date: new Date('2026-09-30T00:00:00.000Z'),
    });
    await createTransaction({
      ...base,
      categoryId: entradas.id,
      type: 'ENTRADA',
      amount: '999.00',
      date: new Date('2026-10-01T00:00:00.000Z'),
    });

    const response = await request(createApp())
      .get('/extrato')
      .query(PERIODO)
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect(response.body.linhas.map((linha: { id: string }) => linha.id)).toEqual([
      noInicio.id.toString(),
      noFim.id.toString(),
    ]);
    expect(response.body.saldoFinal).toBe('30.00');
  });

  it('acumula a sequência exata de uma entrada e três saídas iguais', async () => {
    const { authorization, base, entradas, saidas } = await criarCenarioBase();

    await createTransaction({
      ...base,
      categoryId: entradas.id,
      type: 'ENTRADA',
      amount: '100.00',
      date: new Date('2026-09-01T00:00:00.000Z'),
    });

    for (const dia of ['02', '03', '04']) {
      await createTransaction({
        ...base,
        categoryId: saidas.id,
        type: 'SAIDA',
        amount: '33.33',
        date: new Date(`2026-09-${dia}T00:00:00.000Z`),
      });
    }

    const response = await request(createApp())
      .get('/extrato')
      .query(PERIODO)
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect(
      response.body.linhas.map((linha: { saldoAcumulado: string }) => linha.saldoAcumulado),
    ).toEqual(['100.00', '66.67', '33.34', '0.01']);
    expect(response.body.saldoFinal).toBe('0.01');
  });

  it('rejeita requisição sem dataInicio', async () => {
    const { authorization } = await criarCenarioBase();

    const response = await request(createApp())
      .get('/extrato')
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
      .get('/extrato')
      .query({ dataInicio: '2026-09-01' })
      .set('Authorization', authorization);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      erro: 'Dados inválidos',
      campos: { dataFim: 'Entrada inválida: esperava um texto, recebeu um valor "undefined"' },
    });
  });

  it('rejeita dataFim anterior a dataInicio', async () => {
    const { authorization } = await criarCenarioBase();

    const response = await request(createApp())
      .get('/extrato')
      .query({ dataInicio: '2026-09-30', dataFim: '2026-09-01' })
      .set('Authorization', authorization);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      erro: 'Dados inválidos',
      campos: { dataFim: 'dataFim não pode ser anterior a dataInicio' },
    });
  });

  it('não deixa outra organização contaminar as linhas nem o saldo anterior', async () => {
    const { authorization, base, entradas } = await criarCenarioBase();

    const proprio = await createTransaction({
      ...base,
      categoryId: entradas.id,
      type: 'ENTRADA',
      amount: '10.00',
      date: new Date('2026-09-05T00:00:00.000Z'),
    });

    const outraOrganizacao = await createOrganization();
    const outroUsuario = await createUser();
    await createMembership({ userId: outroUsuario.id, organizationId: outraOrganizacao.id });
    const outraCategoria = await createCategory({
      organizationId: outraOrganizacao.id,
      type: 'ENTRADA',
    });
    // Anterior ao periodo: entraria no saldo anterior se a organizacao nao fosse respeitada.
    await createTransaction({
      organizationId: outraOrganizacao.id,
      userId: outroUsuario.id,
      categoryId: outraCategoria.id,
      type: 'ENTRADA',
      amount: '5000.00',
      date: new Date('2026-08-01T00:00:00.000Z'),
    });
    await createTransaction({
      organizationId: outraOrganizacao.id,
      userId: outroUsuario.id,
      categoryId: outraCategoria.id,
      type: 'ENTRADA',
      amount: '7000.00',
      date: new Date('2026-09-06T00:00:00.000Z'),
    });

    const response = await request(createApp())
      .get('/extrato')
      .query(PERIODO)
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect(response.body.saldoAnterior).toBe('0.00');
    expect(response.body.linhas.map((linha: { id: string }) => linha.id)).toEqual([
      proprio.id.toString(),
    ]);
    expect(response.body.saldoFinal).toBe('10.00');
  });

  it('permite que um consultor consulte o extrato', async () => {
    const consultor = await createUser();
    const organization = await createOrganization();
    await createMembership({
      userId: consultor.id,
      organizationId: organization.id,
      role: 'CONSULTOR',
    });
    const categoria = await createCategory({ organizationId: organization.id, type: 'ENTRADA' });
    await createTransaction({
      organizationId: organization.id,
      userId: consultor.id,
      categoryId: categoria.id,
      type: 'ENTRADA',
      amount: '15.00',
      date: new Date('2026-09-09T00:00:00.000Z'),
    });

    const response = await request(createApp())
      .get('/extrato')
      .query(PERIODO)
      .set('Authorization', createAuthorizationHeader(consultor));

    expect(response.status).toBe(200);
    expect(response.body.linhas).toHaveLength(1);
    expect(response.body.saldoFinal).toBe('15.00');
  });
});
