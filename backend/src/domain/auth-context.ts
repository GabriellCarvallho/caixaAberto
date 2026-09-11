export const roles = ['TESOUREIRO', 'CONSULTOR'] as const;

export type Role = (typeof roles)[number];

export interface AuthContext {
  usuarioId: bigint;
  organizacaoId: bigint;
  papel: Role;
}
