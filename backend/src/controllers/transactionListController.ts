import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { transactionTypes } from '../domain/transaction.js';
import { getContexto } from '../middlewares/load-context.js';
import * as transactionListService from '../services/transactionListService.js';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function toUtcDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

// Rejeita datas que casam com o formato mas nao existem, como 2026-09-31, que o Date
// normalizaria silenciosamente para o mes seguinte.
function isExistingCivilDate(value: string): boolean {
  const date = toUtcDate(value);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const civilDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data no formato AAAA-MM-DD')
  .refine(isExistingCivilDate, 'Informe uma data existente')
  .transform(toUtcDate);

const identifierSchema = z
  .string()
  .regex(/^\d+$/, 'Informe um identificador numérico')
  .transform(BigInt);

const positiveIntegerSchema = z
  .string()
  .regex(/^\d+$/, 'Informe um número inteiro')
  .transform(Number);

const listTransactionsQuerySchema = z
  .object({
    dataInicio: civilDateSchema.optional(),
    dataFim: civilDateSchema.optional(),
    tipo: z.enum(transactionTypes).optional(),
    categoriaId: identifierSchema.optional(),
    usuarioId: identifierSchema.optional(),
    pagina: positiveIntegerSchema.pipe(z.int().min(1)).default(DEFAULT_PAGE),
    tamanhoPagina: positiveIntegerSchema
      .pipe(z.int().min(1).max(MAX_PAGE_SIZE))
      .default(DEFAULT_PAGE_SIZE),
  })
  .strict()
  .refine((query) => !query.dataInicio || !query.dataFim || query.dataFim >= query.dataInicio, {
    path: ['dataFim'],
    error: 'dataFim não pode ser anterior a dataInicio',
  });

export async function listTransactions(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = listTransactionsQuerySchema.parse(request.query);
    const result = await transactionListService.listTransactions(
      getContexto(request).organizacaoId,
      {
        startDate: query.dataInicio,
        endDate: query.dataFim,
        type: query.tipo,
        categoryId: query.categoriaId,
        userId: query.usuarioId,
        page: query.pagina,
        pageSize: query.tamanhoPagina,
      },
    );
    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
