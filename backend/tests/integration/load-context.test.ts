import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../src/app.js';
import { createMembership, createOrganization, createUser } from '../factories/index.js';
import { createAuthorizationHeader } from '../helpers/auth.js';

describe('contexto autenticado da organização', () => {
  it('carrega o único vínculo ativo usando um JWT real', async () => {
    const user = await createUser();
    const organization = await createOrganization();
    await createMembership({ userId: user.id, organizationId: organization.id });

    const response = await request(createApp())
      .get('/test/contexto')
      .set('Authorization', createAuthorizationHeader(user));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      usuarioId: user.id.toString(),
      organizacaoId: organization.id.toString(),
      papel: 'TESOUREIRO',
    });
  });

  it('preserva o contexto informado por X-Test-Context sem exigir JWT ou vínculo', async () => {
    const response = await request(createApp())
      .get('/test/contexto')
      .set(
        'X-Test-Context',
        JSON.stringify({ usuarioId: '41', organizacaoId: '42', papel: 'CONSULTOR' }),
      );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      usuarioId: '41',
      organizacaoId: '42',
      papel: 'CONSULTOR',
    });
  });

  it('rejeita usuário autenticado sem vínculo', async () => {
    const user = await createUser();

    const response = await request(createApp())
      .get('/test/contexto')
      .set('Authorization', createAuthorizationHeader(user));

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ erro: 'Usuário não possui vínculo ativo com uma organização' });
  });

  it('rejeita usuário cujo único vínculo está inativo', async () => {
    const user = await createUser();
    const organization = await createOrganization();
    await createMembership({
      userId: user.id,
      organizationId: organization.id,
      active: false,
    });

    const response = await request(createApp())
      .get('/test/contexto')
      .set('Authorization', createAuthorizationHeader(user));

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ erro: 'Usuário não possui vínculo ativo com uma organização' });
  });

  it('solicita a organização quando existem vários vínculos ativos', async () => {
    const user = await createUser();
    const firstOrganization = await createOrganization();
    const secondOrganization = await createOrganization();
    await createMembership({ userId: user.id, organizationId: firstOrganization.id });
    await createMembership({ userId: user.id, organizationId: secondOrganization.id });

    const response = await request(createApp())
      .get('/test/contexto')
      .set('Authorization', createAuthorizationHeader(user));

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      erro: 'Informe X-Organization-Id para escolher uma organização',
    });
  });

  it('seleciona um dos vínculos ativos por X-Organization-Id', async () => {
    const user = await createUser();
    const firstOrganization = await createOrganization();
    const secondOrganization = await createOrganization();
    await createMembership({ userId: user.id, organizationId: firstOrganization.id });
    await createMembership({
      userId: user.id,
      organizationId: secondOrganization.id,
      role: 'CONSULTOR',
    });

    const response = await request(createApp())
      .get('/test/contexto')
      .set('Authorization', createAuthorizationHeader(user))
      .set('X-Organization-Id', secondOrganization.id.toString());

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      usuarioId: user.id.toString(),
      organizacaoId: secondOrganization.id.toString(),
      papel: 'CONSULTOR',
    });
  });

  it('barra consultor em rota exclusiva de tesoureiro', async () => {
    const user = await createUser();
    const organization = await createOrganization();
    await createMembership({
      userId: user.id,
      organizationId: organization.id,
      role: 'CONSULTOR',
    });

    const response = await request(createApp())
      .get('/test/contexto/tesoureiro')
      .set('Authorization', createAuthorizationHeader(user));

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ erro: 'Acesso permitido apenas para TESOUREIRO' });
  });

  it('autoriza contexto de teste com papel de tesoureiro', async () => {
    const response = await request(createApp())
      .get('/test/contexto/tesoureiro')
      .set(
        'X-Test-Context',
        JSON.stringify({ usuarioId: '51', organizacaoId: '52', papel: 'TESOUREIRO' }),
      );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      usuarioId: '51',
      organizacaoId: '52',
      papel: 'TESOUREIRO',
    });
  });
});
