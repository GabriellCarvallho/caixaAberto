import type { NextFunction, Request, Response } from 'express';

export function requestLogger(request: Request, response: Response, next: NextFunction) {
  const startedAt = performance.now();

  response.on('finish', () => {
    if (process.env.NODE_ENV !== 'test') {
      const durationMs = Math.round(performance.now() - startedAt);
      console.info(
        `${request.method} ${request.originalUrl} ${response.statusCode} ${durationMs}ms`,
      );
    }
  });

  next();
}
