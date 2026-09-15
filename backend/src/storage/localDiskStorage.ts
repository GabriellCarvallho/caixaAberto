import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

import { AppError } from '../errors/app-error.js';
import type { StorageSaveInput, StorageService, StoredDelivery } from './types.js';

export class LocalDiskStorage implements StorageService {
  private readonly baseDirectory: string;

  constructor(baseDirectory: string) {
    this.baseDirectory = resolve(baseDirectory);
  }

  // A chave e gerada pelo servico e nunca vem do cliente, mas a contencao e verificada aqui de
  // qualquer forma: e a ultima linha antes do disco, e uma chave que escapasse do diretorio base
  // seria gravacao em caminho arbitrario.
  private resolveWithin(key: string): string {
    const target = resolve(this.baseDirectory, key);

    if (target !== this.baseDirectory && !target.startsWith(this.baseDirectory + sep)) {
      throw new AppError(400, 'Caminho de armazenamento inválido');
    }

    return target;
  }

  async save({ key, content }: StorageSaveInput): Promise<void> {
    const target = this.resolveWithin(key);

    await mkdir(dirname(target), { recursive: true });

    try {
      await writeFile(target, content, { flag: 'wx' });
    } catch (error) {
      // Gravacao parcial nao pode sobrar: o servico ainda vai desfazer a linha do banco.
      await rm(target, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  async deliver(key: string): Promise<StoredDelivery> {
    const content = await readFile(this.resolveWithin(key));

    return { kind: 'content', content };
  }

  async remove(key: string): Promise<void> {
    await rm(this.resolveWithin(key), { force: true });
  }
}
