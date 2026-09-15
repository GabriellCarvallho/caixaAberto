import { mkdir, rm } from 'node:fs/promises';
import { sep } from 'node:path';
import { afterAll, beforeEach } from 'vitest';

import { testUploadDirectory } from '../helpers/test-environment.js';
import './environment.js';

const directory = testUploadDirectory();

// Mesma guarda que a suite ja aplica ao banco: apagar recursivamente um caminho de configuracao
// exige confirmar antes que ele e mesmo o diretorio de teste.
function assertIsTestDirectory(path: string): void {
  if (!path.includes(`${sep}uploads${sep}`) || !path.endsWith(`${sep}test`)) {
    throw new Error(`UPLOAD_DIR de teste inesperado, recusando apagar: ${path}`);
  }
}

async function resetUploadDirectory(): Promise<void> {
  assertIsTestDirectory(directory);
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
}

beforeEach(resetUploadDirectory);

afterAll(async () => {
  assertIsTestDirectory(directory);
  await rm(directory, { recursive: true, force: true });
});
