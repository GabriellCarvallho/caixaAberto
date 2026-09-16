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
});
