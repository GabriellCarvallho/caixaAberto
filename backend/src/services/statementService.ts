import { formatCivilDate } from '../domain/civil-date.js';
import { affectsBalance, transactionTypes } from '../domain/transaction.js';
import { Prisma } from '../generated/prisma/client.js';
import * as statementRepository from '../repositories/statementRepository.js';
import type {
  StatementLineRecord,
  StatementTotalByType,
} from '../repositories/statementRepository.js';

const [INCOME_TYPE] = transactionTypes;

export interface StatementLine {
  id: string;
  data: string;
  tipo: string;
  valor: string;
  categoria: { id: string; nome: string };
  descricao: string;
  status: string;
  saldoAcumulado: string;
}

export interface StatementResponse {
  dataInicio: string;
  dataFim: string;
  saldoAnterior: string;
  linhas: StatementLine[];
  saldoFinal: string;
}

function applyToBalance(balance: Prisma.Decimal, type: string, amount: Prisma.Decimal) {
  return type === INCOME_TYPE ? balance.plus(amount) : balance.minus(amount);
}

// Nao existe saldo inicial armazenado: o saldo anterior e sempre derivado do historico.
function calculatePreviousBalance(totals: StatementTotalByType[]): Prisma.Decimal {
  return totals.reduce(
    (balance, row) => applyToBalance(balance, row.type, row.total),
    new Prisma.Decimal(0),
  );
}

function toLine(record: StatementLineRecord, accumulated: Prisma.Decimal): StatementLine {
  return {
    id: record.id.toString(),
    data: formatCivilDate(record.date),
    tipo: record.type,
    valor: record.amount.toFixed(2),
    categoria: {
      id: record.category.id.toString(),
      nome: record.category.name,
    },
    descricao: record.description,
    status: record.status,
    saldoAcumulado: accumulated.toFixed(2),
  };
}

export async function getStatement(
  organizationId: bigint,
  startDate: Date,
  endDate: Date,
): Promise<StatementResponse> {
  const { lines, previousTotals } = await statementRepository.findStatement({
    organizationId,
    startDate,
    endDate,
  });

  const previousBalance = calculatePreviousBalance(previousTotals);

  // O acumulado usa Decimal, e nao number, para que somas de centavos nao acumulem erro binario.
  // A linha estornada repete o acumulado da anterior, porque nao altera o saldo.
  let accumulated = previousBalance;

  const statementLines = lines.map((record) => {
    if (affectsBalance(record.status)) {
      accumulated = applyToBalance(accumulated, record.type, record.amount);
    }

    return toLine(record, accumulated);
  });

  // Sem linhas no periodo, o acumulado nunca avancou e o saldo final e o proprio saldo anterior.
  return {
    dataInicio: formatCivilDate(startDate),
    dataFim: formatCivilDate(endDate),
    saldoAnterior: previousBalance.toFixed(2),
    linhas: statementLines,
    saldoFinal: accumulated.toFixed(2),
  };
}
