import { prisma } from '../../src/database/client.js';
import type { Prisma } from '../../src/generated/prisma/client.js';

let sequence = 0;

export async function createOrganization(overrides: Partial<Prisma.OrganizationCreateInput> = {}) {
  sequence += 1;

  return prisma.organization.create({
    data: {
      name: `Organização de teste ${sequence}`,
      description: 'Organização criada por uma factory de integração',
      managementStart: new Date('2026-01-01T00:00:00.000Z'),
      managementEnd: new Date('2026-12-31T00:00:00.000Z'),
      transparencyActive: false,
      ...overrides,
    },
  });
}
