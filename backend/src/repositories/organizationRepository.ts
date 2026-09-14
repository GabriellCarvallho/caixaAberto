import { prisma } from '../database/client.js';

export async function findByPublicLink(publicLink: string) {
  return prisma.organization.findFirst({
    where: {
      publicLink,
      transparencyActive: true,
    },
    select: {
      id: true,
      name: true,
      description: true,
      managementStart: true,
      managementEnd: true,
      transparencyActive: true,
      publicLink: true,
    },
  });
}
