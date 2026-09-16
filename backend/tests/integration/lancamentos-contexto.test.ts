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
});
