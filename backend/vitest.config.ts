import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    globalSetup: ['./tests/global-setup.ts'],
    maxWorkers: 1,
    setupFiles: ['./tests/setup/environment.ts', './tests/setup/database.ts'],
  },
});
