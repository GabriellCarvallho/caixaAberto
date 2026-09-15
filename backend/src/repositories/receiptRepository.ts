import { prisma } from '../database/client.js';

export interface ReceiptRecord {
  id: bigint;
  transactionId: bigint;
  fileName: string;
  fileType: string;
  size: bigint;
  fileUrl: string;
  uploadedAt: Date;
}

export interface CreateReceiptData {
  transactionId: bigint;
  fileName: string;
  fileType: string;
  size: bigint;
  fileUrl: string;
  uploadedAt: Date;
}

const receiptSelection = {
  id: true,
  transactionId: true,
  fileName: true,
  fileType: true,
  size: true,
  fileUrl: true,
  uploadedAt: true,
} as const;

export async function findTransactionInOrganization(
  transactionId: bigint,
  organizationId: bigint,
): Promise<{ id: bigint } | null> {
  return prisma.transaction.findFirst({
    where: { id: transactionId, organizationId },
    select: { id: true },
  });
}

// O vinculo com a organizacao entra na propria consulta: lancamento de outra organizacao e
// comprovante ausente resultam igualmente em null, e ambos viram 404, sem revelar existencia.
export async function findReceiptInOrganization(
  transactionId: bigint,
  organizationId: bigint,
): Promise<ReceiptRecord | null> {
  return prisma.receipt.findFirst({
    where: { transactionId, transaction: { organizationId } },
    select: receiptSelection,
  });
}

// beforeCommit roda dentro da transacao, depois da linha existir e antes do commit: se a gravacao
// do arquivo falhar, a linha e desfeita junto.
export async function createReceipt(
  data: CreateReceiptData,
  beforeCommit: () => Promise<void>,
): Promise<ReceiptRecord> {
  return prisma.$transaction(async (tx) => {
    const created = await tx.receipt.create({ data, select: receiptSelection });

    await beforeCommit();

    return created;
  });
}
