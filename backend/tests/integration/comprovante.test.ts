import { readdir } from 'node:fs/promises';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from '../../src/app.js';
import { readEnvironment } from '../../src/config/environment.js';
import { prisma } from '../../src/database/client.js';
import * as receiptRepository from '../../src/repositories/receiptRepository.js';
import {
  createCategory,
  createMembership,
  createOrganization,
  createTransaction,
  createUser,
} from '../factories/index.js';
import { createAuthorizationHeader } from '../helpers/auth.js';
import { testUploadDirectory } from '../helpers/test-environment.js';

// Conteudos reais, montados pelos bytes iniciais de cada formato. O corpo depois da assinatura nao
// importa para a deteccao, que e justamente o ponto: o tipo sai do conteudo, nao da extensao.
const PDF = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.from('conteudo de teste')]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32, 1)]);
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32, 1),
]);
const WEBP = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0x00, 0x00, 0x00, 0x00]),
  Buffer.from('WEBP'),
  Buffer.alloc(32, 1),
]);
// Assinatura de arquivo ZIP, que e o que um .docx realmente e.
const DOCX = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(64, 1)]);

async function arquivosArmazenados(): Promise<string[]> {
  return readdir(testUploadDirectory());
}

async function criarCenario(role: 'TESOUREIRO' | 'CONSULTOR' = 'TESOUREIRO') {
  const user = await createUser();
  const organization = await createOrganization();
  await createMembership({ userId: user.id, organizationId: organization.id, role });
  const categoria = await createCategory({ organizationId: organization.id, type: 'SAIDA' });
  const lancamento = await createTransaction({
    organizationId: organization.id,
    userId: user.id,
    categoryId: categoria.id,
    type: 'SAIDA',
    amount: '75.00',
    date: new Date('2026-09-10T00:00:00.000Z'),
  });

  return {
    user,
    organization,
    lancamento,
    authorization: createAuthorizationHeader(user),
  };
}

