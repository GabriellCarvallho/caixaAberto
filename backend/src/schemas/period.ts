import { z } from 'zod';

import { civilDateSchema } from './civil-date.js';

// Periodo fechado, com as duas pontas obrigatorias e inclusivas. A regra vive aqui, e nao em cada
// controller, para que consultas diferentes nao passem a discordar sobre o que e um periodo valido.
export const periodQuerySchema = z
  .object({
    dataInicio: civilDateSchema,
    dataFim: civilDateSchema,
  })
  .strict()
  .refine((query) => query.dataFim >= query.dataInicio, {
    path: ['dataFim'],
    error: 'dataFim não pode ser anterior a dataInicio',
  });
