import { prisma } from '../database/client.js';
import { Prisma } from '../generated/prisma/client.js';
import { BALANCE_AFFECTING_STATUS } from '../domain/transaction.js';

export interface StatementRange {
  organizationId: bigint;
  startDate: Date;
  endDate: Date;
}

export interface StatementLineRecord {
  id: bigint;
  date: Date;
  type: string;
  amount: Prisma.Decimal;
  description: string;
  status: string;
  category: { id: bigint; name: string };
}

export interface StatementTotalByType {
  type: string;
  total: Prisma.Decimal;
}

export interface StatementData {
  lines: StatementLineRecord[];
  previousTotals: StatementTotalByType[];
}

// O estorno nao e filtrado aqui: a linha estornada aparece no extrato, apenas sem efeito no saldo.
const statementLineSelection = {
  id: true,
  date: true,
  type: true,
  amount: true,
  description: true,
  status: true,
  category: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.TransactionSelect;

export async function findStatement(range: StatementRange): Promise<StatementData> {
  const { organizationId, startDate, endDate } = range;

  // As duas consultas correm na mesma transacao: um lancamento gravado entre elas deixaria o saldo
  // anterior e as linhas descrevendo estados diferentes do banco.
  const [lines, previousTotals] = await prisma.$transaction([
    prisma.transaction.findMany({
      where: {
        organizationId,
        date: { gte: startDate, lte: endDate },
      },
      select: statementLineSelection,
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
    }),
    // O corte e estrito: um lancamento em dataInicio pertence as linhas, nunca ao saldo anterior.
    prisma.transaction.groupBy({
      by: ['type'],
      where: {
        organizationId,
        status: BALANCE_AFFECTING_STATUS,
        date: { lt: startDate },
      },
      _sum: { amount: true },
      orderBy: { type: 'asc' },
    }),
  ]);

  return {
    lines,
    previousTotals: previousTotals.map((row) => ({
      type: row.type,
      total: row._sum?.amount ?? new Prisma.Decimal(0),
    })),
  };
}
