import { prisma } from '../../src/database/client.js';
import type { Prisma } from '../../src/generated/prisma/client.js';

let sequence = 0;

export async function createReceipt(
  overrides: Pick<Prisma.ReceiptUncheckedCreateInput, 'transactionId'> &
    Partial<Omit<Prisma.ReceiptUncheckedCreateInput, 'transactionId'>>,
) {
  sequence += 1;

  return prisma.receipt.create({
    data: {
      fileName: `comprovante-${sequence}.pdf`,
      fileType: 'application/pdf',
      size: 1024n,
      fileUrl: `/uploads/comprovante-${sequence}.pdf`,
      uploadedAt: new Date('2026-09-01T12:00:00.000Z'),
      ...overrides,
    },
  });
}
