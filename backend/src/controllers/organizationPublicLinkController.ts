import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { AppError } from '../errors/app-error.js';
import * as publicLinkService from '../services/organizationPublicLinkService.js';

const changePublicLinkStateSchema = z
  .object({
    ativo: z.boolean(),
  })
  .strict();

function getOrganizationId(request: Request): bigint {
  if (!request.contexto) {
    throw new AppError(401, 'Contexto autenticado ausente');
  }

  return request.contexto.organizacaoId;
}

export async function generatePublicLink(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await publicLinkService.generateAndActivatePublicLink(
      getOrganizationId(request),
    );
    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function changePublicLinkState(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = changePublicLinkStateSchema.parse(request.body);
    const result = await publicLinkService.changePublicLinkState(
      getOrganizationId(request),
      body.ativo,
    );
    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
