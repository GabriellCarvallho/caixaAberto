import type { NextFunction, Request, RequestHandler, Response } from 'express';
import multer, { MulterError } from 'multer';

import { readEnvironment } from '../config/environment.js';
import { AppError } from '../errors/app-error.js';
import { getContexto } from '../middlewares/load-context.js';
import { transactionIdParamSchema } from '../schemas/identifier.js';
import * as receiptService from '../services/receiptService.js';
import { INVALID_RECEIPT_MESSAGE } from '../services/receiptService.js';
import { assertNever } from '../utils/assert-never.js';

const FILE_FIELD = 'arquivo';

// Memoria, e nao disco: o arquivo so chega ao disco depois de aceito, entao nao existe janela em
// que uma requisicao rejeitada deixe residuo. O limite corta ainda no stream, antes de o corpo ser
// inteiramente lido, e e a unica fonte da regra de tamanho.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: readEnvironment().UPLOAD_MAX_BYTES, files: 1 },
});

function toAppError(error: MulterError): AppError {
  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      return new AppError(400, INVALID_RECEIPT_MESSAGE);
    case 'LIMIT_FILE_COUNT':
    case 'LIMIT_UNEXPECTED_FILE':
      return new AppError(400, `Envie um único arquivo no campo ${FILE_FIELD}`);
    default:
      return new AppError(400, 'Não foi possível ler o arquivo enviado');
  }
}

// Sem esta conversao, o MulterError chegaria ao errorHandler como erro desconhecido e viraria 500,
// em vez do 400 com a mensagem do contrato.
export const receiveReceiptFile: RequestHandler = (request, response, next) => {
  upload.single(FILE_FIELD)(request, response, (error: unknown) => {
    if (error instanceof MulterError) {
      next(toAppError(error));
      return;
    }

    next(error);
  });
};

export async function uploadReceipt(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = transactionIdParamSchema.parse(request.params);

    if (!request.file) {
      throw new AppError(400, `Envie o arquivo no campo ${FILE_FIELD}`);
    }

    const result = await receiptService.attachReceipt(getContexto(request).organizacaoId, id, {
      originalName: request.file.originalname,
      content: request.file.buffer,
    });

    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function downloadReceipt(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = transactionIdParamSchema.parse(request.params);
    const { fileName, fileType, delivery } = await receiptService.downloadReceipt(
      getContexto(request).organizacaoId,
      id,
    );

    switch (delivery.kind) {
      case 'content':
        // attachment() monta o Content-Disposition escapando o nome, que veio do cliente. O type()
        // vem depois porque attachment() deduz um Content-Type pela extensao, e o nosso e o tipo
        // detectado no upload.
        response.attachment(fileName);
        response.type(fileType);
        response.send(delivery.content);
        return;
      case 'redirect':
        response.redirect(302, delivery.url);
        return;
      default:
        assertNever(delivery);
    }
  } catch (error) {
    next(error);
  }
}
