import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { getContexto } from '../middlewares/load-context.js';
import { civilDateSchema } from '../schemas/civil-date.js';
import * as statementService from '../services/statementService.js';

const statementQuerySchema = z
  .object({
    dataInicio: civilDateSchema,
    dataFim: civilDateSchema,
  })
  .strict()
  .refine((query) => query.dataFim >= query.dataInicio, {
    path: ['dataFim'],
    error: 'dataFim não pode ser anterior a dataInicio',
  });

export async function getStatement(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = statementQuerySchema.parse(request.query);
    const result = await statementService.getStatement(
      getContexto(request).organizacaoId,
      query.dataInicio,
      query.dataFim,
    );
    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
