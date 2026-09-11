import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { roles } from '../domain/auth-context.js';
import { AppError } from '../errors/app-error.js';

const testContextSchema = z.object({
  usuarioId: z.string().regex(/^\d+$/).transform(BigInt),
  organizacaoId: z.string().regex(/^\d+$/).transform(BigInt),
  papel: z.enum(roles),
});

export function testContextMiddleware(request: Request, _response: Response, next: NextFunction) {
  if (process.env.NODE_ENV !== 'test') {
    next();
    return;
  }

  const header = request.header('X-Test-Context');

  if (!header) {
    next();
    return;
  }

  try {
    request.contexto = testContextSchema.parse(JSON.parse(header));
    next();
  } catch {
    next(new AppError(400, 'Contexto de teste inválido'));
  }
}
