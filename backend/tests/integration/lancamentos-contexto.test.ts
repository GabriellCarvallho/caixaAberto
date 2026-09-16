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

async function createOrganizationWithTreasurer() {
  const user = await createUser();
  const organization = await createOrganization();
  await createMembership({ userId: user.id, organizationId: organization.id });

  return { user, organization, authorization: createAuthorizationHeader(user) };
}

describe('organização dos lançamentos vem do contexto autenticado', () => {
  it('não expõe lançamento de outra organização no detalhe', async () => {
    const { authorization } = await createOrganizationWithTreasurer();
    const vizinha = await createOrganizationWithTreasurer();
    const categoriaVizinha = await createCategory({
      organizationId: vizinha.organization.id,
      type: 'ENTRADA',
    });
    const lancamentoVizinho = await createTransaction({
      organizationId: vizinha.organization.id,
      userId: vizinha.user.id,
      categoryId: categoriaVizinha.id,
    });

    const response = await request(createApp())
      .get(`/transactions/${lancamentoVizinho.id}`)
      .set('Authorization', authorization);

    expect(response.status).toBe(404);
  });
  it('resume apenas os lançamentos da organização do contexto', async () => {
    const { user, organization, authorization } = await createOrganizationWithTreasurer();
    const vizinha = await createOrganizationWithTreasurer();

    const categoria = await createCategory({ organizationId: organization.id, type: 'ENTRADA' });
    const categoriaVizinha = await createCategory({
      organizationId: vizinha.organization.id,
      type: 'ENTRADA',
    });

    await createTransaction({
      organizationId: organization.id,
      userId: user.id,
      categoryId: categoria.id,
      type: 'ENTRADA',
      amount: '70.00',
      date: new Date('2026-09-10T00:00:00.000Z'),
    });
    await createTransaction({
      organizationId: vizinha.organization.id,
      userId: vizinha.user.id,
      categoryId: categoriaVizinha.id,
      type: 'ENTRADA',
      amount: '999.00',
      date: new Date('2026-09-10T00:00:00.000Z'),
    });

    const response = await request(createApp())
      .get('/transactions/resumo/mensal')
      .query({ mes: '2026-09' })
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect(response.body.entries).toBe('70');
    expect(response.body.balance).toBe('70');
  });

  it('recusa quem não possui vínculo ativo com nenhuma organização', async () => {
    const user = await createUser();

    const response = await request(createApp())
      .get('/transactions/resumo/mensal')
      .query({ mes: '2026-09' })
      .set('Authorization', createAuthorizationHeader(user));

    expect(response.status).toBe(403);
  });
  it('registra o lançamento na organização do vínculo sem recebê-la no corpo', async () => {
    const { organization, authorization } = await createOrganizationWithTreasurer();
    const categoria = await createCategory({
      organizationId: organization.id,
      type: 'ENTRADA',
    });

    const response = await request(createApp())
      .post('/transactions')
      .set('Authorization', authorization)
      .send({
        categoryId: categoria.id.toString(),
        amount: '150.00',
        date: '2026-09-15',
        description: 'Doação recebida',
        tipo: 'ENTRADA',
      });

    expect(response.status).toBe(201);
    expect(response.body.organizationId).toBe(organization.id.toString());
  });

  it('ignora a organização informada pelo cliente e usa a do contexto', async () => {
    const { organization, authorization } = await createOrganizationWithTreasurer();
    const outra = await createOrganization();
    const categoria = await createCategory({
      organizationId: organization.id,
      type: 'SAIDA',
    });

    const response = await request(createApp())
      .post('/transactions')
      .set('Authorization', authorization)
      .send({
        organizationId: outra.id.toString(),
        categoryId: categoria.id.toString(),
        amount: '40.00',
        date: '2026-09-15',
        description: 'Compra de material',
        tipo: 'SAIDA',
      });

    expect(response.status).toBe(201);
    expect(response.body.organizationId).toBe(organization.id.toString());
  });
});
