export const categoryTypes = ['ENTRADA', 'SAIDA'] as const;

export type CategoryType = (typeof categoryTypes)[number];
