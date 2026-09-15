import { z } from 'zod';

import { isExistingCivilDate, toUtcDate } from '../domain/civil-date.js';

export const civilDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data no formato AAAA-MM-DD')
  .refine(isExistingCivilDate, 'Informe uma data existente')
  .transform(toUtcDate);
