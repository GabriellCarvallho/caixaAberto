import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { readEnvironment } from '../config/environment.js';
import { AppError } from '../errors/app-error.js';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf']);

export interface FileToStore {
  originalName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
}

export interface StoredFile {
  fileName: string;
  fileType: string;
  size: number;
  fileUrl: string;
}

function getUploadDir(): string {
  const environment = readEnvironment();
  return path.resolve(process.cwd(), environment.UPLOAD_DIR);
}

function getMaxBytes(): number {
  return readEnvironment().UPLOAD_MAX_BYTES;
}

export function validateFile(file: Pick<FileToStore, 'mimeType' | 'size'>): void {
  if (!ALLOWED_MIME_TYPES.has(file.mimeType)) {
    throw new AppError(400, 'Tipo de arquivo não permitido', {
      arquivo: 'Envie um arquivo em JPEG, PNG ou PDF',
    });
  }

  const maxBytes = getMaxBytes();

  if (file.size > maxBytes) {
    throw new AppError(400, 'Arquivo excede o tamanho máximo permitido', {
      arquivo: `O arquivo deve ter no máximo ${Math.floor(maxBytes / (1024 * 1024))}MB`,
    });
  }
}

function extensionFor(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'application/pdf':
      return '.pdf';
    default:
      return '';
  }
}

export async function saveFile(file: FileToStore): Promise<StoredFile> {
  validateFile(file);

  const uploadDir = getUploadDir();
  await mkdir(uploadDir, { recursive: true });

  const fileName = `${randomUUID()}${extensionFor(file.mimeType)}`;
  const destination = path.join(uploadDir, fileName);

  await writeFile(destination, file.buffer);

  return {
    fileName,
    fileType: file.mimeType,
    size: file.size,
    fileUrl: path.posix.join('/uploads', fileName),
  };
}

export async function deleteFile(fileName: string): Promise<void> {
  const uploadDir = getUploadDir();
  const target = path.join(uploadDir, fileName);

  try {
    await unlink(target);
  } catch (error) {
    const isMissingFile = (error as NodeJS.ErrnoException).code === 'ENOENT';

    if (!isMissingFile) {
      throw error;
    }
  }
}