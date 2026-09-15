import { formatCivilDate } from '../domain/civil-date.js';
import {
  affectsBalance,
  assertKnownTransactionType,
  EXPENSE_TYPE,
  INCOME_TYPE,
} from '../domain/transaction.js';
import { Prisma } from '../generated/prisma/client.js';
import * as statementRepository from '../repositories/statementRepository.js';
import { assertNever } from '../utils/assert-never.js';
import type {
  StatementLineRecord,
  StatementTotalByType,
} from '../repositories/statementRepository.js';

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

// Switch exaustivo em vez de `else` generico: um terceiro tipo acrescentado ao dominio quebra a
// compilacao aqui, no assertNever, em vez de virar saida em silencio e produzir saldo errado sem
// erro nenhum. Um tipo fora da uniao, vindo do banco, e barrado antes, no assertKnownTransactionType.
function applyToBalance(
  balance: Prisma.Decimal,
  type: string,
  amount: Prisma.Decimal,
): Prisma.Decimal {
  const knownType = assertKnownTransactionType(type);

  switch (knownType) {
    case INCOME_TYPE:
      return balance.plus(amount);
    case EXPENSE_TYPE:
      return balance.minus(amount);
    default:
      return assertNever(knownType);
  }
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

  // O acumulado usa Decimal porque e o tipo que o Prisma devolve: converter para number seria perda
  // gratuita. Nas magnitudes permitidas por DECIMAL(12,2) a diferenca nao seria observavel depois do
  // toFixed(2), entao isso e fidelidade ao tipo de origem, e nao protecao contra erro binario.
  // Cada linha depende do acumulado da anterior, e o for...of deixa essa ordem explicita. A linha
  // estornada nao avanca o acumulado, entao repete o valor da anterior.
  let accumulated = previousBalance;
  const statementLines: StatementLine[] = [];

  for (const record of lines) {
    if (affectsBalance(record.status)) {
      accumulated = applyToBalance(accumulated, record.type, record.amount);
    }

    statementLines.push(toLine(record, accumulated));
  }

  // Sem linhas no periodo, o acumulado nunca avancou e o saldo final e o proprio saldo anterior.
  return {
    dataInicio: formatCivilDate(startDate),
    dataFim: formatCivilDate(endDate),
    saldoAnterior: previousBalance.toFixed(2),
    linhas: statementLines,
    saldoFinal: accumulated.toFixed(2),
  };
}
