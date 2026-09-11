import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../src/app.js';

describe('estrutura HTTP da API', () => {
  it('informa que o serviço está saudável', async () => {
    const response = await request(createApp()).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('retorna erros no contrato público sem stack trace', async () => {
    const response = await request(createApp()).get('/rota-inexistente');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ erro: 'Rota não encontrada' });
    expect(response.text).not.toContain('stack');
  });

  it('disponibiliza o contexto autenticado informado no cabeçalho de teste', async () => {
    const context = JSON.stringify({
      usuarioId: '11',
      organizacaoId: '22',
      papel: 'TESOUREIRO',
    });

    const response = await request(createApp())
      .get('/test/contexto')
      .set('X-Test-Context', context);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      usuarioId: '11',
      organizacaoId: '22',
      papel: 'TESOUREIRO',
    });
  });

  it('rejeita contexto de teste malformado no contrato padrão de erros', async () => {
    const response = await request(createApp())
      .get('/test/contexto')
      .set('X-Test-Context', '{"papel":"INVALIDO"}');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ erro: 'Contexto de teste inválido' });
  });
});
