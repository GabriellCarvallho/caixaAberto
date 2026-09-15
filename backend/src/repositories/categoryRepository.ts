import { prisma } from '../database/client.js';
import type { CategoryType } from '../domain/category.js';

export interface CategoryRecord {
  id: bigint;
  name: string;
  type: string;
}

export async function findActiveCategories(
  organizationId: bigint,
  type?: CategoryType,
): Promise<CategoryRecord[]> {
  return prisma.category.findMany({
    where: {
      organizationId,
      active: true,
      ...(type ? { type } : {}),
    },
    select: {
      id: true,
      name: true,
      type: true,
    },
    orderBy: { name: 'asc' },
  });
}
