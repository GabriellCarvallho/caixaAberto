import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { AppError } from '../errors/app-error.js';

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      erro: error.message,
      ...(error.fields ? { campos: error.fields } : {}),
    });
    return;
  }

  if (error instanceof ZodError) {
    const fields = Object.fromEntries(
      error.issues.map((issue) => [issue.path.join('.') || 'requisicao', issue.message]),
    );

    response.status(400).json({ erro: 'Dados inválidos', campos: fields });
    return;
  }

  console.error('Erro não tratado', error);
  response.status(500).json({ erro: 'Erro interno do servidor' });
};
