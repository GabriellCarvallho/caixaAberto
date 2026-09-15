export const transactionTypes = ['ENTRADA', 'SAIDA'] as const;

export type TransactionType = (typeof transactionTypes)[number];

// Nomeadas em vez de posicionais: a ordem de transactionTypes existe para o enum do Zod e e
// incidental, entao depender dela faria um tipo novo no inicio do array inverter o sinal do saldo.
export const INCOME_TYPE: TransactionType = 'ENTRADA';

export const EXPENSE_TYPE: TransactionType = 'SAIDA';

export const transactionStatuses = ['ATIVO', 'ESTORNADO'] as const;

export type TransactionStatus = (typeof transactionStatuses)[number];

// Um lancamento so entra no saldo enquanto esta ativo. O mesmo criterio decide o saldo anterior,
// filtrado no banco, e o acumulado de cada linha, calculado no servico, para que os dois nao
// possam divergir.
export const BALANCE_AFFECTING_STATUS: TransactionStatus = 'ATIVO';

export function affectsBalance(status: string): boolean {
  return status === BALANCE_AFFECTING_STATUS;
}
