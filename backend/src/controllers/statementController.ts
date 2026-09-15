import type { NextFunction, Request, Response } from 'express';

import { getContexto } from '../middlewares/load-context.js';
import { periodQuerySchema } from '../schemas/period.js';
import * as statementService from '../services/statementService.js';

export async function getStatement(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = periodQuerySchema.parse(request.query);
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
