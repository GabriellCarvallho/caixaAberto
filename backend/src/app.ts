import express from 'express';
import 'dotenv/config';

import { AppError } from './errors/app-error.js';
import { errorHandler } from './middlewares/error-handler.js';
import { requestLogger } from './middlewares/request-logger.js';
import { testContextMiddleware } from './middlewares/test-context.js';

import authRouter from './routers/authRouter.js';
import userRouter from './routers/userRouter.js';
import transactionRouter from './routers/transactionRouter.js';
import transparencyRouter from './routers/transparencyRouter.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());
  app.use(requestLogger);
  app.use(testContextMiddleware);

  app.get('/health', (_request, response) => {
    response.status(200).json({ status: 'ok' });
  });

  if (process.env.NODE_ENV === 'test') {
    app.get('/test/contexto', (request, response, next) => {
      if (!request.contexto) {
        next(new AppError(401, 'Contexto autenticado ausente'));
        return;
      }

      response.json({
        usuarioId: request.contexto.usuarioId.toString(),
        organizacaoId: request.contexto.organizacaoId.toString(),
        papel: request.contexto.papel,
      });
    });
  }

  app.use('/auth', authRouter);
  app.use('/users', userRouter);
  app.use('/transactions', transactionRouter);
  app.use('/transparency', transparencyRouter);

  app.use((_request, _response, next) => {
    next(new AppError(404, 'Rota não encontrada'));
  });

  app.use(errorHandler);

  return app;
}
