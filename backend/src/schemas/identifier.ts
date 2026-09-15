import { z } from 'zod';

export const identifierSchema = z
  .string()
  .regex(/^\d+$/, 'Informe um identificador numérico')
  .transform(BigInt);

export const transactionIdParamSchema = z.object({ id: identifierSchema }).strict();
