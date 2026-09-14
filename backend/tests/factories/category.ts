import { prisma } from '../../src/database/client.js';
import type { Prisma } from '../../src/generated/prisma/client.js';

let sequence = 0;

export async function createCategory(
  overrides: Pick<Prisma.CategoryUncheckedCreateInput, 'organizationId'> &
    Partial<Omit<Prisma.CategoryUncheckedCreateInput, 'organizationId'>>,
) {
  sequence += 1;

  return prisma.category.create({
    data: {
      name: `Categoria de teste ${sequence}`,
      description: 'Categoria criada por uma factory de integração',
      type: 'ENTRADA',
      active: true,
      ...overrides,
    },
  });
}
