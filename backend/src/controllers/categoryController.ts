import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { categoryTypes } from '../domain/category.js';
import { getContexto } from '../middlewares/load-context.js';
import * as categoryService from '../services/categoryService.js';

const listCategoriesQuerySchema = z
  .object({
    tipo: z.enum(categoryTypes).optional(),
  })
  .strict();

export async function listCategories(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = listCategoriesQuerySchema.parse(request.query);
    const result = await categoryService.listActiveCategories(
      getContexto(request).organizacaoId,
      query.tipo,
    );
    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
