import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.url(),
  JWT_SECRET: z.string().min(32),
  PORT: z.coerce.number().int().positive().max(65_535).default(3000),
  CORS_ORIGIN: z.url(),
  STORAGE_DRIVER: z.string().default('local'),
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(5_242_880),
  UPLOAD_DIR: z.string().min(1).default('uploads'),
});

export type Environment = z.infer<typeof environmentSchema>;

export function readEnvironment(source: NodeJS.ProcessEnv = process.env): Environment {
  return environmentSchema.parse(source);
}
