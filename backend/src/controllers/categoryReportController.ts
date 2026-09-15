import type { NextFunction, Request, Response } from 'express';

import { getContexto } from '../middlewares/load-context.js';
import { periodQuerySchema } from '../schemas/period.js';
import * as categoryReportService from '../services/categoryReportService.js';

export async function getCategoryReport(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = periodQuerySchema.parse(request.query);
    const result = await categoryReportService.getCategoryReport(
      getContexto(request).organizacaoId,
      query.dataInicio,
      query.dataFim,
    );
    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
