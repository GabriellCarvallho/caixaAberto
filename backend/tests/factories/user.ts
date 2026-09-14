import type { Prisma } from '../../src/generated/prisma/client.js';
import { prisma } from '../../src/database/client.js';

let sequence = 0;

export async function createUser(overrides: Partial<Prisma.UserCreateInput> = {}) {
  sequence += 1;

  return prisma.user.create({
    data: {
      name: `Usuário de teste ${sequence}`,
      email: `usuario-${sequence}@example.test`,
      passwordHash: '$2b$10$hash.apenas.para.testes',
      active: true,
      createdAt: new Date('2026-09-01T12:00:00.000Z'),
      ...overrides,
    },
  });
}
