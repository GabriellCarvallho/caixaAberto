import { createPrismaClient } from '../database/prisma.js'

const DATABASE_URL = process.env.DATABASE_URL

if(!DATABASE_URL) {
    throw new Error('erro')
}

const prisma = createPrismaClient(DATABASE_URL)

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
  })
}
