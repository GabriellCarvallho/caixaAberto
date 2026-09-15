import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';

const environmentPath = fileURLToPath(new URL('../../.env', import.meta.url));

function parseTestDatabaseUrl(value: string): URL {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(
      'DATABASE_URL_TEST inválida. Informe uma URL PostgreSQL exclusiva para os testes.',
    );
  }

  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('DATABASE_URL_TEST deve usar o protocolo postgresql:// ou postgres://.');
  }

  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, '')).toLowerCase();

  if (!/(^|[_-])test($|[_-])/.test(databaseName)) {
    throw new Error(
      `DATABASE_URL_TEST aponta para o banco "${databaseName || '(sem nome)'}". ` +
        'Use um banco cujo nome identifique explicitamente o ambiente de teste.',
    );
  }

  return url;
}

const uploadDirectoryPath = fileURLToPath(new URL('../../uploads/test', import.meta.url));

export function testUploadDirectory(): string {
  return uploadDirectoryPath;
}

export function configureTestEnvironment(): string {
  config({ path: environmentPath });

  const testDatabaseUrl = process.env.DATABASE_URL_TEST;

  if (!testDatabaseUrl) {
    throw new Error(
      'DATABASE_URL_TEST não está definida. Copie backend/.env.example para backend/.env ' +
        'e configure um banco PostgreSQL exclusivo para testes.',
    );
  }

  parseTestDatabaseUrl(testDatabaseUrl);

  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.NODE_ENV = 'test';
  // Diretorio proprio para os arquivos criados pela suite, dentro de uploads/ e por isso ja
  // coberto pelo .gitignore. A limpeza fica em tests/setup/uploads.ts.
  process.env.UPLOAD_DIR = testUploadDirectory();

  return testDatabaseUrl;
}
