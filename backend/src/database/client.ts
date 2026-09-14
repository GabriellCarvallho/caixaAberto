import { readEnvironment } from '../config/environment.js';
import { createPrismaClient } from './prisma.js';

const environment = readEnvironment();

export const prisma = createPrismaClient(environment.DATABASE_URL);
