import { PrismaClient } from '../generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

async function findAll() {
  return prisma.user.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  })
}

async function findById(id: bigint) {
  return prisma.user.findUnique({
    where: {
      id,
    },
  })
}

async function findByEmail(email: string) {
  return prisma.user.findUnique({
    where: {
      email,
    },
  })
}

async function create(data: {
  name: string
  email: string
  passwordHash: string
  active?: boolean
  createdAt?: Date
}) {
  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash,
      active: data.active ?? true,
      createdAt: data.createdAt ?? new Date(),
    },
  })
}

async function update(
  id: bigint,
  data: {
    name?: string
    email?: string
    passwordHash?: string
    active?: boolean
  }
) {
  return prisma.user.update({
    where: {
      id,
    },
    data,
  })
}

async function deleteById(id: bigint) {
  return prisma.user.delete({
    where: {
      id,
    },
  })
}

export default {
  findAll,
  findById,
  findByEmail,
  create,
  update,
  deleteById,
}
