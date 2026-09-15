export interface StorageSaveInput {
  key: string;
  content: Buffer;
  contentType: string;
}

// Como o arquivo chega ao cliente. O driver local devolve o conteudo; um driver remoto pode
// devolver um redirecionamento para uma URL temporaria, sem que o controller precise mudar.
// O tipo do conteudo nao vem daqui: ele e atributo do comprovante, guardado no banco, e o driver
// nao tem como conhece-lo.
export type StoredDelivery =
  { kind: 'content'; content: Buffer } | { kind: 'redirect'; url: string };

export interface StorageService {
  save(input: StorageSaveInput): Promise<void>;
  deliver(key: string): Promise<StoredDelivery>;
  remove(key: string): Promise<void>;
}
