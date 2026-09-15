export const transactionTypes = ['ENTRADA', 'SAIDA'] as const;

export type TransactionType = (typeof transactionTypes)[number];

export const transactionStatuses = ['ATIVO', 'ESTORNADO'] as const;

export type TransactionStatus = (typeof transactionStatuses)[number];
