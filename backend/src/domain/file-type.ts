export const acceptedFileTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export type AcceptedFileType = (typeof acceptedFileTypes)[number];

export const JPEG_TYPE = 'image/jpeg' as const satisfies AcceptedFileType;
export const PNG_TYPE = 'image/png' as const satisfies AcceptedFileType;
export const WEBP_TYPE = 'image/webp' as const satisfies AcceptedFileType;
export const PDF_TYPE = 'application/pdf' as const satisfies AcceptedFileType;

// Record sobre a uniao: acrescentar um tipo aceito quebra a compilacao aqui ate a extensao ser
// definida, em vez de gerar arquivo sem extensao em producao.
const extensionByType: Record<AcceptedFileType, string> = {
  [JPEG_TYPE]: '.jpg',
  [PNG_TYPE]: '.png',
  [WEBP_TYPE]: '.webp',
  [PDF_TYPE]: '.pdf',
};

export function extensionFor(type: AcceptedFileType): string {
  return extensionByType[type];
}

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) {
    return false;
  }

  return signature.every((byte, index) => bytes[offset + index] === byte);
}

// O tipo sai dos bytes iniciais, nunca da extensao nem do Content-Type declarado, que sao
// controlados por quem envia. Devolve null quando o conteudo nao e um dos formatos aceitos.
export function detectFileType(bytes: Uint8Array): AcceptedFileType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return JPEG_TYPE;
  }

  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return PNG_TYPE;
  }

  // RIFF....WEBP: o rotulo do formato vem depois do tamanho do container.
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return WEBP_TYPE;
  }

  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) {
    return PDF_TYPE;
  }

  return null;
}
