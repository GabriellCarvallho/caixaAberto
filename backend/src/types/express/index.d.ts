import type { AuthContext } from '../../domain/auth-context.js';

declare global {
  namespace Express {
    interface Request {
      contexto?: AuthContext;
    }
  }
}

export {};