describe('comprovante de lançamento', () => {
  it('Cenário 1 - anexar comprovante válido', async () => {
    const { lancamento, authorization } = await criarCenario();

    const response = await request(createApp())
      .post(`/lancamentos/${lancamento.id}/comprovante`)
      .set('Authorization', authorization)
      .attach('arquivo', PDF, { filename: 'nota.pdf', contentType: 'application/pdf' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: expect.stringMatching(/^\d+$/),
      lancamentoId: lancamento.id.toString(),
      nomeArquivo: 'nota.pdf',
      tipoArquivo: 'application/pdf',
      tamanho: String(PDF.length),
      url: `/lancamentos/${lancamento.id}/comprovante`,
    });

    const persistido = await prisma.receipt.findUniqueOrThrow({
      where: { transactionId: lancamento.id },
    });
    expect(persistido.fileType).toBe('application/pdf');
    expect(await arquivosArmazenados()).toHaveLength(1);

    // Passa a aparecer na consulta de lançamentos.
    const listagem = await request(createApp())
      .get('/lancamentos')
      .set('Authorization', authorization);
    expect(listagem.body.dados[0].possuiComprovante).toBe(true);

    const download = await request(createApp())
      .get(`/lancamentos/${lancamento.id}/comprovante`)
      .set('Authorization', authorization);
    expect(download.status).toBe(200);
    expect(Buffer.from(download.body)).toEqual(PDF);
  });

  it('Cenário 2 - arquivo de tipo não permitido é rejeitado sem armazenar nada', async () => {
    const { lancamento, authorization } = await criarCenario();

    const response = await request(createApp())
      .post(`/lancamentos/${lancamento.id}/comprovante`)
      .set('Authorization', authorization)
      .attach('arquivo', DOCX, {
        filename: 'contrato.docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ erro: 'Envie uma imagem ou PDF de até 5 MB' });
    expect(await prisma.receipt.count()).toBe(0);
    expect(await arquivosArmazenados()).toEqual([]);
  });

  it('rejeita arquivo acima do limite sem armazenar nada', async () => {
    const { lancamento, authorization } = await criarCenario();
    const limite = readEnvironment().UPLOAD_MAX_BYTES;
    // PDF valido, para que somente a regra de tamanho possa rejeita-lo.
    const grande = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(limite, 0x41)]);

    const response = await request(createApp())
      .post(`/lancamentos/${lancamento.id}/comprovante`)
      .set('Authorization', authorization)
      .attach('arquivo', grande, { filename: 'gigante.pdf', contentType: 'application/pdf' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ erro: 'Envie uma imagem ou PDF de até 5 MB' });
    expect(await prisma.receipt.count()).toBe(0);
    expect(await arquivosArmazenados()).toEqual([]);
  });

  it.each([
    ['application/pdf', PDF, 'nota.pdf'],
    ['image/jpeg', JPEG, 'foto.jpg'],
    ['image/png', PNG, 'recibo.png'],
    ['image/webp', WEBP, 'imagem.webp'],
  ])('aceita %s', async (tipoEsperado, conteudo, nome) => {
    const { lancamento, authorization } = await criarCenario();

    const response = await request(createApp())
      .post(`/lancamentos/${lancamento.id}/comprovante`)
      .set('Authorization', authorization)
      .attach('arquivo', conteudo as Buffer, { filename: nome as string });

    expect(response.status).toBe(201);
    expect(response.body.tipoArquivo).toBe(tipoEsperado);
  });

  it('rejeita arquivo com extensão .pdf mas conteúdo que não é PDF', async () => {
    const { lancamento, authorization } = await criarCenario();

    const response = await request(createApp())
      .post(`/lancamentos/${lancamento.id}/comprovante`)
      .set('Authorization', authorization)
      // Extensao e Content-Type dizem PDF; o conteudo e um ZIP.
      .attach('arquivo', DOCX, { filename: 'disfarcado.pdf', contentType: 'application/pdf' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ erro: 'Envie uma imagem ou PDF de até 5 MB' });
    expect(await prisma.receipt.count()).toBe(0);
    expect(await arquivosArmazenados()).toEqual([]);
  });

  it('responde 403 quando um consultor tenta enviar', async () => {
    const { lancamento, authorization } = await criarCenario('CONSULTOR');

    const response = await request(createApp())
      .post(`/lancamentos/${lancamento.id}/comprovante`)
      .set('Authorization', authorization)
      .attach('arquivo', PDF, { filename: 'nota.pdf' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ erro: 'Acesso permitido apenas para TESOUREIRO' });
    expect(await prisma.receipt.count()).toBe(0);
    expect(await arquivosArmazenados()).toEqual([]);
  });

  it('responde 404 para lançamento de outra organização, no envio e na leitura', async () => {
    const { authorization } = await criarCenario();

    const outraOrganizacao = await createOrganization();
    const outroUsuario = await createUser();
    await createMembership({ userId: outroUsuario.id, organizationId: outraOrganizacao.id });
    const outraCategoria = await createCategory({
      organizationId: outraOrganizacao.id,
      type: 'SAIDA',
    });
    const alheio = await createTransaction({
      organizationId: outraOrganizacao.id,
      userId: outroUsuario.id,
      categoryId: outraCategoria.id,
      type: 'SAIDA',
    });
    await request(createApp())
      .post(`/lancamentos/${alheio.id}/comprovante`)
      .set('Authorization', createAuthorizationHeader(outroUsuario))
      .attach('arquivo', PDF, { filename: 'alheio.pdf' });

    const envio = await request(createApp())
      .post(`/lancamentos/${alheio.id}/comprovante`)
      .set('Authorization', authorization)
      .attach('arquivo', PDF, { filename: 'invasor.pdf' });
    const leitura = await request(createApp())
      .get(`/lancamentos/${alheio.id}/comprovante`)
      .set('Authorization', authorization);

    expect(envio.status).toBe(404);
    expect(envio.body).toEqual({ erro: 'Lançamento não encontrado' });
    expect(leitura.status).toBe(404);
    expect(leitura.body).toEqual({ erro: 'Comprovante não encontrado' });
  });

  it('devolve o conteúdo com o tipo correto na leitura', async () => {
    const { lancamento, authorization } = await criarCenario();

    await request(createApp())
      .post(`/lancamentos/${lancamento.id}/comprovante`)
      .set('Authorization', authorization)
      .attach('arquivo', PNG, { filename: 'recibo.png' });

    const response = await request(createApp())
      .get(`/lancamentos/${lancamento.id}/comprovante`)
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('image/png');
    expect(response.headers['content-disposition']).toContain('recibo.png');
    expect(Buffer.from(response.body)).toEqual(PNG);
  });

  it('responde 404 na leitura de lançamento sem comprovante', async () => {
    const { lancamento, authorization } = await criarCenario();

    const response = await request(createApp())
      .get(`/lancamentos/${lancamento.id}/comprovante`)
      .set('Authorization', authorization);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ erro: 'Comprovante não encontrado' });
  });

  it('responde 409 no segundo envio e preserva o comprovante existente', async () => {
    const { lancamento, authorization } = await criarCenario();

    const primeiro = await request(createApp())
      .post(`/lancamentos/${lancamento.id}/comprovante`)
      .set('Authorization', authorization)
      .attach('arquivo', PDF, { filename: 'original.pdf' });

    const segundo = await request(createApp())
      .post(`/lancamentos/${lancamento.id}/comprovante`)
      .set('Authorization', authorization)
      .attach('arquivo', PNG, { filename: 'substituto.png' });

    expect(primeiro.status).toBe(201);
    expect(segundo.status).toBe(409);
    expect(segundo.body).toEqual({ erro: 'Lançamento já possui comprovante' });

    // A evidencia anterior continua intacta, arquivo e linha.
    const persistido = await prisma.receipt.findUniqueOrThrow({
      where: { transactionId: lancamento.id },
    });
    expect(persistido.fileName).toBe('original.pdf');
    expect(persistido.fileType).toBe('application/pdf');
    expect(await arquivosArmazenados()).toHaveLength(1);
  });

  it('remove o arquivo gravado quando a operação de banco não completa', async () => {
    const { lancamento, authorization } = await criarCenario();

    // A gravacao em disco nao participa da transacao do banco, entao existe uma janela real: o
    // arquivo gravado e o commit falhando depois. E a unica forma de exercitar a compensacao, ja
    // que a falha de commit nao tem como ser provocada pelo banco de teste.
    const spy = vi
      .spyOn(receiptRepository, 'createReceipt')
      .mockImplementation(async (_data, beforeCommit) => {
        await beforeCommit();

        throw new Error('falha simulada depois da gravação do arquivo');
      });

    try {
      const response = await request(createApp())
        .post(`/lancamentos/${lancamento.id}/comprovante`)
        .set('Authorization', authorization)
        .attach('arquivo', PDF, { filename: 'nota.pdf' });

      expect(response.status).toBe(500);
      // Nem arquivo orfao em disco, nem linha orfa no banco.
      expect(await arquivosArmazenados()).toEqual([]);
      expect(await prisma.receipt.count()).toBe(0);
    } finally {
      spy.mockRestore();
    }
  });

  it('não deixa nome de arquivo do cliente escapar do diretório de upload', async () => {
    const { lancamento, authorization } = await criarCenario();
    const nomeMalicioso = '../../../etc/passwd.pdf';

    const response = await request(createApp())
      .post(`/lancamentos/${lancamento.id}/comprovante`)
      .set('Authorization', authorization)
      .attach('arquivo', PDF, { filename: nomeMalicioso });

    expect(response.status).toBe(201);
    // Guardado apenas para exibicao, nunca usado como caminho.
    expect(response.body.nomeArquivo).toContain('passwd.pdf');

    const persistido = await prisma.receipt.findUniqueOrThrow({
      where: { transactionId: lancamento.id },
    });
    // A chave de armazenamento e gerada: nem barra, nem .., nem o nome recebido.
    expect(persistido.fileUrl).toMatch(/^[0-9a-f-]{36}\.pdf$/);
    expect(persistido.fileUrl).not.toContain('..');
    expect(persistido.fileUrl).not.toContain('/');

    // O arquivo esta dentro do diretorio de upload, e so ele.
    expect(await arquivosArmazenados()).toEqual([persistido.fileUrl]);
  });
});
