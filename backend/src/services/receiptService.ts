import { randomUUID } from 'node:crypto';

import { detectFileType, extensionFor } from '../domain/file-type.js';
import { AppError } from '../errors/app-error.js';
import { Prisma } from '../generated/prisma/client.js';
import * as receiptRepository from '../repositories/receiptRepository.js';
import type { ReceiptRecord } from '../repositories/receiptRepository.js';
import { getStorageService } from '../storage/index.js';
import type { StoredDelivery } from '../storage/types.js';

export const INVALID_RECEIPT_MESSAGE = 'Envie uma imagem ou PDF de até 5 MB';

const TRANSACTION_NOT_FOUND = 'Lançamento não encontrado';
const RECEIPT_NOT_FOUND = 'Comprovante não encontrado';
const RECEIPT_ALREADY_EXISTS = 'Lançamento já possui comprovante';

export interface UploadedFile {
  originalName: string;
  content: Buffer;
}

export interface ReceiptResponse {
  id: string;
  lancamentoId: string;
  nomeArquivo: string;
  tipoArquivo: string;
  tamanho: string;
  url: string;
}

export interface ReceiptDownload {
  fileName: string;
  fileType: string;
  delivery: StoredDelivery;
}

function toResponse(receipt: ReceiptRecord): ReceiptResponse {
  return {
    id: receipt.id.toString(),
    lancamentoId: receipt.transactionId.toString(),
    nomeArquivo: receipt.fileName,
    tipoArquivo: receipt.fileType,
    tamanho: receipt.size.toString(),
    url: `/lancamentos/${receipt.transactionId.toString()}/comprovante`,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export async function attachReceipt(
  organizationId: bigint,
  transactionId: bigint,
  file: UploadedFile,
): Promise<ReceiptResponse> {
  // O tipo sai do conteudo. Enquanto ele nao for aceito, nada foi gravado em disco, porque o multer
  // usa memoria, nem no banco, porque a linha so e criada abaixo.
  const fileType = detectFileType(file.content);

  if (!fileType) {
    throw new AppError(400, INVALID_RECEIPT_MESSAGE);
  }

  const transaction = await receiptRepository.findTransactionInOrganization(
    transactionId,
    organizationId,
  );

  if (!transaction) {
    throw new AppError(404, TRANSACTION_NOT_FOUND);
  }

  const existing = await receiptRepository.findReceiptInOrganization(transactionId, organizationId);

  if (existing) {
    throw new AppError(409, RECEIPT_ALREADY_EXISTS);
  }

  const storage = getStorageService();
  // A chave e gerada aqui, com extensao derivada do tipo detectado. Nenhum valor recebido do
  // cliente participa da construcao do caminho; o nome original vai apenas para exibicao.
  const key = `${randomUUID()}${extensionFor(fileType)}`;
  let saved = false;

  try {
    const receipt = await receiptRepository.createReceipt(
      {
        transactionId,
        fileName: file.originalName,
        fileType,
        size: BigInt(file.content.length),
        fileUrl: key,
        uploadedAt: new Date(),
      },
      async () => {
        await storage.save({ key, content: file.content, contentType: fileType });
        saved = true;
      },
    );

    return toResponse(receipt);
  } catch (error) {
    // Dos dois orfaos possiveis, toleramos o de disco e nunca o de banco: arquivo sem linha e lixo
    // invisivel, enquanto linha sem arquivo e um GET quebrado na cara do usuario. A gravacao nao
    // participa da transacao, entao ela e desfeita aqui quando a operacao de banco nao completa.
    if (saved) {
      await storage.remove(key).catch(() => undefined);
    }

    if (isUniqueViolation(error)) {
      throw new AppError(409, RECEIPT_ALREADY_EXISTS);
    }

    throw error;
  }
}

export async function downloadReceipt(
  organizationId: bigint,
  transactionId: bigint,
): Promise<ReceiptDownload> {
  const receipt = await receiptRepository.findReceiptInOrganization(transactionId, organizationId);

  if (!receipt) {
    throw new AppError(404, RECEIPT_NOT_FOUND);
  }

  const delivery = await getStorageService().deliver(receipt.fileUrl);

  return { fileName: receipt.fileName, fileType: receipt.fileType, delivery };
}
