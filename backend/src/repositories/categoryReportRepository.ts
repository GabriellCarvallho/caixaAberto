import { prisma } from '../database/client.js';
import { Prisma } from '../generated/prisma/client.js';
import { BALANCE_AFFECTING_STATUS } from '../domain/transaction.js';

export interface CategoryReportRange {
  organizationId: bigint;
  startDate: Date;
  endDate: Date;
}

export interface CategoryReportTotal {
  categoryId: bigint;
  total: Prisma.Decimal;
}

export interface CategoryReportCategory {
  id: bigint;
  name: string;
  type: string;
}

export interface CategoryReportData {
  totals: CategoryReportTotal[];
  categories: CategoryReportCategory[];
}

export async function findCategoryReport(range: CategoryReportRange): Promise<CategoryReportData> {
  const { organizationId, startDate, endDate } = range;

  // Transacao interativa, e nao a forma de array: a consulta das categorias depende dos ids que
  // saem da agregacao. As duas ficam na mesma transacao para que um lancamento gravado entre elas
  // nao deixe os totais e os nomes descrevendo estados diferentes do banco.
  return prisma.$transaction(async (tx) => {
    // O estorno e excluido ja na agregacao, pelo mesmo criterio que o extrato usa.
    const grouped = await tx.transaction.groupBy({
      by: ['categoryId'],
      where: {
        organizationId,
        status: BALANCE_AFFECTING_STATUS,
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
      orderBy: { categoryId: 'asc' },
    });

    const totals = grouped.map((row) => ({
      categoryId: row.categoryId,
      total: row._sum?.amount ?? new Prisma.Decimal(0),
    }));

    if (totals.length === 0) {
      return { totals, categories: [] };
    }

    // Uma consulta so para todas as categorias envolvidas, nunca uma por categoria. Sem filtro de
    // ativa: uma categoria desativada depois de usada precisa continuar aparecendo no historico,
    // senao o relatorio deixa de bater com o extrato do mesmo periodo.
    const categories = await tx.category.findMany({
      where: {
        organizationId,
        id: { in: totals.map((row) => row.categoryId) },
      },
      select: {
        id: true,
        name: true,
        type: true,
      },
    });

    return { totals, categories };
  });
}
