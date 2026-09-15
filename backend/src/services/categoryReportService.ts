import { formatCivilDate } from '../domain/civil-date.js';
import {
  assertKnownTransactionType,
  EXPENSE_TYPE,
  INCOME_TYPE,
  type TransactionType,
} from '../domain/transaction.js';
import { Prisma } from '../generated/prisma/client.js';
import * as categoryReportRepository from '../repositories/categoryReportRepository.js';
import { assertNever } from '../utils/assert-never.js';

export interface CategoryReportItem {
  id: string;
  nome: string;
  tipo: string;
  total: string;
}

export interface CategoryReportResponse {
  dataInicio: string;
  dataFim: string;
  categorias: CategoryReportItem[];
  totais: {
    entradas: string;
    saidas: string;
  };
}

interface AggregatedCategory {
  id: bigint;
  name: string;
  type: string;
  total: Prisma.Decimal;
}

// Entradas antes de saidas, para o relatorio ser lido na ordem em que o dinheiro se move: o que
// entrou e depois o que saiu. A ordem vem deste rank nomeado, e nao da comparacao alfabetica dos
// rotulos, que poria ENTRADA na frente por acidente e faria renomear um rotulo reordenar a tela.
// Sendo um Record da uniao, acrescentar um tipo ao dominio quebra a compilacao aqui.
const READING_RANK: Record<TransactionType, number> = {
  [INCOME_TYPE]: 0,
  [EXPENSE_TYPE]: 1,
};

// Tipo separa os dois blocos, espelhando o objeto totais; dentro do bloco o maior total vem
// primeiro, que e a pergunta do relatorio; o nome desempata para a ordem ser deterministica e a tela
// nao trocar linhas de lugar entre dois carregamentos iguais.
function compareForReading(first: AggregatedCategory, second: AggregatedCategory): number {
  const byType =
    READING_RANK[assertKnownTransactionType(first.type)] -
    READING_RANK[assertKnownTransactionType(second.type)];

  if (byType !== 0) {
    return byType;
  }

  const byTotal = second.total.comparedTo(first.total);

  if (byTotal !== 0) {
    return byTotal;
  }

  return first.name.localeCompare(second.name, 'pt-BR');
}

export async function getCategoryReport(
  organizationId: bigint,
  startDate: Date,
  endDate: Date,
): Promise<CategoryReportResponse> {
  const { totals, categories } = await categoryReportRepository.findCategoryReport({
    organizationId,
    startDate,
    endDate,
  });

  const categoriesById = new Map(categories.map((category) => [category.id, category]));

  const aggregated: AggregatedCategory[] = totals.map((row) => {
    const category = categoriesById.get(row.categoryId);

    if (!category) {
      throw new Error(`Categoria ${row.categoryId} nao encontrada para o relatorio`);
    }

    return { id: category.id, name: category.name, type: category.type, total: row.total };
  });

  aggregated.sort(compareForReading);

  let entradas = new Prisma.Decimal(0);
  let saidas = new Prisma.Decimal(0);

  for (const category of aggregated) {
    // O tipo e atributo da categoria, e uma categoria de entrada so recebe lancamentos de entrada,
    // entao o total de cada linha e sempre positivo e nao ha subtracao dentro de uma categoria.
    // Os totais gerais somam as categorias de cada tipo, ambos positivos. Saldo e do extrato.
    const knownType = assertKnownTransactionType(category.type);

    switch (knownType) {
      case INCOME_TYPE:
        entradas = entradas.plus(category.total);
        break;
      case EXPENSE_TYPE:
        saidas = saidas.plus(category.total);
        break;
      default:
        assertNever(knownType);
    }
  }

  return {
    dataInicio: formatCivilDate(startDate),
    dataFim: formatCivilDate(endDate),
    categorias: aggregated.map((category) => ({
      id: category.id.toString(),
      nome: category.name,
      tipo: category.type,
      total: category.total.toFixed(2),
    })),
    totais: {
      entradas: entradas.toFixed(2),
      saidas: saidas.toFixed(2),
    },
  };
}
