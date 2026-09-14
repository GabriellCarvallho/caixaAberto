import { prisma } from '../../src/database/client.js';
import { Prisma } from '../../src/generated/prisma/client.js';

export async function createTransaction(
  overrides: Pick<
    Prisma.TransactionUncheckedCreateInput,
    'organizationId' | 'userId' | 'categoryId'
  > &
    Partial<
      Omit<Prisma.TransactionUncheckedCreateInput, 'organizationId' | 'userId' | 'categoryId'>
    >,
) {
  return prisma.transaction.create({
    data: {
      amount: new Prisma.Decimal('100.00'),
      date: new Date('2026-09-01T00:00:00.000Z'),
      type: 'ENTRADA',
      description: 'Lançamento criado por uma factory de integração',
      source: 'Factory',
      recipient: null,
      status: 'ATIVO',
      createdAt: new Date('2026-09-01T12:00:00.000Z'),
      ...overrides,
    },
  });
}
