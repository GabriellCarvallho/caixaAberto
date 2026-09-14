import { prisma } from '../../src/database/client.js';
import type { Prisma } from '../../src/generated/prisma/client.js';

export async function createMembership(
  overrides: Pick<Prisma.MembershipUncheckedCreateInput, 'userId' | 'organizationId'> &
    Partial<Omit<Prisma.MembershipUncheckedCreateInput, 'userId' | 'organizationId'>>,
) {
  return prisma.membership.create({
    data: {
      role: 'TESOUREIRO',
      linkedAt: new Date('2026-09-01T00:00:00.000Z'),
      active: true,
      ...overrides,
    },
  });
}
